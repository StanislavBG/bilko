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
