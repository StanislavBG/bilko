import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface RunningExecution {
  executionId: string;
  startedAt: number;
}

interface ExecutionStatus {
  execution: {
    id: string;
    workflowId: string;
    status: "running" | "completed" | "failed";
    completedAt?: string;
  };
}

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const TIMEOUT_CHECK_MS = 30000;

export function useExecutionPolling() {
  const { toast } = useToast();
  const [runningExecutions, setRunningExecutions] = useState<Record<string, RunningExecution>>({});

  const allRunningIds = Object.values(runningExecutions).map((r) => r.executionId);

  // Poll running executions
  useEffect(() => {
    if (allRunningIds.length === 0) return;

    const interval = setInterval(async () => {
      for (const executionId of allRunningIds) {
        try {
          const res = await fetch(`/api/n8n/executions/${executionId}`, { credentials: "include" });
          if (!res.ok) continue;

          const data: ExecutionStatus = await res.json();
          const { status, workflowId } = data.execution;

          if (status === "completed") {
            setRunningExecutions((prev) => {
              const updated = { ...prev };
              delete updated[workflowId];
              return updated;
            });
            toast({ title: "Workflow completed", description: "Processing finished successfully. Refreshing output..." });
            queryClient.invalidateQueries({ queryKey: ["/api/n8n/traces"] });
            queryClient.invalidateQueries({ queryKey: ["/api/n8n/workflows", workflowId, "output"] });
            queryClient.invalidateQueries({ queryKey: ["/api/n8n/workflows", workflowId, "executions"] });
          } else if (status === "failed") {
            setRunningExecutions((prev) => {
              const updated = { ...prev };
              delete updated[workflowId];
              return updated;
            });
            toast({ title: "Workflow failed", description: "Processing encountered an error", variant: "destructive" });
            queryClient.invalidateQueries({ queryKey: ["/api/n8n/traces"] });
            queryClient.invalidateQueries({ queryKey: ["/api/n8n/workflows", workflowId, "executions"] });
          }
        } catch {
          // Ignore polling errors
        }
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [allRunningIds.join(","), toast]);

  // Timeout check — clear stuck executions after 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timedOut: string[] = [];

      setRunningExecutions((prev) => {
        const updated = { ...prev };
        let changed = false;
        for (const [wfId, data] of Object.entries(updated)) {
          if (now - data.startedAt > TIMEOUT_MS) {
            timedOut.push(wfId);
            delete updated[wfId];
            changed = true;
          }
        }
        return changed ? updated : prev;
      });

      timedOut.forEach((wfId) => {
        toast({
          title: "Workflow timed out",
          description: `${wfId} did not complete within 10 minutes. Check the execution history for details.`,
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/n8n/workflows", wfId, "executions"] });
      });
    }, TIMEOUT_CHECK_MS);

    return () => clearInterval(interval);
  }, [toast]);

  const startTracking = (workflowId: string, executionId: string) => {
    setRunningExecutions((prev) => ({
      ...prev,
      [workflowId]: { executionId, startedAt: Date.now() },
    }));
  };

  const isRunning = (workflowId: string) => !!runningExecutions[workflowId];

  return { isRunning, startTracking };
}
