/**
 * Video Generation Service — Veo (Gemini API video generation)
 *
 * Uses the Gemini API's dedicated generateVideos endpoint to produce
 * 5-8 second video clips from text prompts (and optional source videos).
 *
 * Supports:
 *   - Text-to-video: Generate a clip from a text prompt
 *   - Source-grounded: Pass a previous clip as context — Veo uses the
 *     last ~2 seconds as visual grounding for style/scene continuity
 *   - Image-to-video: Generate a clip grounded on a reference image
 *
 * Each Veo call produces a standalone clip (max 8s). To build longer
 * videos (e.g. ~20s), generate multiple clips sequentially and
 * concatenate them server-side with FFmpeg (see video-concat.ts).
 *
 * Model: veo-3.1-generate-preview
 *
 * Unlike image generation, video generation is an async operation
 * that requires polling. This service handles the full lifecycle:
 * 1. Submit the generation request
 * 2. Poll until the operation completes
 * 3. Return the generated video data
 */

import { createLogger } from "../logger";

const log = createLogger("video-generation");

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_VIDEO_MODEL = "veo-3.1-generate-preview";
/** Video extension (source-grounded) also uses Veo 3.1 */
const EXTENSION_VIDEO_MODEL = "veo-3.1-generate-preview";

export interface VideoGenerationRequest {
  prompt: string;
  model?: string;
  durationSeconds?: 5 | 6 | 7 | 8;
  aspectRatio?: "16:9" | "9:16";
  /** Optional reference image to guide the video */
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  /** Optional source video for grounding (base64-encoded previous Veo clip).
   *  When provided, Veo uses the last ~2 seconds as visual context for
   *  style/scene continuity. The response is a NEW standalone clip (not merged). */
  sourceVideoBase64?: string;
  sourceVideoMimeType?: string;
}

export interface GeneratedVideo {
  videoBase64: string;
  mimeType: string;
  durationSeconds: number;
}

export interface VideoGenerationResponse {
  videos: GeneratedVideo[];
  model: string;
  operationName?: string;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return key;
}

/**
 * Submit a video generation request to Veo and poll until complete.
 *
 * Returns the generated video(s) as base64-encoded data.
 * Timeout: 8 minutes (video generation can be slow).
 *
 * When `sourceVideoBase64` is provided, Veo uses the last ~2 seconds
 * of the source clip as visual grounding for scene/style continuity.
 * The response is a NEW standalone clip (not merged with the source).
 */
