/**
 * Bilko Flow API — Flow Definition Bridge
 *
 * Connects flow implementation components to their registry definitions.
 * Ensures flow components stay consistent with ARCH-005 steel frame
 * by providing runtime access to the validated FlowDefinition.
 *
 * This bridge enforces the separation between:
 * 1. Framework templates (definitions: types, validation, registry)
 * 2. Flow implementation (flow components: execution logic)
 * 3. UX rendering (component JSX output)
 *
 * Flow components should use this hook to:
 * - Access their step definitions from the registry
 * - Verify their flow ID is registered and validated
 * - Log warnings when a component's flow is missing from registry
 */

import { useRef } from "react";
import { getFlowById } from "../definitions/registry";
import type { FlowDefinition, FlowStep } from "../types";

export interface FlowDefinitionBridge {
  /** The validated FlowDefinition from the registry, or null if not found */
  definition: FlowDefinition | null;
  /** Whether this flow ID exists in the validated registry */
  isRegistered: boolean;
  /** Get a specific step definition by ID */
  getStep: (stepId: string) => FlowStep | undefined;
  /** Get step IDs in topological order (dependency-respecting) */
  stepIds: string[];
  /** The flow's version from the registry */
  version: string | null;
}

/**
 * Hook that bridges a flow component to its registry definition.
 *
 * Usage:
 * ```tsx
 * function MyFlow() {
 *   const { definition, getStep, isRegistered } = useFlowDefinition("my-flow-id");
 *
 *   // Access step metadata from registry
 *   const researchStep = getStep("research-steps");
 *   // researchStep?.prompt, researchStep?.outputSchema, etc.
 * }
 * ```
 */
export function useFlowDefinition(flowId: string): FlowDefinitionBridge {
  const warnedRef = useRef(false);

  const definition = getFlowById(flowId) ?? null;

  // Log once if flow is not in registry (dev aid, not a runtime error)
  if (!definition && !warnedRef.current) {
    warnedRef.current = true;
    console.warn(
      `[flow-bridge] Flow "${flowId}" not found in validated registry. ` +
      `Ensure it is registered in bilko-flow/definitions/registry.ts and passes ARCH-005 validation.`
    );
  }

  const getStep = (stepId: string): FlowStep | undefined => {
    return definition?.steps.find((s) => s.id === stepId);
  };

  const stepIds = definition?.steps.map((s) => s.id) ?? [];

  return {
    definition,
    isRegistered: definition !== null,
    getStep,
    stepIds,
    version: definition?.version ?? null,
  };
}
