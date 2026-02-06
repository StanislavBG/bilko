/**
 * StepNode - A single step in the flow timeline.
 * Reusable building block: shows step name, type badge, status indicator.
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  MousePointerClick,
  ArrowRightLeft,
  ShieldCheck,
  Monitor,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  SkipForward,
} from "lucide-react";
import type { FlowStep, StepStatus, StepType } from "@/lib/flow-inspector/types";

const TYPE_CONFIG: Record<StepType, { icon: typeof Brain; label: string; color: string }> = {
  llm: { icon: Brain, label: "LLM", color: "text-purple-500 bg-purple-500/10" },
  "user-input": { icon: MousePointerClick, label: "User Input", color: "text-blue-500 bg-blue-500/10" },
  transform: { icon: ArrowRightLeft, label: "Transform", color: "text-orange-500 bg-orange-500/10" },
  validate: { icon: ShieldCheck, label: "Validate", color: "text-green-500 bg-green-500/10" },
  display: { icon: Monitor, label: "Display", color: "text-cyan-500 bg-cyan-500/10" },
};

const STATUS_ICON: Record<StepStatus, typeof Circle> = {
  idle: Circle,
  running: Loader2,
  success: CheckCircle2,
  error: XCircle,
  skipped: SkipForward,
};

interface StepNodeProps {
  step: FlowStep;
  status: StepStatus;
  isSelected: boolean;
  onClick: () => void;
  index: number;
  isLast: boolean;
}

export function StepNode({ step, status, isSelected, onClick, index, isLast }: StepNodeProps) {
  const config = TYPE_CONFIG[step.type];
  const StatusIcon = STATUS_ICON[status];
  const TypeIcon = config.icon;

  return (
    <div className="flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors",
            isSelected
              ? "border-primary bg-primary/10"
              : status === "success"
              ? "border-green-500 bg-green-500/10"
              : status === "error"
              ? "border-red-500 bg-red-500/10"
              : status === "running"
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/30 bg-muted"
          )}
        >
          <StatusIcon
            className={cn(
              "h-4 w-4",
              status === "running" && "animate-spin text-primary",
              status === "success" && "text-green-500",
              status === "error" && "text-red-500",
              status === "idle" && "text-muted-foreground",
              status === "skipped" && "text-muted-foreground"
            )}
          />
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 min-h-[24px]",
              status === "success" ? "bg-green-500/50" : "bg-muted-foreground/20"
            )}
          />
        )}
      </div>

      {/* Step content */}
      <button
        onClick={onClick}
        className={cn(
          "flex-1 text-left rounded-lg border p-3 mb-2 transition-all hover:border-primary/50",
          isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-transparent hover:bg-muted/50"
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
          <h4 className="text-sm font-medium flex-1">{step.name}</h4>
          <Badge variant="outline" className={cn("text-xs gap-1", config.color)}>
            <TypeIcon className="h-3 w-3" />
            {config.label}
          </Badge>
          {step.parallel && (
            <Badge variant="secondary" className="text-xs">
              parallel
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{step.description}</p>
      </button>
    </div>
  );
}
