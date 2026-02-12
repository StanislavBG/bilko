/**
 * FlowStatusIndicator / FlowProgressBanner — Adapters that bridge
 * FlowBusContext data to bilko-flow/react's FlowProgress component.
 *
 * FlowStatusIndicator  → FlowProgress mode="compact" (inline bottom panel)
 * FlowProgressBanner   → FlowProgress mode="full"    (full-width top banner)
 */

import { useMemo } from "react";
import { FlowProgress, type FlowProgressStep } from "bilko-flow/react";
import { useFlowBus, type FlowRegistration } from "@/contexts/flow-bus-context";
import { getFlowById } from "@/lib/bilko-flow";
import type { FlowPhase } from "@/lib/bilko-flow";

// ── Phase resolution from flow registry ─────────────────

function getFlowPhases(flowId: string): FlowPhase[] | null {
  const def = getFlowById(flowId);
  return def?.phases ?? null;
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
  }));
}

/** Resolve the current activity text from phase */
function resolveActivity(flow: FlowRegistration): string | undefined {
  if (!flow.phase) return undefined;
  const phases = getFlowPhases(flow.id);
  return phases ? getPhaseLabel(phases, flow.phase) : flow.phase;
}

// ── Compact indicator (under chat panel) ─────────────────

interface FlowStatusIndicatorProps {
  onReset?: () => void;
  /** Show only this flow (e.g. "bilko-main") */
  flowId?: string;
}

export function FlowStatusIndicator({ onReset, flowId }: FlowStatusIndicatorProps) {
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

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-sm
      animate-in fade-in slide-in-from-bottom-2 duration-300">
      {activeFlows.map((flow) => (
        <FlowProgress
          key={flow.id}
          mode="compact"
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
    <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm
      px-6 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {activeFlows.map((flow) => (
        <FlowProgress
          key={flow.id}
          mode="full"
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