export async function generateVideo(
  request: VideoGenerationRequest,
): Promise<VideoGenerationResponse> {
  const apiKey = getApiKey();
  const hasSource = !!request.sourceVideoBase64;
  const hasReference = !!request.referenceImageBase64;
  const durationSec = request.durationSeconds ?? 8;

  // Video extension requires Veo 3.1 — auto-upgrade when source video is provided
  const model = hasSource
    ? (request.model ?? EXTENSION_VIDEO_MODEL)
    : (request.model ?? DEFAULT_VIDEO_MODEL);

  // Use the generateVideos endpoint (Gemini API) with inlineData format.
  // The older predictLongRunning endpoint uses bytesBase64Encoded which is
  // not supported for video/image inputs on current models.
  const url = `${GEMINI_BASE_URL}/models/${model}:generateVideos?key=${apiKey}`;

  // Build the instance — use inlineData format for video/image inputs
  const instance: Record<string, unknown> = {
    prompt: request.prompt,
  };

  if (request.sourceVideoBase64) {
    // Source-grounded: pass previous clip for visual grounding (last ~2s used as context)
    instance.video = {
      inlineData: {
        mimeType: request.sourceVideoMimeType ?? "video/mp4",
        data: request.sourceVideoBase64,
      },
    };
  } else if (request.referenceImageBase64) {
    // Image-to-video: pass a reference image
    instance.image = {
      inlineData: {
        mimeType: request.referenceImageMimeType ?? "image/png",
        data: request.referenceImageBase64,
      },
    };
  }

  // Build the request body
  const body: Record<string, unknown> = {
    instances: [instance],
    parameters: {
      aspectRatio: request.aspectRatio ?? "16:9",
      durationSeconds: durationSec,
      numberOfVideos: 1,
      ...(hasSource ? { resolution: "720p" } : {}),
    },
  };

  log.info(`Submitting video ${hasSource ? "source-grounded" : "fresh"} generation with ${model}`, {
    promptLength: request.prompt.length,
    durationSeconds: durationSec,
    hasSourceVideo: hasSource,
    hasReference,
  });

  // Submit the generation request
  const submitResponse = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    log.error(`Video ${hasSource ? "extension" : "generation"} submission failed: ${submitResponse.status}`, { error: errorText });
    throw new Error(`Video ${hasSource ? "extension" : "generation"} failed (${submitResponse.status}): ${errorText}`);
  }

  const operation = (await submitResponse.json()) as {
    name?: string;
    done?: boolean;
    response?: {
      generateVideoResponse?: {
        generatedSamples?: Array<{
          video?: {
            uri?: string;
            encoding?: string;
          };
        }>;
      };
      videos?: Array<{
        gcsUri?: string;
        mimeType?: string;
        video?: string;
      }>;
    };
    error?: { message: string; code: number };
  };

  // If immediately done (unlikely for video)
  if (operation.done && operation.response) {
    return await parseVideoResponse(operation.response, model);
  }

  if (operation.error) {
    throw new Error(`Video ${hasSource ? "extension" : "generation"} error: ${operation.error.message}`);
  }

  // Poll for completion
  const operationName = operation.name;
  if (!operationName) {
    throw new Error("Video generation did not return an operation name");
  }

  log.info(`Polling video ${hasSource ? "extension" : "generation"} operation: ${operationName}`);

  const maxPollTime = 8 * 60 * 1000; // 8 minutes (Veo can be slow for complex scenes)
  const pollInterval = 10_000; // 10 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollTime) {
    await sleep(pollInterval);

    const pollUrl = `${GEMINI_BASE_URL}/${operationName}?key=${apiKey}`;
    const pollResponse = await fetch(pollUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!pollResponse.ok) {
      log.warn(`Poll failed with status ${pollResponse.status}, retrying...`);
      continue;
    }

    const pollResult = (await pollResponse.json()) as typeof operation;

    if (pollResult.error) {
      throw new Error(`Video ${hasSource ? "extension" : "generation"} failed: ${pollResult.error.message}`);
    }

    if (pollResult.done && pollResult.response) {
      log.info(`Video ${hasSource ? "extension" : "generation"} completed after ${Math.round((Date.now() - startTime) / 1000)}s`);
      return await parseVideoResponse(pollResult.response, model, operationName);
    }

    log.info(`Video still ${hasSource ? "extending" : "generating"}... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
  }

  throw new Error(`Video ${hasSource ? "extension" : "generation"} timed out after 8 minutes`);
}

/**
 * Download video content from a Gemini API file URI.
 * The URI requires the API key appended as a query parameter to authorize the download.
 */
async function downloadVideoFromUri(uri: string, apiKey: string): Promise<string> {
  const separator = uri.includes("?") ? "&" : "?";
  const downloadUrl = `${uri}${separator}key=${apiKey}&alt=media`;

  log.info(`Downloading video from URI: ${uri.substring(0, 100)}...`);

  const response = await fetch(downloadUrl, {
    method: "GET",
    signal: AbortSignal.timeout(120_000), // 2 min download timeout
    redirect: "follow",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    log.error(`Video download failed: ${response.status}`, { error: errorText, uri });
    throw new Error(`Failed to download video (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  log.info(`Video downloaded: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB (${base64.length} chars base64)`);

  return base64;
}

async function parseVideoResponse(
  response: Record<string, unknown>,
  model: string,
  operationName?: string,
): Promise<VideoGenerationResponse> {
  const videos: GeneratedVideo[] = [];
  const apiKey = getApiKey();

  // Log response shape for debugging
  const responseKeys = Object.keys(response);
  log.info(`Parsing video response. Top-level keys: [${responseKeys.join(", ")}]`);

  const genResponse = response as {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string; encoding?: string } }>;
    };
    videos?: Array<{ video?: string; mimeType?: string; gcsUri?: string }>;
  };

  // Shape 1: generateVideoResponse.generatedSamples (Gemini API)
  // The API returns a download URI — we must fetch the actual video bytes.
  if (genResponse.generateVideoResponse?.generatedSamples) {
    const samples = genResponse.generateVideoResponse.generatedSamples;
    log.info(`Response shape: generateVideoResponse with ${samples.length} sample(s)`);
    for (const sample of samples) {
      if (sample.video?.uri) {
        try {
          const videoBase64 = await downloadVideoFromUri(sample.video.uri, apiKey);
          videos.push({
            videoBase64,
            mimeType: "video/mp4",
            durationSeconds: 8,
          });
        } catch (downloadErr) {
          log.error(`Failed to download video from URI`, {
            uri: sample.video.uri.substring(0, 100),
            error: downloadErr instanceof Error ? downloadErr.message : String(downloadErr),
          });
        }
      }
    }
  }

  // Shape 2: direct videos array (may contain inline base64 or GCS URIs)
  if (genResponse.videos) {
    log.info(`Response shape: videos array with ${genResponse.videos.length} entry/entries`);
    for (const v of genResponse.videos) {
      if (v.video) {
        // Inline base64 data
        videos.push({
          videoBase64: v.video,
          mimeType: v.mimeType ?? "video/mp4",
          durationSeconds: 8,
        });
      } else if (v.gcsUri) {
        // GCS/download URI — fetch the actual video
        try {
          const videoBase64 = await downloadVideoFromUri(v.gcsUri, apiKey);
          videos.push({
            videoBase64,
            mimeType: v.mimeType ?? "video/mp4",
            durationSeconds: 8,
          });
        } catch (downloadErr) {
          log.error(`Failed to download video from GCS URI`, {
            uri: v.gcsUri.substring(0, 100),
            error: downloadErr instanceof Error ? downloadErr.message : String(downloadErr),
          });
        }
      }
    }
  }

  if (videos.length === 0) {
    log.warn(`No videos parsed from response. Keys: [${responseKeys.join(", ")}]. Snippet: ${JSON.stringify(response).substring(0, 500)}`);
  } else {
    log.info(`Parsed ${videos.length} video(s) successfully`);
  }

  return { videos, model, operationName };
}

