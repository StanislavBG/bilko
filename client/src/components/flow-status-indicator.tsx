/**
 * FlowStatusIndicator / FlowProgressBanner — Adapters that bridge
 * FlowBusContext data to bilko-flow/react's FlowProgress component.
 *
 * FlowStatusIndicator  → FlowProgress mode="compact" (inline bottom panel)
 * FlowProgressBanner   → FlowProgress mode="full"    (full-width top banner)
 */

import { useMemo } from "react";
import { FlowProgress, type FlowProgressStep } from "bilko-flow/react";
import { useFlowBus, type FlowStatus, type FlowRegistration } from "@/contexts/flow-bus-context";
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

  return phases.map((phase, i) => ({
    id: phase.id,
    label: phase.label,
    status: i < currentIdx
      ? "complete" as const
      : i === currentIdx
        ? "active" as const
        : "pending" as const,
  }));
}

function toFlowStatus(status: FlowStatus): "idle" | "running" | "complete" | "error" {
  if (status === "complete") return "complete";
  return status;
}

// ── Compact indicator (bottom of chat) ──────────────────

interface FlowStatusIndicatorProps {
  onReset?: () => void;
}

export function FlowStatusIndicator({ onReset }: FlowStatusIndicatorProps) {
  const { flows } = useFlowBus();

  const activeFlows = useMemo(
    () => Array.from(flows.values()).filter((f) => f.status !== "idle"),
    [flows],
  );

  if (activeFlows.length === 0) return null;

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-sm px-4 py-2.5
      animate-in fade-in slide-in-from-bottom-2 duration-300">
      {activeFlows.map((flow) => {
        const steps = toProgressSteps(flow);
        const phases = getFlowPhases(flow.id);
        const activity = flow.phase && phases
          ? getPhaseLabel(phases, flow.phase)
          : undefined;

        return (
          <FlowProgress
            key={flow.id}
            mode="compact"
            steps={steps}
            label={flow.label}
            status={toFlowStatus(flow.status)}
            activity={activity}
            onReset={onReset}
          />
        );
      })}
    </div>
  );
}

// ── Full banner (top of page) ───────────────────────────

interface FlowProgressBannerProps {
  onReset?: () => void;
}

export function FlowProgressBanner({ onReset }: FlowProgressBannerProps) {
  const { flows } = useFlowBus();

  const activeFlows = useMemo(
    () => Array.from(flows.values()).filter((f) => f.status !== "idle"),
    [flows],
  );

  if (activeFlows.length === 0) return null;

  return (
    <div
      className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm
        px-6 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      {activeFlows.map((flow) => {
        const steps = toProgressSteps(flow);
        const phases = getFlowPhases(flow.id);
        const activity = flow.phase && phases
          ? getPhaseLabel(phases, flow.phase)
          : undefined;

        return (
          <FlowProgress
            key={flow.id}
            mode="full"
            steps={steps}
            label={flow.label}
            status={toFlowStatus(flow.status)}
            activity={activity}
            onReset={onReset}
          />
        );
      })}
    </div>
  );
}
