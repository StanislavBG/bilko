/**
 * API Client — Typed wrappers for backend API calls.
 *
 * General-purpose `apiPost<T>()` and `apiGet<T>()` for any endpoint,
 * plus domain-specific helpers like `validateVideos()`.
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
  } catch {
    // Validation is best-effort; return unvalidated on failure
    return videos;
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
