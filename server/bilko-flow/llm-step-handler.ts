/**
 * LLM Step Handler — bridges bilko-flow steps to Bilko's Gemini service
 *
 * Registers an "ai.generate-text" step handler with bilko-flow's engine
 * that calls the existing server/llm chat() function.
 *
 * Template interpolation: step inputs can include systemPromptTemplate
 * and userMessageTemplate with {{variable.path}} placeholders that are
 * resolved from upstream step outputs.
 */

import { registerStepHandler } from "bilko-flow/dist/engine/step-runner";
import type { CompiledStep } from "bilko-flow/dist/dsl/compiler";
import type { StepExecutionContext } from "bilko-flow/dist/engine/step-runner";
import { chat } from "../llm/index";

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
 * Register the LLM step handler with bilko-flow's engine.
 *
 * Handles step type "ai.generate-text" by:
 * 1. Reading systemPrompt/systemPromptTemplate and userMessage/userMessageTemplate from inputs
 * 2. Interpolating template variables from upstream outputs
 * 3. Calling the Gemini LLM via the existing chat() function
 * 4. Parsing the JSON response and returning it as step outputs
 */
export function registerLLMStepHandler(): void {
  registerStepHandler({
    type: "ai.generate-text",
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
    },
  });

  console.log("[bilko-flow] Registered ai.generate-text step handler (Gemini bridge)");
}
