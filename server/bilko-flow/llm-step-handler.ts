/**
 * LLM Step Handler — bridges bilko-flow steps to Bilko's Gemini service
 *
 * Registers step handlers for ai.generate-text, ai.generate-image, and
 * ai.generate-video with bilko-flow's engine.
 *
 * Uses bilko-flow v0.2.0 features:
 * - inputContract: Declares expected inputs and validates model names
 *   against AVAILABLE_MODELS at compile time (catches typos before execution)
 * - validate(): Async pre-flight hook for runtime model availability checks
 * - NonRetryableStepError: Immediate failure on 404/400 API errors
 *
 * Template interpolation: step inputs can include systemPromptTemplate
 * and userMessageTemplate with {{variable.path}} placeholders that are
 * resolved from upstream step outputs.
 */

import { registerStepHandler, NonRetryableStepError } from "bilko-flow";
import type { CompiledStep, StepExecutionContext, InputFieldContract } from "bilko-flow";
import { chat, AVAILABLE_MODELS } from "../llm/index";
import { generateImage, generateImages } from "../llm/image-generation";
import { generateVideo, generateVideos } from "../llm/video-generation";

// ── Model lists derived from AVAILABLE_MODELS (single source of truth) ──

const TEXT_MODELS = AVAILABLE_MODELS
  .filter((m) => !m.id.includes("image") && !m.id.includes("veo"))
  .map((m) => m.id);

const IMAGE_MODELS = AVAILABLE_MODELS
  .filter((m) => m.id.includes("image"))
  .map((m) => m.id);

const VIDEO_MODELS = AVAILABLE_MODELS
  .filter((m) => m.id.includes("veo"))
  .map((m) => m.id);

const ALL_MODEL_IDS = AVAILABLE_MODELS.map((m) => m.id);

/**
 * Resolve {{path.to.value}} template placeholders from upstream outputs.
 */
function interpolateTemplate(
  template: string,
  upstreamOutputs: Record<string, Record<string, unknown>>,
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
    const parts = path.trim().split(".");
    // Walk through upstream outputs to find the value
    // First part could be a step ID or a top-level key from any step's outputs
    for (const [_stepId, outputs] of Object.entries(upstreamOutputs)) {
      let value: unknown = outputs;
      let found = true;
      for (const part of parts) {
        if (value && typeof value === "object" && part in (value as Record<string, unknown>)) {
          value = (value as Record<string, unknown>)[part];
        } else {
          found = false;
          break;
        }
      }
      if (found && value !== undefined) {
        return typeof value === "string" ? value : JSON.stringify(value);
      }
    }
    // If not found, return the placeholder as-is
    return `{{${path}}}`;
  });
}

/**
 * Shared model contract: declares the "model" input field with
 * a dynamic oneOf that resolves against the current AVAILABLE_MODELS list.
 */
function modelContract(allowedModels: string[]): InputFieldContract {
  return {
    type: "string" as const,
    required: false,
    oneOf: () => allowedModels,
    description: `Model ID. Allowed: ${allowedModels.join(", ")}`,
  };
}

/**
 * Register all LLM step handlers with bilko-flow's engine.
 *
 * Each handler declares:
 * - inputContract: compile-time input validation (catches wrong model names)
 * - validate(): async pre-flight check (can probe the API if needed)
 * - execute(): the actual LLM call
 */
