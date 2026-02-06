/**
 * FlowCard - Summary card for a flow in the registry list.
 * Used on the Flow Explorer page to browse available flows.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Brain, MousePointerClick, ShieldCheck, Monitor, ArrowRightLeft } from "lucide-react";
import type { FlowDefinition, StepType } from "@/lib/flow-inspector/types";

const TYPE_ICON: Record<StepType, typeof Brain> = {
  llm: Brain,
  "user-input": MousePointerClick,
  transform: ArrowRightLeft,
  validate: ShieldCheck,
  display: Monitor,
};

interface FlowCardProps {
  flow: FlowDefinition;
  onClick: () => void;
}

export function FlowCard({ flow, onClick }: FlowCardProps) {
  // Count step types
  const typeCounts = flow.steps.reduce<Partial<Record<StepType, number>>>((acc, step) => {
    acc[step.type] = (acc[step.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium">{flow.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{flow.description}</p>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge variant="outline" className="text-xs">
                v{flow.version}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {flow.steps.length} steps
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {flow.location}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-2">
              {Object.entries(typeCounts).map(([type, count]) => {
                const Icon = TYPE_ICON[type as StepType];
                return (
                  <span
                    key={type}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <Icon className="h-3 w-3" />
                    {count}
                  </span>
                );
              })}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}