/**
 * Generate a continuous video by chaining Veo clips + FFmpeg concatenation.
 *
 * Strategy for a ~20-second continuous video:
 *   1. Clip 1: Generate initial 8-second clip from the first prompt
 *   2. Clip 2: Generate 6-second clip using clip 1 as source context
 *      (Veo uses the last ~2 seconds for visual grounding)
 *   3. Clip 3: Generate 6-second clip using clip 2 as source context
 *   4. Concatenate: FFmpeg concat demuxer joins the 3 individual clips
 *
 * Each Veo call returns a standalone clip. The final ~20s video
 * is assembled by concatenation, not by Veo merging.
 *
 * @param prompts Array of 3 prompts (initial + 2 grounded prompts)
 * @param options Common options for all clips
 * @returns The concatenated video and per-clip metadata
 */
export async function generateContinuousVideo(
  prompts: string[],
  options?: {
    model?: string;
    aspectRatio?: "16:9" | "9:16";
    initialDurationSeconds?: 5 | 6 | 7 | 8;
    extensionDurationSeconds?: 5 | 6 | 7 | 8;
    onClipProgress?: (clipIndex: number, status: "generating" | "extending" | "done" | "error", elapsedMs: number) => void;
  },
): Promise<{
  /** The final concatenated continuous video (all clips joined by FFmpeg) */
  mergedVideo: GeneratedVideo | null;
  /** Per-clip results (null for failed clips) */
  clips: (GeneratedVideo | null)[];
  /** Total duration in seconds */
  totalDurationSeconds: number;
  model: string;
}> {
  if (prompts.length === 0) {
    throw new Error("At least one prompt is required");
  }

  const model = options?.model ?? DEFAULT_VIDEO_MODEL;
  const clips: (GeneratedVideo | null)[] = [];
  let previousClipBase64: string | null = null;
  const startTime = Date.now();

  for (let i = 0; i < prompts.length; i++) {
    const isFirst = i === 0;
    const hasSource = !isFirst && previousClipBase64 !== null;
    const clipDuration = isFirst
      ? (options?.initialDurationSeconds ?? 8)
      : (options?.extensionDurationSeconds ?? 6);
    const clipStart = Date.now();

    try {
      options?.onClipProgress?.(i, hasSource ? "extending" : "generating", Date.now() - startTime);

      log.info(`Continuous video: ${hasSource ? "source-grounded" : "fresh"} clip ${i + 1}/${prompts.length} (${clipDuration}s)`);

      const result = await generateVideo({
        prompt: prompts[i],
        model,
        aspectRatio: options?.aspectRatio ?? "16:9",
        durationSeconds: clipDuration,
        ...(hasSource && previousClipBase64 ? {
          sourceVideoBase64: previousClipBase64,
          sourceVideoMimeType: "video/mp4",
        } : {}),
      });

      const video = result.videos[0];
      if (video) {
        clips.push(video);
        previousClipBase64 = video.videoBase64;

        log.info(`Clip ${i + 1}/${prompts.length} complete (${Math.round((Date.now() - clipStart) / 1000)}s elapsed)`);
        options?.onClipProgress?.(i, "done", Date.now() - startTime);
      } else {
        log.warn(`Clip ${i + 1}/${prompts.length}: no video in response`);
        clips.push(null);
        options?.onClipProgress?.(i, "error", Date.now() - startTime);
        break;
      }
    } catch (err) {
      log.warn(`Clip ${i + 1}/${prompts.length} failed`, {
        error: err instanceof Error ? err.message : String(err),
      });
      clips.push(null);
      options?.onClipProgress?.(i, "error", Date.now() - startTime);
      break;
    }
  }

  // Concatenate all successful clips with FFmpeg
  const successfulClips = clips.filter((c): c is GeneratedVideo => c !== null);

  if (successfulClips.length === 0) {
    log.info("No clips generated — skipping concatenation");
    return { mergedVideo: null, clips, totalDurationSeconds: 0, model };
  }

  let mergedVideo: GeneratedVideo | null = null;
  let totalDuration = 0;

  if (successfulClips.length === 1) {
    // Single clip — no concat needed
    mergedVideo = successfulClips[0];
    totalDuration = mergedVideo.durationSeconds;
  } else {
    // Concatenate with FFmpeg
    try {
      const { concatenateVideos } = await import("./video-concat");
      const concatResult = await concatenateVideos(successfulClips);
      mergedVideo = {
        videoBase64: concatResult.videoBase64,
        mimeType: concatResult.mimeType,
        durationSeconds: concatResult.durationSeconds,
      };
      totalDuration = concatResult.durationSeconds;
      log.info(`Concatenated ${successfulClips.length} clips → ~${totalDuration}s`);
    } catch (concatErr) {
      log.error("FFmpeg concatenation failed, returning last clip as fallback", {
        error: concatErr instanceof Error ? concatErr.message : String(concatErr),
      });
      mergedVideo = successfulClips[successfulClips.length - 1];
      totalDuration = successfulClips.reduce((sum, c) => sum + c.durationSeconds, 0);
    }
  }

  log.info(`Continuous video complete: ${successfulClips.length}/${prompts.length} clips, ~${totalDuration}s total`);

  return { mergedVideo, clips, totalDurationSeconds: totalDuration, model };
}

/**
 * Generate multiple videos sequentially (to avoid rate limits).
 * Returns results in the same order as the requests.
 * Failed generations return null.
 */
export async function generateVideos(
  requests: VideoGenerationRequest[],
): Promise<(VideoGenerationResponse | null)[]> {
  log.info(`Generating ${requests.length} videos sequentially`);
  const results: (VideoGenerationResponse | null)[] = [];

  for (let i = 0; i < requests.length; i++) {
    try {
      log.info(`Starting video ${i + 1}/${requests.length}`);
      const result = await generateVideo(requests[i]);
      results.push(result);
    } catch (err) {
      log.warn(`Video ${i + 1}/${requests.length} failed`, {
        error: err instanceof Error ? err.message : String(err),
      });
      results.push(null);
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
