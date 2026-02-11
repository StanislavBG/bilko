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
import type { FlowDefinition } from "@/lib/bilko-flow/types";
import { getStepVisuals } from "@/lib/bilko-flow/inspector/step-type-config";
import type { StepTypeVisuals } from "@/lib/bilko-flow/inspector/step-type-config";

interface FlowCardProps {
  flow: FlowDefinition;
  onClick: () => void;
}

export function FlowCard({ flow, onClick }: FlowCardProps) {
  // Group by visual key (type + subtype) so image/video LLM steps get their own count
  const visualCounts: { key: string; config: StepTypeVisuals; count: number }[] = [];
  const seen = new Map<string, number>();
  for (const step of flow.steps) {
    const vKey = step.type === "llm" && step.subtype ? `llm:${step.subtype}` : step.type;
    const idx = seen.get(vKey);
    if (idx !== undefined) {
      visualCounts[idx].count++;
    } else {
      seen.set(vKey, visualCounts.length);
      visualCounts.push({ key: vKey, config: getStepVisuals(step), count: 1 });
    }
  }

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
              {visualCounts.map(({ key, config: cfg, count }) => {
                const Icon = cfg.icon;
                return (
                  <span
                    key={key}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                    title={`${count} ${cfg.shortLabel} step${count > 1 ? "s" : ""}`}
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
