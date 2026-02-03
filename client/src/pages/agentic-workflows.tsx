import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Play, RefreshCw, Workflow, Image, FileText, History, Copy, Download, Check, ChevronDown, ChevronRight, Info, Clock, Activity, ExternalLink, Maximize2, X, Link } from "lucide-react";
import { ActionBar } from "@/components/action-bar";
import { ActionPanel } from "@/components/action-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useCopyToClipboard, copyImageToClipboard, downloadImage } from "@/hooks/use-clipboard";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDuration, formatTimestamp } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ExecutionsList } from "@/components/executions-list";
import { ExecutionDetail } from "@/components/execution-detail";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

interface ExecutionStats {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  stepCount: number;
}

interface TraceItem {
  id: string;
  action: string | null;
  status: string;
  stepIndex: number;
  timestamp: string;
  durationMs: number | null;
}

interface WorkflowOutput {
  hasOutput: boolean;
  message?: string;
  fb2DisclosureText?: string;
  executionStats?: ExecutionStats | null;
  traces?: TraceItem[];
  sourceUrls?: string[];
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
          sourceUrls?: string[];
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
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [showFullPost, setShowFullPost] = useState(false);
  const [showTraces, setShowTraces] = useState(false);
  
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
  const stats = data.executionStats;
  const traces = data.traces || [];
  const sourceUrls = data.sourceUrls || finalData?.sourceUrls || [];

  return (
    <div className="space-y-3">
      {/* Header with Refresh */}
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

      {/* Execution Stats Bar */}
      {stats && (
        <Card className="bg-muted/30" data-testid="card-execution-stats">
          <CardContent className="py-2 px-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Started:</span>
                <span className="font-medium">{formatTimestamp(stats.startedAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{formatDuration(stats.durationMs)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Steps:</span>
                <span className="font-medium">{stats.stepCount}</span>
              </div>
              <Badge 
                variant={stats.status === "completed" ? "default" : "secondary"}
                className="text-[10px]"
              >
                {stats.status}
              </Badge>
              {traces.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 text-[10px]"
                  onClick={() => setShowTraces(!showTraces)}
                  data-testid="button-toggle-traces"
                >
                  {showTraces ? "Hide" : "Show"} Traces
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Traces Panel (collapsible) */}
      {showTraces && traces.length > 0 && (
        <Card data-testid="card-traces">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">Memory Communications</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0 max-h-48 overflow-auto">
            <div className="space-y-1">
              {traces.map((trace, idx) => (
                <div 
                  key={trace.id} 
                  className="flex items-center gap-2 text-[10px] py-1 border-b last:border-b-0"
                  data-testid={`trace-item-${idx}`}
                >
                  <span className="text-muted-foreground w-4">{trace.stepIndex}</span>
                  <Badge 
                    variant={trace.status === "success" ? "default" : "secondary"}
                    className="text-[8px] px-1"
                  >
                    {trace.status === "success" ? "OK" : trace.status}
                  </Badge>
                  <span className="font-medium truncate flex-1">{trace.action || "unknown"}</span>
                  <span className="text-muted-foreground">{formatDuration(trace.durationMs)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* Image - full width on mobile, fixed width on desktop */}
        <div className="w-full md:w-[280px] flex-shrink-0">
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
                            size="sm"
                            onClick={() => setShowFullscreenImage(true)}
                            data-testid="button-fullscreen-image"
                          >
                            <Maximize2 className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Fullscreen</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
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
                            size="sm"
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
                  <div 
                    className="rounded overflow-hidden cursor-pointer"
                    onClick={() => setShowFullscreenImage(true)}
                  >
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

        {/* Post and Sources */}
        <div className="flex-1 space-y-3 min-w-0 w-full">
          {postContent && (
            <Card data-testid="card-facebook-post">
              <CardHeader className="py-2 px-3">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <CardTitle className="text-xs">Facebook Post</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFullPost(true)}
                          data-testid="button-expand-post"
                        >
                          <Maximize2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View full post</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copy(postContent, "post-content", "Post copied")}
                          data-testid="button-copy-post"
                        >
                          {isCopied("post-content") ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy post</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div 
                  className="bg-muted rounded p-2 cursor-pointer"
                  onClick={() => setShowFullPost(true)}
                >
                  <p className="text-xs line-clamp-4" data-testid="text-post-content">{postContent}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Source Links */}
          {sourceUrls.length > 0 && (
            <Card data-testid="card-sources">
              <CardHeader className="py-2 px-3">
                <div className="flex items-center gap-1">
                  <Link className="h-3 w-3 text-muted-foreground" />
                  <CardTitle className="text-xs">Sources ({sourceUrls.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="space-y-1">
                  {sourceUrls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground hover:underline truncate"
                      data-testid={`source-link-${idx + 1}`}
                    >
                      <span className="font-medium">[{idx + 1}]</span>
                      <ExternalLink className="h-2 w-2 flex-shrink-0" />
                      <span className="truncate">{url.replace(/^https?:\/\//, "").substring(0, 50)}...</span>
                    </a>
                  ))}
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

      {/* Fullscreen Image Modal */}
      {showFullscreenImage && imageUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowFullscreenImage(false)}
          data-testid="modal-fullscreen-image"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setShowFullscreenImage(false)}
            data-testid="button-close-fullscreen"
          >
            <X className="h-6 w-6" />
          </Button>
          <img 
            src={imageUrl} 
            alt="Generated infographic" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Full Post Modal */}
      {showFullPost && postContent && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullPost(false)}
          data-testid="modal-full-post"
        >
          <Card 
            className="max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Facebook Post</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copy(postContent, "modal-post", "Post copied")}
                  data-testid="button-copy-modal-post"
                >
                  {isCopied("modal-post") ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFullPost(false)}
                  data-testid="button-close-post-modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap" data-testid="text-full-post">{postContent}</p>
            </CardContent>
          </Card>
        </div>
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

  const handleWorkflowSelect = (workflow: WorkflowDefinition | null) => {
    setSelectedWorkflow(workflow);
    setSelectedExecution(null);
    setViewMode("latest");
    // Expand ActionPanel on mobile when a workflow is selected (so execute button is visible)
    if (workflow && isMobile) {
      setIsActionPanelCollapsed(false);
    }
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
