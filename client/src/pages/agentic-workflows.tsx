import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Play, RefreshCw, Workflow, Image, FileText, History } from "lucide-react";
import { ActionBar } from "@/components/action-bar";
import { ActionPanel } from "@/components/action-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ExecutionsList } from "@/components/executions-list";
import { ExecutionDetail } from "@/components/execution-detail";

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

interface WorkflowOutput {
  hasOutput: boolean;
  message?: string;
  outputs?: {
    final: {
      traceId: string;
      timestamp: string;
      data: {
        success?: boolean;
        data?: {
          postContent?: string;
          imagePrompt?: string;
          imageUrl?: string | null;
        };
      };
    } | null;
    sentiment: {
      traceId: string;
      timestamp: string;
      data: unknown;
    } | null;
    articles: {
      traceId: string;
      timestamp: string;
      data: {
        articles?: Array<{ title: string; source: string }>;
        count?: number;
      };
    } | null;
  };
}

function WorkflowOutputPreview({ workflowId }: { workflowId: string }) {
  const { data, isLoading, refetch, isRefetching } = useQuery<WorkflowOutput>({
    queryKey: ["/api/workflows", workflowId, "output"],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}/output`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!data?.hasOutput) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Workflow className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No output yet</p>
          <p className="text-xs mt-1">{data?.message || "Execute the workflow to see results"}</p>
        </CardContent>
      </Card>
    );
  }

  const finalData = data.outputs?.final?.data?.data;
  const postContent = finalData?.postContent;
  const imagePrompt = finalData?.imagePrompt;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Latest Output</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh-output"
        >
          <RefreshCw className={`h-3 w-3 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {(finalData?.imageUrl || imagePrompt) && (
        <Card data-testid="card-infographic">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Infographic</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {finalData?.imageUrl ? (
              <div className="rounded-md overflow-hidden">
                <img 
                  src={finalData.imageUrl} 
                  alt="Generated infographic" 
                  className="w-full h-auto"
                  data-testid="img-infographic"
                />
              </div>
            ) : (
              <div className="bg-muted rounded-md p-4 min-h-32 flex items-center justify-center border-2 border-dashed">
                <div className="text-center text-sm text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="font-medium mb-2">Image Prompt</p>
                  <p className="text-xs max-w-md" data-testid="text-image-prompt">{imagePrompt}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {postContent && (
        <Card data-testid="card-facebook-post">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Facebook Post</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-md p-4">
              <p className="text-sm whitespace-pre-wrap" data-testid="text-post-content">{postContent}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Generated {data.outputs?.final?.timestamp ? new Date(data.outputs.final.timestamp).toLocaleString() : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {!postContent && !imagePrompt && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-muted-foreground">
            <p className="text-sm">Output received but content not yet available</p>
            <p className="text-xs mt-1">The workflow may still be processing</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SelectedExecution {
  id: string;
  workflowId: string;
  status: string;
}

export default function AgenticWorkflows() {
  const { toast } = useToast();
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<SelectedExecution | null>(null);
  const [isActionPanelCollapsed, setIsActionPanelCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<"latest" | "history">("latest");

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
      if (selectedWorkflow) {
        queryClient.invalidateQueries({ queryKey: ["/api/workflows", selectedWorkflow.id, "output"] });
      }
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
      {/* Left Nav - Workflow List */}
      <div className="w-64 border-r bg-muted/30 flex flex-col overflow-hidden">
        <div className="p-3 border-b">
          <h2 className="text-sm font-medium">Workflows</h2>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {isLoading ? (
            <div className="space-y-2" data-testid="status-loading-workflows">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            workflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => { setSelectedWorkflow(workflow); setSelectedExecution(null); setViewMode("latest"); }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedWorkflow?.id === workflow.id
                    ? "bg-foreground text-background"
                    : "hover-elevate"
                }`}
                data-testid={`nav-workflow-${workflow.id}`}
              >
                <div className="font-medium truncate">{workflow.name}</div>
                <div className="text-xs opacity-70 truncate">{workflow.mode}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Workflow Detail */}
      <div className="flex-1 overflow-auto p-4">
        {selectedWorkflow ? (
          <div className="space-y-6">
            <ActionBar 
              variant="page" 
              title={selectedWorkflow.name} 
              description={selectedWorkflow.category}
              testId="actionbar-workflow-detail" 
            />

            <Card data-testid="card-workflow-detail">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{selectedWorkflow.name}</CardTitle>
                  <Badge variant="outline">{selectedWorkflow.mode}</Badge>
                </div>
                <CardDescription>{selectedWorkflow.category}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedWorkflow.description}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">How to Execute</h4>
                  <p className="text-sm text-muted-foreground">{selectedWorkflow.instructions}</p>
                </div>
              </CardContent>
            </Card>

            {selectedWorkflow.mode === "n8n" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "latest" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setViewMode("latest"); setSelectedExecution(null); }}
                    data-testid="button-view-latest"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Latest
                  </Button>
                  <Button
                    variant={viewMode === "history" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("history")}
                    data-testid="button-view-history"
                  >
                    <History className="h-3 w-3 mr-1" />
                    History
                  </Button>
                </div>

                {viewMode === "latest" ? (
                  <WorkflowOutputPreview workflowId={selectedWorkflow.id} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ExecutionsList
                      workflowId={selectedWorkflow.id}
                      selectedExecutionId={selectedExecution?.id || null}
                      onSelectExecution={(exec) => setSelectedExecution({ id: exec.id, workflowId: exec.workflowId, status: exec.status })}
                    />
                    {selectedExecution && (
                      <ExecutionDetail executionId={selectedExecution.id} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Workflow className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select a workflow to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Action Panel */}
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
