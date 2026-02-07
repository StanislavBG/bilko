/**
 * Flow Detail — Step-level inspector for a single PER-002 flow.
 *
 * Main area is the FlowCanvas (DAG with zoom/pan).
 * Selecting a step opens the detail panel on the right.
 */

import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Workflow,
  GitBranch,
  MapPin,
  PanelRightClose,
} from "lucide-react";
import { getFlowById } from "@/lib/flow-inspector/registry";
import { FlowCanvas, StepDetail } from "@/components/flow-inspector";
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-3">
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
              {flow.output && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  out: {flow.output.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main area: Canvas + optional detail panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <FlowCanvas
            flow={flow}
            selectedStepId={selectedStepId}
            onSelectStep={setSelectedStepId}
            executions={execution?.steps}
          />
        </div>

        {/* Detail panel (slides in when a step is selected) */}
        {selectedStep && (
          <div className="w-[420px] shrink-0 border-l overflow-auto">
            <div className="flex items-center justify-between px-3 pt-3">
              <span className="text-xs text-muted-foreground font-medium">Step Inspector</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedStepId(null)}
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="p-3">
              <StepDetail step={selectedStep} flow={flow} execution={selectedExecution} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
