/**
 * Bilko Flow API — HTTP Client & Domain Helpers
 *
 * General-purpose `apiPost<T>()` and `apiGet<T>()` for any endpoint,
 * plus domain-specific helpers like `validateVideos()` and `searchYouTube()`.
 */

/**
 * General-purpose POST. Returns typed response body.
 */
export async function apiPost<T>(
  endpoint: string,
  body: unknown,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new APIError(
      err.error || `API request failed (${response.status})`,
      response.status,
      endpoint,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * General-purpose GET. Returns typed response body.
 */
export async function apiGet<T>(
  endpoint: string,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const response = await fetch(endpoint, {
    signal: options?.signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new APIError(
      err.error || `API request failed (${response.status})`,
      response.status,
      endpoint,
    );
  }

  return response.json() as Promise<T>;
}

// ── Domain-specific helpers ──────────────────────────────────────────

export interface VideoCandidate {
  title: string;
  creator: string;
  description: string;
  url: string;
  embedId: string;
  whyRecommended: string;
  views: string;
  likes: string;
  comments: string;
}

/**
 * Validate video embed IDs against YouTube oEmbed.
 * Filters out hallucinated/unavailable videos.
 */
export async function validateVideos(
  videos: VideoCandidate[],
  options?: { signal?: AbortSignal },
): Promise<VideoCandidate[]> {
  if (videos.length === 0) return [];

  try {
    const result = await apiPost<{ videos: VideoCandidate[] }>(
      "/api/llm/validate-videos",
      { videos },
      options,
    );
    return result.videos ?? [];
  } catch (err) {
    // Never return unvalidated videos — hallucinated IDs will produce broken embeds.
    // Return empty so the caller knows validation couldn't confirm anything.
    console.warn("[validateVideos] Validation failed, returning empty:", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Search YouTube via Data API v3.
 * Takes an array of search queries, returns real videos with stats.
 */
export async function searchYouTube(
  queries: string[],
  options?: { signal?: AbortSignal },
): Promise<VideoCandidate[]> {
  if (queries.length === 0) return [];

  try {
    const result = await apiPost<{ videos: VideoCandidate[] }>(
      "/api/llm/youtube-search",
      { queries },
      options,
    );
    return result.videos ?? [];
  } catch (err) {
    console.warn("[searchYouTube] Search failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Image Generation (Nano Banana) ──────────────────────────────────

export interface ImageGenerationResult {
  imageBase64: string;
  mimeType: string;
  textResponse?: string;
  model: string;
}

/**
 * Generate a single image using Nano Banana (Gemini native image generation).
 */
export async function generateImage(
  prompt: string,
  options?: {
    aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
    model?: string;
    referenceImageBase64?: string;
    signal?: AbortSignal;
  },
): Promise<ImageGenerationResult> {
  return apiPost<ImageGenerationResult>("/api/llm/generate-image", {
    prompt,
    aspectRatio: options?.aspectRatio,
    model: options?.model,
    referenceImageBase64: options?.referenceImageBase64,
  }, { signal: options?.signal });
}

/**
 * Generate multiple images in parallel using Nano Banana.
 * Returns array of results (null for failed generations).
 */
export async function generateImages(
  prompts: Array<{
    prompt: string;
    aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
    model?: string;
  }>,
  options?: { signal?: AbortSignal },
): Promise<(ImageGenerationResult | null)[]> {
  const result = await apiPost<{ images: (ImageGenerationResult | null)[] }>(
    "/api/llm/generate-images",
    {
      requests: prompts.map((p) => ({
        prompt: p.prompt,
        aspectRatio: p.aspectRatio,
        model: p.model,
      })),
    },
    { signal: options?.signal },
  );
  return result.images;
}

// ── Video Generation (Veo) ──────────────────────────────────────────

export interface VideoGenerationResult {
  videos: Array<{
    videoBase64: string;
    mimeType: string;
    durationSeconds: number;
  }>;
  model: string;
}

/**
 * Generate a single video using Veo.
 * Note: This is an async operation and may take up to 5 minutes.
 *
 * Supports scene extension: pass `sourceVideoBase64` to extend a
 * previous Veo-generated video by ~7 seconds using the last ~1 second as grounding.
 */
export async function generateVideo(
  prompt: string,
  options?: {
    durationSeconds?: 5 | 6 | 7 | 8;
    aspectRatio?: "16:9" | "9:16";
    model?: string;
    referenceImageBase64?: string;
    /** Base64-encoded Veo-generated video to extend (scene extension) */
    sourceVideoBase64?: string;
    signal?: AbortSignal;
  },
): Promise<VideoGenerationResult> {
  return apiPost<VideoGenerationResult>("/api/llm/generate-video", {
    prompt,
    durationSeconds: options?.durationSeconds,
    aspectRatio: options?.aspectRatio,
    model: options?.model,
    referenceImageBase64: options?.referenceImageBase64,
    sourceVideoBase64: options?.sourceVideoBase64,
  }, { signal: options?.signal });
}

/**
 * Generate a continuous video by chaining Veo scene extensions.
 *
 * Creates a ~22-second continuous video from 3 prompts:
 *   - Clip 1: 8s initial generation
 *   - Clip 2: Extend by ~7s (Veo uses last ~1s of clip 1 as grounding)
 *   - Clip 3: Extend by ~7s (Veo uses last ~1s of merged clip as grounding)
 *
 * Each extension returns a merged video. The final result is a single
 * continuous video plus metadata about each clip.
 */
export interface ContinuousVideoResult {
  mergedVideo: { videoBase64: string; mimeType: string; durationSeconds: number } | null;
  clips: ({ videoBase64: string; mimeType: string; durationSeconds: number } | null)[];
  totalDurationSeconds: number;
  model: string;
}

export async function generateContinuousVideo(
  prompts: string[],
  options?: {
    model?: string;
    aspectRatio?: "16:9" | "9:16";
    initialDurationSeconds?: 5 | 6 | 7 | 8;
    signal?: AbortSignal;
  },
): Promise<ContinuousVideoResult> {
  return apiPost<ContinuousVideoResult>("/api/llm/generate-continuous-video", {
    prompts,
    model: options?.model,
    aspectRatio: options?.aspectRatio,
    initialDurationSeconds: options?.initialDurationSeconds,
  }, { signal: options?.signal });
}

/**
 * Generate multiple videos sequentially using Veo.
 * Returns array of results (null for failed generations).
 */
export async function generateVideos(
  prompts: Array<{
    prompt: string;
    durationSeconds?: 5 | 6 | 7 | 8;
    aspectRatio?: "16:9" | "9:16";
    model?: string;
  }>,
  options?: { signal?: AbortSignal },
): Promise<(VideoGenerationResult | null)[]> {
  const result = await apiPost<{ videos: (VideoGenerationResult | null)[] }>(
    "/api/llm/generate-videos",
    {
      requests: prompts.map((p) => ({
        prompt: p.prompt,
        durationSeconds: p.durationSeconds,
        aspectRatio: p.aspectRatio,
        model: p.model,
      })),
    },
    { signal: options?.signal },
  );
  return result.videos;
}

/**
 * API-specific error with status and endpoint.
 */
export class APIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}
