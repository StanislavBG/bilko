/**
 * FlowStatusIndicator — Inline panel at the bottom of the chat showing
 * active flow status with mini progress visualization and reset button.
 *
 * Sits inside the left panel (not fixed/floating). Shows:
 * 1. Mini flow progress — ordered phase dots
 * 2. Status pill — flow ID, status, current phase
 * 3. Reset button — restarts the flow (or navigates home for main flow)
 */

import { useFlowBus, type FlowStatus, type FlowRegistration } from "@/contexts/flow-bus-context";
import { Activity, RotateCcw } from "lucide-react";

const STATUS_DOT: Record<FlowStatus, string> = {
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

// ── Known phase sequences per flow type ─────────────────
// These are the ordered phases for the mini progress dots.
// Falls back to just showing the current phase if flow ID is unknown.

const PHASE_SEQUENCES: Record<string, string[]> = {
  "ai-consultation":       ["intro", "setup", "questioning", "analyzing", "complete"],
  "recursive-interviewer":  ["intro", "setup", "questioning", "analyzing", "complete"],
  "linkedin-strategist":    ["intro", "goal", "setup", "conversation", "analyzing", "complete"],
  "socratic-architect":     ["intro", "setup", "questioning", "analyzing", "complete"],
  "video-discovery":        ["researching-topics", "select-topic", "ready"],
};

// Short labels for the phase dots
const PHASE_SHORT: Record<string, string> = {
  "intro": "Start",
  "setup": "Setup",
  "questioning": "Interview",
  "analyzing": "Analyzing",
  "complete": "Done",
  "researching-topics": "Research",
  "select-topic": "Pick Topic",
  "ready": "Watch",
};

function MiniFlowProgress({ flow }: { flow: FlowRegistration }) {
  const phases = PHASE_SEQUENCES[flow.id];
  if (!phases || !flow.phase) return null;

  const currentIdx = phases.indexOf(flow.phase);

  return (
    <div className="flex items-center gap-1 px-1">
      {phases.map((phase, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        const label = PHASE_SHORT[phase] ?? phase;

        return (
          <div key={phase} className="flex items-center gap-1">
            {/* Connector line between dots */}
            {i > 0 && (
              <div
                className={`h-px w-3 transition-colors duration-300 ${
                  isDone ? "bg-primary/60" : "bg-border"
                }`}
              />
            )}
            {/* Phase dot with tooltip */}
            <div className="relative group">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-green-500 ring-2 ring-green-500/30 scale-125"
                    : isDone
                      ? "bg-primary/60"
                      : "bg-muted-foreground/25"
                }`}
              />
              {/* Tooltip */}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
                px-1.5 py-0.5 rounded text-[10px] font-medium bg-popover text-popover-foreground
                border border-border shadow-sm whitespace-nowrap opacity-0
                group-hover:opacity-100 transition-opacity pointer-events-none">
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ──────────────────────────────────────

interface FlowStatusIndicatorProps {
  onReset?: () => void;
}

export function FlowStatusIndicator({ onReset }: FlowStatusIndicatorProps) {
  const { flows } = useFlowBus();

  const activeFlows = Array.from(flows.values()).filter(
    (f) => f.status !== "idle",
  );

  if (activeFlows.length === 0) return null;

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-sm px-4 py-2.5
      animate-in fade-in slide-in-from-bottom-2 duration-300">
      {activeFlows.map((flow) => (
        <div key={flow.id} className="space-y-2">
          {/* Mini flow progress */}
          <MiniFlowProgress flow={flow} />

          {/* Status pill + reset */}
          <div className="flex items-center gap-2">
            {/* Status dot */}
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[flow.status]} ${
                flow.status === "running" ? "animate-pulse" : ""
              }`}
            />

            {/* Flow info */}
            <Activity className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono text-muted-foreground truncate">{flow.id}</span>
            <span className="text-xs font-mono font-medium text-foreground">{STATUS_LABEL[flow.status]}</span>

            {/* Phase */}
            {flow.phase && (
              <>
                <span className="text-muted-foreground/40 text-xs">|</span>
                <span className="text-xs font-mono text-muted-foreground">{flow.phase}</span>
              </>
            )}

            {/* Reset button — pushed to the right */}
            {onReset && (
              <button
                onClick={onReset}
                className="ml-auto p-1 rounded-md text-muted-foreground/60
                  hover:text-foreground hover:bg-muted transition-colors"
                title="Reset flow"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
