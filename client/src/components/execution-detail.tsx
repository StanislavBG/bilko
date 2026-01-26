import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle, XCircle, Clock, Image, FileText, Activity, Shield, Copy, Download, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

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

interface CommunicationTrace {
  id: string;
  traceId: string;
  executionId: string | null;
  attemptNumber: number;
  sourceService: string;
  destinationService: string;
  workflowId: string | null;
  action: string;
  overallStatus: string;
  requestedAt: string;
  respondedAt: string | null;
  durationMs: number;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggerTraceId: string;
  externalExecutionId: string | null;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  finalOutput: Record<string, unknown> | null;
  userId: string;
}

interface ExecutionDetailResponse {
  execution: WorkflowExecution;
  traces: CommunicationTrace[];
}

interface ExecutionDetailProps {
  executionId: string;
}

function extractFinalOutput(execution: WorkflowExecution): { 
  postContent?: string; 
  imagePrompt?: string; 
  imageUrl?: string;
  transparencyPost?: string;
  contentFiltered?: boolean;
} | null {
  if (!execution.finalOutput) return null;
  
  const data = execution.finalOutput.data as Record<string, unknown> | undefined;
  if (!data) return null;
  
  return {
    postContent: data.postContent as string | undefined,
    imagePrompt: data.imagePrompt as string | undefined,
    imageUrl: data.imageUrl as string | undefined,
    transparencyPost: data.transparencyPost as string | undefined,
    contentFiltered: data.contentFiltered as boolean | undefined,
  };
}

function TraceItem({ trace }: { trace: CommunicationTrace }) {
  const isSuccess = trace.overallStatus === "success";
  const timestamp = new Date(trace.requestedAt);
  
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-b-0">
      <div className="mt-0.5">
        {isSuccess ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : trace.overallStatus === "pending" ? (
          <Clock className="h-4 w-4 text-muted-foreground" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm">{trace.action}</span>
          <Badge variant="outline" className="text-xs">
            Step {trace.attemptNumber}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {timestamp.toLocaleTimeString()} - {trace.sourceService} → {trace.destinationService}
        </div>
      </div>
    </div>
  );
}

export function ExecutionDetail({ executionId }: ExecutionDetailProps) {
  const { toast } = useToast();
  const { copy, isCopied } = useCopyToClipboard();
  const { data, isLoading } = useQuery<ExecutionDetailResponse>({
    queryKey: ["/api/executions", executionId],
    queryFn: async () => {
      const res = await fetch(`/api/executions/${executionId}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-muted-foreground">
          <p>Failed to load execution details</p>
        </CardContent>
      </Card>
    );
  }

  const { execution, traces } = data;
  const output = extractFinalOutput(execution);
  const startTime = new Date(execution.startedAt);
  const endTime = execution.completedAt ? new Date(execution.completedAt) : null;
  const duration = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : null;

  return (
    <div className="space-y-4">
      <Card data-testid="card-execution-summary">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Execution Summary</CardTitle>
            <Badge variant={execution.status === "completed" ? "default" : execution.status === "failed" ? "destructive" : "secondary"}>
              {execution.status}
            </Badge>
          </div>
          <CardDescription className="text-xs font-mono">
            {execution.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Started</span>
            <span>{startTime.toLocaleString()}</span>
          </div>
          {endTime && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span>{endTime.toLocaleString()}</span>
            </div>
          )}
          {duration !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span>{duration}s</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Steps</span>
            <span>{traces.length}</span>
          </div>
        </CardContent>
      </Card>

      {output && (output.postContent || output.imagePrompt) && (
        <div className="flex gap-3">
          {/* Left: Image */}
          <div className="w-[200px] flex-shrink-0">
            {(output.imageUrl || output.imagePrompt) && (
              <Card data-testid="card-execution-infographic" className="h-full">
                <CardHeader className="py-2 px-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <Image className="h-3 w-3 text-muted-foreground" />
                      <CardTitle className="text-[10px]">Image</CardTitle>
                    </div>
                    {output.imageUrl && (
                      <div className="flex items-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => downloadImage(output.imageUrl!, `infographic-${executionId}.png`)}
                              data-testid="button-download-exec-image"
                            >
                              <Download className="h-2.5 w-2.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => copyImageToClipboard(output.imageUrl!, toast)}
                              data-testid="button-copy-exec-image"
                            >
                              <Copy className="h-2.5 w-2.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  {output.imageUrl ? (
                    <div className="rounded overflow-hidden">
                      <img 
                        src={output.imageUrl} 
                        alt="Generated infographic" 
                        className="w-full h-auto"
                        data-testid="img-execution-infographic"
                      />
                    </div>
                  ) : (
                    <div className="bg-muted rounded p-2 flex items-center justify-center border border-dashed h-24">
                      <div className="text-center text-[10px] text-muted-foreground">
                        <Image className="h-4 w-4 mx-auto mb-1 opacity-30" />
                        <p>Prompt only</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Posts */}
          <div className="flex-1 space-y-2 min-w-0">
            {output.postContent && (
              <Card data-testid="card-execution-post">
                <CardHeader className="py-1.5 px-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <CardTitle className="text-[10px]">Post 1</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copy(output.postContent!, `exec-post-${executionId}`, "Copied")}
                            data-testid="button-copy-exec-post"
                          >
                            {isCopied(`exec-post-${executionId}`) ? <Check className="h-2.5 w-2.5 text-green-600" /> : <Copy className="h-2.5 w-2.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy</TooltipContent>
                      </Tooltip>
                      <Badge variant="outline" className="text-[8px] px-1 py-0">Main</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <div className="bg-muted rounded p-1.5">
                    <p className="text-[10px] line-clamp-3" data-testid="text-execution-post-content">{output.postContent}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {output.transparencyPost && (
              <Card data-testid="card-execution-transparency">
                <CardHeader className="py-1.5 px-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-muted-foreground" />
                      <CardTitle className="text-[10px]">Post 2</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copy(output.transparencyPost!, `exec-transparency-${executionId}`, "Copied")}
                            data-testid="button-copy-exec-transparency"
                          >
                            {isCopied(`exec-transparency-${executionId}`) ? <Check className="h-2.5 w-2.5 text-green-600" /> : <Copy className="h-2.5 w-2.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy</TooltipContent>
                      </Tooltip>
                      <Badge variant="secondary" className="text-[8px] px-1 py-0">AI</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-[10px] text-muted-foreground line-clamp-2" data-testid="text-execution-transparency">{output.transparencyPost}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {output.contentFiltered && (
              <Card className="border-amber-200 dark:border-amber-800" data-testid="card-execution-filtered">
                <CardContent className="py-2 px-2">
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Shield className="h-3 w-3" />
                    <p className="text-[10px]">Image filtered by safety guidelines</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <Card data-testid="card-execution-traces">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Trace Log</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          {traces.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No traces recorded</p>
          ) : (
            traces.map((trace) => (
              <TraceItem key={trace.id} trace={trace} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
