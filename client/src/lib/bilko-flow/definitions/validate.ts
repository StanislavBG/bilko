/**
 * Bilko Flow API — ARCH-005 Steel Frame Validator
 *
 * Enforces all structural invariants (I1–I7) and step type contracts
 * at application startup. Flows that fail validation are logged with
 * specific errors and excluded from the registry.
 */

import type { FlowDefinition, FlowStep, StepType } from "../types";

export interface FlowValidationError {
  flowId: string;
  invariant: string; // e.g. "I1", "I3", "llm-contract"
  stepId?: string;
  message: string;
}

/**
 * Validate a single flow definition against all steel frame invariants.
 * Returns an empty array if valid.
 */
export function validateFlowDefinition(
  flow: FlowDefinition,
): FlowValidationError[] {
  const errors: FlowValidationError[] = [];
  const e = (invariant: string, message: string, stepId?: string) =>
    errors.push({ flowId: flow.id, invariant, stepId, message });

  const stepIds = new Set<string>();
  const stepMap = new Map<string, FlowStep>();

  // ── I5: Unique Step IDs ──────────────────────────────────
  for (const step of flow.steps) {
    if (stepIds.has(step.id)) {
      e("I5", `Duplicate step ID "${step.id}"`, step.id);
    }
    stepIds.add(step.id);
    stepMap.set(step.id, step);
  }

  // ── I7: Step Completeness ────────────────────────────────
  for (const step of flow.steps) {
    if (!step.id || step.id.trim() === "") {
      e("I7", "Step has empty id");
    }
    if (!step.name || step.name.trim() === "") {
      e("I7", `Step "${step.id}" has empty name`, step.id);
    }
    if (!step.type) {
      e("I7", `Step "${step.id}" has no type`, step.id);
    }
    if (!step.description || step.description.trim() === "") {
      e("I7", `Step "${step.id}" has empty description`, step.id);
    }
    if (!Array.isArray(step.dependsOn)) {
      e("I7", `Step "${step.id}" has no dependsOn array`, step.id);
    }
  }

  // ── I6: Valid Dependencies ───────────────────────────────
  for (const step of flow.steps) {
    if (!Array.isArray(step.dependsOn)) continue;
    for (const dep of step.dependsOn) {
      if (!stepIds.has(dep)) {
        e(
          "I6",
          `Step "${step.id}" depends on "${dep}" which does not exist`,
          step.id,
        );
      }
    }
  }

  // ── I2: At Least One Root ────────────────────────────────
  const roots = flow.steps.filter(
    (s) => Array.isArray(s.dependsOn) && s.dependsOn.length === 0,
  );
  if (roots.length === 0) {
    e("I2", "Flow has no root steps (steps with empty dependsOn)");
  }

  // ── I1: Directed Acyclic Graph (no cycles) ──────────────
  // Kahn's algorithm: if we can't topologically sort all nodes, there's a cycle
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const step of flow.steps) {
    inDegree.set(step.id, 0);
    adj.set(step.id, []);
  }
  for (const step of flow.steps) {
    if (!Array.isArray(step.dependsOn)) continue;
    for (const dep of step.dependsOn) {
      if (adj.has(dep)) {
        adj.get(dep)!.push(step.id);
        inDegree.set(step.id, (inDegree.get(step.id) ?? 0) + 1);
      }
    }
  }
  const queue = [...flow.steps.filter((s) => inDegree.get(s.id) === 0)].map(
    (s) => s.id,
  );
  let sorted = 0;
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted++;
    for (const neighbor of adj.get(node) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }
  if (sorted < flow.steps.length) {
    e("I1", "Flow contains a cycle — not a valid DAG");
  }

  // ── I3: No Orphans ──────────────────────────────────────
  // BFS from all roots — every step must be reachable
  const reachable = new Set<string>();
  const bfsQueue = roots.map((s) => s.id);
  while (bfsQueue.length > 0) {
    const node = bfsQueue.shift()!;
    if (reachable.has(node)) continue;
    reachable.add(node);
    for (const neighbor of adj.get(node) ?? []) {
      if (!reachable.has(neighbor)) bfsQueue.push(neighbor);
    }
  }
  for (const step of flow.steps) {
    if (!reachable.has(step.id)) {
      e("I3", `Step "${step.id}" is an orphan — not reachable from any root`, step.id);
    }
  }

  // ── Step Type Contracts ──────────────────────────────────
  for (const step of flow.steps) {
    validateStepTypeContract(step, e);
  }

  return errors;
}

/**
 * Validate step-type-specific contracts.
 */
function validateStepTypeContract(
  step: FlowStep,
  e: (invariant: string, message: string, stepId?: string) => void,
): void {
  const type: StepType = step.type;

  switch (type) {
    case "llm":
      if (!step.prompt || step.prompt.trim() === "") {
        e("llm-contract", `LLM step "${step.id}" must have a prompt`, step.id);
      }
      if (!step.outputSchema || step.outputSchema.length === 0) {
        e(
          "llm-contract",
          `LLM step "${step.id}" must have a non-empty outputSchema`,
          step.id,
        );
      }
      break;

    case "user-input":
      if (!step.inputSchema || step.inputSchema.length === 0) {
        e(
          "user-input-contract",
          `User-input step "${step.id}" must have inputSchema`,
          step.id,
        );
      }
      if (!step.outputSchema || step.outputSchema.length === 0) {
        e(
          "user-input-contract",
          `User-input step "${step.id}" must have outputSchema`,
          step.id,
        );
      }
      break;

    case "transform":
      if (!step.inputSchema || step.inputSchema.length === 0) {
        e(
          "transform-contract",
          `Transform step "${step.id}" must have inputSchema`,
          step.id,
        );
      }
      if (!step.outputSchema || step.outputSchema.length === 0) {
        e(
          "transform-contract",
          `Transform step "${step.id}" must have outputSchema`,
          step.id,
        );
      }
      break;

    case "validate":
      if (!step.inputSchema || step.inputSchema.length === 0) {
        e(
          "validate-contract",
          `Validate step "${step.id}" must have inputSchema`,
          step.id,
        );
      }
      if (!step.outputSchema || step.outputSchema.length === 0) {
        e(
          "validate-contract",
          `Validate step "${step.id}" must have outputSchema`,
          step.id,
        );
      }
      break;

    case "display":
      // display steps: inputSchema is SHOULD (not MUST), no hard failure
      break;

    case "chat":
      // chat steps: push a message to the chat panel. No hard schema requirements.
      break;
  }
}

/**
 * Validate all flows in a registry and return only the valid ones.
 * Logs errors for invalid flows.
 */
export function validateRegistry(flows: FlowDefinition[]): FlowDefinition[] {
  const valid: FlowDefinition[] = [];

  for (const flow of flows) {
    const errors = validateFlowDefinition(flow);
    if (errors.length === 0) {
      valid.push(flow);
    } else {
      console.error(
        `[ARCH-005] Flow "${flow.id}" failed validation (${errors.length} error${errors.length === 1 ? "" : "s"}):`,
      );
      for (const err of errors) {
        console.error(
          `  [${err.invariant}]${err.stepId ? ` step="${err.stepId}"` : ""}: ${err.message}`,
        );
      }
    }
  }

  return valid;
}
