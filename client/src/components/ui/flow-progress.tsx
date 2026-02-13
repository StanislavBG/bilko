import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  MoreHorizontal,
  RotateCcw,
  Check,
} from "lucide-react";

export interface FlowProgressStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
  type?: string;
}

export interface FlowProgressTheme {
  completedColor: string;
  activeColor: string;
  pendingColor: string;
  errorColor: string;
  stepColors: Record<string, string>;
}

export type FlowProgressAdapter = (steps: FlowProgressStep[]) => FlowProgressStep[];

export type FlowProgressStepRenderer = React.ComponentType<{
  step: FlowProgressStep;
  index: number;
}>;

export interface FlowProgressProps {
  steps: FlowProgressStep[];
  mode?: "full" | "compact" | "expanded" | "auto";
  activity?: string;
  lastResult?: string;
  label?: string;
  status?: "idle" | "running" | "complete" | "error";
  onReset?: () => void;
  theme?: Partial<FlowProgressTheme>;
}

export function adaptSteps(steps: FlowProgressStep[]): FlowProgressStep[] {
  return steps;
}

export const DEFAULT_FLOW_PROGRESS_THEME: FlowProgressTheme = {
  completedColor: "bg-green-500",
  activeColor: "bg-blue-500",
  pendingColor: "bg-gray-600",
  errorColor: "bg-red-500",
  stepColors: {},
};

export function mergeTheme(theme?: Partial<FlowProgressTheme>): FlowProgressTheme {
  if (!theme) return DEFAULT_FLOW_PROGRESS_THEME;
  return {
    ...DEFAULT_FLOW_PROGRESS_THEME,
    ...theme,
    stepColors: { ...DEFAULT_FLOW_PROGRESS_THEME.stepColors, ...theme.stepColors },
  };
}

function resolveStepBg(step: FlowProgressStep, theme: FlowProgressTheme): string {
  if (step.type && theme.stepColors[step.type]) {
    return theme.stepColors[step.type];
  }
  switch (step.status) {
    case "complete":
      return theme.completedColor;
    case "active":
      return theme.activeColor;
    case "error":
      return theme.errorColor;
    default:
      return theme.pendingColor;
  }
}

function StepStatusIcon({ status, className }: { status: FlowProgressStep["status"]; className?: string }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className={cn("h-4 w-4 text-green-500", className)} />;
    case "active":
      return <Loader2 className={cn("h-4 w-4 text-blue-500 animate-spin", className)} />;
    case "error":
      return <XCircle className={cn("h-4 w-4 text-red-500", className)} />;
    default:
      return <Circle className={cn("h-4 w-4 text-muted-foreground", className)} />;
  }
}

const MAX_VISIBLE_STEPS = 7;

function computeWindow(steps: FlowProgressStep[], maxVisible: number) {
  if (steps.length <= maxVisible) {
    return { visible: steps, startEllipsis: false, endEllipsis: false, startIndex: 0 };
  }

  const activeIdx = steps.findIndex((s) => s.status === "active");
  const center = activeIdx >= 0 ? activeIdx : steps.findIndex((s) => s.status === "pending");
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(0, (center >= 0 ? center : 0) - half);
  let end = start + maxVisible;

  if (end > steps.length) {
    end = steps.length;
    start = Math.max(0, end - maxVisible);
  }

  return {
    visible: steps.slice(start, end),
    startEllipsis: start > 0,
    endEllipsis: end < steps.length,
    startIndex: start,
  };
}

function CompactMode({
  steps,
  activity,
  lastResult,
  label,
  theme,
}: {
  steps: FlowProgressStep[];
  activity?: string;
  lastResult?: string;
  label?: string;
  theme: FlowProgressTheme;
}) {
  const { visible, startEllipsis, endEllipsis } = computeWindow(steps, MAX_VISIBLE_STEPS);
  const completedCount = steps.filter((s) => s.status === "complete").length;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5" data-testid="flow-progress-compact">
      <div className="flex items-center gap-1.5">
        {label && (
          <span className="text-xs font-medium text-muted-foreground" data-testid="text-flow-label">
            {label}
          </span>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {completedCount}/{steps.length}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {startEllipsis && <MoreHorizontal className="h-3 w-3 text-muted-foreground" />}
        {visible.map((step) => (
          <div
            key={step.id}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              resolveStepBg(step, theme),
              step.status === "active" && "animate-pulse",
            )}
            title={`${step.label} (${step.status})`}
            data-testid={`dot-step-${step.id}`}
          />
        ))}
        {endEllipsis && <MoreHorizontal className="h-3 w-3 text-muted-foreground" />}
      </div>
      {activity && (
        <span className="text-xs text-muted-foreground/70 truncate" data-testid="text-flow-activity">
          {activity}
        </span>
      )}
      {lastResult && (
        <span className="text-xs text-muted-foreground/50 truncate" data-testid="text-flow-last-result">
          {lastResult}
        </span>
      )}
    </div>
  );
}

