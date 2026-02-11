/**
 * FlowStatusIndicator / FlowProgressBanner — Thin adapters that bridge
 * the FlowBus context to the props-driven FlowProgress component.
 *
 * FlowStatusIndicator  → compact mode (inline bottom panel)
 * FlowProgressBanner   → full mode (wide banner with numbered stepper)
 *
 * These wrappers read FlowBus state and map it to FlowProgressStep[].
 * All visual logic lives in FlowProgress.
 */

import { useFlowBus, type FlowRegistration } from "@/contexts/flow-bus-context";
import { getFlowById } from "@/lib/bilko-flow";
import type { FlowPhase } from "@/lib/bilko-flow";
import { FlowProgress, type FlowProgressStep } from "@/components/ui/flow-progress";

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

/** Map FlowBus registration → FlowProgressStep[] */
function toProgressSteps(flow: FlowRegistration): FlowProgressStep[] {
  const phases = getFlowPhases(flow.id);
  if (!phases || !flow.phase) return [];

  const currentIdx = findPhaseIndex(phases, flow.phase);

  return phases.map((phase, i): FlowProgressStep => {
    const isActive = i === currentIdx;
    const isDone = i < currentIdx;
    return {
      id: phase.id,
      label: phase.label,
      status: isActive ? "active" : isDone ? "complete" : "pending",
    };
  });
}

/** Resolve the current activity text from phase */
function resolveActivity(flow: FlowRegistration): string | undefined {
  if (!flow.phase) return undefined;
  const phases = getFlowPhases(flow.id);
  return phases ? getPhaseLabel(phases, flow.phase) : flow.phase;
}

// ── FlowStatusIndicator (compact) ───────────────────────

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

// ── FlowProgressBanner (full) ───────────────────────────

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
    <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm
      animate-in fade-in slide-in-from-bottom-2 duration-300">
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
