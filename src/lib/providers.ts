import type { AspectRatio, ModelDef, ProviderDef, ProviderId, Resolution } from "./types";

/* ------------------------------------------------------------------ */
/*  Provider & model catalogue                                        */
/* ------------------------------------------------------------------ */

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    icon: "✦",
    logoDomain: "openai.com",
    defaultBaseUrl: "https://api.openai.com",
    models: [
      {
        id: "gpt-image-1.5",
        name: "GPT Image 1.5",
        description: "Latest & most advanced — best realism, instruction following, and text rendering",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "3:2", "2:3"],
        supportedQualities: ["auto", "low", "medium", "high"],
        defaultQuality: "auto",
        supportsImageInput: true,
        maxN: 1,
      },
      {
        id: "gpt-image-1",
        name: "GPT Image 1",
        description: "High quality, prompt-faithful image generation",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "3:2", "2:3"],
        supportedQualities: ["auto", "low", "medium", "high"],
        defaultQuality: "auto",
        supportsImageInput: true,
        maxN: 1,
      },
      {
        id: "gpt-image-1-mini",
        name: "GPT Image 1 Mini",
        description: "Cost-efficient image generation — great quality at lower cost",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "3:2", "2:3"],
        supportedQualities: ["auto", "low", "medium", "high"],
        defaultQuality: "auto",
        supportsImageInput: true,
        maxN: 1,
      },
    ],
  },

  google: {
    id: "google",
    name: "Google",
    icon: "◈",
    logoDomain: "google.com",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    models: [
      {
        id: "imagen-4.0-ultra-generate-001",
        name: "Imagen 4 Ultra",
        description: "Highest fidelity — professional branding, complex scenes, precise text",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
        supportedQualities: undefined,
        supportedResolutions: ["1K", "2K"],
        defaultResolution: "1K",
        supportsImageInput: false,
        maxN: 4,
      },
      {
        id: "imagen-4.0-generate-001",
        name: "Imagen 4",
        description: "High quality with precise text rendering and complex lighting",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
        supportedQualities: undefined,
        supportedResolutions: ["1K", "2K"],
        defaultResolution: "1K",
        supportsImageInput: false,
        maxN: 4,
      },
      {
        id: "imagen-4.0-fast-generate-001",
        name: "Imagen 4 Fast",
        description: "Fast generation with great quality",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
        supportedQualities: undefined,
        supportsImageInput: false,
        maxN: 4,
      },
      {
        id: "imagen-3.0-generate-002",
        name: "Imagen 3",
        description: "Previous generation — still available",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
        supportedQualities: undefined,
        supportsImageInput: false,
        maxN: 4,
      },
      /* ── Gemini native image generation ─────────────────── */
      {
        id: "gemini-3-pro-image-preview",
        name: "Gemini 3 Pro Image (Nano Banana Pro)",
        description: "Most advanced — reasoning-powered, up to 4K, precise text",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportedResolutions: ["1K", "2K", "4K"],
        defaultResolution: "1K",
        supportsImageInput: true,
        maxN: 1,
      },
      {
        id: "gemini-3.1-flash-image-preview",
        name: "Gemini 3.1 Flash Image (Nano Banana 2)",
        description: "Pro-level visual quality at Flash speed",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportedResolutions: ["512", "1K", "2K", "4K"],
        defaultResolution: "1K",
        supportsImageInput: true,
        maxN: 1,
      },
      {
        id: "gemini-2.5-flash-image",
        name: "Gemini 2.5 Flash Image (Nano Banana)",
        description: "Fast, efficient image generation — GA",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportedResolutions: ["1K", "2K", "4K"],
        defaultResolution: "1K",
        supportsImageInput: true,
        maxN: 1,
      },
    ],
  },

  grok: {
    id: "grok",
    name: "Grok (xAI)",
    icon: "𝕏",
    logoDomain: "x.ai",
    defaultBaseUrl: "https://api.x.ai",
    models: [
      {
        id: "grok-imagine-image-pro",
        name: "Grok Imagine Image Pro",
        description: "xAI's top-tier image generation — highest quality and control",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportsImageInput: true,
        maxN: 10,
      },
      {
        id: "grok-imagine-image",
        name: "Grok Imagine Image",
        description: "Versatile image generation — photorealistic to artistic styles",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportsImageInput: true,
        maxN: 10,
      },
    ],
  },

  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    icon: "⬡",
    logoDomain: "openrouter.ai",
    defaultBaseUrl: "https://openrouter.ai/api",
    models: [
      /* ── Google Gemini image models ─────────────────────── */
      {
        id: "google/gemini-3.1-flash-image-preview",
        name: "Nano Banana 2 (Gemini 3.1 Flash Image)",
        description: "Pro-level visual quality at Flash speed",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportsImageInput: true,
        maxN: 1,
      },
      {
        id: "google/gemini-3-pro-image-preview",
        name: "Nano Banana Pro (Gemini 3 Pro Image)",
        description: "Most advanced Google image gen — reasoning-powered, up to 4K",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportsImageInput: true,
        maxN: 1,
      },
      {
        id: "google/gemini-2.5-flash-image",
        name: "Nano Banana (Gemini 2.5 Flash Image)",
        description: "Fast, efficient image generation — GA",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportsImageInput: true,
        maxN: 1,
      },
      /* ── OpenAI ─────────────────────────────────────────── */
      {
        id: "openai/gpt-5-image",
        name: "GPT-5 Image",
        description: "GPT-5 + GPT Image 1 — advanced reasoning with image gen",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "3:2", "2:3"],
        supportedQualities: ["auto", "low", "medium", "high"],
        defaultQuality: "auto",
        supportsImageInput: true,
        maxN: 1,
      },
      {
        id: "openai/gpt-5-image-mini",
        name: "GPT-5 Image Mini",
        description: "Efficient GPT-5 Mini + GPT Image 1 Mini",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "3:2", "2:3"],
        supportedQualities: ["auto", "low", "medium", "high"],
        defaultQuality: "auto",
        supportsImageInput: true,
        maxN: 1,
      },
      /* ── Black Forest Labs FLUX.2 ───────────────────────── */
      {
        id: "black-forest-labs/flux.2-max",
        name: "FLUX.2 Max",
        description: "Top-tier image quality, prompt understanding, and editing",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportsImageInput: false,
        maxN: 1,
      },
      {
        id: "black-forest-labs/flux.2-pro",
        name: "FLUX.2 Pro",
        description: "High-end generation — strong prompt adherence and sharp textures",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportsImageInput: false,
        maxN: 1,
      },
      {
        id: "black-forest-labs/flux.2-flex",
        name: "FLUX.2 Flex",
        description: "Complex text rendering and multi-reference editing",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportsImageInput: true,
        maxN: 1,
      },
      {
        id: "black-forest-labs/flux.2-klein-4b",
        name: "FLUX.2 Klein 4B",
        description: "Fastest and most cost-effective FLUX.2 variant",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportsImageInput: false,
        maxN: 1,
      },
      /* ── ByteDance ──────────────────────────────────────── */
      {
        id: "bytedance-seed/seedream-4.5",
        name: "Seedream 4.5",
        description: "ByteDance's latest — great editing consistency and text rendering",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportsImageInput: true,
        maxN: 1,
      },
      /* ── Sourceful Riverflow ────────────────────────────── */
      {
        id: "sourceful/riverflow-v2-pro",
        name: "Riverflow V2 Pro",
        description: "SOTA reasoning-powered image gen — top-tier control and text",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportsImageInput: true,
        maxN: 1,
      },
      {
        id: "sourceful/riverflow-v2-fast",
        name: "Riverflow V2 Fast",
        description: "Fast variant for production and latency-critical workflows",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: undefined,
        supportsImageInput: false,
        maxN: 1,
      },
    ],
  },

  custom: {
    id: "custom",
    name: "Custom (OpenAI-compat)",
    icon: "⚙",
    defaultBaseUrl: "",
    models: [
      {
        id: "__custom__",
        name: "Custom model",
        description: "Specify model ID and base URL manually",
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        supportedQualities: ["auto", "low", "medium", "high", "standard", "hd"],
        defaultQuality: "auto",
        supportsImageInput: true,
        maxN: 4,
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Helper: map aspect ratio → pixel size per provider                */
/* ------------------------------------------------------------------ */

const GPT_IMAGE_SIZES: Record<AspectRatio, string> = {
  "1:1": "1024x1024",
  "16:9": "1536x1024",
  "9:16": "1024x1536",
  "3:2": "1536x1024",
  "2:3": "1024x1536",
  "4:3": "1536x1024",
  "3:4": "1024x1536",
};

const OPENAI_SIZE_MAP: Record<string, Record<AspectRatio, string>> = {
  "gpt-image-1.5": GPT_IMAGE_SIZES,
  "gpt-image-1": GPT_IMAGE_SIZES,
  "gpt-image-1-mini": GPT_IMAGE_SIZES,
};

/** Resolve provider-specific size string from an aspect ratio. */
export function resolveSize(
  provider: ProviderId,
  model: string,
  aspectRatio: AspectRatio,
): string | undefined {
  if (provider === "openai" || provider === "grok" || provider === "custom") {
    const map = OPENAI_SIZE_MAP[model];
    if (map) return map[aspectRatio];
    // fallback for unknown models – use shared GPT Image mapping
    return GPT_IMAGE_SIZES[aspectRatio];
  }
  if (provider === "openrouter") {
    // OpenRouter uses OpenAI format for size when proxying OpenAI models
    if (model.startsWith("openai/")) {
      const baseModel = model.replace("openai/", "");
      const map = OPENAI_SIZE_MAP[baseModel];
      if (map) return map[aspectRatio];
    }
    return GPT_IMAGE_SIZES[aspectRatio];
  }
  // Google sends aspectRatio directly
  return undefined;
}

export function getProviderDef(id: ProviderId): ProviderDef {
  return PROVIDERS[id];
}

export function getModelDef(
  providerId: ProviderId,
  modelId: string,
): ModelDef | undefined {
  return PROVIDERS[providerId]?.models.find((m) => m.id === modelId);
}
