/**
 * Bilko Workflows - Browse and inspect PER-002 in-platform flows.
 *
 * Two tabs:
 * - Flows: Lists all registered flows. Click to open the step-level inspector.
 * - Components: Browsable catalog of the 5 step types with I/O, use cases, references.
 *
 * This is the admin's "private n8n" for in-platform workflows.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Workflow, Blocks } from "lucide-react";
import { flowRegistry } from "@/lib/bilko-flow";
import { FlowCard, ComponentCatalog } from "@/components/flow-inspector";

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
              <h1 className="text-2xl font-bold">Bilko Workflows</h1>
              <p className="text-sm text-muted-foreground">
                Build and inspect in-platform workflows (PER-002)
              </p>
            </div>
          </div>
        </div>

        {/* Tabs: Flows | Components */}
        <Tabs defaultValue="flows">
          <TabsList>
            <TabsTrigger value="flows" className="gap-1.5">
              <Workflow className="h-3.5 w-3.5" />
              Flows
            </TabsTrigger>
            <TabsTrigger value="components" className="gap-1.5">
              <Blocks className="h-3.5 w-3.5" />
              Components
            </TabsTrigger>
          </TabsList>

          {/* Flows tab (existing content) */}
          <TabsContent value="flows" className="space-y-4 mt-4">
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
          </TabsContent>

          {/* Components tab */}
          <TabsContent value="components" className="mt-4">
            <ComponentCatalog />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