function FullMode({
  steps,
  activity,
  lastResult,
  label,
  status,
  onReset,
  theme,
}: {
  steps: FlowProgressStep[];
  activity?: string;
  lastResult?: string;
  label?: string;
  status?: string;
  onReset?: () => void;
  theme: FlowProgressTheme;
}) {
  const { visible, startEllipsis, endEllipsis } = computeWindow(steps, MAX_VISIBLE_STEPS);
  const completedCount = steps.filter((s) => s.status === "complete").length;

  return (
    <div className="space-y-2 px-3 py-2" data-testid="flow-progress-full">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {label && (
            <span className="text-sm font-medium shrink-0" data-testid="text-flow-label">
              {label}
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {completedCount}/{steps.length}
          </span>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {startEllipsis && <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            {visible.map((step, i) => (
              <div key={step.id} className="flex items-center gap-1">
                {i > 0 && <div className="w-3 h-px bg-border/60 shrink-0" />}
                <div className="flex items-center gap-1">
                  <div
                    className={cn(
                      "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-medium text-white shrink-0",
                      resolveStepBg(step, theme),
                      step.status === "active" && "ring-1 ring-blue-500/30",
                    )}
                    data-testid={`circle-step-${step.id}`}
                  >
                    {step.status === "complete" ? (
                      <Check className="h-3 w-3" />
                    ) : step.status === "active" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : step.status === "error" ? (
                      <XCircle className="h-3 w-3" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap",
                      step.status === "active" ? "text-foreground font-medium" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
            {endEllipsis && <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </div>
        </div>
        {onReset && status === "complete" && (
          <button
            onClick={onReset}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
            data-testid="button-flow-reset"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {activity && (
        <p className="text-xs text-muted-foreground" data-testid="text-flow-activity">
          {activity}
        </p>
      )}
      {lastResult && (
        <p className="text-xs text-muted-foreground/60" data-testid="text-flow-last-result">
          {lastResult}
        </p>
      )}
    </div>
  );
}

function ExpandedMode({
  steps,
  activity,
  lastResult,
  label,
  status,
  onReset,
  theme,
}: {
  steps: FlowProgressStep[];
  activity?: string;
  lastResult?: string;
  label?: string;
  status?: string;
  onReset?: () => void;
  theme: FlowProgressTheme;
}) {
  const { visible, startEllipsis, endEllipsis } = computeWindow(steps, MAX_VISIBLE_STEPS);
  const completedCount = steps.filter((s) => s.status === "complete").length;

  return (
    <div className="space-y-2 px-3 py-2" data-testid="flow-progress-expanded">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {label && (
            <span className="text-sm font-medium" data-testid="text-flow-label">
              {label}
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {completedCount}/{steps.length}
          </span>
        </div>
        {onReset && status === "complete" && (
          <button
            onClick={onReset}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
            data-testid="button-flow-reset"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 w-full">
        {startEllipsis && (
          <div className="shrink-0 flex items-center px-1">
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
        {visible.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            {i > 0 && <div className="w-3 h-px bg-border/60 shrink-0" />}
            <div
              className={cn(
                "flex items-center justify-center gap-1.5 px-2 py-1 rounded-md border text-xs whitespace-nowrap flex-1 min-w-0",
                step.status === "active" && "border-blue-500/40 bg-blue-500/5",
                step.status === "complete" && "border-green-500/30 bg-green-500/5",
                step.status === "error" && "border-red-500/30 bg-red-500/5",
                step.status === "pending" && "border-border",
              )}
              data-testid={`card-step-${step.id}`}
            >
              <StepStatusIcon status={step.status} className="h-3 w-3 shrink-0" />
              <span className={cn(
                "truncate",
                step.status === "active" ? "text-foreground font-medium" : "text-muted-foreground",
              )}>
                {step.label}
              </span>
            </div>
          </div>
        ))}
        {endEllipsis && (
          <div className="shrink-0 flex items-center px-1">
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </div>

      {activity && (
        <p className="text-xs text-muted-foreground" data-testid="text-flow-activity">
          {activity}
        </p>
      )}
      {lastResult && (
        <p className="text-xs text-muted-foreground/60" data-testid="text-flow-last-result">
          {lastResult}
        </p>
      )}
    </div>
  );
}

export function FlowProgress({
  steps,
  mode = "compact",
  activity,
  lastResult,
  label,
  status,
  onReset,
  theme,
}: FlowProgressProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedMode, setResolvedMode] = useState<"compact" | "full" | "expanded">(
    mode === "auto" ? "compact" : mode === "auto" ? "compact" : (mode as "compact" | "full" | "expanded"),
  );

  const merged = useMemo(() => mergeTheme(theme), [theme]);

  useEffect(() => {
    if (mode !== "auto") {
      setResolvedMode(mode as "compact" | "full" | "expanded");
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width >= 380) {
          setResolvedMode("expanded");
        } else if (width >= 260) {
          setResolvedMode("full");
        } else {
          setResolvedMode("compact");
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [mode]);

  if (steps.length === 0) return null;

  const sharedProps = { steps, activity, lastResult, label, status, onReset, theme: merged };

  return (
    <div ref={containerRef} data-testid="flow-progress">
      {resolvedMode === "compact" && <CompactMode {...sharedProps} />}
      {resolvedMode === "full" && <FullMode {...sharedProps} />}
      {resolvedMode === "expanded" && <ExpandedMode {...sharedProps} />}
    </div>
  );
}

FlowProgress.displayName = "FlowProgress";
