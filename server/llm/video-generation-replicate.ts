/**
 * Clip Generation Service — Replicate (Wan 2.1)
 *
 * Drop-in alternative to video-generation.ts (Veo) for single clip generation.
 * Uses the Replicate HTTP API with the open-source Wan 2.1 model.
 *
 * Model: wavespeedai/wan-2.1-t2v-480p (14B, ~39s for 5s clip at 480p)
 *
 * Returns the same ClipGenerationResponse shape as the Veo implementation
 * so the rest of the pipeline (routes, client, flows) works unchanged.
 */

import Replicate from "replicate";
import { createLogger } from "../logger";
import type { ClipGenerationRequest, ClipGenerationResponse, GeneratedClip } from "./video-generation";

const log = createLogger("video-generation-replicate");

/** Default Replicate model for text-to-video */
export const REPLICATE_VIDEO_MODEL = "wavespeedai/wan-2.1-t2v-480p";

function getApiToken(): string {
  const token = process.env.REPLICATE_VIDEO_API_KEY;
  if (!token) {
    throw new Error("REPLICATE_VIDEO_API_KEY is not configured. Add it to your Replit Secrets.");
  }
  return token;
}

/** Lazily-created Replicate client (reused across calls). */
let _replicate: Replicate | null = null;
function getReplicate(): Replicate {
  if (!_replicate) {
    _replicate = new Replicate({ auth: getApiToken() });
  }
  return _replicate;
}

/**
 * Map duration in seconds to approximate frame count.
 * Wan 2.1 generates at a fixed FPS (typically 16 fps for 480p).
 * The model expects num_frames as input rather than seconds.
 */
function durationToFrames(durationSeconds: number): number {
  // Wan 2.1 on Replicate uses 16 fps at 480p
  // num_frames should be a multiple of 4 + 1 for best results
  const fps = 16;
  const raw = durationSeconds * fps;
  // Round to nearest valid frame count (4n + 1)
  const n = Math.round((raw - 1) / 4);
  return Math.max(4 * n + 1, 17); // minimum ~1 second
}

/**
 * Map aspect ratio to Wan 2.1 resolution string.
 * 480p variants: 832×480 (16:9) or 480×832 (9:16)
 */
function aspectToResolution(aspectRatio: string): string {
  switch (aspectRatio) {
    case "9:16":
      return "480x832";
    case "16:9":
    default:
      return "832x480";
  }
}

/**
 * Generate a single clip using Replicate's Wan 2.1 model.
 *
 * Matches the same ClipGenerationResponse interface as the Veo implementation.
 * The `replicate.run()` call handles polling automatically.
 *
 * Note: Wan 2.1 does not support source-grounded generation (extending a
 * previous clip). If sourceVideoBase64 is provided, it is ignored with a warning.
 * For multi-clip continuity, use the Veo-based generateVideo() instead.
 */
export async function generateClipReplicate(
  request: ClipGenerationRequest,
): Promise<ClipGenerationResponse> {
  const replicate = getReplicate();
  const model = request.model ?? REPLICATE_VIDEO_MODEL;
  const durationSec = request.durationSeconds ?? 5;

  if (request.sourceVideoBase64) {
    log.warn("Wan 2.1 does not support source-grounded generation. sourceVideoBase64 will be ignored.");
  }

  if (request.referenceImageBase64) {
    log.warn("Use the i2v (image-to-video) model variant for reference images. referenceImageBase64 will be ignored for t2v model.");
  }

  log.info(`Submitting Replicate clip generation with ${model}`, {
    promptLength: request.prompt.length,
    durationSeconds: durationSec,
    aspectRatio: request.aspectRatio ?? "16:9",
  });

  const startTime = Date.now();

  try {
    // Build input for Wan 2.1 model
    const input: Record<string, unknown> = {
      prompt: request.prompt,
      num_frames: durationToFrames(durationSec),
      resolution: aspectToResolution(request.aspectRatio ?? "16:9"),
    };

    log.info(`Replicate input: ${JSON.stringify(input)}`);

    // replicate.run() handles creation + polling automatically
    // Returns the output directly (URL string or array of URLs)
    const output = await replicate.run(model as `${string}/${string}`, { input });

    log.info(`Replicate generation completed after ${Math.round((Date.now() - startTime) / 1000)}s`);

    // Output is typically a URL string or a FileOutput object
    const videoUrl = extractVideoUrl(output);
    if (!videoUrl) {
      log.error("Replicate returned no video URL", {
        output: JSON.stringify(output).substring(0, 500),
      });
      throw new Error("Replicate returned no video data. The model may be unavailable or the prompt was filtered.");
    }

    log.info(`Downloading video from Replicate: ${videoUrl.substring(0, 100)}...`);

    // Download the video and convert to base64
    const videoBase64 = await downloadVideoAsBase64(videoUrl);

    const clip: GeneratedClip = {
      videoBase64,
      mimeType: "video/mp4",
      durationSeconds: durationSec,
    };

    log.info(`Replicate clip ready: ${(Buffer.from(videoBase64, "base64").length / 1024 / 1024).toFixed(1)}MB`);

    return { videos: [clip], model };
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    log.error(`Replicate clip generation failed after ${elapsed}s`, {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new Error(`Replicate clip generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Extract the video URL from Replicate output.
 * Output format varies by model — can be a string URL, a FileOutput, or an array.
 */
function extractVideoUrl(output: unknown): string | null {
  if (!output) return null;

  // String URL
  if (typeof output === "string") return output;

  // FileOutput object with url() method
  if (typeof output === "object" && output !== null && "url" in output) {
    const url = (output as { url: () => string }).url?.();
    if (typeof url === "string") return url;
    // Or it might be a direct property
    const urlProp = (output as { url: string }).url;
    if (typeof urlProp === "string") return urlProp;
  }

  // Array of outputs (take first)
  if (Array.isArray(output)) {
    for (const item of output) {
      const url = extractVideoUrl(item);
      if (url) return url;
    }
  }

  return null;
}

/**
 * Download a video from a URL and return as base64 string.
 */
async function downloadVideoAsBase64(url: string): Promise<string> {
  const maxRetries = 3;
  const baseDelayMs = 2_000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log.info(`Download attempt ${attempt}/${maxRetries}`);

      const response = await fetch(url, {
        signal: AbortSignal.timeout(120_000),
        redirect: "follow",
      });

      if (!response.ok) {
        throw new Error(`Download failed (${response.status}): ${await response.text().catch(() => "")}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        throw new Error("Downloaded empty file");
      }

      const base64 = Buffer.from(arrayBuffer).toString("base64");
      log.info(`Download succeeded: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`);
      return base64;
    } catch (err) {
      log.warn(`Download attempt ${attempt}/${maxRetries} failed`, {
        error: err instanceof Error ? err.message : String(err),
      });

      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        log.info(`Waiting ${delayMs / 1000}s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Video download failed after ${maxRetries} attempts from URL: ${url.substring(0, 150)}`);
}

/**
 * Check if a model string refers to a Replicate-hosted model.
 */
export function isReplicateModel(model: string): boolean {
  return model.includes("/") && !model.startsWith("veo") && !model.startsWith("gemini");
}
