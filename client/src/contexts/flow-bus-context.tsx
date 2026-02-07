/**
 * FlowBus — Loosely-coupled communication between flows.
 *
 * Each flow registers itself with an ID when it mounts and unregisters
 * on unmount. Flows publish typed messages to the bus; any subscriber
 * (including the main conversation) can listen for messages addressed
 * to a specific target or broadcast to all.
 *
 * This enforces separation of concerns: flows never import each other,
 * they only know about the bus.
 */

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";

// ── Types ────────────────────────────────────────────────

export type FlowStatus = "idle" | "running" | "complete" | "error";

export interface FlowRegistration {
  /** Unique flow identifier (e.g. "ai-consultation", "video-discovery") */
  id: string;
  /** Human-readable label for the indicator */
  label: string;
  /** Current status */
  status: FlowStatus;
  /** Current phase/step within the flow (flow-specific) */
  phase?: string;
  /** Timestamp of last status change */
  updatedAt: number;
}

export interface FlowMessage {
  /** Flow that sent the message */
  from: string;
  /** Target flow ID, or "main" for the main conversation, or "*" for broadcast */
  to: string;
  /** Message type — consumers switch on this */
  type: "summary" | "status-change" | "error" | "data";
  /** Payload — shape depends on type */
  payload: Record<string, unknown>;
  /** Auto-assigned */
  timestamp: number;
}

type MessageHandler = (message: FlowMessage) => void;

// ── Context interface ────────────────────────────────────

interface FlowBusContextValue {
  /** All currently registered flows */
  flows: Map<string, FlowRegistration>;

  /** Register a flow when it mounts */
  registerFlow: (id: string, label: string) => void;

  /** Unregister a flow when it unmounts */
  unregisterFlow: (id: string) => void;

  /** Update a flow's status and optional phase */
  updateFlowStatus: (id: string, status: FlowStatus, phase?: string) => void;

  /** Publish a message to the bus */
  publish: (message: Omit<FlowMessage, "timestamp">) => void;

  /** Subscribe to messages for a target flow ID (or "*" for all) */
  subscribe: (targetId: string, handler: MessageHandler) => () => void;
}

// ── Provider ─────────────────────────────────────────────

const FlowBusCtx = createContext<FlowBusContextValue | undefined>(undefined);

export function FlowBusProvider({ children }: { children: ReactNode }) {
  const [flows, setFlows] = useState<Map<string, FlowRegistration>>(new Map());

  // Subscriber map: targetId → Set<handler>
  const subscribersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());

  const registerFlow = useCallback((id: string, label: string) => {
    setFlows((prev) => {
      const next = new Map(prev);
      next.set(id, {
        id,
        label,
        status: "running",
        updatedAt: Date.now(),
      });
      return next;
    });
  }, []);

  const unregisterFlow = useCallback((id: string) => {
    setFlows((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateFlowStatus = useCallback(
    (id: string, status: FlowStatus, phase?: string) => {
      setFlows((prev) => {
        const existing = prev.get(id);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(id, {
          ...existing,
          status,
          phase,
          updatedAt: Date.now(),
        });
        return next;
      });
    },
    [],
  );

  const publish = useCallback(
    (msg: Omit<FlowMessage, "timestamp">) => {
      const full: FlowMessage = { ...msg, timestamp: Date.now() };

      // Deliver to exact-match subscribers
      const targetSubs = subscribersRef.current.get(msg.to);
      if (targetSubs) {
        targetSubs.forEach((handler) => handler(full));
      }

      // Deliver to wildcard subscribers
      const wildcardSubs = subscribersRef.current.get("*");
      if (wildcardSubs) {
        wildcardSubs.forEach((handler) => handler(full));
      }
    },
    [],
  );

  const subscribe = useCallback(
    (targetId: string, handler: MessageHandler): (() => void) => {
      if (!subscribersRef.current.has(targetId)) {
        subscribersRef.current.set(targetId, new Set());
      }
      subscribersRef.current.get(targetId)!.add(handler);

      // Return unsubscribe function
      return () => {
        const subs = subscribersRef.current.get(targetId);
        if (subs) {
          subs.delete(handler);
          if (subs.size === 0) {
            subscribersRef.current.delete(targetId);
          }
        }
      };
    },
    [],
  );

  return (
    <FlowBusCtx.Provider
      value={{ flows, registerFlow, unregisterFlow, updateFlowStatus, publish, subscribe }}
    >
      {children}
    </FlowBusCtx.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────

export function useFlowBus(): FlowBusContextValue {
  const ctx = useContext(FlowBusCtx);
  if (ctx === undefined) {
    throw new Error("useFlowBus must be used within a FlowBusProvider");
  }
  return ctx;
}

/**
 * Hook for a flow component to register itself, update status, and
 * publish messages. Handles cleanup on unmount automatically.
 */
export function useFlowRegistration(flowId: string, label: string) {
  const { registerFlow, unregisterFlow, updateFlowStatus, publish } =
    useFlowBus();

  useEffect(() => {
    registerFlow(flowId, label);
    return () => unregisterFlow(flowId);
  }, [flowId, label, registerFlow, unregisterFlow]);

  const setStatus = useCallback(
    (status: FlowStatus, phase?: string) => {
      updateFlowStatus(flowId, status, phase);
    },
    [flowId, updateFlowStatus],
  );

  const send = useCallback(
    (to: string, type: FlowMessage["type"], payload: Record<string, unknown>) => {
      publish({ from: flowId, to, type, payload });
    },
    [flowId, publish],
  );

  return { setStatus, send };
}
