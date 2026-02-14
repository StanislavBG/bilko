/**
 * Clip Generation Service — Replicate
 *
 * Drop-in alternative to video-generation.ts (Veo) for single clip generation.
 * Uses the Replicate HTTP API with open-source / free-tier models.
 *
 * Default model: minimax/video-01 (Hailuo) — free-to-try, 6s clips at 720p/25fps.
 * Also supports: wavespeedai/wan-2.1-t2v-480p, wan-video/wan-2.2-t2v-fast, etc.
 *
 * Returns the same ClipGenerationResponse shape as the Veo implementation
 * so the rest of the pipeline (routes, client, flows) works unchanged.
 */

import Replicate from "replicate";
import { createLogger } from "../logger";
import type { ClipGenerationRequest, ClipGenerationResponse, GeneratedClip } from "./video-generation";

const log = createLogger("video-generation-replicate");

/** Default Replicate model for text-to-video (free-to-try on Replicate) */
export const REPLICATE_VIDEO_MODEL = "minimax/video-01";

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
 * Check if a model ID is a minimax model.
 */
function isMinimaxModel(model: string): boolean {
  return model.startsWith("minimax/");
}

/**
 * Build model-specific input for Replicate.
 *
 * - minimax/video-01: { prompt, prompt_optimizer } — 6s at 720p (fixed)
 * - wan-* models:     { prompt, num_frames, resolution }
 */
function buildModelInput(
  model: string,
  prompt: string,
  durationSeconds: number,
  aspectRatio: string,
): Record<string, unknown> {
  if (isMinimaxModel(model)) {
    return {
      prompt,
      prompt_optimizer: true,
    };
  }

  // Wan-family models (wavespeedai/wan-*, wan-video/wan-*)
  return {
    prompt,
    num_frames: durationToFrames(durationSeconds),
    resolution: aspectToResolution(aspectRatio),
  };
}

/**
 * Get the fixed output duration for models that don't support configurable length.
 * Returns null if the model supports configurable duration.
 */
function getFixedDuration(model: string): number | null {
  if (isMinimaxModel(model)) return 6; // minimax/video-01 always produces 6s
  return null;
}

/**
 * Generate a single clip using a Replicate-hosted model.
 *
 * Matches the same ClipGenerationResponse interface as the Veo implementation.
 * The `replicate.run()` call handles polling automatically.
 *
 * Supported models:
 *   - minimax/video-01 (Hailuo) — free-to-try, 6s at 720p
 *   - wavespeedai/wan-2.1-t2v-480p — 5-8s at 480p
 *   - wan-video/wan-2.2-t2v-fast — 5-8s at 480p/720p
 */
export async function generateClipReplicate(
  request: ClipGenerationRequest,
): Promise<ClipGenerationResponse> {
  const replicate = getReplicate();
  const model = request.model ?? REPLICATE_VIDEO_MODEL;
  const fixedDuration = getFixedDuration(model);
  const durationSec = fixedDuration ?? request.durationSeconds ?? 5;

  if (request.sourceVideoBase64) {
    log.warn("Replicate t2v models do not support source-grounded generation. sourceVideoBase64 will be ignored.");
  }

  if (request.referenceImageBase64 && !isMinimaxModel(model)) {
    log.warn("Use the i2v (image-to-video) model variant for reference images. referenceImageBase64 will be ignored for t2v model.");
  }

  log.info(`Submitting Replicate clip generation with ${model}`, {
    promptLength: request.prompt.length,
    durationSeconds: durationSec,
    aspectRatio: request.aspectRatio ?? "16:9",
  });

  const startTime = Date.now();

  try {
    const input = buildModelInput(model, request.prompt, durationSec, request.aspectRatio ?? "16:9");

    log.info(`Replicate input: ${JSON.stringify(input)}`);

    // replicate.run() handles creation + polling automatically
    // Returns the output directly (URL string or array of URLs)
    const output = await replicate.run(model as `${string}/${string}`, { input });

    log.info(`Replicate generation completed after ${Math.round((Date.now() - startTime) / 1000)}s`);

    // SDK v1.4+ returns FileOutput (ReadableStream) objects, not raw URLs.
    // We read the stream directly into base64 — no separate download needed.
    const videoBase64 = await extractVideoBase64(output);
    if (!videoBase64) {
      log.error("Replicate returned no video data", {
        outputType: typeof output,
        outputConstructor: output?.constructor?.name ?? "unknown",
        outputStr: String(output).substring(0, 500),
      });
      throw new Error("Replicate returned no video data. The model may be unavailable or the prompt was filtered.");
    }

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
 * Extract video data as base64 from Replicate output.
 *
 * The SDK v1.4+ returns FileOutput objects that extend ReadableStream.
 * We handle all output shapes:
 *   - FileOutput (ReadableStream) → read stream directly to base64
 *   - String URL → download and convert
 *   - Array → recurse on first item
 *   - Object with toString() → extract URL string, download
 */
async function extractVideoBase64(output: unknown): Promise<string | null> {
  if (!output) return null;

  // FileOutput extends ReadableStream — read it directly (most efficient)
  if (output instanceof ReadableStream) {
    log.info("Output is a ReadableStream (FileOutput) — reading directly");
    return await readStreamToBase64(output as ReadableStream<Uint8Array>);
  }

  // String URL (older SDK or useFileOutput: false)
  if (typeof output === "string" && (output.startsWith("https:") || output.startsWith("data:"))) {
    log.info(`Output is a URL string — downloading: ${output.substring(0, 100)}...`);
    return await downloadVideoAsBase64(output);
  }

  // Array of outputs — take first non-null
  if (Array.isArray(output)) {
    log.info(`Output is an array of ${output.length} items — processing first`);
    for (const item of output) {
      const data = await extractVideoBase64(item);
      if (data) return data;
    }
    return null;
  }

  // Object with toString() that returns a URL (FileOutput fallback)
  if (typeof output === "object" && output !== null) {
    const str = String(output);
    if (str.startsWith("https:") || str.startsWith("http:")) {
      log.info(`Output object stringifies to URL — downloading: ${str.substring(0, 100)}...`);
      return await downloadVideoAsBase64(str);
    }
    // Try .url() method (FileOutput.url() returns a URL object)
    if ("url" in output && typeof (output as any).url === "function") {
      const urlObj = (output as any).url();
      const urlStr = String(urlObj);
      if (urlStr.startsWith("https:") || urlStr.startsWith("http:")) {
        log.info(`Output.url() = ${urlStr.substring(0, 100)}... — downloading`);
        return await downloadVideoAsBase64(urlStr);
      }
    }
  }

  return null;
}

/**
 * Read a ReadableStream<Uint8Array> fully into a base64 string.
 * Used to consume FileOutput objects directly without a separate download.
 */
async function readStreamToBase64(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  if (totalLength === 0) {
    throw new Error("FileOutput stream was empty — no video data received");
  }

  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const base64 = Buffer.from(merged).toString("base64");
  log.info(`Stream read complete: ${(totalLength / 1024 / 1024).toFixed(1)}MB`);
  return base64;
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
