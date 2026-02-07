/**
 * Flow Mutations — Pure transformations on FlowDefinitions.
 *
 * Every mutation takes a FlowDefinition and returns a new one.
 * All mutations re-validate against ARCH-005 steel frame.
 * Invalid mutations are rejected with specific errors.
 */

import type { FlowDefinition, FlowStep, StepType } from "@/lib/flow-inspector/types";
import { validateFlowDefinition, type FlowValidationError } from "@/lib/flow-inspector/validate";

// ── Mutation result ────────────────────────────────────────

export interface MutationResult {
  /** The transformed flow (if valid) */
  flow: FlowDefinition;
  /** Whether the mutation produced a valid flow */
  valid: boolean;
  /** Validation errors (empty if valid) */
  errors: FlowValidationError[];
  /** Human-readable description of what changed */
  description: string;
}

// ── Mutation types (what voice commands resolve to) ────────

export type FlowMutation =
  | { type: "add-step"; step: FlowStep; afterStepId?: string }
  | { type: "remove-step"; stepId: string }
  | { type: "update-step"; stepId: string; changes: Partial<FlowStep> }
  | { type: "connect"; fromId: string; toId: string }
  | { type: "disconnect"; fromId: string; toId: string }
  | { type: "change-type"; stepId: string; newType: StepType }
  | { type: "reorder-deps"; stepId: string; newDeps: string[] }
  | { type: "batch"; mutations: FlowMutation[]; description: string };

// ── Apply a single mutation ────────────────────────────────

