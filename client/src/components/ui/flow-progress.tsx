/**
 * FlowProgress — Unified, adaptive progress component for multi-step flows.
 *
 * Single component, two visual modes:
 *   mode="full"    — Large numbered circles, labels below, connector bars, header row.
 *                     Use in banners, footers, dedicated progress sections.
 *   mode="compact" — Small status icons + inline text labels, thin connectors.
 *                     Use inline within content, sidebars, mobile.
 *
 * Sliding Window:
 *   When the step count exceeds what can comfortably render, the component
 *   shows: [1] ... [X-2] [X-1] [X] [X+1] [X+2] ... [N]
 *   Ellipsis markers are interactive — hover to see hidden steps, click to jump.
 *
 * Adaptive Labeling:
 *   - Active step: full text, bold
 *   - Immediate neighbors (±1): truncated text
 *   - Distant steps & endpoints: icon/number only (full mode) or omitted (compact)
 */

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  MoreHorizontal,
  RotateCcw,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────

export interface FlowProgressStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
}

export interface FlowProgressProps {
  /** Visual mode — "full" for banner/footer, "compact" for inline */
  mode: "full" | "compact";

  /** Steps to display, in order */
  steps: FlowProgressStep[];

  /** Flow name (shown in full mode header row) */
  label?: string;

  /** Overall flow status */
  status?: "idle" | "running" | "complete" | "error";

  /** Current activity description */
  activity?: string;

  /** Result from last completed step (compact mode line 3) */
  lastResult?: string;

  /** Called when user clicks reset/restart */
  onReset?: () => void;

  /** Called when user clicks a step (from ellipsis dropdown or direct) */
  onStepClick?: (stepId: string) => void;

  /** Additional CSS classes on root element */
  className?: string;
}

// ── Sliding window logic ──────────────────────────────────

interface WindowEntry {
  type: "step";
  step: FlowProgressStep;
  originalIndex: number;
}

interface EllipsisEntry {
  type: "ellipsis";
  hiddenSteps: Array<FlowProgressStep & { originalIndex: number }>;
}

type VisibleEntry = WindowEntry | EllipsisEntry;

/**
 * Compute which steps are visible and where ellipses go.
 *
 * Always visible: first, last, active ± radius.
 * Ellipsis shown when gaps exist between visible ranges.
 */
function computeWindow(
  steps: FlowProgressStep[],
  radius: number,
): VisibleEntry[] {
  const N = steps.length;
  if (N === 0) return [];

  // Find the active step index (or last completed, or 0)
  let activeIdx = steps.findIndex((s) => s.status === "active");
  if (activeIdx === -1) {
    // No active — find last completed
    for (let i = N - 1; i >= 0; i--) {
      if (steps[i].status === "complete") {
        activeIdx = i;
        break;
      }
    }
    if (activeIdx === -1) activeIdx = 0;
  }

  // If all steps fit comfortably, show everything
  const maxVisible = 2 * radius + 3; // first + window(2r+1) + last
  if (N <= maxVisible) {
    return steps.map((step, i) => ({ type: "step", step, originalIndex: i }));
  }

  // Build the set of indices that must be visible
  const visible = new Set<number>();
  visible.add(0); // first
  visible.add(N - 1); // last
  for (
    let i = Math.max(0, activeIdx - radius);
    i <= Math.min(N - 1, activeIdx + radius);
    i++
  ) {
    visible.add(i);
  }

  // Sort visible indices and build entries with ellipsis gaps
  const sorted = Array.from(visible).sort((a, b) => a - b);
  const result: VisibleEntry[] = [];

  for (let j = 0; j < sorted.length; j++) {
    const idx = sorted[j];

    // Check gap from previous visible index
    if (j > 0) {
      const prevIdx = sorted[j - 1];
      if (idx - prevIdx > 1) {
        // There's a gap — collect hidden steps
        const hidden: Array<FlowProgressStep & { originalIndex: number }> = [];
        for (let k = prevIdx + 1; k < idx; k++) {
          hidden.push({ ...steps[k], originalIndex: k });
        }
        result.push({ type: "ellipsis", hiddenSteps: hidden });
      }
    }

    result.push({ type: "step", step: steps[idx], originalIndex: idx });
  }

  return result;
}

// ── Ellipsis dropdown ─────────────────────────────────────