export function registerLLMStepHandler(): void {
  // ── ai.generate-text ──────────────────────────────────────────────
  registerStepHandler({
    type: "ai.generate-text",

    inputContract: {
      model: modelContract(TEXT_MODELS),
    },

    validate(step: CompiledStep) {
      const inputs = step.inputs as Record<string, unknown>;
      const model = (inputs.model as string) ?? "gemini-2.5-flash";
      const errors: string[] = [];

      if (!ALL_MODEL_IDS.includes(model)) {
        errors.push(
          `Model "${model}" is not registered in AVAILABLE_MODELS. ` +
          `Valid text models: ${TEXT_MODELS.join(", ")}`,
        );
      } else if (!TEXT_MODELS.includes(model)) {
        errors.push(
          `Model "${model}" exists but is not a text generation model. ` +
          `Use one of: ${TEXT_MODELS.join(", ")}`,
        );
      }

      return { valid: errors.length === 0, errors };
    },

    async execute(
      step: CompiledStep,
      context: StepExecutionContext,
    ): Promise<{ outputs: Record<string, unknown> }> {
      const inputs = step.inputs as Record<string, unknown>;
      const model = (inputs.model as string) ?? "gemini-2.5-flash";

      // Resolve prompt — either static or templated from upstream outputs
      let systemPrompt: string;
      if (inputs.systemPromptTemplate) {
        systemPrompt = interpolateTemplate(
          inputs.systemPromptTemplate as string,
          context.upstreamOutputs,
        );
      } else {
        systemPrompt = (inputs.systemPrompt as string) ?? "";
      }

      let userMessage: string;
      if (inputs.userMessageTemplate) {
        userMessage = interpolateTemplate(
          inputs.userMessageTemplate as string,
          context.upstreamOutputs,
        );
      } else {
        userMessage = (inputs.userMessage as string) ?? "";
      }

      console.log(
        `[bilko-flow] Step "${step.name}" (${step.id}) calling LLM with model ${model}`,
      );

      try {
        // Call Gemini via the existing server-side LLM service
        const response = await chat({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.7,
          maxTokens: 8192,
        });

        // Parse the cleaned JSON response
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(response.content);
        } catch {
          console.warn(
            `[bilko-flow] Step "${step.id}" LLM response was not valid JSON, wrapping as raw`,
          );
          parsed = { raw: response.content };
        }

        console.log(
          `[bilko-flow] Step "${step.id}" completed. Model: ${response.model}. Tokens: ${response.usage?.totalTokens ?? "unknown"}`,
        );

        return {
          outputs: {
            ...parsed,
            _meta: {
              model: response.model,
              usage: response.usage,
            },
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Model not found or bad request — don't retry
        if (message.includes("404") || message.includes("not found") || message.includes("400")) {
          throw new NonRetryableStepError(
            `Model "${model}" call failed: ${message}`,
            message.includes("404") ? 404 : 400,
          );
        }
        throw err;
      }
    },
  });

  console.log("[bilko-flow] Registered ai.generate-text step handler (Gemini bridge)");

  // ── ai.generate-image (Nano Banana) ───────────────────────────────
  registerStepHandler({
    type: "ai.generate-image",

    inputContract: {
      model: modelContract(IMAGE_MODELS),
      aspectRatio: {
        type: "string" as const,
        required: false,
        oneOf: ["1:1", "16:9", "9:16", "4:3", "3:4"] as readonly string[],
        description: "Image aspect ratio",
      },
    },

    validate(step: CompiledStep) {
      const inputs = step.inputs as Record<string, unknown>;
      const model = (inputs.model as string) ?? "gemini-2.5-flash-image";
      const errors: string[] = [];

      if (!ALL_MODEL_IDS.includes(model)) {
        errors.push(
          `Model "${model}" is not registered in AVAILABLE_MODELS. ` +
          `Valid image models: ${IMAGE_MODELS.join(", ")}`,
        );
      } else if (!IMAGE_MODELS.includes(model)) {
        errors.push(
          `Model "${model}" exists but is not an image generation model. ` +
          `Use one of: ${IMAGE_MODELS.join(", ")}`,
        );
      }

      // Must have at least one prompt source
      if (!inputs.prompt && !inputs.promptTemplate && !inputs.prompts && !inputs.promptsTemplate) {
        errors.push("Image step requires at least one of: prompt, promptTemplate, prompts, promptsTemplate");
      }

      return { valid: errors.length === 0, errors };
    },

    async execute(
      step: CompiledStep,
      context: StepExecutionContext,
    ): Promise<{ outputs: Record<string, unknown> }> {
      const inputs = step.inputs as Record<string, unknown>;

      let prompt: string;
      if (inputs.promptTemplate) {
        prompt = interpolateTemplate(
          inputs.promptTemplate as string,
          context.upstreamOutputs,
        );
      } else {
        prompt = (inputs.prompt as string) ?? "";
      }

      const aspectRatio = (inputs.aspectRatio as string) ?? "16:9";
      const model = inputs.model as string | undefined;

      console.log(
        `[bilko-flow] Step "${step.name}" (${step.id}) generating image with Nano Banana`,
      );

      try {
        // Check if this is a batch request (multiple prompts)
        if (inputs.prompts || inputs.promptsTemplate) {
          let prompts: string[];
          if (inputs.promptsTemplate) {
            const resolved = interpolateTemplate(
              inputs.promptsTemplate as string,
              context.upstreamOutputs,
            );
            prompts = JSON.parse(resolved);
          } else {
            prompts = inputs.prompts as string[];
          }

          const results = await generateImages(
            prompts.map((p) => ({ prompt: p, aspectRatio: aspectRatio as any, model })),
          );

          const images = results.map((r) =>
            r ? { imageBase64: r.imageBase64, mimeType: r.mimeType, textResponse: r.textResponse } : null,
          );

          console.log(
            `[bilko-flow] Step "${step.id}" generated ${images.filter(Boolean).length}/${prompts.length} images`,
          );

          return { outputs: { images } };
        }

        // Single image generation
        const result = await generateImage({ prompt, aspectRatio: aspectRatio as any, model });

        console.log(`[bilko-flow] Step "${step.id}" image generated successfully`);

        return {
          outputs: {
            imageBase64: result.imageBase64,
            mimeType: result.mimeType,
            textResponse: result.textResponse,
            model: result.model,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("404") || message.includes("not found") || message.includes("400")) {
          throw new NonRetryableStepError(
            `Image generation failed: ${message}`,
            message.includes("404") ? 404 : 400,
          );
        }
        throw err;
      }
    },
  });

  console.log("[bilko-flow] Registered ai.generate-image step handler (Nano Banana)");

  // ── ai.generate-video (Veo) ───────────────────────────────────────
  registerStepHandler({
    type: "ai.generate-video",

    inputContract: {
      model: modelContract(VIDEO_MODELS),
      aspectRatio: {
        type: "string" as const,
        required: false,
        oneOf: ["16:9", "9:16"] as readonly string[],
        description: "Video aspect ratio",
      },
      durationSeconds: {
        type: "number" as const,
        required: false,
        description: "Video duration in seconds (5-8)",
      },
    },

    validate(step: CompiledStep) {
      const inputs = step.inputs as Record<string, unknown>;
      const model = (inputs.model as string) ?? "veo-3.1-generate-preview";
      const errors: string[] = [];

      if (!ALL_MODEL_IDS.includes(model)) {
        errors.push(
          `Model "${model}" is not registered in AVAILABLE_MODELS. ` +
          `Valid video models: ${VIDEO_MODELS.join(", ")}`,
        );
      } else if (!VIDEO_MODELS.includes(model)) {
        errors.push(
          `Model "${model}" exists but is not a video generation model. ` +
          `Use one of: ${VIDEO_MODELS.join(", ")}`,
        );
      }

      if (!inputs.prompt && !inputs.promptTemplate && !inputs.prompts && !inputs.promptsTemplate) {
        errors.push("Video step requires at least one of: prompt, promptTemplate, prompts, promptsTemplate");
      }

      return { valid: errors.length === 0, errors };
    },

    async execute(
      step: CompiledStep,
      context: StepExecutionContext,
    ): Promise<{ outputs: Record<string, unknown> }> {
      const inputs = step.inputs as Record<string, unknown>;

      let prompt: string;
      if (inputs.promptTemplate) {
        prompt = interpolateTemplate(
          inputs.promptTemplate as string,
          context.upstreamOutputs,
        );
      } else {
        prompt = (inputs.prompt as string) ?? "";
      }

      const durationSeconds = (inputs.durationSeconds as number) ?? 8;
      const aspectRatio = (inputs.aspectRatio as string) ?? "16:9";
      const model = inputs.model as string | undefined;

      console.log(
        `[bilko-flow] Step "${step.name}" (${step.id}) generating video with Veo`,
      );

      try {
        // Check for batch request
        if (inputs.prompts || inputs.promptsTemplate) {
          let prompts: string[];
          if (inputs.promptsTemplate) {
            const resolved = interpolateTemplate(
              inputs.promptsTemplate as string,
              context.upstreamOutputs,
            );
            prompts = JSON.parse(resolved);
          } else {
            prompts = inputs.prompts as string[];
          }

          const results = await generateVideos(
            prompts.map((p) => ({
              prompt: p,
              durationSeconds: durationSeconds as any,
              aspectRatio: aspectRatio as any,
              model,
            })),
          );

          const videos = results.map((r) =>
            r && r.videos.length > 0
              ? { videoBase64: r.videos[0].videoBase64, mimeType: r.videos[0].mimeType, durationSeconds: r.videos[0].durationSeconds }
              : null,
          );

          console.log(
            `[bilko-flow] Step "${step.id}" generated ${videos.filter(Boolean).length}/${prompts.length} videos`,
          );

          return { outputs: { videos } };
        }

        // Single video
        const result = await generateVideo({
          prompt,
          durationSeconds: durationSeconds as any,
          aspectRatio: aspectRatio as any,
          model,
        });

        const video = result.videos[0];
        console.log(`[bilko-flow] Step "${step.id}" video generated successfully`);

        return {
          outputs: {
            videoBase64: video?.videoBase64 ?? "",
            mimeType: video?.mimeType ?? "video/mp4",
            durationSeconds: video?.durationSeconds ?? durationSeconds,
            model: result.model,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("404") || message.includes("not found") || message.includes("400")) {
          throw new NonRetryableStepError(
            `Video generation failed: ${message}`,
            message.includes("404") ? 404 : 400,
          );
        }
        throw err;
      }
    },
  });

  console.log("[bilko-flow] Registered ai.generate-video step handler (Veo)");
}
