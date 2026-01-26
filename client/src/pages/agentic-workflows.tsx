import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Play, RefreshCw, Workflow, Image, FileText, History, Shield, Menu, Copy, Download, Check, ChevronDown, ChevronRight, Info } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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

          {transparencyPost && (
            <Card data-testid="card-transparency-post">
              <CardHeader className="py-2 px-3">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    <CardTitle className="text-xs">Post 2: Transparency</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copy(transparencyPost, "transparency-post", "Post copied")}
                          data-testid="button-copy-transparency"
                        >
                          {isCopied("transparency-post") ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy post</TooltipContent>
                    </Tooltip>
                    <Badge variant="secondary" className="text-[10px] px-1">Follow-up</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-xs text-muted-foreground line-clamp-3" data-testid="text-transparency-content">{transparencyPost}</p>
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
  const [isWorkflowNavOpen, setIsWorkflowNavOpen] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  useEffect(() => {
    setIsActionPanelCollapsed(isMobile);
  }, [isMobile]);

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
        queryClient.invalidateQueries({ queryKey: ["/api/workflows", selectedWorkflow.id, "executions"] });
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

  const handleWorkflowSelect = (workflow: WorkflowDefinition) => {
    setSelectedWorkflow(workflow);
    setSelectedExecution(null);
    setViewMode("latest");
    if (isMobile) {
      setIsWorkflowNavOpen(false);
    }
  };

  const WorkflowNavContent = () => (
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
      {/* Mobile Workflow Nav Sheet */}
      {isMobile && (
        <Sheet open={isWorkflowNavOpen} onOpenChange={setIsWorkflowNavOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Workflows</SheetTitle>
              <SheetDescription>Select a workflow to view</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col h-full">
              <WorkflowNavContent />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop Left Nav - Workflow List */}
      {!isMobile && (
        <div className="w-64 border-r bg-muted/30 flex flex-col overflow-hidden">
          <WorkflowNavContent />
        </div>
      )}

      {/* Main Content - Workflow Detail */}
      <div className="flex-1 overflow-auto p-4">
        {/* Mobile nav toggle */}
        {isMobile && (
          <div className="flex items-center gap-2 mb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsWorkflowNavOpen(true)}
                  data-testid="button-open-workflow-nav"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open workflows</TooltipContent>
            </Tooltip>
            {selectedWorkflow && (
              <span className="text-sm font-medium truncate">{selectedWorkflow.name}</span>
            )}
          </div>
        )}

        {selectedWorkflow ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold" data-testid="text-workflow-name">{selectedWorkflow.name}</h2>
                <Badge variant="outline">{selectedWorkflow.mode}</Badge>
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
                <div className="w-64 flex-shrink-0 overflow-auto">
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
