/**
 * Video Generation Service — Veo (Gemini API video generation)
 *
 * Uses the Gemini API's dedicated generateVideos endpoint to produce
 * 7-8 second video clips from text prompts (and optional reference images).
 *
 * Supports:
 *   - Text-to-video: Generate a clip from a text prompt
 *   - Scene extension: Extend a previous Veo-generated video by ~7 seconds
 *     using the last ~1 second as grounding context
 *   - Image-to-video: Generate a clip grounded on a reference image
 *
 * Model: veo-3.0-generate-001
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
const DEFAULT_VIDEO_MODEL = "veo-3.0-generate-001";

export interface VideoGenerationRequest {
  prompt: string;
  model?: string;
  durationSeconds?: 5 | 6 | 7 | 8;
  aspectRatio?: "16:9" | "9:16";
  /** Optional reference image to guide the video */
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  /** Optional source video for scene extension (base64-encoded Veo-generated video).
   *  When provided, Veo uses the last ~1 second as grounding to extend by ~7 seconds.
   *  The response includes the merged video (original + extension). */
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
 * Timeout: 5 minutes (video generation can be slow).
 *
 * When `sourceVideoBase64` is provided, performs a scene extension:
 * Veo extracts the last ~1 second (24 frames) of the source video as seed
 * and generates ~7 seconds of continuation. The response is a merged video.
 */
