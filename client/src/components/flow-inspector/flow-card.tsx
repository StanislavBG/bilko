/**
 * FlowCard - Summary card for a flow in the registry list.
 * Used on the Flow Explorer page to browse available flows.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  Package,
} from "lucide-react";
import type { FlowDefinition, StepType } from "@/lib/bilko-flow/types";
import { STEP_TYPE_CONFIG } from "@/lib/bilko-flow/inspector/step-type-config";

interface FlowCardProps {
  flow: FlowDefinition;
  onClick: () => void;
}

export function FlowCard({ flow, onClick }: FlowCardProps) {
  const typeCounts = flow.steps.reduce<Partial<Record<StepType, number>>>((acc, step) => {
    acc[step.type] = (acc[step.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{flow.name}</h3>
              <Badge variant="outline" className="text-[10px] shrink-0">
                v{flow.version}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {flow.description}
            </p>

            {/* Step type breakdown */}
            <div className="flex items-center gap-3 mt-3">
              {Object.entries(typeCounts).map(([type, count]) => {
                const cfg = STEP_TYPE_CONFIG[type as StepType];
                const Icon = cfg.icon;
                return (
                  <span
                    key={type}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                    title={`${count} ${cfg.shortLabel} step${count! > 1 ? "s" : ""}`}
                  >
                    <Icon className="h-3 w-3" />
                    {count}
                  </span>
                );
              })}
              <span className="text-xs text-muted-foreground/50">|</span>
              <span className="text-xs text-muted-foreground">
                {flow.steps.length} steps
              </span>
            </div>

            {/* Output + location + tags */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">
                {flow.location}
              </Badge>
              {flow.output && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Package className="h-2.5 w-2.5" />
                  {flow.output.name}
                </Badge>
              )}
              {flow.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
              {flow.tags.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{flow.tags.length - 4}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}
