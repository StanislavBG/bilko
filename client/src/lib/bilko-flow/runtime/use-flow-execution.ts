/**
 * Bilko Flow API — Execution Tracking Hook
 *
 * Wraps any async operation via `trackStep()` and records a full
 * execution trace (timing, I/O, errors, token usage) that feeds
 * directly into the Flow Explorer inspector.
 *
 * This is the bridge between "running a flow" and "inspecting a flow".
 */

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from "react";
import type {
  FlowExecution,
  StepExecution,
  StepStatus,
} from "../types";
import type { TokenUsage } from "../llm/client";
import {
  setExecution as storeExecution,
  getExecution as storeGetExecution,
  clearLiveExecution as storeClearLive,
  subscribe as storeSubscribe,
} from "./execution-store";

export interface TrackStepResult<T> {
  data: T;
  durationMs: number;
}

export interface UseFlowExecutionReturn {
  /** The full execution trace — pass this to FlowTimeline / StepDetail */
  execution: FlowExecution;
  /** Wrap any async operation to track it as a step */
  trackStep: <T>(
    stepId: string,
    input: unknown,
    fn: () => Promise<T>,
    meta?: { raw?: string; usage?: TokenUsage },
  ) => Promise<TrackStepResult<T>>;
  /** Mark a user-input step as resolved (no async needed) */
  resolveUserInput: (stepId: string, value: unknown) => void;
  /** Get the output of a completed step */
  getStepOutput: (stepId: string) => unknown;
  /** Get step status */
  getStepStatus: (stepId: string) => StepStatus;
  /** Reset all execution state */
  reset: () => void;
}

function createEmptyExecution(flowId: string): FlowExecution {
  return {
    id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    flowId,
    startedAt: Date.now(),
    status: "running",
    steps: {},
  };
}

export function useFlowExecution(flowId: string): UseFlowExecutionReturn {
  const [execution, setExecution] = useState<FlowExecution>(() =>
    createEmptyExecution(flowId),
  );

  // Keep a ref for synchronous access to step outputs
  const stepsRef = useRef<Record<string, StepExecution>>({});

  const updateStep = useCallback(
    (stepId: string, updates: Partial<StepExecution>) => {
      setExecution((prev) => {
        const current = prev.steps[stepId] ?? { stepId, status: "idle" as StepStatus };
        const updated = { ...current, ...updates };
        stepsRef.current[stepId] = updated;
        return {
          ...prev,
          steps: { ...prev.steps, [stepId]: updated },
        };
      });
    },
    [],
  );

  const trackStep = useCallback(
    async <T,>(
      stepId: string,
      input: unknown,
      fn: () => Promise<T>,
      meta?: { raw?: string; usage?: TokenUsage },
    ): Promise<TrackStepResult<T>> => {
      const startedAt = Date.now();
      updateStep(stepId, {
        stepId,
        status: "running",
        startedAt,
        input,
      });

      try {
        const data = await fn();
        const completedAt = Date.now();
        const durationMs = completedAt - startedAt;

        updateStep(stepId, {
          status: "success",
          completedAt,
          durationMs,
          output: data,
          rawResponse: meta?.raw,
          usage: meta?.usage,
        });

        return { data, durationMs };
      } catch (err) {
        const completedAt = Date.now();
        updateStep(stepId, {
          status: "error",
          completedAt,
          durationMs: completedAt - startedAt,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
    [updateStep],
  );

  const resolveUserInput = useCallback(
    (stepId: string, value: unknown) => {
      updateStep(stepId, {
        stepId,
        status: "success",
        startedAt: Date.now(),
        completedAt: Date.now(),
        durationMs: 0,
        output: value,
      });
    },
    [updateStep],
  );

  const getStepOutput = useCallback((stepId: string): unknown => {
    return stepsRef.current[stepId]?.output;
  }, []);

  const getStepStatus = useCallback((stepId: string): StepStatus => {
    return stepsRef.current[stepId]?.status ?? "idle";
  }, []);

  const reset = useCallback(() => {
    stepsRef.current = {};
    setExecution(createEmptyExecution(flowId));
  }, [flowId]);

  // Sync to global execution store so the Flow Explorer can read it
  useEffect(() => {
    storeExecution(flowId, execution);
  }, [flowId, execution]);

  // Clean up live execution from the store when this hook unmounts
  // (e.g. user navigates away from Dynamic Learning).
  useEffect(() => {
    return () => {
      storeClearLive(flowId);
    };
  }, [flowId]);

  return {
    execution,
    trackStep,
    resolveUserInput,
    getStepOutput,
    getStepStatus,
    reset,
  };
}

/**
 * useExecutionStore — Read execution traces from the global store.
 * Use this in the Flow Explorer / Flow Detail pages to display
 * execution data captured by running flows.
 */
export function useExecutionStore(flowId: string): FlowExecution | undefined {
  return useSyncExternalStore(
    storeSubscribe,
    () => storeGetExecution(flowId),
  );
}