function EllipsisDropdown({
  hiddenSteps,
  onStepClick,
  side = "bottom",
}: {
  hiddenSteps: Array<FlowProgressStep & { originalIndex: number }>;
  onStepClick?: (stepId: string) => void;
  side?: "bottom" | "top";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-0.5 px-1 py-0.5 rounded text-muted-foreground/60
          hover:text-foreground hover:bg-muted/50 transition-colors group"
        title={`${hiddenSteps.length} hidden step${hiddenSteps.length > 1 ? "s" : ""}`}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 z-50 min-w-[180px] max-w-[260px]",
            "rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
            "py-1.5 animate-in fade-in zoom-in-95 duration-150",
            side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
          )}
        >
          <div className="px-2 pb-1 mb-1 border-b border-border">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {hiddenSteps.length} hidden step{hiddenSteps.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="max-h-[200px] overflow-auto">
            {hiddenSteps.map((step) => (
              <button
                key={step.id}
                onClick={() => {
                  onStepClick?.(step.id);
                  setOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2
                  hover:bg-muted/50 transition-colors"
              >
                <StepStatusIcon status={step.status} size="sm" />
                <span className="truncate">
                  <span className="text-muted-foreground font-mono mr-1">
                    {step.originalIndex + 1}.
                  </span>
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared status icon ────────────────────────────────────

function StepStatusIcon({
  status,
  size = "sm",
}: {
  status: FlowProgressStep["status"];
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  switch (status) {
    case "complete":
      return <CheckCircle2 className={cn(cls, "text-green-500 shrink-0")} />;
    case "active":
      return (
        <Loader2
          className={cn(cls, "text-primary animate-spin shrink-0")}
        />
      );
    case "error":
      return <XCircle className={cn(cls, "text-red-500 shrink-0")} />;
    case "pending":
    default:
      return (
        <Circle className={cn(cls, "text-muted-foreground/40 shrink-0")} />
      );
  }
}

// ── Full mode (banner stepper) ────────────────────────────

const STATUS_DOT: Record<string, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-green-500",
  complete: "bg-blue-500",
  error: "bg-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  idle: "Idle",
  running: "Running",
  complete: "Done",
  error: "Error",
};

function FullMode({
  steps,
  entries,
  label,
  status,
  activity,
  onReset,
  onStepClick,
}: FlowProgressProps & { entries: VisibleEntry[] }) {
  const activeStep = steps.find((s) => s.status === "active");
  const completedCount = steps.filter((s) => s.status === "complete").length;
  const flowStatus = status ?? "idle";

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "w-2.5 h-2.5 rounded-full shrink-0",
            STATUS_DOT[flowStatus],
            flowStatus === "running" && "animate-pulse",
          )}
        />
        {label && <span className="font-semibold text-sm">{label}</span>}
        <span className="text-xs font-mono text-muted-foreground">
          {STATUS_LABEL[flowStatus]}
        </span>
        {activeStep && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-xs text-muted-foreground">
              {activeStep.label}
            </span>
          </>
        )}
        <span className="text-xs text-muted-foreground/60 ml-auto mr-2 font-mono">
          {completedCount}/{steps.length}
        </span>
        {onReset && (
          <button
            onClick={onReset}
            className="p-1.5 rounded-md text-muted-foreground/60
              hover:text-foreground hover:bg-muted transition-colors"
            title="Reset flow"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Stepper row */}
      <div className="flex items-start w-full">
        {entries.map((entry, i) => {
          if (entry.type === "ellipsis") {
            return (
              <div
                key={`ellipsis-${i}`}
                className="flex items-start flex-initial"
              >
                {/* Connector before ellipsis */}
                <div className="flex-1 h-0.5 mt-[18px] mx-1 rounded-full bg-border min-w-[12px]" />
                <div className="flex flex-col items-center gap-2 min-w-[36px]">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center
                    border-2 border-dashed border-muted-foreground/30 bg-muted/50">
                    <EllipsisDropdown
                      hiddenSteps={entry.hiddenSteps}
                      onStepClick={onStepClick}
                      side="bottom"
                    />
                  </div>
                </div>
                {/* Connector after ellipsis */}
                <div className="flex-1 h-0.5 mt-[18px] mx-1 rounded-full bg-border min-w-[12px]" />
              </div>
            );
          }

          const { step, originalIndex } = entry;
          const isActive = step.status === "active";
          const isDone = step.status === "complete";
          const isError = step.status === "error";
          const isLast = i === entries.length - 1;

          // Determine label visibility: active + immediate neighbors get labels
          const activeEntryIdx = entries.findIndex(
            (e) => e.type === "step" && e.step.status === "active",
          );
          const distFromActive = Math.abs(i - activeEntryIdx);
          const showLabel = distFromActive <= 2 || i === 0 || isLast;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start",
                isLast ? "flex-initial" : "flex-1",
              )}
            >
              {/* Step circle + label column */}
              <button
                onClick={() => onStepClick?.(step.id)}
                className="flex flex-col items-center gap-2 min-w-[56px] group"
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold",
                    "transition-all duration-500 shrink-0",
                    isActive &&
                      "bg-green-500 text-white ring-4 ring-green-500/20 scale-110",
                    isDone && "bg-primary text-primary-foreground",
                    isError && "bg-red-500 text-white",
                    !isActive &&
                      !isDone &&
                      !isError &&
                      "bg-muted text-muted-foreground/60",
                  )}
                >
                  {isDone ? (
                    <Check className="h-4 w-4" />
                  ) : isError ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    originalIndex + 1
                  )}
                </div>
                {showLabel && (
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-tight text-center transition-colors duration-300",
                      "max-w-[72px]",
                      isActive
                        ? "text-green-600 dark:text-green-400"
                        : isDone
                          ? "text-foreground"
                          : "text-muted-foreground/60",
                      distFromActive > 1 && !isActive && "truncate",
                    )}
                  >
                    {step.label}
                  </span>
                )}
                {!showLabel && (
                  <span className="text-[10px] text-muted-foreground/40 font-mono">
                    #{originalIndex + 1}
                  </span>
                )}
              </button>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mt-[18px] mx-1.5 rounded-full transition-colors duration-500",
                    isDone ? "bg-primary/60" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress track (thin background bar) */}
      {steps.length > 1 && (
        <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/40 rounded-full transition-all duration-700"
            style={{
              width: `${(completedCount / steps.length) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Activity text */}
      {activity && (
        <p className="text-xs text-muted-foreground truncate">{activity}</p>
      )}
    </div>
  );
}

// ── Compact mode (inline strip) ───────────────────────────

function CompactMode({
  steps,
  entries,
  activity,
  lastResult,
  onStepClick,
}: FlowProgressProps & { entries: VisibleEntry[] }) {
  return (
    <div className="space-y-1">
      {/* Step chain */}
      <div className="flex items-center gap-1 text-xs flex-wrap">
        {entries.map((entry, i) => {
          if (entry.type === "ellipsis") {
            return (
              <div key={`ellipsis-${i}`} className="flex items-center gap-1">
                <span className="w-4 h-px mx-0.5 bg-border" />
                <EllipsisDropdown
                  hiddenSteps={entry.hiddenSteps}
                  onStepClick={onStepClick}
                  side="bottom"
                />
                <span className="w-4 h-px mx-0.5 bg-border" />
              </div>
            );
          }

          const { step } = entry;
          const isFirst = i === 0;

          // Determine label display: active + neighbors get full text
          const activeEntryIdx = entries.findIndex(
            (e) => e.type === "step" && e.step.status === "active",
          );
          const distFromActive =
            activeEntryIdx >= 0 ? Math.abs(i - activeEntryIdx) : Infinity;
          const showFullLabel = step.status === "active" || distFromActive <= 1;
          const showTruncLabel = distFromActive === 2;
          const showLabel = showFullLabel || showTruncLabel;

          return (
            <div key={step.id} className="flex items-center gap-1">
              {/* Connector */}
              {!isFirst && (
                <span
                  className={cn(
                    "w-4 h-px mx-0.5",
                    step.status === "complete" || step.status === "active"
                      ? "bg-primary/50"
                      : "bg-border",
                  )}
                />
              )}
              {/* Icon */}
              <button
                onClick={() => onStepClick?.(step.id)}
                className="flex items-center gap-1 shrink-0"
              >
                <StepStatusIcon status={step.status} size="sm" />
                {showLabel && (
                  <span
                    className={cn(
                      "whitespace-nowrap",
                      step.status === "active"
                        ? "text-foreground font-medium"
                        : step.status === "complete"
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40",
                      showTruncLabel && "max-w-[60px] truncate",
                    )}
                  >
                    {step.label}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Activity text */}
      {activity && (
        <p className="text-xs text-muted-foreground truncate">{activity}</p>
      )}

      {/* Last result */}
      {lastResult && (
        <p className="text-xs text-green-600 dark:text-green-400 truncate">
          {lastResult}
        </p>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────

const WINDOW_RADIUS: Record<string, number> = {
  full: 2,
  compact: 2,
};

export function FlowProgress({
  mode,
  steps,
  label,
  status,
  activity,
  lastResult,
  onReset,
  onStepClick,
  className,
}: FlowProgressProps) {
  const radius = WINDOW_RADIUS[mode];
  const entries = useMemo(() => computeWindow(steps, radius), [steps, radius]);

  const wrapCls = cn(
    mode === "full"
      ? "px-6 py-4"
      : "rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5",
    className,
  );

  return (
    <div className={wrapCls}>
      {mode === "full" ? (
        <FullMode
          mode={mode}
          steps={steps}
          entries={entries}
          label={label}
          status={status}
          activity={activity}
          lastResult={lastResult}
          onReset={onReset}
          onStepClick={onStepClick}
          className={className}
        />
      ) : (
        <CompactMode
          mode={mode}
          steps={steps}
          entries={entries}
          label={label}
          status={status}
          activity={activity}
          lastResult={lastResult}
          onReset={onReset}
          onStepClick={onStepClick}
          className={className}
        />
      )}
    </div>
  );
}
