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

/**
 * General-purpose PATCH. Returns typed response body.
 */
export async function apiPatch<T>(
  endpoint: string,
  body: unknown,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "PATCH",
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

// ── Clip & Video Generation (Veo) ───────────────────────────────────
//
// Naming:
//   Clip  = single atomic Veo call (5-8 seconds)
//   Video = finished product (8-6-6-6 methodology, multiple clips + FFmpeg)

export interface ClipGenerationResult {
  videos: Array<{
    videoBase64: string;
    mimeType: string;
    durationSeconds: number;
  }>;
  model: string;
}

/** @deprecated Use ClipGenerationResult */
export type VideoGenerationResult = ClipGenerationResult;

/**
 * Generate a single Veo clip (the atomic building block).
 * Async operation — may take up to 8 minutes.
 *
 * Pass `sourceVideoBase64` to provide a previous clip as visual context —
 * Veo uses the last ~2 seconds for style/scene continuity grounding.
 */
export async function generateClip(
  prompt: string,
  options?: {
    durationSeconds?: 5 | 6 | 7 | 8;
    aspectRatio?: "16:9" | "9:16";
    model?: string;
    referenceImageBase64?: string;
    /** Base64-encoded previous Veo clip for visual grounding (last ~2s used as context) */
    sourceVideoBase64?: string;
    signal?: AbortSignal;
  },
): Promise<ClipGenerationResult> {
  return apiPost<ClipGenerationResult>("/api/llm/generate-clip", {
    prompt,
    durationSeconds: options?.durationSeconds,
    aspectRatio: options?.aspectRatio,
    model: options?.model,
    referenceImageBase64: options?.referenceImageBase64,
    sourceVideoBase64: options?.sourceVideoBase64,
  }, { signal: options?.signal });
}

/**
 * Generate a variable-length video using the 8-6-6 grounding methodology.
 *
 * Each 8s Veo clip overlaps 2s with the previous for visual continuity,
 * so each extension adds 6 unique seconds. Pass N prompts for
 * 8 + 6(N-1) unique seconds. Final clips are joined with FFmpeg.
 *
 * Examples: 2 prompts = 14s, 3 prompts = 20s, 4 prompts = 26s.
 */
export interface VideoResult {
  mergedVideo: { videoBase64: string; mimeType: string; durationSeconds: number } | null;
  clips: ({ videoBase64: string; mimeType: string; durationSeconds: number } | null)[];
  totalDurationSeconds: number;
  model: string;
}

/** @deprecated Use VideoResult */
export type ContinuousVideoResult = VideoResult;

export async function generateVideo(
  prompts: string[],
  options?: {
    model?: string;
    aspectRatio?: "16:9" | "9:16";
    initialDurationSeconds?: 5 | 6 | 7 | 8;
    signal?: AbortSignal;
  },
): Promise<VideoResult> {
  return apiPost<VideoResult>("/api/llm/generate-video", {
    prompts,
    model: options?.model,
    aspectRatio: options?.aspectRatio,
    initialDurationSeconds: options?.initialDurationSeconds,
  }, { signal: options?.signal });
}

// ── Video Concatenation (FFmpeg) ─────────────────────────────────────

export interface ConcatResult {
  videoBase64: string;
  mimeType: string;
  durationSeconds: number;
}

/**
 * Concatenate multiple video clips into a single video using server-side FFmpeg.
 * Used after generating individual Veo clips to produce the final continuous video.
 */
export async function concatenateVideos(
  clips: Array<{ videoBase64: string; mimeType?: string }>,
  options?: { signal?: AbortSignal },
): Promise<ConcatResult> {
  return apiPost<ConcatResult>("/api/llm/concat-videos", { clips }, options);
}

/**
 * Generate multiple clips sequentially using Veo.
 * Returns array of results (null for failed generations).
 */
export async function generateClips(
  prompts: Array<{
    prompt: string;
    durationSeconds?: 5 | 6 | 7 | 8;
    aspectRatio?: "16:9" | "9:16";
    model?: string;
  }>,
  options?: { signal?: AbortSignal },
): Promise<(ClipGenerationResult | null)[]> {
  const result = await apiPost<{ clips: (ClipGenerationResult | null)[] }>(
    "/api/llm/generate-clips",
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
  return result.clips;
}

// ── Video Run Persistence ────────────────────────────────────────────

export interface VideoRunSummary {
  id: string;
  flowId: string;
  runId: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  title: string | null;
  headline: string | null;
  league: string | null;
  clipCount: number;
  finalDurationSeconds: number | null;
  hasFinalVideo: boolean;
}

export interface VideoRunDetail extends VideoRunSummary {
  research: unknown;
  script: unknown;
  error: string | null;
  clips: Array<{ index: number; url: string; sizeMB: number }>;
  finalVideoUrl: string | null;
}

/** Create a new video run record */
export async function createVideoRun(flowId: string, runId: string): Promise<void> {
  await apiPost("/api/video-runs", { flowId, runId });
}

/** Update video run metadata */
export async function updateVideoRun(
  runId: string,
  data: {
    status?: string;
    research?: unknown;
    script?: unknown;
    clipCount?: number;
    finalDurationSeconds?: number;
    error?: string;
  },
): Promise<void> {
  await apiPatch(`/api/video-runs/${runId}`, data);
}

/** Save a clip video file to the server */
export async function saveVideoClip(runId: string, clipIndex: number, videoBase64: string): Promise<void> {
  await apiPost(`/api/video-runs/${runId}/clips/${clipIndex}`, { videoBase64 });
}

/** Save the combined final video to the server */
export async function saveVideoFinal(runId: string, videoBase64: string): Promise<void> {
  await apiPost(`/api/video-runs/${runId}/video`, { videoBase64 });
}

/** List past video runs */
export async function listVideoRuns(flowId?: string): Promise<VideoRunSummary[]> {
  const query = flowId ? `?flowId=${encodeURIComponent(flowId)}` : "";
  const result = await apiGet<{ runs: VideoRunSummary[] }>(`/api/video-runs${query}`);
  return result.runs;
}

/** Get full details for a video run */
export async function getVideoRun(runId: string): Promise<VideoRunDetail> {
  return apiGet<VideoRunDetail>(`/api/video-runs/${runId}`);
}

// ── Errors ───────────────────────────────────────────────────────────

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
