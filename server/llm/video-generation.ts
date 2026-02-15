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
 * Uses the @google/genai SDK for the entire flow (generation → polling → download)
 * which handles authentication internally and avoids the 403 "project mismatch"
 * errors that occur with manual REST + query-param auth.
 *
 * Model: veo-3.1-generate-preview
 */

import { GoogleGenAI, type GenerateVideosOperation } from "@google/genai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createLogger } from "../logger";
import { MODEL_DEFAULTS } from "./index";

const log = createLogger("video-generation");

export interface ClipGenerationRequest {
  prompt: string;
  model?: string;
  durationSeconds?: 4 | 5 | 6 | 7 | 8;
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

/** Lazily-created SDK client (reused across calls). */
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: getApiKey() });
  }
  return _ai;
}

/**
 * Generate a single Veo clip (the atomic building block).
 *
 * Uses the @google/genai SDK for the entire flow:
 *   1. ai.models.generateVideos() — submit generation
 *   2. ai.operations.getVideosOperation() — poll for completion
 *   3. ai.files.download() — download the generated video
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
  const ai = getAI();
  const hasSource = !!request.sourceVideoBase64;
  const hasReference = !!request.referenceImageBase64;
  // Veo API accepts integer durationSeconds in [4, 8]. Clamp and round to
  // guarantee we never send an out-of-range value.
  const rawDuration = request.durationSeconds ?? 8;
  const durationSec = Math.round(Math.max(4, Math.min(8, rawDuration)));
  const model = request.model ?? MODEL_DEFAULTS.video;

  if (rawDuration !== durationSec) {
    log.warn(`durationSeconds clamped: requested ${rawDuration} → sending ${durationSec}`);
  }

  log.info(`Submitting clip ${hasSource ? "source-grounded" : "fresh"} generation with ${model}`, {
    promptLength: request.prompt.length,
    durationSeconds: durationSec,
    hasSourceVideo: hasSource,
    hasReference,
  });

  // ── Step 1: Submit generation via SDK ──────────────────────────────
  let operation: GenerateVideosOperation;
  try {
    operation = await ai.models.generateVideos({
      model,
      prompt: request.prompt,
      // Source-grounded: pass previous clip for visual grounding
      ...(request.sourceVideoBase64 ? {
        video: {
          videoBytes: request.sourceVideoBase64,
          mimeType: request.sourceVideoMimeType ?? "video/mp4",
        },
      } : {}),
      // Image-to-clip: pass a reference image
      ...(!request.sourceVideoBase64 && request.referenceImageBase64 ? {
        image: {
          imageBytes: request.referenceImageBase64,
          mimeType: request.referenceImageMimeType ?? "image/png",
        },
      } : {}),
      config: {
        aspectRatio: request.aspectRatio ?? "16:9",
        durationSeconds: durationSec,
        numberOfVideos: 1,
        ...(hasSource ? { resolution: "720p" } : {}),
      },
    });
  } catch (submitErr) {
    log.error(`Clip ${hasSource ? "extension" : "generation"} submission failed`, {
      error: submitErr instanceof Error ? submitErr.message : String(submitErr),
    });
    throw new Error(`Clip ${hasSource ? "extension" : "generation"} submission failed: ${submitErr instanceof Error ? submitErr.message : String(submitErr)}`);
  }

  // ── Step 2: Poll for completion ────────────────────────────────────
  const maxPollTime = 8 * 60 * 1000; // 8 minutes
  const pollInterval = 10_000; // 10 seconds
  const startTime = Date.now();

  log.info(`Polling clip ${hasSource ? "extension" : "generation"} operation: ${operation.name ?? "unknown"}`);

  while (!operation.done) {
    if (Date.now() - startTime > maxPollTime) {
      throw new Error(`Clip ${hasSource ? "extension" : "generation"} timed out after 8 minutes`);
    }

    await sleep(pollInterval);

    try {
      operation = await ai.operations.getVideosOperation({ operation });
    } catch (pollErr) {
      log.warn(`Poll attempt failed, retrying...`, {
        error: pollErr instanceof Error ? pollErr.message : String(pollErr),
      });
      continue;
    }

    log.info(`Clip still ${hasSource ? "extending" : "generating"}... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
  }

  // Check for operation-level error
  if (operation.error) {
    const errMsg = JSON.stringify(operation.error);
    log.error(`Clip ${hasSource ? "extension" : "generation"} operation failed`, { error: errMsg });
    throw new Error(`Clip ${hasSource ? "extension" : "generation"} failed: ${errMsg}`);
  }

  log.info(`Clip ${hasSource ? "extension" : "generation"} completed after ${Math.round((Date.now() - startTime) / 1000)}s`);

  // ── Step 3: Extract and download videos ────────────────────────────
  const response = operation.response;
  if (!response) {
    throw new Error("Veo operation completed but returned no response");
  }

  // Check for RAI content filtering
  if (response.raiMediaFilteredCount && response.raiMediaFilteredCount > 0) {
    const reasons = response.raiMediaFilteredReasons?.length
      ? response.raiMediaFilteredReasons.join(", ")
      : "unspecified safety filter";
    log.error(`Veo content filtered by safety policy (${response.raiMediaFilteredCount} sample(s)): ${reasons}`);
    throw new Error(`Veo rejected the prompt due to content safety filters: ${reasons}. Try rephrasing the visual description to avoid references to real people, violence, or copyrighted content.`);
  }

  const generatedVideos = response.generatedVideos;
  if (!generatedVideos || generatedVideos.length === 0) {
    log.error("Veo returned no generated videos", {
      response: JSON.stringify(response).substring(0, 500),
    });
    throw new Error("Veo returned no video data. The model may be unavailable or the prompt was filtered.");
  }

  log.info(`Veo returned ${generatedVideos.length} video(s). Downloading...`);

  const clips: GeneratedClip[] = [];

  for (let i = 0; i < generatedVideos.length; i++) {
    const genVideo = generatedVideos[i];
    const videoUri = genVideo.video?.uri;

    log.info(`Video ${i + 1}/${generatedVideos.length}: URI = ${videoUri ?? "none"}`);

    try {
      // Primary: SDK download (handles auth internally)
      const base64 = await downloadWithSdk(ai, genVideo, i);
      clips.push({
        videoBase64: base64,
        mimeType: "video/mp4",
        durationSeconds: durationSec,
      });
    } catch (sdkErr) {
      log.warn(`SDK download failed for video ${i + 1}`, {
        error: sdkErr instanceof Error ? sdkErr.message : String(sdkErr),
      });

      // Fallback: manual fetch with header auth
      if (videoUri) {
        try {
          const base64 = await downloadWithFetch(videoUri, getApiKey());
          clips.push({
            videoBase64: base64,
            mimeType: "video/mp4",
            durationSeconds: durationSec,
          });
        } catch (fetchErr) {
          log.error(`Fallback fetch also failed for video ${i + 1}`, {
            error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
          });
        }
      }
    }
  }

  if (clips.length === 0) {
    throw new Error(`Veo returned ${generatedVideos.length} video(s) but all downloads failed. Check server logs for details.`);
  }

  log.info(`Successfully downloaded ${clips.length}/${generatedVideos.length} clip(s)`);

  return { videos: clips, model, operationName: operation.name };
}

// ── Download helpers ─────────────────────────────────────────────────

/**
 * Download a generated video using the @google/genai SDK.
 * The SDK handles authentication internally — no manual API key management needed.
 * Downloads to a temp file and reads back as base64.
 */
