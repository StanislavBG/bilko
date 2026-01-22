import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useViewMode } from "@/contexts/view-mode-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, RefreshCw, Activity } from "lucide-react";
import type { CommunicationTrace } from "@shared/schema";

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
            {trace.success ? (
              <Badge variant="default" className="bg-green-600">Success</Badge>
            ) : (
              <Badge variant="destructive">Failed</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Trace ID</span>
              <p className="font-mono text-xs">{trace.traceId}</p>
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
              <span className="text-muted-foreground">Attempt</span>
              <p>{trace.attemptNumber}</p>
            </div>
          </div>

          {trace.errorCode && (
            <div className="p-3 bg-destructive/10 rounded-md">
              <p className="text-sm font-medium text-destructive">{trace.errorCode}</p>
              <p className="text-sm text-muted-foreground">{trace.errorMessage}</p>
            </div>
          )}

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

export default function MemoryExplorer() {
  const { effectiveIsAdmin } = useViewMode();
  const [selectedTrace, setSelectedTrace] = useState<CommunicationTrace | null>(null);

  const { data: traces, isLoading, refetch, isRefetching } = useQuery<CommunicationTrace[]>({
    queryKey: ["/api/traces"],
  });

  if (!effectiveIsAdmin) {
    return (
      <div className="p-6">
        <div className="flex flex-col gap-6 max-w-4xl">
          <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
              Memory Explorer
            </h1>
            <p className="text-muted-foreground">
              View orchestration layer communication traces
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-traces">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Timestamp</th>
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
                      <td className="p-3"><Skeleton className="h-4 w-32" /></td>
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
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{formatTimestamp(trace.requestedAt)}</span>
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
                        {trace.success ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Success</span>
                          </div>
                        ) : trace.success === false ? (
                          <div className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-4 w-4" />
                            <span>Failed</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {formatDuration(trace.durationMs)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
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
      </div>

      <TraceDetailModal 
        trace={selectedTrace} 
        open={!!selectedTrace} 
        onClose={() => setSelectedTrace(null)} 
      />
    </div>
  );
}
