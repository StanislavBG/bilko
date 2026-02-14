/**
 * Clip & Video Generation Service — Veo (Gemini API)
 *
 * Naming convention:
 *   - Clip  = single atomic Veo call (5-8 seconds)
 *   - Video = finished product (multiple clips chained + FFmpeg concat)
 *
 * API:
 *   generateClip()   — Single Veo call. The atomic building block (5-8s).
 *   generateVideo()  — Variable-length video using the 8-6-6 grounding method.
 *                      Each 8s clip overlaps 2s with the previous for continuity,
 *                      yielding 6 unique seconds per extension. Pass N prompts
 *                      for 8 + 6(N-1) unique seconds. FFmpeg concat at the end.
 *   generateClips()  — Batch of independent single clips (sequential).
 *
 * Supports:
 *   - Text-to-clip: Generate a clip from a text prompt
 *   - Source-grounded: Pass a previous clip as context — Veo uses the
 *     last ~2 seconds as visual grounding for style/scene continuity
 *   - Image-to-clip: Generate a clip grounded on a reference image
 *
 * Model: veo-3.1-generate-preview
 */

import { createLogger } from "../logger";
import { MODEL_DEFAULTS } from "./index";

const log = createLogger("video-generation");

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// ── Veo predictLongRunning API contract ──────────────────────────────
// Endpoint: POST /v1beta/models/{model}:predictLongRunning
// Model:    veo-3.1-generate-preview
//
// These typed interfaces enforce the exact parameter shape accepted by
// the API. Any unsupported parameter will cause a compile-time error
// instead of a runtime 400 INVALID_ARGUMENT.
// ─────────────────────────────────────────────────────────────────────

/** Parameters accepted by the Veo predictLongRunning endpoint. */
interface VeoPredictParameters {
  aspectRatio: "16:9" | "9:16";
  durationSeconds: number;
  /** Only valid for source-grounded extensions (720p required by Veo 3.1 extend). */
  resolution?: "720p";
}

/** Inline media payload (video or image) for Veo instance inputs. */
interface VeoInlineMedia {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

/** A single generation instance sent to the Veo API. */
interface VeoPredictInstance {
  prompt: string;
  video?: VeoInlineMedia;
  image?: VeoInlineMedia;
}

/** Full request body for the predictLongRunning endpoint. */
interface VeoPredictRequestBody {
  instances: VeoPredictInstance[];
  parameters: VeoPredictParameters;
}

export interface ClipGenerationRequest {
  prompt: string;
  model?: string;
  durationSeconds?: 5 | 6 | 7 | 8;
  aspectRatio?: "16:9" | "9:16";
  /** Optional reference image to guide the clip */
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  /** Optional source video for grounding (base64-encoded previous Veo clip).
   *  When provided, Veo uses the last ~2 seconds as visual context for
   *  style/scene continuity. The response is a NEW standalone clip (not merged). */
  sourceVideoBase64?: string;
  sourceVideoMimeType?: string;
}

export interface GeneratedClip {
  videoBase64: string;
  mimeType: string;
  durationSeconds: number;
}

export interface ClipGenerationResponse {
  videos: GeneratedClip[];
  model: string;
  operationName?: string;
}

/** @deprecated Use ClipGenerationRequest */
export type VideoGenerationRequest = ClipGenerationRequest;
/** @deprecated Use GeneratedClip */
export type GeneratedVideo = GeneratedClip;
/** @deprecated Use ClipGenerationResponse */
export type VideoGenerationResponse = ClipGenerationResponse;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return key;
}

/**
 * Generate a single Veo clip (the atomic building block).
 *
 * Returns the generated clip as base64-encoded data.
 * Timeout: 8 minutes (Veo can be slow for complex scenes).
 *
 * When `sourceVideoBase64` is provided, Veo uses the last ~2 seconds
 * of the source clip as visual grounding for scene/style continuity.
 * The response is a NEW standalone clip (not merged with the source).
 */
