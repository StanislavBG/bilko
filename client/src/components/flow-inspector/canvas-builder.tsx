/**
 * CanvasBuilder — Bilko adapter wrapping bilko-flow/react's CanvasBuilder.
 *
 * The bilko-flow/react CanvasBuilder is props-driven with an `onParseIntent`
 * callback for LLM integration. This adapter provides Bilko's LLM backend
 * (chatJSON + bilkoSystemPrompt) as the intent parser.
 */

import {
  CanvasBuilder as LibCanvasBuilder,
  type ParsedIntent,
  type MutationResult,
  type FlowStep as LibFlowStep,
} from "bilko-flow/react";
import { chatJSON, jsonPrompt } from "@/lib/bilko-flow";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import type { FlowDefinition } from "@/lib/bilko-flow/types";

// ── LLM intent parsing (Bilko-specific) ─────────────────

const INTENT_SYSTEM_PROMPT = bilkoSystemPrompt(`The user is looking at a DAG flow and has selected some nodes.
They will tell you what change they want. Parse their intent into a structured action.

Available step types: llm, user-input, transform, validate, display

Return ONLY valid JSON. Example:
{"action":"add","stepType":"llm","stepName":"Generate Summary","targetStepIds":["research-topics"],"changes":{},"description":"Add an LLM step called Generate Summary after research-topics"}

Rules:
- action must be one of: add, remove, update, connect, disconnect, change-type, unknown
- targetStepIds are the step IDs the user is referring to (from the selected nodes or their speech)
- For "add": include stepType and stepName
- For "change-type": include stepType (the new type)
- For "update": include changes object with field names and new values
- For "connect" or "disconnect": targetStepIds should have exactly 2 IDs [from, to]
- description is a human-readable summary of what will happen
- If you can't understand the request, use action: "unknown"
- No markdown, ONLY the JSON object`);

function buildIntentUserMessage(
  userText: string,
  selectedIds: string[],
  steps: LibFlowStep[],
): string {
  const selectedSteps = steps
    .filter((s) => selectedIds.includes(s.id))
    .map((s) => `- ${s.id}: "${s.name}" (${s.type}, depends on: [${s.dependsOn.join(", ")}])`)
    .join("\n");

  const allStepIds = steps.map((s) => s.id).join(", ");

  return `Selected nodes:\n${selectedSteps || "(none selected)"}\n\nAll step IDs in the flow: ${allStepIds}\n\nUser says: "${userText}"`;
}

async function parseIntent(
  userText: string,
  selectedIds: string[],
  steps: LibFlowStep[],
): Promise<ParsedIntent> {
  const userMessage = buildIntentUserMessage(userText, selectedIds, steps);
  const result = await chatJSON<ParsedIntent>(
    jsonPrompt(INTENT_SYSTEM_PROMPT, userMessage),
  );
  return result.data;
}

// ── Adapter component ───────────────────────────────────

interface CanvasBuilderProps {
  flow: FlowDefinition;
  selectedStepIds: Set<string>;
  onApplyMutation: (result: MutationResult) => void;
  onClose: () => void;
}

export function CanvasBuilder({
  flow,
  selectedStepIds,
  onApplyMutation,
  onClose,
}: CanvasBuilderProps) {
  return (
    <LibCanvasBuilder
      flow={flow}
      selectedStepIds={selectedStepIds}
      onApplyMutation={onApplyMutation}
      onClose={onClose}
      onParseIntent={parseIntent}
      assistantName="Bilko"
    />
  );
}
