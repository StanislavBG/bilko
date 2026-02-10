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
import { getFlowById } from "@/lib/bilko-flow";
import type { FlowPhase } from "@/lib/bilko-flow";
import { Activity, RotateCcw, Check } from "lucide-react";

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

// ── Phase resolution from flow registry ─────────────────
// Reads phases from FlowDefinition.phases (the single source of truth).
// Falls back gracefully if the flow has no phases defined.

function getFlowPhases(flowId: string): FlowPhase[] | null {
  const def = getFlowById(flowId);
  return def?.phases ?? null;
}

function getPhaseLabel(phases: FlowPhase[], phaseId: string): string {
  const found = phases.find((p) => p.id === phaseId);
  return found?.label ?? phaseId;
}

/** Find the index of the phase matching the current bus phase.
 *  Also checks if the phase sits "between" declared phases
 *  (i.e. it belongs to a phase's stepIds but isn't the phase's own id). */
function findPhaseIndex(phases: FlowPhase[], currentPhase: string): number {
  // 1. Exact match on phase id
  const exact = phases.findIndex((p) => p.id === currentPhase);
  if (exact >= 0) return exact;

  // 2. Check if the current phase matches a stepId inside a phase group
  for (let i = 0; i < phases.length; i++) {
    if (phases[i].stepIds.includes(currentPhase)) return i;
  }

  return -1;
}

function MiniFlowProgress({ flow }: { flow: FlowRegistration }) {
  const phases = getFlowPhases(flow.id);
  if (!phases || !flow.phase) return null;

  const currentIdx = findPhaseIndex(phases, flow.phase);

  return (
    <div className="flex items-center gap-1 px-1">
      {phases.map((phase, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;

        return (
          <div key={phase.id} className="flex items-center gap-1">
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
                {phase.label}
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
                <span className="text-xs font-mono text-muted-foreground">
                  {(() => {
                    const phases = getFlowPhases(flow.id);
                    return phases ? getPhaseLabel(phases, flow.phase) : flow.phase;
                  })()}
                </span>
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

// ── Banner stepper — large horizontal step visualization ──

function BannerStepper({ flow }: { flow: FlowRegistration }) {
  const phases = getFlowPhases(flow.id);
  if (!phases || !flow.phase) return null;

  const currentIdx = findPhaseIndex(phases, flow.phase);

  return (
    <div className="flex items-start w-full">
      {phases.map((phase, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;

        return (
          <div key={phase.id} className="flex items-start flex-1 last:flex-initial">
            {/* Step circle + label column */}
            <div className="flex flex-col items-center gap-2 min-w-[56px]">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold
                  transition-all duration-500 shrink-0 ${
                  isActive
                    ? "bg-green-500 text-white ring-4 ring-green-500/20 scale-110"
                    : isDone
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground/60"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-[11px] font-medium leading-tight text-center transition-colors duration-300 ${
                  isActive
                    ? "text-green-600 dark:text-green-400"
                    : isDone
                      ? "text-foreground"
                      : "text-muted-foreground/60"
                }`}
              >
                {phase.label}
              </span>
            </div>

            {/* Connector line — sits at circle midpoint (h-9/2 = 18px from top) */}
            {i < phases.length - 1 && (
              <div
                className={`flex-1 h-0.5 mt-[18px] mx-1.5 rounded-full transition-colors duration-500 ${
                  isDone ? "bg-primary/60" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Maximized flow progress banner ──────────────────────
//
// Full-width top banner shown when a subflow is running.
// Replaces the compact bottom indicator with a prominent stepper.

interface FlowProgressBannerProps {
  onReset?: () => void;
}

export function FlowProgressBanner({ onReset }: FlowProgressBannerProps) {
  const { flows } = useFlowBus();

  const activeFlows = Array.from(flows.values()).filter(
    (f) => f.status !== "idle",
  );

  if (activeFlows.length === 0) return null;

  return (
    <div
      className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm
        px-6 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      {activeFlows.map((flow) => (
        <div key={flow.id} className="space-y-4">
          {/* Header row: status dot + flow label + status + phase + reset */}
          <div className="flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[flow.status]} ${
                flow.status === "running" ? "animate-pulse" : ""
              }`}
            />
            <span className="font-semibold text-sm">{flow.label}</span>
            <span className="text-xs font-mono text-muted-foreground">
              {STATUS_LABEL[flow.status]}
            </span>
            {flow.phase && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">
                  {(() => {
                    const phases = getFlowPhases(flow.id);
                    return phases ? getPhaseLabel(phases, flow.phase) : flow.phase;
                  })()}
                </span>
              </>
            )}

            {onReset && (
              <button
                onClick={onReset}
                className="ml-auto p-1.5 rounded-md text-muted-foreground/60
                  hover:text-foreground hover:bg-muted transition-colors"
                title="Reset flow"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Full-width stepper */}
          <BannerStepper flow={flow} />
        </div>
      ))}
    </div>
  );
}