export async function generateClip(
  request: ClipGenerationRequest,
): Promise<ClipGenerationResponse> {
  const apiKey = getApiKey();
  const hasSource = !!request.sourceVideoBase64;
  const hasReference = !!request.referenceImageBase64;
  const durationSec = request.durationSeconds ?? 8;

  const model = request.model ?? MODEL_DEFAULTS.video;

  // Use the predictLongRunning REST endpoint (Gemini API).
  // The SDK method is called generateVideos, but the REST path is predictLongRunning.
  const url = `${GEMINI_BASE_URL}/models/${model}:predictLongRunning?key=${apiKey}`;

  // Build the instance — use inlineData format for video/image inputs
  const instance: VeoPredictInstance = {
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
    // Image-to-clip: pass a reference image
    instance.image = {
      inlineData: {
        mimeType: request.referenceImageMimeType ?? "image/png",
        data: request.referenceImageBase64,
      },
    };
  }

  // Build the request body — typed to VeoPredictRequestBody so any
  // unsupported parameter is a compile-time error, not a runtime 400.
  const body: VeoPredictRequestBody = {
    instances: [instance],
    parameters: {
      aspectRatio: request.aspectRatio ?? "16:9",
      durationSeconds: durationSec,
      ...(hasSource ? { resolution: "720p" as const } : {}),
    },
  };

  log.info(`Submitting clip ${hasSource ? "source-grounded" : "fresh"} generation with ${model}`, {
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
    log.error(`Clip ${hasSource ? "extension" : "generation"} submission failed: ${submitResponse.status}`, { error: errorText });
    throw new Error(`Clip ${hasSource ? "extension" : "generation"} failed (${submitResponse.status}): ${errorText}`);
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
    return await parseClipResponse(operation.response, model);
  }

  if (operation.error) {
    throw new Error(`Clip ${hasSource ? "extension" : "generation"} error: ${operation.error.message}`);
  }

  // Poll for completion
  const operationName = operation.name;
  if (!operationName) {
    throw new Error("Clip generation did not return an operation name");
  }

  log.info(`Polling clip ${hasSource ? "extension" : "generation"} operation: ${operationName}`);

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
      throw new Error(`Clip ${hasSource ? "extension" : "generation"} failed: ${pollResult.error.message}`);
    }

    if (pollResult.done && pollResult.response) {
      log.info(`Clip ${hasSource ? "extension" : "generation"} completed after ${Math.round((Date.now() - startTime) / 1000)}s`);
      return await parseClipResponse(pollResult.response, model, operationName);
    }

    log.info(`Clip still ${hasSource ? "extending" : "generating"}... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
  }

  throw new Error(`Clip ${hasSource ? "extension" : "generation"} timed out after 8 minutes`);
}

/**
 * Download video content from a Gemini API file URI.
 * The URI requires the API key appended as a query parameter to authorize the download.
 */
async function downloadVideoFromUri(uri: string, apiKey: string): Promise<string> {
  const separator = uri.includes("?") ? "&" : "?";
  const downloadUrl = `${uri}${separator}key=${apiKey}&alt=media`;

  log.info(`Downloading clip from URI: ${uri.substring(0, 100)}...`);

  const response = await fetch(downloadUrl, {
    method: "GET",
    signal: AbortSignal.timeout(120_000), // 2 min download timeout
    redirect: "follow",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    log.error(`Clip download failed: ${response.status}`, { error: errorText, uri });
    throw new Error(`Failed to download clip (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  log.info(`Clip downloaded: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB (${base64.length} chars base64)`);

  return base64;
}

async function parseClipResponse(
  response: Record<string, unknown>,
  model: string,
  operationName?: string,
): Promise<ClipGenerationResponse> {
  const videos: GeneratedClip[] = [];
  const apiKey = getApiKey();

  // Log response shape for debugging
  const responseKeys = Object.keys(response);
  log.info(`Parsing clip response. Top-level keys: [${responseKeys.join(", ")}]`);

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
          log.error(`Failed to download clip from URI`, {
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
          log.error(`Failed to download clip from GCS URI`, {
            uri: v.gcsUri.substring(0, 100),
            error: downloadErr instanceof Error ? downloadErr.message : String(downloadErr),
          });
        }
      }
    }
  }

  if (videos.length === 0) {
    // Check for RAI (Responsible AI) content filtering in the response
    const raiCount = (genResponse as Record<string, unknown>).generateVideoResponse
      ? ((genResponse.generateVideoResponse as Record<string, unknown>).raiMediaFilteredCount as number | undefined)
      : undefined;
    const raiReasons = (genResponse as Record<string, unknown>).generateVideoResponse
      ? ((genResponse.generateVideoResponse as Record<string, unknown>).raiMediaFilteredReasons as string[] | undefined)
      : undefined;

    const snippet = JSON.stringify(response).substring(0, 500);

    if (raiCount && raiCount > 0) {
      const reasons = raiReasons?.length ? raiReasons.join(", ") : "unspecified safety filter";
      log.error(`Veo content filtered by safety policy (${raiCount} sample(s)): ${reasons}`, { snippet });
      throw new Error(`Veo rejected the prompt due to content safety filters: ${reasons}. Try rephrasing the visual description to avoid references to real people, violence, or copyrighted content.`);
    }

    // Check if generatedSamples existed but had no downloadable URIs
    const samples = genResponse.generateVideoResponse?.generatedSamples;
    if (samples && samples.length > 0) {
      log.error(`Veo returned ${samples.length} sample(s) but none had downloadable video URIs`, { snippet });
      throw new Error(`Veo returned ${samples.length} sample(s) but video download failed for all of them. The Gemini API file URIs may be temporarily unavailable.`);
    }

    log.error(`No clips parsed from Veo response. Keys: [${responseKeys.join(", ")}]. Snippet: ${snippet}`);
    throw new Error(`Veo returned no video data. Response keys: [${responseKeys.join(", ")}]. The model may be unavailable or the response format was unrecognized.`);
  }

  log.info(`Parsed ${videos.length} clip(s) successfully`);

  return { videos, model, operationName };
}

