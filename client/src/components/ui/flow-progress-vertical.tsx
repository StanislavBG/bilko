import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  XCircle,
  MoreVertical,
  Brain,
  ArrowRightLeft,
  ShieldCheck,
  Monitor,
  MessageSquare,
  Globe,
  PlugZap,
  RotateCcw,
} from "lucide-react";
import type { FlowProgressStep, FlowProgressTheme } from "./flow-progress";
import { mergeTheme } from "./flow-progress";

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

function StepIcon({ status, className }: { status: FlowProgressStep["status"]; className?: string }) {
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

function TypeIcon({ type }: { type?: string }) {
  if (!type) return null;
  const normalized = type.toLowerCase();

  if (normalized.includes("llm") || normalized.includes("ai")) {
    return <Brain className="h-3 w-3 text-purple-500" />;
  }
  if (normalized.includes("transform")) {
    return <ArrowRightLeft className="h-3 w-3 text-amber-500" />;
  }
  if (normalized.includes("validate")) {
    return <ShieldCheck className="h-3 w-3 text-teal-500" />;
  }
  if (normalized.includes("display")) {
    return <Monitor className="h-3 w-3 text-sky-500" />;
  }
  if (normalized.includes("chat")) {
    return <MessageSquare className="h-3 w-3 text-indigo-500" />;
  }
  if (normalized.includes("external") || normalized.includes("http")) {
    return <Globe className="h-3 w-3 text-emerald-500" />;
  }
  if (normalized.includes("user-input")) {
    return <PlugZap className="h-3 w-3 text-orange-500" />;
  }

  return null;
}

const MAX_VISIBLE_VERTICAL = 8;

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

export interface FlowProgressVerticalProps {
  steps: FlowProgressStep[];
  activity?: string;
  label?: string;
  status?: "idle" | "running" | "complete" | "error";
  onReset?: () => void;
  theme?: Partial<FlowProgressTheme>;
}

export function FlowProgressVertical({
  steps,
  activity,
  label,
  status,
  onReset,
  theme,
}: FlowProgressVerticalProps) {
  const merged = useMemo(() => mergeTheme(theme), [theme]);
  const { visible, startEllipsis, endEllipsis } = useMemo(
    () => computeWindow(steps, MAX_VISIBLE_VERTICAL),
    [steps],
  );

  const completedCount = steps.filter((s) => s.status === "complete").length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  if (steps.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="flow-progress-vertical">
      <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
        <div className="flex items-center gap-2">
          {label && (
            <span className="text-sm font-medium" data-testid="text-vertical-label">
              {label}
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {completedCount}/{steps.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
              data-testid="bar-vertical-progress"
            />
          </div>
          {onReset && status === "complete" && (
            <button
              onClick={onReset}
              className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
              data-testid="button-vertical-reset"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="relative pl-4">
        {startEllipsis && (
          <div className="flex items-center gap-2 py-1 pl-2 text-muted-foreground" data-testid="ellipsis-start">
            <MoreVertical className="h-4 w-4" />
            <span className="text-xs">Earlier steps</span>
          </div>
        )}

        {visible.map((step, i) => {
          const isLast = i === visible.length - 1 && !endEllipsis;
          const bg = resolveStepBg(step, merged);

          return (
            <div key={step.id} className="relative flex gap-3" data-testid={`vertical-step-${step.id}`}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center h-6 w-6 rounded-full shrink-0 z-10",
                    step.status === "active" && "ring-2 ring-blue-500/30",
                    step.status === "complete" && "bg-green-500/10",
                    step.status === "error" && "bg-red-500/10",
                    step.status === "pending" && "bg-muted",
                  )}
                >
                  <StepIcon status={step.status} />
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-px flex-1 min-h-[16px]",
                      step.status === "complete" ? "bg-green-500/40" : "bg-border",
                    )}
                  />
                )}
              </div>

              <div className="pb-4 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      "text-sm",
                      step.status === "active" ? "text-foreground font-medium" : "text-muted-foreground",
                      step.status === "complete" && "line-through opacity-60",
                    )}
                  >
                    {step.label}
                  </span>
                  <TypeIcon type={step.type} />
                  {step.status === "active" && (
                    <span className="text-xs text-blue-500 font-medium">Running</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {endEllipsis && (
          <div className="flex items-center gap-2 py-1 pl-2 text-muted-foreground" data-testid="ellipsis-end">
            <MoreVertical className="h-4 w-4" />
            <span className="text-xs">More steps</span>
          </div>
        )}
      </div>

      {activity && (
        <p className="text-xs text-muted-foreground px-1 truncate" data-testid="text-vertical-activity">
          {activity}
        </p>
      )}
    </div>
  );
}

FlowProgressVertical.displayName = "FlowProgressVertical";
