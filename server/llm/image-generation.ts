/**
 * Image Generation Service — Nano Banana (Gemini native image generation)
 *
 * Uses the Gemini API's native generateContent endpoint with
 * responseModalities: ["TEXT", "IMAGE"] to generate images.
 *
 * Model: gemini-2.5-flash-image (Nano Banana / Gemini 2.5 Flash Image)
 *
 * This does NOT use the OpenAI-compatible endpoint — it uses the native
 * Gemini REST API directly because image generation requires the
 * responseModalities parameter which isn't supported by the OpenAI shim.
 */

import { createLogger } from "../logger";
import { MODEL_DEFAULTS } from "./index";

const log = createLogger("image-generation");

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  /** Optional reference image for editing/compositing */
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
}

export interface ImageGenerationResponse {
  imageBase64: string;
  mimeType: string;
  textResponse?: string;
  model: string;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured. Add it to your Replit Secrets.");
  }
  return key;
}

/**
 * Generate an image using Nano Banana (Gemini native image generation).
 *
 * Uses the generateContent endpoint with responseModalities: ["TEXT", "IMAGE"]
 * to get the model to produce an image alongside optional text.
 */
export async function generateImage(
  request: ImageGenerationRequest,
): Promise<ImageGenerationResponse> {
  const apiKey = getApiKey();
  const model = request.model ?? MODEL_DEFAULTS.image;
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  // Build the content parts
  const parts: Array<Record<string, unknown>> = [];

  // Add reference image if provided (for editing/compositing)
  if (request.referenceImageBase64) {
    parts.push({
      inline_data: {
        mime_type: request.referenceImageMimeType ?? "image/png",
        data: request.referenceImageBase64,
      },
    });
  }

  // Add the text prompt
  parts.push({ text: request.prompt });

  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      ...(request.aspectRatio && {
        imageConfig: {
          aspectRatio: request.aspectRatio,
        },
      }),
    },
  };

  log.info(`Generating image with ${model}`, {
    promptLength: request.prompt.length,
    aspectRatio: request.aspectRatio ?? "default",
    hasReference: !!request.referenceImageBase64,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000), // 2 minute timeout for image gen
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error(`Image generation failed: ${response.status}`, { error: errorText });
    throw new Error(`Image generation failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          inlineData?: { data: string; mimeType: string };
          inline_data?: { data: string; mime_type: string };
        }>;
      };
    }>;
  };

  const candidate = data.candidates?.[0];
  if (!candidate?.content?.parts) {
    throw new Error("Image generation returned no content");
  }

  let imageBase64 = "";
  let mimeType = "image/png";
  let textResponse = "";

  for (const part of candidate.content.parts) {
    if (part.text) {
      textResponse += part.text;
    }
    // Handle both camelCase and snake_case response formats
    const inlineData = part.inlineData ?? part.inline_data;
    if (inlineData) {
      imageBase64 = inlineData.data ?? inlineData.data;
      mimeType = inlineData.mimeType ?? inlineData.mime_type ?? "image/png";
    }
  }

  if (!imageBase64) {
    throw new Error("Image generation returned no image data. The model may have returned only text.");
  }

  log.info(`Image generated successfully`, {
    model,
    imageSizeBytes: Math.round(imageBase64.length * 0.75),
    hasText: !!textResponse,
  });

  return {
    imageBase64,
    mimeType,
    textResponse: textResponse || undefined,
    model,
  };
}

/**
 * Generate multiple images in parallel.
 * Returns results in the same order as the requests.
 * Failed generations return null in the array.
 */
export async function generateImages(
  requests: ImageGenerationRequest[],
): Promise<(ImageGenerationResponse | null)[]> {
  log.info(`Generating ${requests.length} images in parallel`);

  const results = await Promise.allSettled(
    requests.map((req) => generateImage(req)),
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    log.warn(`Image ${i + 1}/${requests.length} failed`, {
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
    return null;
  });
}