export function applyMutation(
  flow: FlowDefinition,
  mutation: FlowMutation,
): MutationResult {
  let result: FlowDefinition;
  let description: string;

  switch (mutation.type) {
    case "add-step": {
      const { step, afterStepId } = mutation;
      // If afterStepId specified, make new step depend on it
      const newStep = afterStepId && !step.dependsOn.includes(afterStepId)
        ? { ...step, dependsOn: [...step.dependsOn, afterStepId] }
        : step;
      result = { ...flow, steps: [...flow.steps, newStep] };
      description = `Added step "${step.name}" (${step.type})`;
      break;
    }

    case "remove-step": {
      const { stepId } = mutation;
      const removing = flow.steps.find((s) => s.id === stepId);
      if (!removing) {
        return {
          flow,
          valid: false,
          errors: [{ flowId: flow.id, invariant: "mutation", message: `Step "${stepId}" not found` }],
          description: `Cannot remove "${stepId}" — not found`,
        };
      }
      // Remove step and clean up any dangling references
      result = {
        ...flow,
        steps: flow.steps
          .filter((s) => s.id !== stepId)
          .map((s) => ({
            ...s,
            dependsOn: s.dependsOn.filter((d) => d !== stepId),
          })),
      };
      description = `Removed step "${removing.name}"`;
      break;
    }

    case "update-step": {
      const { stepId, changes } = mutation;
      const existing = flow.steps.find((s) => s.id === stepId);
      if (!existing) {
        return {
          flow,
          valid: false,
          errors: [{ flowId: flow.id, invariant: "mutation", message: `Step "${stepId}" not found` }],
          description: `Cannot update "${stepId}" — not found`,
        };
      }
      result = {
        ...flow,
        steps: flow.steps.map((s) =>
          s.id === stepId ? { ...s, ...changes, id: stepId } : s,
        ),
      };
      const changedFields = Object.keys(changes).join(", ");
      description = `Updated "${existing.name}" (${changedFields})`;
      break;
    }

    case "connect": {
      const { fromId, toId } = mutation;
      const to = flow.steps.find((s) => s.id === toId);
      if (!to) {
        return {
          flow,
          valid: false,
          errors: [{ flowId: flow.id, invariant: "mutation", message: `Step "${toId}" not found` }],
          description: `Cannot connect — "${toId}" not found`,
        };
      }
      if (to.dependsOn.includes(fromId)) {
        return { flow, valid: true, errors: [], description: `Already connected: ${fromId} → ${toId}` };
      }
      result = {
        ...flow,
        steps: flow.steps.map((s) =>
          s.id === toId ? { ...s, dependsOn: [...s.dependsOn, fromId] } : s,
        ),
      };
      const fromName = flow.steps.find((s) => s.id === fromId)?.name ?? fromId;
      description = `Connected "${fromName}" → "${to.name}"`;
      break;
    }

    case "disconnect": {
      const { fromId, toId } = mutation;
      const to = flow.steps.find((s) => s.id === toId);
      if (!to) {
        return {
          flow,
          valid: false,
          errors: [{ flowId: flow.id, invariant: "mutation", message: `Step "${toId}" not found` }],
          description: `Cannot disconnect — "${toId}" not found`,
        };
      }
      result = {
        ...flow,
        steps: flow.steps.map((s) =>
          s.id === toId ? { ...s, dependsOn: s.dependsOn.filter((d) => d !== fromId) } : s,
        ),
      };
      const fromName = flow.steps.find((s) => s.id === fromId)?.name ?? fromId;
      description = `Disconnected "${fromName}" → "${to.name}"`;
      break;
    }

    case "change-type": {
      const { stepId, newType } = mutation;
      const existing = flow.steps.find((s) => s.id === stepId);
      if (!existing) {
        return {
          flow,
          valid: false,
          errors: [{ flowId: flow.id, invariant: "mutation", message: `Step "${stepId}" not found` }],
          description: `Cannot change type — "${stepId}" not found`,
        };
      }
      result = {
        ...flow,
        steps: flow.steps.map((s) =>
          s.id === stepId ? { ...s, type: newType } : s,
        ),
      };
      description = `Changed "${existing.name}" from ${existing.type} to ${newType}`;
      break;
    }

    case "reorder-deps": {
      const { stepId, newDeps } = mutation;
      result = {
        ...flow,
        steps: flow.steps.map((s) =>
          s.id === stepId ? { ...s, dependsOn: newDeps } : s,
        ),
      };
      description = `Reordered dependencies for "${stepId}"`;
      break;
    }

    case "batch": {
      let current = flow;
      const allErrors: FlowValidationError[] = [];
      for (const sub of mutation.mutations) {
        const subResult = applyMutation(current, sub);
        current = subResult.flow;
        // Don't validate intermediates — only the final result
      }
      result = current;
      description = mutation.description;
      break;
    }

    default:
      return {
        flow,
        valid: false,
        errors: [{ flowId: flow.id, invariant: "mutation", message: "Unknown mutation type" }],
        description: "Unknown mutation",
      };
  }

  // Validate the result against ARCH-005
  const errors = validateFlowDefinition(result);
  return { flow: result, valid: errors.length === 0, errors, description };
}

// ── Helper: generate a unique step ID ──────────────────────

export function generateStepId(baseName: string, existingIds: Set<string>): string {
  const slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!existingIds.has(slug)) return slug;
  for (let i = 2; i < 100; i++) {
    const candidate = `${slug}-${i}`;
    if (!existingIds.has(candidate)) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

// ── Helper: create a blank step with sensible defaults ─────

export function createBlankStep(
  type: StepType,
  name: string,
  existingIds: Set<string>,
  dependsOn: string[] = [],
): FlowStep {
  return {
    id: generateStepId(name, existingIds),
    name,
    type,
    description: `New ${type} step`,
    dependsOn,
    ...(type === "llm" ? {
      prompt: "",
      outputSchema: [{ name: "result", type: "object" as const, description: "Output" }],
    } : {}),
    ...(type === "user-input" || type === "transform" || type === "validate" ? {
      inputSchema: [{ name: "input", type: "object" as const, description: "Input" }],
      outputSchema: [{ name: "output", type: "object" as const, description: "Output" }],
    } : {}),
  };
}
