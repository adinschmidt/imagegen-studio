/* ------------------------------------------------------------------ */
/*  ImageGen Studio – shared type definitions                         */
/* ------------------------------------------------------------------ */

// ── Providers ──────────────────────────────────────────────────────

export type ProviderId =
  | "openai"
  | "google"
  | "grok"
  | "openrouter"
  | "custom";

export interface ModelDef {
  id: string;
  name: string;
  description?: string;
  supportedAspectRatios: AspectRatio[];
  supportedQualities?: Quality[];
  defaultQuality?: Quality;
  supportedResolutions?: Resolution[];
  defaultResolution?: Resolution;
  supportsImageInput?: boolean;
  maxN?: number; // max images per single API call (usually 1)
}

export interface ProviderDef {
  id: ProviderId;
  name: string;
  icon: string;
  defaultBaseUrl: string;
  models: ModelDef[];
}

// ── Aspect ratio & quality ─────────────────────────────────────────

export type AspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "4:3"
  | "3:4"
  | "3:2"
  | "2:3";

export const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  "1:1": "Square (1:1)",
  "16:9": "Landscape (16:9)",
  "9:16": "Portrait (9:16)",
  "4:3": "Landscape (4:3)",
  "3:4": "Portrait (3:4)",
  "3:2": "Landscape (3:2)",
  "2:3": "Portrait (2:3)",
};

export type Quality = "auto" | "low" | "medium" | "high" | "standard" | "hd";

export const QUALITY_LABELS: Record<Quality, string> = {
  auto: "Auto",
  low: "Low",
  medium: "Medium",
  high: "High",
  standard: "Standard",
  hd: "HD",
};

// ── Resolution (Google models only) ───────────────────────────────

export type Resolution = "512" | "1K" | "2K" | "4K";

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  "512": "0.5K (512)",
  "1K": "1K (default)",
  "2K": "2K",
  "4K": "4K",
};

// ── Generation request / response ──────────────────────────────────

export interface GenerationRequest {
  prompt: string;
  provider: ProviderId;
  model: string;
  customModelId?: string; // user-typed override
  aspectRatio: AspectRatio;
  quality?: Quality;
  resolution?: Resolution; // Google models only (e.g. "1K", "2K", "4K")
  apiKey: string;
  baseUrl?: string; // for custom / overrides
  proxy?: string; // full proxy URL e.g. socks5h://user:pass@host:port
  referenceImages?: string[]; // base64 data-URIs
}

export interface GenerationResponse {
  images: GeneratedImageData[];
  error?: string;
}

export interface GeneratedImageData {
  base64: string; // raw base64, no prefix
  mimeType: string;
}

// ── Stored image ───────────────────────────────────────────────────

export interface StoredImage {
  id: string;
  dataUrl: string; // data:image/...;base64,...
  thumbnailDataUrl: string; // smaller version for gallery
  prompt: string;
  provider: ProviderId;
  model: string;
  aspectRatio: AspectRatio;
  quality?: Quality;
  resolution?: Resolution;
  createdAt: number; // epoch ms
}

// ── Queue ──────────────────────────────────────────────────────────

export type QueueItemStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface QueueItem {
  id: string;
  request: GenerationRequest;
  status: QueueItemStatus;
  attempt: number; // current attempt (1-based)
  maxRetries: number; // total allowed attempts
  imagesPerPrompt: number; // how many times to fire the same prompt
  completedCount: number; // how many of imagesPerPrompt completed
  results: StoredImage[];
  error?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

// ── Settings (persisted to localStorage) ───────────────────────────

export interface AppSettings {
  provider: ProviderId;
  model: string;
  customModelId: string;
  aspectRatio: AspectRatio;
  quality: Quality;
  resolution?: Resolution; // Google models only
  apiKeys: Partial<Record<ProviderId, string>>;
  customBaseUrl: string;
  proxy: string;
  retries: number; // 0 = no retry
  imagesPerPrompt: number; // 1–10
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider: "openai",
  model: "gpt-image-1.5",
  customModelId: "",
  aspectRatio: "1:1",
  quality: "auto",
  resolution: undefined,
  apiKeys: {},
  customBaseUrl: "",
  proxy: "",
  retries: 0,
  imagesPerPrompt: 1,
};