export async function generateVideo(
  request: VideoGenerationRequest,
): Promise<VideoGenerationResponse> {
  const apiKey = getApiKey();
  const model = request.model ?? DEFAULT_VIDEO_MODEL;
  const url = `${GEMINI_BASE_URL}/models/${model}:predictLongRunning?key=${apiKey}`;

  const isExtension = !!request.sourceVideoBase64;

  // Build the instance — shape differs for extension vs fresh generation
  const instance: Record<string, unknown> = {
    prompt: request.prompt,
  };

  if (request.sourceVideoBase64) {
    // Scene extension: pass the source video for grounding
    instance.video = {
      bytesBase64Encoded: request.sourceVideoBase64,
      mimeType: request.sourceVideoMimeType ?? "video/mp4",
    };
  } else if (request.referenceImageBase64) {
    // Image-to-video: pass a reference image
    instance.image = {
      bytesBase64Encoded: request.referenceImageBase64,
      mimeType: request.referenceImageMimeType ?? "image/png",
    };
  }

  // Build the request body
  const body: Record<string, unknown> = {
    instances: [instance],
    parameters: {
      aspectRatio: request.aspectRatio ?? "16:9",
      // Duration only applies to fresh generation, not extensions
      ...(isExtension ? {} : { durationSeconds: request.durationSeconds ?? 8 }),
      sampleCount: 1,
    },
  };

  log.info(`Submitting video ${isExtension ? "extension" : "generation"} with ${model}`, {
    promptLength: request.prompt.length,
    duration: isExtension ? "extension (~7s)" : `${request.durationSeconds ?? 8}s`,
    hasSourceVideo: isExtension,
    hasReference: !!request.referenceImageBase64,
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
    log.error(`Video ${isExtension ? "extension" : "generation"} submission failed: ${submitResponse.status}`, { error: errorText });
    throw new Error(`Video ${isExtension ? "extension" : "generation"} failed (${submitResponse.status}): ${errorText}`);
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
    return parseVideoResponse(operation.response, model);
  }

  if (operation.error) {
    throw new Error(`Video ${isExtension ? "extension" : "generation"} error: ${operation.error.message}`);
  }

  // Poll for completion
  const operationName = operation.name;
  if (!operationName) {
    throw new Error("Video generation did not return an operation name");
  }

  log.info(`Polling video ${isExtension ? "extension" : "generation"} operation: ${operationName}`);

  const maxPollTime = 5 * 60 * 1000; // 5 minutes
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
      throw new Error(`Video ${isExtension ? "extension" : "generation"} failed: ${pollResult.error.message}`);
    }

    if (pollResult.done && pollResult.response) {
      log.info(`Video ${isExtension ? "extension" : "generation"} completed after ${Math.round((Date.now() - startTime) / 1000)}s`);
      return parseVideoResponse(pollResult.response, model, operationName);
    }

    log.info(`Video still ${isExtension ? "extending" : "generating"}... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
  }

  throw new Error(`Video ${isExtension ? "extension" : "generation"} timed out after 5 minutes`);
}

function parseVideoResponse(
  response: Record<string, unknown>,
  model: string,
  operationName?: string,
): VideoGenerationResponse {
  // The response format can vary — handle multiple shapes
  const videos: GeneratedVideo[] = [];

  // Shape 1: generateVideoResponse.generatedSamples
  const genResponse = response as {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string; encoding?: string } }>;
    };
    videos?: Array<{ video?: string; mimeType?: string }>;
  };

  if (genResponse.generateVideoResponse?.generatedSamples) {
    for (const sample of genResponse.generateVideoResponse.generatedSamples) {
      if (sample.video?.uri) {
        videos.push({
          videoBase64: sample.video.uri, // May need conversion from GCS URI
          mimeType: "video/mp4",
          durationSeconds: 8,
        });
      }
    }
  }

  // Shape 2: direct videos array
  if (genResponse.videos) {
    for (const v of genResponse.videos) {
      if (v.video) {
        videos.push({
          videoBase64: v.video,
          mimeType: v.mimeType ?? "video/mp4",
          durationSeconds: 8,
        });
      }
    }
  }

  return { videos, model, operationName };
}

/**
 * Generate a continuous video by chaining Veo scene extensions.
 *
 * Strategy for a ~22-second continuous video:
 *   1. Clip 1: Initial 8-second generation from the first prompt
 *   2. Clip 2: Extend clip 1 by ~7 seconds using the second prompt
 *      (Veo uses the last ~1 second of clip 1 as seed → returns merged ~15s video)
 *   3. Clip 3: Extend the merged clip by ~7 seconds using the third prompt
 *      (Veo uses the last ~1 second of merged clip → returns merged ~22s video)
 *
 * Each extension is sequential since it depends on the previous clip.
 * The final result includes both the merged video and individual clip data.
 *
 * @param prompts Array of 3 prompts (initial + 2 extension prompts)
 * @param options Common options for all clips
 * @returns The final merged video and per-clip metadata
 */
export async function generateContinuousVideo(
  prompts: string[],
  options?: {
    model?: string;
    aspectRatio?: "16:9" | "9:16";
    initialDurationSeconds?: 5 | 6 | 7 | 8;
    onClipProgress?: (clipIndex: number, status: "generating" | "extending" | "done" | "error", elapsedMs: number) => void;
  },
): Promise<{
  /** The final merged continuous video (all clips combined by Veo) */
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
  let currentVideoBase64: string | null = null;
  let totalDuration = 0;
  const startTime = Date.now();

  for (let i = 0; i < prompts.length; i++) {
    const isExtension = i > 0 && currentVideoBase64 !== null;
    const clipStart = Date.now();

    try {
      options?.onClipProgress?.(i, isExtension ? "extending" : "generating", Date.now() - startTime);

      log.info(`Continuous video: ${isExtension ? "extending" : "generating"} clip ${i + 1}/${prompts.length}`);

      const result = await generateVideo({
        prompt: prompts[i],
        model,
        aspectRatio: options?.aspectRatio ?? "16:9",
        // Only set duration for the initial clip
        ...(isExtension ? {} : { durationSeconds: options?.initialDurationSeconds ?? 8 }),
        // Pass the previous merged video for extension
        ...(isExtension && currentVideoBase64 ? {
          sourceVideoBase64: currentVideoBase64,
          sourceVideoMimeType: "video/mp4",
        } : {}),
      });

      const video = result.videos[0];
      if (video) {
        clips.push(video);
        currentVideoBase64 = video.videoBase64;
        // Extension: first clip ~8s, each extension adds ~7s
        totalDuration = isExtension ? totalDuration + 7 : (options?.initialDurationSeconds ?? 8);

        log.info(`Clip ${i + 1}/${prompts.length} complete (${Math.round((Date.now() - clipStart) / 1000)}s). Running total: ~${totalDuration}s`);
        options?.onClipProgress?.(i, "done", Date.now() - startTime);
      } else {
        log.warn(`Clip ${i + 1}/${prompts.length}: no video in response`);
        clips.push(null);
        options?.onClipProgress?.(i, "error", Date.now() - startTime);
        // If an intermediate clip fails, we can't extend further
        break;
      }
    } catch (err) {
      log.warn(`Clip ${i + 1}/${prompts.length} failed`, {
        error: err instanceof Error ? err.message : String(err),
      });
      clips.push(null);
      options?.onClipProgress?.(i, "error", Date.now() - startTime);
      // If an intermediate clip fails, we can't extend further
      break;
    }
  }

  // The last successful clip's video is the merged continuous video
  const lastSuccessful = [...clips].reverse().find((c) => c !== null) ?? null;

  log.info(`Continuous video complete: ${clips.filter(Boolean).length}/${prompts.length} clips, ~${totalDuration}s total`);

  return {
    mergedVideo: lastSuccessful,
    clips,
    totalDurationSeconds: totalDuration,
    model,
  };
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
