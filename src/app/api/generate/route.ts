import { type NextRequest, NextResponse } from "next/server";
import type {
  AspectRatio,
  GenerationRequest,
  GenerationResponse,
  GeneratedImageData,
  ProviderId,
} from "@/lib/types";
import { resolveSize } from "@/lib/providers";

const MAX_GENERATE_REQUEST_BYTES = 12 * 1024 * 1024;

/* ------------------------------------------------------------------ */
/*  Proxy-aware fetch                                                  */
/* ------------------------------------------------------------------ */

async function proxyFetch(
  url: string,
  init: RequestInit,
  proxyUrl?: string,
): Promise<Response> {
  const redactedUrl = url.replace(/key=[^&]+/, "key=***");
  console.log(`[generate] ➜ ${init.method ?? "GET"} ${redactedUrl}${proxyUrl ? ` (via proxy)` : ""}`);
  const t0 = Date.now();

  if (!proxyUrl) {
    const res = await fetch(url, init);
    console.log(`[generate] ← ${res.status} ${res.statusText} (${Date.now() - t0}ms) ${redactedUrl}`);
    return res;
  }

  // Dynamic imports to keep cold-start fast when no proxy is used
  const parsedProxy = new URL(proxyUrl);
  const isSocks =
    parsedProxy.protocol === "socks5:" ||
    parsedProxy.protocol === "socks5h:" ||
    parsedProxy.protocol === "socks4:" ||
    parsedProxy.protocol === "socks4a:";

  let agent: import("node:http").Agent;

  if (isSocks) {
    const { SocksProxyAgent } = await import("socks-proxy-agent");
    agent = new SocksProxyAgent(proxyUrl);
  } else {
    const { HttpsProxyAgent } = await import("https-proxy-agent");
    agent = new HttpsProxyAgent(proxyUrl);
  }

  // Node.js fetch (undici) doesn't natively accept http.Agent.
  // Use node:https to make the request with the proxy agent.
  const https = await import("node:https");
  const http = await import("node:http");
  const parsed = new URL(url);

  return new Promise((resolve, reject) => {
    const mod = parsed.protocol === "https:" ? https : http;
    const headers: Record<string, string> = {};
    if (init.headers) {
      const h = init.headers as Record<string, string>;
      for (const [k, v] of Object.entries(h)) headers[k] = v;
    }

    const req = mod.request(
      url,
      {
        method: init.method ?? "GET",
        headers,
        agent: agent as unknown as import("node:https").Agent,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          console.log(`[generate] ← ${res.statusCode} ${res.statusMessage} (${Date.now() - t0}ms, proxy) ${redactedUrl}`);
          const body = Buffer.concat(chunks);
          resolve(
            new Response(body, {
              status: res.statusCode ?? 500,
              statusText: res.statusMessage ?? "",
              headers: res.headers as unknown as HeadersInit,
            }),
          );
        });
      },
    );
    req.on("error", (err) => {
      console.error(`[generate] ✗ proxy fetch error (${Date.now() - t0}ms): ${err.message}`);
      reject(err);
    });
    if (init.body) req.write(init.body);
    req.end();
  });
}

/* ------------------------------------------------------------------ */
/*  Provider-specific generation logic                                 */
/* ------------------------------------------------------------------ */

