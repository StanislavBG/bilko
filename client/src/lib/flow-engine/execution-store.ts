/**
 * Execution Store — Global in-memory store for flow execution traces.
 *
 * When a flow runs (e.g., VideoDiscoveryFlow on the landing page),
 * its execution trace is written here. The Flow Explorer admin page
 * reads from here to display live and historical execution data.
 *
 * Simple pub/sub pattern — no React context needed.
 */

import type { FlowExecution } from "@/lib/flow-inspector/types";

type Listener = () => void;

const executions = new Map<string, FlowExecution>();
const listeners = new Set<Listener>();

/**
 * Store or update an execution trace.
 * Called by useFlowExecution on every state change.
 */
export function setExecution(flowId: string, execution: FlowExecution): void {
  executions.set(flowId, execution);
  listeners.forEach((fn) => fn());
}

/**
 * Get the latest execution trace for a flow.
 */
export function getExecution(flowId: string): FlowExecution | undefined {
  return executions.get(flowId);
}

/**
 * Get all stored execution traces.
 */
export function getAllExecutions(): FlowExecution[] {
  return Array.from(executions.values());
}

/**
 * Subscribe to execution changes. Returns an unsubscribe function.
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
