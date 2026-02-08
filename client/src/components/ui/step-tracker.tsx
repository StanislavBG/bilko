/**
 * StepTracker — Thin, reusable progress bar for multi-step flows.
 *
 * Design:
 *   Line 1: Step dots + labels — shows full journey, highlights active step
 *   Line 2: Current activity — explains what is happening right now
 *   Line 3: Last step result — shows outcome of the previous step (optional)
 *
 * Only one step is "active" at a time. The rest are either done or upcoming.
 * Designed to be a slim, semi-transparent header that doesn't compete with content.
 */

import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export interface TrackerStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
}

export interface StepTrackerProps {
  steps: TrackerStep[];
  /** Line 2: what's happening right now */
  activity?: string;
  /** Line 3: result from the last completed step */
  lastResult?: string;
}

export function StepTracker({ steps, activity, lastResult }: StepTrackerProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5 space-y-1">
      {/* Line 1: Step dots + labels */}
      <div className="flex items-center gap-1 text-xs">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-1">
            {idx > 0 && (
              <span
                className={`w-4 h-px mx-0.5 ${
                  step.status === "complete" || step.status === "active"
                    ? "bg-primary/50"
                    : "bg-border"
                }`}
              />
            )}
            {step.status === "complete" && (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
            )}
            {step.status === "active" && (
              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
            )}
            {step.status === "pending" && (
              <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            )}
            {step.status === "error" && (
              <Circle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
            <span
              className={`whitespace-nowrap ${
                step.status === "active"
                  ? "text-foreground font-medium"
                  : step.status === "complete"
                  ? "text-muted-foreground"
                  : "text-muted-foreground/40"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Line 2: Current activity */}
      {activity && (
        <p className="text-xs text-muted-foreground truncate">{activity}</p>
      )}

      {/* Line 3: Last step result */}
      {lastResult && (
        <p className="text-xs text-green-600 dark:text-green-400 truncate">
          {lastResult}
        </p>
      )}
    </div>
  );
}