async function generateOpenAICompat(
  req: GenerationRequest,
  baseUrl: string,
  extraHeaders?: Record<string, string>,
): Promise<GeneratedImageData[]> {
  const model = req.customModelId || req.model;
  const size = resolveSize(req.provider, req.model, req.aspectRatio);

  // Build request body
  const body: Record<string, unknown> = {
    model,
    prompt: req.prompt,
    n: 1,
    response_format: "b64_json",
  };
  if (size) body.size = size;
  if (req.quality && req.quality !== "auto") body.quality = req.quality;

  // If reference images are provided and model supports it, use the images endpoint
  if (req.referenceImages?.length) {
    return generateOpenAIWithImages(req, baseUrl, extraHeaders);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${req.apiKey}`,
    ...extraHeaders,
  };

  const res = await proxyFetch(
    `${baseUrl}/v1/images/generations`,
    { method: "POST", headers, body: JSON.stringify(body) },
    req.proxy,
  );

  if (!res.ok) {
    const text = await res.text();
    let msg = `Provider returned ${res.status}`;
    try {
      const j = JSON.parse(text);
      msg = j.error?.message ?? j.error ?? msg;
    } catch { /* use default */ }
    throw new Error(msg);
  }

  const json = await res.json() as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };

  if (!json.data?.length) throw new Error("No images returned from provider");

  const images: GeneratedImageData[] = [];
  for (const d of json.data) {
    if (d.b64_json) {
      images.push({ base64: d.b64_json, mimeType: "image/png" });
    } else if (d.url) {
      // Download the URL and convert to base64
      const imgRes = await proxyFetch(d.url, {}, req.proxy);
      const buf = await imgRes.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      images.push({ base64: b64, mimeType: "image/png" });
    }
  }
  return images;
}

async function generateOpenAIWithImages(
  req: GenerationRequest,
  baseUrl: string,
  extraHeaders?: Record<string, string>,
): Promise<GeneratedImageData[]> {
  const model = req.customModelId || req.model;
  const size = resolveSize(req.provider, req.model, req.aspectRatio);

  // Build multipart form
  const formData = new FormData();
  formData.append("model", model);
  formData.append("prompt", req.prompt);
  formData.append("n", "1");
  formData.append("response_format", "b64_json");
  if (size) formData.append("size", size);
  if (req.quality && req.quality !== "auto") formData.append("quality", req.quality);

  // Add reference images
  for (let i = 0; i < req.referenceImages!.length; i++) {
    const dataUrl = req.referenceImages![i];
    const [header, b64] = dataUrl.split(",");
    const mimeMatch = header.match(/data:(.*?);/);
    const mime = mimeMatch?.[1] ?? "image/png";
    const ext = mime.split("/")[1] ?? "png";
    const buf = Buffer.from(b64, "base64");
    const blob = new Blob([buf], { type: mime });
    formData.append("image[]", blob, `ref_${i}.${ext}`);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${req.apiKey}`,
    ...extraHeaders,
  };

  // FormData with multipart encoding uses native fetch (proxy not supported
  // for image-edit requests — FormData requires multipart boundary handling
  // that raw node:http doesn't provide). For proxied image edits, the user
  // should configure a system-level proxy instead.
  const res = await fetch(`${baseUrl}/v1/images/edits`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = `Provider returned ${res.status}`;
    try {
      const j = JSON.parse(text);
      msg = j.error?.message ?? j.error ?? msg;
    } catch { /* use default */ }
    throw new Error(msg);
  }

  const json = await res.json() as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };

  if (!json.data?.length) throw new Error("No images returned");

  return json.data
    .filter((d) => d.b64_json)
    .map((d) => ({ base64: d.b64_json!, mimeType: "image/png" }));
}

/** Returns true if the model ID is a Gemini native image model. */
function isGeminiImageModel(model: string): boolean {
  return model.startsWith("gemini-");
}

async function generateGoogle(
  req: GenerationRequest,
): Promise<GeneratedImageData[]> {
  const model = req.customModelId || req.model;

  if (isGeminiImageModel(model)) {
    return generateGeminiImage(req, model);
  }
  return generateImagen(req, model);
}

/** Imagen models – uses the :predict endpoint. */
async function generateImagen(
  req: GenerationRequest,
  model: string,
): Promise<GeneratedImageData[]> {
  const baseUrl =
    req.baseUrl || "https://generativelanguage.googleapis.com";

  const parameters: Record<string, unknown> = {
    sampleCount: 1,
    aspectRatio: req.aspectRatio,
  };

  // Imagen 4 Ultra & Imagen 4 (Standard) support imageSize: "1K" | "2K"
  if (req.resolution) {
    parameters.imageSize = req.resolution;
  }

  const body = {
    instances: [{ prompt: req.prompt }],
    parameters,
  };

  const url = `${baseUrl}/v1beta/models/${model}:predict?key=${req.apiKey}`;

  const res = await proxyFetch(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    req.proxy,
  );

  if (!res.ok) {
    const text = await res.text();
    let msg = `Google API returned ${res.status}`;
    try {
      const j = JSON.parse(text);
      msg = j.error?.message ?? j.error?.status ?? msg;
    } catch { /* use default */ }
    throw new Error(msg);
  }

  const json = await res.json() as {
    predictions?: Array<{ bytesBase64Encoded: string; mimeType?: string }>;
  };

  if (!json.predictions?.length) throw new Error("No images returned from Google");

  return json.predictions.map((p) => ({
    base64: p.bytesBase64Encoded,
    mimeType: p.mimeType ?? "image/png",
  }));
}

