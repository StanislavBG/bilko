/**
 * Flow Explorer - Browse and inspect PER-002 agentic flows.
 *
 * Lists all registered flows. Click to open the step-level inspector.
 * This is the admin's "private n8n" for in-platform workflows.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Workflow } from "lucide-react";
import { flowRegistry } from "@/lib/flow-inspector";
import { FlowCard } from "@/components/flow-inspector";
import type { FlowDefinition } from "@/lib/flow-inspector/types";

export default function FlowExplorer() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<string | null>(null);

  const allTags = Array.from(new Set(flowRegistry.flatMap((f) => f.tags)));

  const filtered = filter
    ? flowRegistry.filter((f) => f.tags.includes(filter))
    : flowRegistry;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Workflow className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Flow Explorer</h1>
              <p className="text-sm text-muted-foreground">
                Inspect and debug in-platform agentic workflows (PER-002)
              </p>
            </div>
          </div>
        </div>

        {/* Tag filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={filter === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter(null)}
          >
            All ({flowRegistry.length})
          </Badge>
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={filter === tag ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter(filter === tag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Flow list */}
        <div className="grid gap-4">
          {filtered.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onClick={() => setLocation(`/flows/${flow.id}`)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No flows match this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