async function downloadWithSdk(
  ai: GoogleGenAI,
  generatedVideo: { video?: { uri?: string } },
  index: number,
): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "veo-download-"));
  const tmpFile = path.join(tmpDir, `clip-${index}.mp4`);

  // Retry — files can take a few seconds to become available after operation completion
  const maxRetries = 4;
  const baseDelayMs = 5_000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log.info(`SDK download attempt ${attempt}/${maxRetries} for video ${index + 1}`);

      await ai.files.download({
        file: generatedVideo as any, // SDK accepts GeneratedVideo | Video | string
        downloadPath: tmpFile,
      });

      if (!fs.existsSync(tmpFile)) {
        throw new Error("SDK download completed but no file was written");
      }

      const buffer = fs.readFileSync(tmpFile);
      if (buffer.byteLength === 0) {
        throw new Error("SDK downloaded an empty file");
      }

      const base64 = buffer.toString("base64");
      log.info(`SDK download succeeded: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB`);
      return base64;
    } catch (err) {
      log.warn(`SDK download attempt ${attempt}/${maxRetries} failed`, {
        error: err instanceof Error ? err.message : String(err),
      });

      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        log.info(`Waiting ${delayMs / 1000}s before retry...`);
        await sleep(delayMs);
      }
    } finally {
      // Clean up temp file between attempts
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch { /* ignore */ }
    }
  }

  // Clean up temp dir
  try { fs.rmdirSync(tmpDir); } catch { /* ignore */ }

  throw new Error(`SDK download failed after ${maxRetries} attempts`);
}

/**
 * Fallback download using manual fetch with x-goog-api-key header auth.
 * Used when the SDK download fails.
 */
async function downloadWithFetch(uri: string, apiKey: string): Promise<string> {
  const downloadUrl = buildDownloadUrl(uri);

  const maxRetries = 4;
  const baseDelayMs = 5_000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    log.info(`Fetch download attempt ${attempt}/${maxRetries}: ${downloadUrl.substring(0, 150)}`);

    try {
      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: { "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(120_000),
        redirect: "follow",
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
          log.warn(`Empty response body on attempt ${attempt}`);
        } else {
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          log.info(`Fetch download succeeded: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`);
          return base64;
        }
      } else {
        const errorText = await response.text().catch(() => "");

        // Non-retryable client errors (except 403/404/408/429)
        if (response.status >= 400 && response.status < 500
            && response.status !== 403 && response.status !== 404
            && response.status !== 408 && response.status !== 429) {
          throw new Error(`Fetch download failed (${response.status}): ${errorText}`);
        }

        log.warn(`Fetch attempt ${attempt}/${maxRetries} failed: ${response.status}`, { error: errorText });
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Fetch download failed")) {
        throw err;
      }
      log.warn(`Fetch attempt ${attempt}/${maxRetries} error`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (attempt < maxRetries) {
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      log.info(`Waiting ${delayMs / 1000}s before retry...`);
      await sleep(delayMs);
    }
  }

  throw new Error(`Fetch download failed after ${maxRetries} attempts from URI: ${uri.substring(0, 150)}`);
}

/**
 * Build a proper download URL from a Gemini file URI.
 * Ensures `alt=media` is present exactly once and avoids duplicate params.
 */
function buildDownloadUrl(uri: string): string {
  const decoded = decodeURIComponent(uri);

  try {
    const url = new URL(decoded);
    if (!url.searchParams.has("alt")) {
      url.searchParams.set("alt", "media");
    }
    return url.toString();
  } catch {
    if (!decoded.includes("alt=media")) {
      const sep = decoded.includes("?") ? "&" : "?";
      return `${decoded}${sep}alt=media`;
    }
    return decoded;
  }
}

// ── Multi-clip video generation ──────────────────────────────────────

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
    initialDurationSeconds?: 4 | 5 | 6 | 7 | 8;
    extensionDurationSeconds?: 4 | 5 | 6 | 7 | 8;
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
