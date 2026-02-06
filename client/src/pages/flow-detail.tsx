/**
 * Flow Detail - The step-level inspector for a single PER-002 flow.
 *
 * Split-pane layout: FlowTimeline on the left, StepDetail on the right.
 * Browse steps, inspect prompts, schemas, and execution data.
 */

import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Workflow,
  Play,
  GitBranch,
  MapPin,
} from "lucide-react";
import { getFlowById } from "@/lib/flow-inspector/registry";
import { FlowTimeline, StepDetail } from "@/components/flow-inspector";
import { useExecutionStore } from "@/lib/flow-engine";

export default function FlowDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/flows/:flowId");

  const flowId = params?.flowId;
  const flow = flowId ? getFlowById(flowId) : undefined;

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Read live execution data from the global store
  const execution = useExecutionStore(flowId ?? "");

  if (!match || !flow) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-muted-foreground mb-4">Flow not found.</p>
          <Button variant="outline" onClick={() => setLocation("/flows")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Flow Explorer
          </Button>
        </div>
      </div>
    );
  }

  const selectedStep = selectedStepId
    ? flow.steps.find((s) => s.id === selectedStepId)
    : null;

  const selectedExecution = selectedStepId
    ? execution?.steps[selectedStepId]
    : undefined;

  // Build a dependency graph for visualization
  const dependencyPairs: Array<[string, string]> = [];
  for (const step of flow.steps) {
    for (const dep of step.dependsOn) {
      dependencyPairs.push([dep, step.id]);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/flows")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Workflow className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">{flow.name}</h1>
                <Badge variant="outline" className="text-xs">
                  v{flow.version}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {flow.description}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="gap-1 text-xs">
                <MapPin className="h-3 w-3" />
                {flow.location}
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs">
                <GitBranch className="h-3 w-3" />
                {flow.steps.length} steps
              </Badge>
            </div>
          </div>

          {/* Dependency graph mini-bar */}
          {dependencyPairs.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Flow:</span>
              {flow.steps.map((step, i) => (
                <span key={step.id} className="flex items-center gap-1">
                  <button
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      selectedStepId === step.id
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-muted-foreground/20 text-muted-foreground hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedStepId(step.id)}
                  >
                    {step.name}
                  </button>
                  {i < flow.steps.length - 1 && (
                    <span className="text-muted-foreground/40 text-xs">
                      {step.parallel ? "||" : "\u2192"}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Split pane: Timeline left, Detail right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Timeline */}
        <div className="w-[380px] shrink-0 border-r overflow-auto p-4">
          <FlowTimeline
            flow={flow}
            selectedStepId={selectedStepId}
            onSelectStep={setSelectedStepId}
            executions={execution?.steps}
          />
        </div>

        {/* Right panel - Step detail */}
        <div className="flex-1 overflow-auto p-4">
          {selectedStep ? (
            <StepDetail
              step={selectedStep}
              execution={selectedExecution}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Workflow className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">Select a step to inspect</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click any step in the timeline to view its prompts,
                    input/output schemas, and execution data.
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-center">
                  <p className="text-xs text-muted-foreground">
                    This flow has {flow.steps.length} steps across{" "}
                    {new Set(flow.steps.map((s) => s.type)).size} step types
                  </p>
                  <div className="flex gap-1 flex-wrap justify-center">
                    {flow.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStepId(flow.steps[0]?.id ?? null)}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Start with Step 1
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