/**
 * Generate a full video of any length using the 8-6-6 grounding methodology.
 *
 * **How it works:**
 *   - Each Veo call generates an 8-second clip
 *   - The last 2 seconds of each clip are used as visual grounding for
 *     the next clip, providing style/scene continuity
 *   - So each extension clip adds 6 UNIQUE seconds (8s total minus 2s overlap)
 *   - Final clips are joined with FFmpeg concat demuxer
 *
 * **Duration formula:**
 *   Unique seconds = 8 + 6 × (N - 1)   where N = number of clips
 *   - 1 clip  =  8s unique
 *   - 2 clips = 14s unique (8 + 6)
 *   - 3 clips = 20s unique (8 + 6 + 6)
 *   - 4 clips = 26s unique (8 + 6 + 6 + 6)
 *   - 5 clips = 32s unique (8 + 6 + 6 + 6 + 6)
 *
 * The number of clips is determined by the number of prompts you pass.
 * This is NOT a fixed format — use as many clips as needed for your
 * target duration.
 *
 * @param prompts One prompt per clip. Length determines video duration.
 * @param options Common options for all clips
 * @returns The concatenated video and per-clip metadata
 */
export async function generateVideo(
  prompts: string[],
  options?: {
    model?: string;
    aspectRatio?: "16:9" | "9:16";
    initialDurationSeconds?: 5 | 6 | 7 | 8;
    extensionDurationSeconds?: 5 | 6 | 7 | 8;
    onClipProgress?: (clipIndex: number, status: "generating" | "extending" | "done" | "error", elapsedMs: number) => void;
  },
): Promise<{
  /** The final concatenated video (all clips joined by FFmpeg) */
  mergedVideo: GeneratedClip | null;
  /** Per-clip results (null for failed clips) */
  clips: (GeneratedClip | null)[];
  /** Total duration in seconds */
  totalDurationSeconds: number;
  model: string;
}> {
  if (prompts.length === 0) {
    throw new Error("At least one prompt is required");
  }

  const model = options?.model ?? MODEL_DEFAULTS.video;
  const clips: (GeneratedClip | null)[] = [];
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

      log.info(`Video [8-6-6-6]: ${hasSource ? "source-grounded" : "fresh"} clip ${i + 1}/${prompts.length} (${clipDuration}s)`);

      const result = await generateClip({
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
  const successfulClips = clips.filter((c): c is GeneratedClip => c !== null);

  if (successfulClips.length === 0) {
    log.info("No clips generated — skipping concatenation");
    return { mergedVideo: null, clips, totalDurationSeconds: 0, model };
  }

  let mergedVideo: GeneratedClip | null = null;
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

  log.info(`Video complete: ${successfulClips.length}/${prompts.length} clips, ~${totalDuration}s total`);

  return { mergedVideo, clips, totalDurationSeconds: totalDuration, model };
}

/**
 * Generate multiple clips sequentially (to avoid rate limits).
 * Returns results in the same order as the requests.
 * Failed generations return null.
 */
export async function generateClips(
  requests: ClipGenerationRequest[],
): Promise<(ClipGenerationResponse | null)[]> {
  log.info(`Generating ${requests.length} clips sequentially`);
  const results: (ClipGenerationResponse | null)[] = [];

  for (let i = 0; i < requests.length; i++) {
    try {
      log.info(`Starting clip ${i + 1}/${requests.length}`);
      const result = await generateClip(requests[i]);
      results.push(result);
    } catch (err) {
      log.warn(`Clip ${i + 1}/${requests.length} failed`, {
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
