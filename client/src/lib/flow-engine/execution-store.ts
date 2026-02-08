/**
 * Execution Store — Persistent store for flow execution traces.
 *
 * When a flow runs (e.g., VideoDiscoveryFlow on the landing page),
 * its execution trace is written here. The Flow Explorer admin page
 * reads from here to display live and historical execution data.
 *
 * Persists completed runs to localStorage so they survive page reloads.
 * Keeps the last MAX_HISTORY_PER_FLOW executions per flow.
 */

import type { FlowExecution } from "@/lib/flow-inspector/types";

type Listener = () => void;

const STORAGE_KEY = "bilko-execution-history";
const MAX_HISTORY_PER_FLOW = 20;

// ── In-memory state ──────────────────────────────────────

/** Live (current) execution per flow — written to rapidly during runs */
const liveExecutions = new Map<string, FlowExecution>();
/** Historical completed executions per flow */
let history: Record<string, FlowExecution[]> = {};
const listeners = new Set<Listener>();
/** Cached snapshots for useSyncExternalStore (must return stable references) */
const historySnapshots = new Map<string, FlowExecution[]>();

// ── Persistence ──────────────────────────────────────────

function loadHistory(): Record<string, FlowExecution[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupted — start fresh
  }
  return {};
}

function saveHistory(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // localStorage full — trim oldest entries
    for (const flowId of Object.keys(history)) {
      history[flowId] = history[flowId].slice(-5);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Give up
    }
  }
}

// Load on init
history = loadHistory();

// ── Notify ───────────────────────────────────────────────

function notify(): void {
  historySnapshots.clear();
  listeners.forEach((fn) => fn());
}

// ── Public API ───────────────────────────────────────────

/**
 * Store or update a live execution trace.
 * Called by useFlowExecution on every state change.
 */
export function setExecution(flowId: string, execution: FlowExecution): void {
  liveExecutions.set(flowId, execution);

  // When execution completes or fails, archive to history
  if (execution.status === "completed" || execution.status === "failed") {
    if (!history[flowId]) history[flowId] = [];
    const idx = history[flowId].findIndex((e) => e.id === execution.id);
    if (idx === -1) {
      history[flowId].push(execution);
      if (history[flowId].length > MAX_HISTORY_PER_FLOW) {
        history[flowId] = history[flowId].slice(-MAX_HISTORY_PER_FLOW);
      }
    } else {
      history[flowId][idx] = execution;
    }
    saveHistory();
  }

  notify();
}

/** Get the live (current) execution trace for a flow. */
export function getExecution(flowId: string): FlowExecution | undefined {
  return liveExecutions.get(flowId);
}

/** Get all live execution traces. */
export function getAllExecutions(): FlowExecution[] {
  return Array.from(liveExecutions.values());
}

/** Get execution history for a flow (newest-first). Cached for useSyncExternalStore stability. */
export function getExecutionHistory(flowId: string): FlowExecution[] {
  let cached = historySnapshots.get(flowId);
  if (!cached) {
    cached = [...(history[flowId] ?? [])].reverse();
    historySnapshots.set(flowId, cached);
  }
  return cached;
}

/** Get a specific historical execution by ID. */
export function getHistoricalExecution(
  flowId: string,
  executionId: string,
): FlowExecution | undefined {
  return history[flowId]?.find((e) => e.id === executionId);
}

/** Clear history for a flow. */
export function clearHistory(flowId: string): void {
  delete history[flowId];
  saveHistory();
  notify();
}

/** Subscribe to execution changes. Returns unsubscribe. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
