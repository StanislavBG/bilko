import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useViewMode } from "@/contexts/view-mode-context";
import { PageContent } from "@/components/page-content";
import { ActionBar } from "@/components/action-bar";
import { ActionPanel } from "@/components/action-panel";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, RefreshCw, Activity, Loader2, ArrowRight, Copy, Check, Database, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CommunicationTrace } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface TracesResponse {
  traces: CommunicationTrace[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTimestamp(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString();
}

function JsonDisplay({ data }: { data: unknown }) {
  if (!data) return <span className="text-muted-foreground">No data</span>;
  return (
    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    success: "Success",
    failed: "Failed",
    in_progress: "In Progress",
    pending: "Pending"
  };
  return <span className="text-sm text-muted-foreground">{labels[status] || status}</span>;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-foreground" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-foreground" />;
    case "in_progress":
      return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function CopyButton({ text, onCopy }: { text: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      data-testid="button-copy-trace-id"
    >
      {copied ? (
        <Check className="h-4 w-4 text-foreground" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

function TraceDetailModal({ 
  trace, 
  open, 
  onClose 
}: { 
  trace: CommunicationTrace | null; 
  open: boolean; 
  onClose: () => void;
}) {
  if (!trace) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Trace Detail
            <StatusBadge status={trace.overallStatus} />
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Trace ID</span>
              <p className="font-mono text-xs">{trace.traceId}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Routing</span>
              <div className="flex items-center gap-1">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{trace.sourceService}</code>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{trace.destinationService}</code>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Workflow</span>
              <p className="font-medium">{trace.workflowId}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Action</span>
              <p>{trace.action || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p>{formatDuration(trace.durationMs)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Requested At</span>
              <p>{formatTimestamp(trace.requestedAt)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Responded At</span>
              <p>{trace.respondedAt ? formatTimestamp(trace.respondedAt) : "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Attempt</span>
              <p>{trace.attemptNumber}</p>
            </div>
            {trace.n8nExecutionId && (
              <div className="col-span-2">
                <span className="text-muted-foreground">n8n Execution ID</span>
                <p className="font-mono text-xs">{trace.n8nExecutionId}</p>
              </div>
            )}
          </div>

          {(trace.errorCode || trace.errorDetail) && (
            <div className="p-3 bg-destructive/10 rounded-md">
              {trace.errorCode && (
                <p className="text-sm font-medium text-destructive">{trace.errorCode}</p>
              )}
              {trace.errorDetail && (
                <pre className="text-xs mt-2 whitespace-pre-wrap max-h-64 overflow-auto">
                  {trace.errorDetail}
                </pre>
              )}
            </div>
          )}

          {trace.details && typeof trace.details === 'object' && Object.keys(trace.details as object).length > 0 ? (
            <div>
              <h4 className="text-sm font-medium mb-2">Details</h4>
              <JsonDisplay data={trace.details} />
            </div>
          ) : null}

          <div>
            <h4 className="text-sm font-medium mb-2">Request Payload</h4>
            <JsonDisplay data={trace.requestPayload} />
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Response Payload</h4>
            <JsonDisplay data={trace.responsePayload} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const PAGE_SIZE = 10;

export default function MemoryExplorer() {
  const { effectiveIsAdmin } = useViewMode();
  const isMobile = useIsMobile();
  const [selectedTrace, setSelectedTrace] = useState<CommunicationTrace | null>(null);
  const [isActionPanelCollapsed, setIsActionPanelCollapsed] = useState(false);
  const [page, setPage] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    setIsActionPanelCollapsed(isMobile);
  }, [isMobile]);

  const { data, isLoading, refetch, isRefetching } = useQuery<TracesResponse>({
    queryKey: ["/api/traces", page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE)
      });
      const res = await fetch(`/api/traces?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch traces");
      return res.json();
    }
  });

  const traces = data?.traces;
  const pagination = data?.pagination;


  if (!effectiveIsAdmin) {
    return (
      <PageContent>
        <div className="p-6">
          <div className="flex flex-col gap-6 max-w-4xl">
            <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
            <p className="text-muted-foreground">
              You don't have permission to view this page.
            </p>
          </div>
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent className="flex-row">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col gap-6">
            <ActionBar
              variant="page"
              icon={<Database className="h-5 w-5 text-muted-foreground" />}
              title="Memory Explorer"
              description="View orchestration layer communication traces"
              testId="action-bar-memory"
            />

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-traces">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Trace ID</th>
                      <th className="text-left p-3 font-medium">Timestamp</th>
                      <th className="text-left p-3 font-medium">Routing</th>
                      <th className="text-left p-3 font-medium">Workflow</th>
                      <th className="text-left p-3 font-medium">Action</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                          <td className="p-3"><Skeleton className="h-4 w-28" /></td>
                          <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                          <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="p-3"><Skeleton className="h-4 w-12" /></td>
                        </tr>
                      ))
                    ) : traces && traces.length > 0 ? (
                      traces.map((trace) => (
                        <tr 
                          key={trace.id} 
                          className="border-b hover-elevate cursor-pointer"
                          onClick={() => setSelectedTrace(trace)}
                          data-testid={`row-trace-${trace.id}`}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono" data-testid={`text-trace-id-${trace.id}`}>
                                {trace.traceId ? `${trace.traceId.slice(0, 12)}...` : "-"}
                              </code>
                              {trace.traceId && (
                                <CopyButton 
                                  text={trace.traceId} 
                                  onCopy={() => toast({
                                    title: "Copied!",
                                    description: `Trace ID ${trace.traceId} copied to clipboard`,
                                  })}
                                />
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span>{formatTimestamp(trace.requestedAt)}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 text-xs">
                              <code className="bg-muted px-1 py-0.5 rounded">{trace.sourceService}</code>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <code className="bg-muted px-1 py-0.5 rounded">{trace.destinationService}</code>
                            </div>
                          </td>
                          <td className="p-3">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {trace.workflowId}
                            </code>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {trace.action || "-"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <StatusIcon status={trace.overallStatus} />
                              <span className="text-muted-foreground">
                                {trace.overallStatus === "success" ? "Success" :
                                 trace.overallStatus === "failed" ? "Failed" :
                                 trace.overallStatus === "in_progress" ? "In Progress" :
                                 "Pending"}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {formatDuration(trace.durationMs)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Activity className="h-8 w-8 opacity-50" />
                            <p>No traces yet</p>
                            <p className="text-xs">
                              Traces will appear here when the orchestrator processes requests
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pagination Controls */}
            {pagination && pagination.total > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {pagination.offset + 1} - {Math.min(pagination.offset + PAGE_SIZE, pagination.total)} of {pagination.total} traces
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {page + 1} of {Math.ceil(pagination.total / PAGE_SIZE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!pagination.hasMore || isLoading}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <TraceDetailModal 
            trace={selectedTrace} 
            open={!!selectedTrace} 
            onClose={() => setSelectedTrace(null)} 
          />
        </div>
      </div>

      {/* Right Action Panel */}
      <ActionPanel
        title="Actions"
        isCollapsed={isActionPanelCollapsed}
        onToggleCollapse={() => setIsActionPanelCollapsed(!isActionPanelCollapsed)}
        testId="memory-action-panel"
        actions={[
          {
            id: "refresh",
            label: "Refresh",
            icon: <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />,
            endpoint: "/api/traces",
            method: "GET",
            description: "Reload trace list",
            onClick: () => refetch(),
            disabled: isRefetching,
            variant: "outline"
          }
        ]}
      />
    </PageContent>
  );
}
