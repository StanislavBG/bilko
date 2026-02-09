/**
 * StepNode - A single step in the flow timeline.
 * Reusable building block: shows step name, type badge, status indicator.
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  SkipForward,
} from "lucide-react";
import type { FlowStep, StepStatus } from "@/lib/flow-inspector/types";
import { STEP_TYPE_CONFIG } from "@/lib/flow-inspector/step-type-config";

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
  const config = STEP_TYPE_CONFIG[step.type];
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
          <Badge variant="outline" className={cn("text-xs gap-1", config.color, config.bg)}>
            <TypeIcon className="h-3 w-3" />
            {step.subtype ? `${config.label} \u203A ${step.subtype.charAt(0).toUpperCase() + step.subtype.slice(1)}` : config.label}
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