/** Gemini native image models – uses the :generateContent endpoint. */
async function generateGeminiImage(
  req: GenerationRequest,
  model: string,
): Promise<GeneratedImageData[]> {
  const baseUrl =
    req.baseUrl || "https://generativelanguage.googleapis.com";

  // Build content parts – text prompt + optional reference images
  const parts: Array<Record<string, unknown>> = [];

  if (req.referenceImages?.length) {
    for (const dataUrl of req.referenceImages) {
      const [header, b64] = dataUrl.split(",");
      const mimeMatch = header.match(/data:(.*?);/);
      const mime = mimeMatch?.[1] ?? "image/png";
      parts.push({ inline_data: { mime_type: mime, data: b64 } });
    }
  }

  parts.push({ text: req.prompt });

  const imageConfig: Record<string, unknown> = {
    aspectRatio: req.aspectRatio,
  };

  // Gemini models support imageSize: "512" | "1K" | "2K" | "4K"
  if (req.resolution) {
    imageConfig.imageSize = req.resolution;
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig,
    },
  };

  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${req.apiKey}`;

  const res = await proxyFetch(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    req.proxy,
  );

  if (!res.ok) {
    const text = await res.text();
    let msg = `Gemini API returned ${res.status}`;
    try {
      const j = JSON.parse(text);
      msg = j.error?.message ?? j.error?.status ?? msg;
    } catch { /* use default */ }
    throw new Error(msg);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await res.json() as Record<string, any>;

  // Log response structure (truncate base64 data to avoid flooding the console)
  const debugJson = JSON.stringify(json, (_k, v) =>
    typeof v === "string" && v.length > 200 ? v.slice(0, 200) + "…[truncated]" : v,
    2,
  );
  console.log(`[generate] Gemini response structure:\n${debugJson}`);

  const images: GeneratedImageData[] = [];
  const candidate = json.candidates?.[0];
  const finishReason = candidate?.finishReason;

  if (finishReason && finishReason !== "STOP") {
    const reasons: Record<string, string> = {
      NO_IMAGE: "Gemini could not generate an image for this prompt. Try a more descriptive prompt.",
      SAFETY: "Request was blocked by safety filters. Try rephrasing your prompt.",
      RECITATION: "Request was blocked due to recitation concerns.",
      MAX_TOKENS: "Response was truncated — try a simpler prompt.",
    };
    throw new Error(reasons[finishReason] ?? `Gemini returned finish reason: ${finishReason}`);
  }

  if (!candidate?.content?.parts) throw new Error("No content returned from Gemini");

  for (const part of candidate.content.parts) {
    // Handle both snake_case (inline_data) and camelCase (inlineData) response formats
    const inlineData = part.inline_data ?? part.inlineData;
    if (inlineData) {
      images.push({
        base64: inlineData.data,
        mimeType: inlineData.mime_type ?? inlineData.mimeType ?? "image/png",
      });
    }
  }

  console.log(`[generate] Gemini parts: ${candidate.content.parts.length} total, ${images.length} image(s) found`);
  if (!images.length) throw new Error("No images returned from Gemini");
  return images;
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const reqStart = Date.now();
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;

  console.log(
    `[generate] ▶ request received: method=${request.method} contentLength=${contentLengthHeader ?? "unknown"}`,
  );

  if (Number.isFinite(contentLength) && contentLength > MAX_GENERATE_REQUEST_BYTES) {
    console.warn(
      `[generate] ✗ rejected oversized request: ${contentLength} bytes > ${MAX_GENERATE_REQUEST_BYTES}`,
    );
    return NextResponse.json(
      {
        images: [],
        error: "Request body is too large. Remove some reference images or use smaller files.",
      } satisfies GenerationResponse,
      { status: 413 },
    );
  }

  try {
    const body: GenerationRequest = await request.json();
    const { provider, apiKey } = body;

    console.log(`[generate] ▶ incoming request: provider=${provider} model=${body.customModelId || body.model} aspect=${body.aspectRatio} prompt="${body.prompt?.slice(0, 80)}${(body.prompt?.length ?? 0) > 80 ? "…" : ""}" proxy=${body.proxy ? "yes" : "no"} refImages=${body.referenceImages?.length ?? 0}`);

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { images: [], error: "Prompt is required" } satisfies GenerationResponse,
        { status: 400 },
      );
    }
    if (!apiKey) {
      return NextResponse.json(
        { images: [], error: "API key is required" } satisfies GenerationResponse,
        { status: 400 },
      );
    }

    let images: GeneratedImageData[];

    switch (provider) {
      case "openai": {
        const base = body.baseUrl || "https://api.openai.com";
        images = await generateOpenAICompat(body, base);
        break;
      }
      case "grok": {
        const base = body.baseUrl || "https://api.x.ai";
        images = await generateOpenAICompat(body, base);
        break;
      }
      case "openrouter": {
        const base = body.baseUrl || "https://openrouter.ai/api";
        images = await generateOpenAICompat(body, base, {
          "HTTP-Referer": "https://imagegen-studio.local",
          "X-Title": "ImageGen Studio",
        });
        break;
      }
      case "custom": {
        if (!body.baseUrl) {
          return NextResponse.json(
            {
              images: [],
              error: "Base URL is required for custom provider",
            } satisfies GenerationResponse,
            { status: 400 },
          );
        }
        images = await generateOpenAICompat(body, body.baseUrl);
        break;
      }
      case "google": {
        images = await generateGoogle(body);
        break;
      }
      default:
        return NextResponse.json(
          {
            images: [],
            error: `Unsupported provider: ${provider}`,
          } satisfies GenerationResponse,
          { status: 400 },
        );
    }

    console.log(`[generate] ✔ completed: ${images.length} image(s) in ${Date.now() - reqStart}ms`);
    return NextResponse.json({ images } satisfies GenerationResponse);
  } catch (err) {
    console.error(`[generate] ✗ failed after ${Date.now() - reqStart}ms:`, err);
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json(
      { images: [], error: message } satisfies GenerationResponse,
      { status: 500 },
    );
  }
}
