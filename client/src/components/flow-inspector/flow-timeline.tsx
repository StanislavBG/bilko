/**
 * FlowTimeline - Vertical timeline of all steps in a flow.
 * The left panel of the inspector: shows all steps with status indicators.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { StepNode } from "./step-node";
import type { FlowDefinition, StepExecution, StepStatus } from "@/lib/bilko-flow/types";

interface FlowTimelineProps {
  flow: FlowDefinition;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  executions?: Record<string, StepExecution>;
}

export function FlowTimeline({ flow, selectedStepId, onSelectStep, executions }: FlowTimelineProps) {
  const getStatus = (stepId: string): StepStatus => {
    return executions?.[stepId]?.status ?? "idle";
  };

  const completedCount = flow.steps.filter(
    (s) => executions?.[s.id]?.status === "success"
  ).length;

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
        {flow.steps.map((step, index) => (
          <StepNode
            key={step.id}
            step={step}
            status={getStatus(step.id)}
            isSelected={selectedStepId === step.id}
            onClick={() => onSelectStep(step.id)}
            index={index}
            isLast={index === flow.steps.length - 1}
          />
        ))}
      </CardContent>
    </Card>
  );
}
