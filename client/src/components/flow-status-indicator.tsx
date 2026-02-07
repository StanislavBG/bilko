/**
 * FlowStatusIndicator — Bottom-right overlay showing active flows.
 *
 * Reads from the FlowBus context and renders a compact pill for each
 * running flow. Admins can see flow ID, label, status, and phase at
 * a glance. Collapses to a single dot when no flows are active.
 */

import { useFlowBus, type FlowStatus } from "@/contexts/flow-bus-context";
import { Activity } from "lucide-react";

const STATUS_COLOR: Record<FlowStatus, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-green-500",
  complete: "bg-blue-500",
  error: "bg-red-500",
};

const STATUS_LABEL: Record<FlowStatus, string> = {
  idle: "Idle",
  running: "Running",
  complete: "Done",
  error: "Error",
};

export function FlowStatusIndicator() {
  const { flows } = useFlowBus();

  const activeFlows = Array.from(flows.values()).filter(
    (f) => f.status !== "idle",
  );

  if (activeFlows.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-1.5 items-end">
      {activeFlows.map((flow) => (
        <div
          key={flow.id}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full
            bg-background/90 backdrop-blur border border-border shadow-sm
            text-xs font-mono animate-in fade-in slide-in-from-right-2 duration-300"
        >
          {/* Status dot */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLOR[flow.status]} ${
              flow.status === "running" ? "animate-pulse" : ""
            }`}
          />

          {/* Flow info */}
          <Activity className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{flow.id}</span>
          <span className="text-foreground">{STATUS_LABEL[flow.status]}</span>

          {/* Phase (if set) */}
          {flow.phase && (
            <>
              <span className="text-muted-foreground/50">|</span>
              <span className="text-muted-foreground">{flow.phase}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
