import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Play } from "lucide-react";
import { ActionBar } from "@/components/action-bar";
import { ActionPanel } from "@/components/action-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface WorkflowDefinition {
  id: string;
  name: string;
  mode: "local" | "n8n";
  description: string;
  instructions: string;
  category: string;
}

interface WorkflowsResponse {
  workflows: WorkflowDefinition[];
}

interface ExecutionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
  metadata: {
    workflowId: string;
    executedAt: string;
    durationMs: number;
  };
}

export default function AgenticWorkflows() {
  const { toast } = useToast();
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);
  const [isActionPanelCollapsed, setIsActionPanelCollapsed] = useState(false);

  const { data, isLoading } = useQuery<WorkflowsResponse>({
    queryKey: ["/api/workflows"],
  });

  const executeMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await apiRequest("POST", `/api/workflows/${workflowId}/execute`, {
        action: "execute",
        payload: { message: "Test from Agentic Workflows UI", timestamp: new Date().toISOString() },
      });
      return response.json();
    },
    onSuccess: (result: ExecutionResult) => {
      setLastResult(result);
      if (result.success) {
        toast({
          title: "Workflow executed",
          description: `${result.metadata.workflowId} completed in ${result.metadata.durationMs}ms`,
        });
      } else {
        toast({
          title: "Workflow failed",
          description: result.error?.message || "Unknown error",
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/traces"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Execution failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const workflows = data?.workflows || [];
  const n8nWorkflows = workflows.filter((w) => w.mode === "n8n");
  const localWorkflows = workflows.filter((w) => w.mode === "local");

  const actions = selectedWorkflow?.mode === "n8n"
    ? [
        {
          id: "execute-workflow",
          label: executeMutation.isPending ? "Executing..." : "Execute",
          icon: <Play className={`h-4 w-4 ${executeMutation.isPending ? "animate-pulse" : ""}`} />,
          method: "POST" as const,
          endpoint: `/api/workflows/${selectedWorkflow.id}/execute`,
          description: "Send test payload to n8n",
          onClick: () => executeMutation.mutate(selectedWorkflow.id),
          disabled: executeMutation.isPending,
          variant: "outline" as const,
        },
      ]
    : [];

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-auto p-4">
        <ActionBar variant="page" title="Agentic Workflows" testId="actionbar-agentic-workflows" />

        {isLoading ? (
          <div className="space-y-4 mt-4" data-testid="status-loading-workflows">
            <Skeleton className="h-32 w-full" data-testid="skeleton-workflow-1" />
            <Skeleton className="h-32 w-full" data-testid="skeleton-workflow-2" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {n8nWorkflows.length > 0 && (
              <section data-testid="section-n8n-workflows">
                <h2 className="text-sm font-medium text-muted-foreground mb-3" data-testid="text-section-n8n">Remote Workflows (n8n)</h2>
                <div className="space-y-3">
                  {n8nWorkflows.map((workflow) => (
                    <Card
                      key={workflow.id}
                      className={`cursor-pointer transition-colors ${
                        selectedWorkflow?.id === workflow.id ? "ring-1 ring-foreground" : ""
                      }`}
                      onClick={() => setSelectedWorkflow(workflow)}
                      data-testid={`card-workflow-${workflow.id}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base" data-testid={`text-name-${workflow.id}`}>{workflow.name}</CardTitle>
                          <Badge variant="outline" className="text-xs" data-testid={`badge-mode-${workflow.id}`}>
                            {workflow.mode}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs" data-testid={`text-category-${workflow.id}`}>{workflow.category}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm" data-testid={`text-description-${workflow.id}`}>{workflow.description}</p>
                        <div className="text-xs text-muted-foreground border-t pt-2" data-testid={`text-instructions-${workflow.id}`}>
                          <span className="font-medium">How to execute:</span> {workflow.instructions}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {localWorkflows.length > 0 && (
              <section data-testid="section-local-workflows">
                <h2 className="text-sm font-medium text-muted-foreground mb-3" data-testid="text-section-local">Local Workflows (Agent Reasoning)</h2>
                <div className="space-y-3">
                  {localWorkflows.map((workflow) => (
                    <Card
                      key={workflow.id}
                      className={`cursor-pointer transition-colors ${
                        selectedWorkflow?.id === workflow.id ? "ring-1 ring-foreground" : ""
                      }`}
                      onClick={() => setSelectedWorkflow(workflow)}
                      data-testid={`card-workflow-${workflow.id}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base" data-testid={`text-name-${workflow.id}`}>{workflow.name}</CardTitle>
                          <Badge variant="outline" className="text-xs" data-testid={`badge-mode-${workflow.id}`}>
                            {workflow.mode}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs" data-testid={`text-category-${workflow.id}`}>{workflow.category}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm" data-testid={`text-description-${workflow.id}`}>{workflow.description}</p>
                        <div className="text-xs text-muted-foreground border-t pt-2" data-testid={`text-instructions-${workflow.id}`}>
                          <span className="font-medium">How to execute:</span> {workflow.instructions}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {lastResult && (
              <section data-testid="section-execution-result">
                <h2 className="text-sm font-medium text-muted-foreground mb-3" data-testid="text-section-result">Last Execution Result</h2>
                <Card data-testid="card-execution-result">
                  <CardContent className="pt-4">
                    <pre className="text-xs overflow-auto bg-muted p-3 rounded" data-testid="text-execution-result">
                      {JSON.stringify(lastResult, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        )}
      </div>

      <ActionPanel
        title={selectedWorkflow?.name || "Actions"}
        actions={actions}
        isCollapsed={isActionPanelCollapsed}
        onToggleCollapse={() => setIsActionPanelCollapsed(!isActionPanelCollapsed)}
        testId="workflows-action-panel"
      />
    </div>
  );
}
