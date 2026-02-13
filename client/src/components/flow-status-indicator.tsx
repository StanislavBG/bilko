/**
 * FlowStatusIndicator / FlowProgressBanner — Adapters that bridge
 * FlowBusContext data to bilko-flow/react's FlowProgress component.
 *
 * FlowStatusIndicator  → FlowProgress (configurable mode)
 * FlowProgressBanner   → FlowProgress mode="expanded" (full-width top banner, rectangular cards)
 */

import { useMemo } from "react";
import { FlowProgress, type FlowProgressStep, type FlowProgressProps } from "@/components/ui/flow-progress";
import { useFlowBus, type FlowRegistration } from "@/contexts/flow-bus-context";
import { getFlowById } from "@/lib/bilko-flow";
import type { FlowPhase, FlowDefinition } from "@/lib/bilko-flow";

// ── Phase resolution from flow registry ─────────────────

function getFlowDef(flowId: string): FlowDefinition | undefined {
  return getFlowById(flowId);
}

function getFlowPhases(flowId: string): FlowPhase[] | null {
  const def = getFlowDef(flowId);
  return def?.phases ?? null;
}

/** Derive a dominant step type from the first step in a phase */
function getPhaseType(flowId: string, phase: FlowPhase): string | undefined {
  const def = getFlowDef(flowId);
  if (!def) return undefined;
  const firstStepId = phase.stepIds[0];
  const step = def.steps.find((s) => s.id === firstStepId);
  if (!step) return undefined;
  return step.subtype ? `${step.type}:${step.subtype}` : step.type;
}

function getPhaseLabel(phases: FlowPhase[], phaseId: string): string {
  const found = phases.find((p) => p.id === phaseId);
  return found?.label ?? phaseId;
}

function findPhaseIndex(phases: FlowPhase[], currentPhase: string): number {
  const exact = phases.findIndex((p) => p.id === currentPhase);
  if (exact >= 0) return exact;
  for (let i = 0; i < phases.length; i++) {
    if (phases[i].stepIds.includes(currentPhase)) return i;
  }
  return -1;
}

// ── Bridge: FlowRegistration → FlowProgressStep[] ──────

function toProgressSteps(flow: FlowRegistration): FlowProgressStep[] {
  const phases = getFlowPhases(flow.id);
  if (!phases || !flow.phase) return [];

  const currentIdx = findPhaseIndex(phases, flow.phase);

  return phases.map((phase, i): FlowProgressStep => ({
    id: phase.id,
    label: phase.label,
    status: i < currentIdx
      ? "complete"
      : i === currentIdx
        ? "active"
        : "pending",
    type: getPhaseType(flow.id, phase),
  }));
}

/** Resolve the current activity text from phase */
function resolveActivity(flow: FlowRegistration): string | undefined {
  if (!flow.phase) return undefined;
  const phases = getFlowPhases(flow.id);
  return phases ? getPhaseLabel(phases, flow.phase) : flow.phase;
}

// ── Flow status indicator ─────────────────────────────────

interface FlowStatusIndicatorProps {
  onReset?: () => void;
  /** Show only this flow (e.g. "bilko-main") */
  flowId?: string;
  /** Position determines border placement: "top" uses border-b, "bottom" (default) uses border-t */
  position?: "top" | "bottom";
  /** Display mode — "compact" for tight spaces, "auto" adapts to container width.
   *  Defaults to "compact". */
  mode?: FlowProgressProps["mode"];
}

export function FlowStatusIndicator({ onReset, flowId, position = "bottom", mode = "compact" }: FlowStatusIndicatorProps) {
  const { flows } = useFlowBus();

  const activeFlows = useMemo(
    () => Array.from(flows.values()).filter((f) => {
      if (f.status === "idle") return false;
      if (flowId && f.id !== flowId) return false;
      return true;
    }),
    [flows, flowId],
  );

  if (activeFlows.length === 0) return null;

  const isLarge = mode === "auto" || mode === "expanded" || mode === "full";
  const borderClass = position === "top" ? "border-b" : "border-t";

  return (
    <div
      className={`${borderClass} border-border shrink-0 w-full ${isLarge ? "px-3 py-2 bg-background/95 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300" : ""}`}
    >
      {activeFlows.map((flow) => (
        <FlowProgress
          key={flow.id}
          mode={mode}
          steps={toProgressSteps(flow)}
          label={flow.label}
          status={flow.status}
          activity={resolveActivity(flow)}
          onReset={onReset}
        />
      ))}
      <div className={`${position === "top" ? "border-b" : "border-t"} border-border/40 mx-3`} />
    </div>
  );
}

// ── Full banner (under right panel) ──────────────────────

interface FlowProgressBannerProps {
  onReset?: () => void;
  /** Exclude this flow so only subflows show */
  excludeFlowId?: string;
}

export function FlowProgressBanner({ onReset, excludeFlowId }: FlowProgressBannerProps) {
  const { flows } = useFlowBus();

  const activeFlows = useMemo(
    () => Array.from(flows.values()).filter((f) => {
      if (f.status === "idle") return false;
      if (excludeFlowId && f.id === excludeFlowId) return false;
      return true;
    }),
    [flows, excludeFlowId],
  );

  if (activeFlows.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-border/40 bg-background/95 backdrop-blur-sm
      px-6 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {activeFlows.map((flow) => (
        <FlowProgress
          key={flow.id}
          mode="expanded"
          steps={toProgressSteps(flow)}
          label={flow.label}
          status={flow.status}
          activity={resolveActivity(flow)}
          onReset={onReset}
        />
      ))}
    </div>
  );
}
