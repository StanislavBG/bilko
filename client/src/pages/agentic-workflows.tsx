import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Play, RefreshCw, Workflow, Image, FileText, History, Shield, Copy, Download, Check, ChevronDown, ChevronRight, Info } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function useCopyToClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const copy = async (text: string, id: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: "Copied!", description: label || "Text copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };
  
  return { copy, isCopied: (id: string) => copiedId === id };
}

async function copyImageToClipboard(imageUrl: string, toast: ReturnType<typeof useToast>["toast"]) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
    toast({ title: "Copied!", description: "Image copied to clipboard" });
  } catch {
    toast({ title: "Failed to copy image", description: "Your browser may not support this feature", variant: "destructive" });
  }
}

function downloadImage(imageUrl: string, filename: string = "infographic.png") {
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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
  data?: {
    status?: string;
    message?: string;
    executionId?: string;
  } & Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
  metadata: {
    workflowId: string;
    executionId?: string;
    executedAt: string;
    durationMs: number;
  };
}

interface ExecutionStatus {
  execution: {
    id: string;
    workflowId: string;
    status: "running" | "completed" | "failed";
    completedAt?: string;
  };
}

interface WorkflowOutput {
  hasOutput: boolean;
  message?: string;
  fb2DisclosureText?: string;
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
          transparencyPost?: string;
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
  const { toast } = useToast();
  const { copy, isCopied } = useCopyToClipboard();
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
  const imageUrl = finalData?.imageUrl;
  const transparencyPost = finalData?.transparencyPost;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
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

