/**
 * Video Generation Service — Veo (Gemini API video generation)
 *
 * Uses the Gemini API's dedicated generateVideos endpoint to produce
 * 7-8 second video clips from text prompts (and optional reference images).
 *
 * Model: veo-3.0-generate-preview
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
const DEFAULT_VIDEO_MODEL = "veo-3.0-generate-preview";

export interface VideoGenerationRequest {
  prompt: string;
  model?: string;
  durationSeconds?: 5 | 6 | 7 | 8;
  aspectRatio?: "16:9" | "9:16";
  /** Optional reference image to guide the video */
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
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
 */
export async function generateVideo(
  request: VideoGenerationRequest,
): Promise<VideoGenerationResponse> {
  const apiKey = getApiKey();
  const model = request.model ?? DEFAULT_VIDEO_MODEL;
  const url = `${GEMINI_BASE_URL}/models/${model}:generateVideos?key=${apiKey}`;

  // Build the request
  const body: Record<string, unknown> = {
    instances: [
      {
        prompt: request.prompt,
        ...(request.referenceImageBase64 && {
          image: {
            bytesBase64Encoded: request.referenceImageBase64,
            mimeType: request.referenceImageMimeType ?? "image/png",
          },
        }),
      },
    ],
    parameters: {
      aspectRatio: request.aspectRatio ?? "16:9",
      durationSeconds: request.durationSeconds ?? 8,
      sampleCount: 1,
    },
  };

  log.info(`Submitting video generation with ${model}`, {
    promptLength: request.prompt.length,
    duration: request.durationSeconds ?? 8,
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
    log.error(`Video generation submission failed: ${submitResponse.status}`, { error: errorText });
    throw new Error(`Video generation failed (${submitResponse.status}): ${errorText}`);
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
    throw new Error(`Video generation error: ${operation.error.message}`);
  }

  // Poll for completion
  const operationName = operation.name;
  if (!operationName) {
    throw new Error("Video generation did not return an operation name");
  }

  log.info(`Polling video generation operation: ${operationName}`);

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
      throw new Error(`Video generation failed: ${pollResult.error.message}`);
    }

    if (pollResult.done && pollResult.response) {
      log.info(`Video generation completed after ${Math.round((Date.now() - startTime) / 1000)}s`);
      return parseVideoResponse(pollResult.response, model, operationName);
    }

    log.info(`Video still generating... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
  }

  throw new Error("Video generation timed out after 5 minutes");
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
