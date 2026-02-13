/**
 * StepTracker — Thin adapter that delegates to bilko-flow/react's
 * FlowProgress in auto mode (expands to rectangular cards when room). Preserves the existing API for
 * backward compatibility with flow components.
 */

import { FlowProgress, type FlowProgressStep } from "@/components/ui/flow-progress";

export type TrackerStep = FlowProgressStep;

export interface StepTrackerProps {
  steps: TrackerStep[];
  /** Line 2: what's happening right now */
  activity?: string;
  /** Line 3: result from the last completed step */
  lastResult?: string;
}

export function StepTracker({ steps, activity, lastResult }: StepTrackerProps) {
  return (
    <FlowProgress
      mode="auto"
      steps={steps}
      activity={activity}
      lastResult={lastResult}
    />
  );
}