      <div className="flex gap-4">
        {/* Left: Image */}
        <div className="w-[280px] flex-shrink-0">
          {(imageUrl || imagePrompt) && (
            <Card data-testid="card-infographic" className="h-full">
              <CardHeader className="py-2 px-3">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <Image className="h-3 w-3 text-muted-foreground" />
                    <CardTitle className="text-xs">Infographic</CardTitle>
                  </div>
                  {imageUrl && (
                    <div className="flex items-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => downloadImage(imageUrl, `infographic-${workflowId}.png`)}
                            data-testid="button-download-image"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyImageToClipboard(imageUrl, toast)}
                            data-testid="button-copy-image"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                {imageUrl ? (
                  <div className="rounded overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt="Generated infographic" 
                      className="w-full h-auto"
                      data-testid="img-infographic"
                    />
                  </div>
                ) : (
                  <div className="bg-muted rounded p-3 flex items-center justify-center border border-dashed h-32">
                    <div className="text-center text-xs text-muted-foreground">
                      <Image className="h-6 w-6 mx-auto mb-1 opacity-30" />
                      <p className="font-medium">Prompt only</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Posts */}
        <div className="flex-1 space-y-3 min-w-0">
          {postContent && (
            <Card data-testid="card-facebook-post">
              <CardHeader className="py-2 px-3">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <CardTitle className="text-xs">Post 1: Main</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copy(postContent, "post-content", "Post copied")}
                          data-testid="button-copy-post"
                        >
                          {isCopied("post-content") ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy post</TooltipContent>
                    </Tooltip>
                    <Badge variant="outline" className="text-[10px] px-1">Primary</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="bg-muted rounded p-2">
                  <p className="text-xs line-clamp-4" data-testid="text-post-content">{postContent}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {data.fb2DisclosureText && (
            <Card data-testid="card-fb2-disclosure">
              <CardHeader className="py-2 px-3">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    <CardTitle className="text-xs">Post 2: Professional Disclosure</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copy(data.fb2DisclosureText!, "fb2-disclosure", "Disclosure copied")}
                          data-testid="button-copy-fb2"
                        >
                          {isCopied("fb2-disclosure") ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy disclosure</TooltipContent>
                    </Tooltip>
                    <Badge variant="secondary" className="text-[10px] px-1">FB Post 2</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-xs text-muted-foreground whitespace-pre-line" data-testid="text-fb2-disclosure">{data.fb2DisclosureText}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
  const isMobile = useIsMobile();
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<SelectedExecution | null>(null);
  const [isActionPanelCollapsed, setIsActionPanelCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<"latest" | "history">("latest");
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  
  // Track running workflow executions for polling (scoped by workflow ID)
  const [runningExecutions, setRunningExecutions] = useState<Record<string, { executionId: string; startedAt: number }>>({}); 
  
  // Get running execution for current workflow (for UI display)
  const currentWorkflowRunning = selectedWorkflow ? runningExecutions[selectedWorkflow.id] : null;
  const isWorkflowRunning = !!currentWorkflowRunning;
  
  // Get all running execution IDs for polling
  const allRunningExecutionIds = Object.values(runningExecutions).map(r => r.executionId);
  
  // Poll ALL running executions (not just selected one)
  useEffect(() => {
    if (allRunningExecutionIds.length === 0) return;
    
    const pollInterval = setInterval(async () => {
      for (const executionId of allRunningExecutionIds) {
        try {
          const res = await fetch(`/api/executions/${executionId}`, { credentials: "include" });
          if (!res.ok) continue;
          
          const data: ExecutionStatus = await res.json();
          const { status, workflowId: execWorkflowId } = data.execution;
          
          if (status === "completed") {
            setRunningExecutions(prev => {
              const updated = { ...prev };
              delete updated[execWorkflowId];
              return updated;
            });
            toast({
              title: "Workflow completed",
              description: "Processing finished successfully. Refreshing output...",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/traces"] });
            queryClient.invalidateQueries({ queryKey: ["/api/workflows", execWorkflowId, "output"] });
            queryClient.invalidateQueries({ queryKey: ["/api/workflows", execWorkflowId, "executions"] });
          } else if (status === "failed") {
            setRunningExecutions(prev => {
              const updated = { ...prev };
              delete updated[execWorkflowId];
              return updated;
            });
            toast({
              title: "Workflow failed",
              description: "Processing encountered an error",
              variant: "destructive",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/traces"] });
            queryClient.invalidateQueries({ queryKey: ["/api/workflows", execWorkflowId, "executions"] });
          }
        } catch {
          // Ignore polling errors
        }
      }
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(pollInterval);
  }, [allRunningExecutionIds.join(","), toast]);
  
  // Timeout check - clear stuck executions after 10 minutes with notification
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const TEN_MINUTES = 10 * 60 * 1000;
      const timedOutWorkflows: string[] = [];
      
      setRunningExecutions(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        for (const [wfId, data] of Object.entries(updated)) {
          if (now - data.startedAt > TEN_MINUTES) {
            timedOutWorkflows.push(wfId);
            delete updated[wfId];
            hasChanges = true;
          }
        }
        return hasChanges ? updated : prev;
      });
      
      // Show timeout toast for each timed-out workflow
      timedOutWorkflows.forEach(wfId => {
        toast({
          title: "Workflow timed out",
          description: `${wfId} did not complete within 10 minutes. Check the execution history for details.`,
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/workflows", wfId, "executions"] });
      });
    }, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [toast]);
  
  // Fetch workflows data
  const { data, isLoading } = useQuery<WorkflowsResponse>({
    queryKey: ["/api/workflows"],
  });
  
  const workflows = data?.workflows || [];

  useEffect(() => {
    setIsActionPanelCollapsed(isMobile);
  }, [isMobile]);

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
        // Check if this is a "running" response (n8n workflows)
        if (result.data?.status === "running" && result.metadata.executionId) {
          const workflowId = result.metadata.workflowId;
          setRunningExecutions(prev => ({
            ...prev,
            [workflowId]: {
              executionId: result.metadata.executionId!,
              startedAt: Date.now(),
            },
          }));
          toast({
            title: "Workflow started",
            description: result.data.message || "Processing in background...",
          });
        } else {
          // Immediate completion (local workflows)
          toast({
            title: "Workflow executed",
            description: `${result.metadata.workflowId} completed in ${result.metadata.durationMs}ms`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/traces"] });
          if (selectedWorkflow) {
            queryClient.invalidateQueries({ queryKey: ["/api/workflows", selectedWorkflow.id, "output"] });
            queryClient.invalidateQueries({ queryKey: ["/api/workflows", selectedWorkflow.id, "executions"] });
          }
        }
      } else {
        toast({
          title: "Workflow failed",
          description: result.error?.message || "Unknown error",
          variant: "destructive",
        });
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

  const getExecuteButtonState = () => {
    if (executeMutation.isPending) {
      return { label: "Starting...", icon: <RefreshCw className="h-4 w-4 animate-spin" />, disabled: true };
    }
    if (isWorkflowRunning) {
      return { label: "Running...", icon: <RefreshCw className="h-4 w-4 animate-spin" />, disabled: true };
    }
    return { label: "Execute", icon: <Play className="h-4 w-4" />, disabled: false };
  };

  const buttonState = getExecuteButtonState();

  const actions = selectedWorkflow?.mode === "n8n"
    ? [
        {
          id: "execute-workflow",
          label: buttonState.label,
          icon: buttonState.icon,
          method: "POST" as const,
          endpoint: `/api/workflows/${selectedWorkflow.id}/execute`,
          description: isWorkflowRunning ? "Workflow is processing..." : "Send test payload to n8n",
          onClick: () => executeMutation.mutate(selectedWorkflow.id),
          disabled: buttonState.disabled,
          variant: "outline" as const,
        },
      ]
    : [];

  const handleWorkflowSelect = (workflow: WorkflowDefinition) => {
    setSelectedWorkflow(workflow);
    setSelectedExecution(null);
    setViewMode("latest");
  };

  // Desktop nav - shows all workflows flat
  const DesktopNavContent = () => (
    <>
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
              onClick={() => handleWorkflowSelect(workflow)}
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
    </>
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Nav - Workflow List (hidden on mobile per UI-006) */}
      <div className="hidden md:flex min-w-[14rem] max-w-[18rem] flex-shrink-0 border-r bg-muted/30 flex-col overflow-hidden">
        <DesktopNavContent />
      </div>

      {/* Main Content - Workflow Detail */}
      <div className="flex-1 overflow-auto p-4">

        {selectedWorkflow ? (
          <div className="space-y-4">
            {/* Mobile back button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm" onClick={() => handleWorkflowSelect(null)} data-testid="button-back-to-workflows">
                Back
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold" data-testid="text-workflow-name">{selectedWorkflow.name}</h2>
                <Badge variant="outline">{selectedWorkflow.mode}</Badge>
                {isWorkflowRunning && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" data-testid="badge-running">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Running
                  </Badge>
                )}
              </div>
              {selectedWorkflow.mode === "n8n" && (
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
              )}
            </div>

            <Collapsible open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" data-testid="button-toggle-description">
                  {isDescriptionOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Info className="h-4 w-4" />
                  <span>Workflow Info</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2" data-testid="card-workflow-detail">
                  <CardContent className="pt-4 space-y-4">
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
              </CollapsibleContent>
            </Collapsible>

            {selectedWorkflow.mode === "n8n" && viewMode === "latest" && (
              <WorkflowOutputPreview workflowId={selectedWorkflow.id} />
            )}

            {selectedWorkflow.mode === "n8n" && viewMode === "history" && (
              <div className="flex gap-4 min-h-[400px] max-h-[calc(100vh-200px)]">
                <div className="min-w-[12rem] max-w-[16rem] flex-shrink-0 overflow-auto">
                  <ExecutionsList
                    workflowId={selectedWorkflow.id}
                    selectedExecutionId={selectedExecution?.id || null}
                    onSelectExecution={(exec) => setSelectedExecution({ id: exec.id, workflowId: exec.workflowId, status: exec.status })}
                  />
                </div>
                <div className="flex-1 overflow-auto">
                  {selectedExecution ? (
                    <ExecutionDetail executionId={selectedExecution.id} />
                  ) : (
                    <Card className="border-dashed h-full flex items-center justify-center">
                      <CardContent className="text-center text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Select an execution to view details</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Mobile: Show workflow list as cards. Desktop: Prompt to select from nav */
          <div className="space-y-4">
            <div className="md:hidden">
              <h2 className="text-lg font-semibold mb-4" data-testid="text-workflows-heading">Agentic Workflows</h2>
              {isLoading ? (
                <div className="space-y-3" data-testid="status-loading-workflows-mobile">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {workflows.map((workflow) => (
                    <Card
                      key={workflow.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleWorkflowSelect(workflow)}
                      data-testid={`card-workflow-${workflow.id}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base">{workflow.name}</CardTitle>
                          <Badge variant="outline">{workflow.mode}</Badge>
                        </div>
                        <CardDescription className="text-sm">{workflow.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden md:flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Workflow className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a workflow to view details</p>
              </div>
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
