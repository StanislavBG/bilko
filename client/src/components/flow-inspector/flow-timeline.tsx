/**
 * FlowTimeline — Thin adapter bridging FlowDefinition + StepExecution data
 * to the unified FlowProgress component.
 *
 * Renders in the flow inspector left panel. Uses FlowProgress mode="full"
 * for rich step display with sliding window support.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { FlowProgress, type FlowProgressStep } from "@/components/ui/flow-progress";
import type { FlowDefinition, StepExecution } from "@/lib/bilko-flow/types";

interface FlowTimelineProps {
  flow: FlowDefinition;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  executions?: Record<string, StepExecution>;
}

export function FlowTimeline({ flow, selectedStepId, onSelectStep, executions }: FlowTimelineProps) {
  const steps = useMemo<FlowProgressStep[]>(
    () =>
      flow.steps.map((step) => {
        const exec = executions?.[step.id];
        let status: FlowProgressStep["status"] = "pending";
        if (exec) {
          if (exec.status === "running") status = "active";
          else if (exec.status === "success") status = "complete";
          else if (exec.status === "error") status = "error";
        }
        return { id: step.id, label: step.name, status };
      }),
    [flow.steps, executions],
  );

  const completedCount = steps.filter((s) => s.status === "complete").length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm flex-1">{flow.name}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {completedCount}/{flow.steps.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{flow.version}</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <FlowProgress
          mode="compact"
          steps={steps}
          onStepClick={onSelectStep}
        />
      </CardContent>
    </Card>
  );
}
