import { useQuery } from "@tanstack/react-query";

interface ExecutionStatus {
  execution: {
    id: string;
    workflowId: string;
    status: "running" | "completed" | "failed";
    completedAt?: string;
    createdAt?: string;
  };
}

interface ExecutionListItem {
  id: string;
  workflowId: string;
  triggerTraceId: string | null;
  externalExecutionId: string | null;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  userId: string | null;
}

interface ExecutionsResponse {
  executions: ExecutionListItem[];
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

export function useExecutionPolling(executionId: string | null) {
  return useQuery<ExecutionStatus>({
    queryKey: ["/api/n8n/executions", executionId, "poll"],
    queryFn: async () => {
      if (!executionId) throw new Error("No execution ID");
      const res = await fetch(`/api/n8n/executions/${executionId}`, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch execution: ${res.status}`);
      return res.json();
    },
    enabled: !!executionId,
    refetchInterval: 3000,
  });
}

export function useExecutionDetail(executionId: string | null) {
  return useQuery<ExecutionDetailResponse>({
    queryKey: ["/api/n8n/executions", executionId],
    queryFn: async () => {
      if (!executionId) throw new Error("No execution ID");
      const res = await fetch(`/api/n8n/executions/${executionId}`, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch execution: ${res.status}`);
      return res.json();
    },
    enabled: !!executionId,
  });
}

export function useExecutionsList(workflowId: string | null) {
  return useQuery<ExecutionsResponse>({
    queryKey: ["/api/n8n/workflows", workflowId, "executions"],
    queryFn: async () => {
      if (!workflowId) throw new Error("No workflow ID");
      const res = await fetch(`/api/n8n/workflows/${workflowId}/executions`, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch executions: ${res.status}`);
      return res.json();
    },
    enabled: !!workflowId,
    refetchInterval: 10000,
  });
}

export function useWorkflowOutput(workflowId: string | null) {
  return useQuery<WorkflowOutput>({
    queryKey: ["/api/n8n/workflows", workflowId, "output"],
    queryFn: async () => {
      if (!workflowId) throw new Error("No workflow ID");
      const res = await fetch(`/api/n8n/workflows/${workflowId}/output`, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch output: ${res.status}`);
      return res.json();
    },
    enabled: !!workflowId,
  });
}

export type {
  ExecutionStatus,
  ExecutionListItem,
  ExecutionsResponse,
  WorkflowOutput,
  ExecutionDetailResponse,
  WorkflowExecution,
  CommunicationTrace
};
