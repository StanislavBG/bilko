export interface WorkflowInput {
  action: string;
  payload: Record<string, unknown>;
  context: {
    userId: string;
    traceId: string;
    requestedAt: string;
    sourceService: "bilko" | "replit:shell" | "n8n";
    attempt: number;
  };
}

export interface WorkflowOutput {
  success: boolean;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  metadata: {
    workflowId: string;
    executionId?: string;
    executedAt: string;
    durationMs: number;
  };
}

export type WorkflowMode = "local" | "n8n";

export interface WorkflowDefinition {
  id: string;
  name: string;
  mode: WorkflowMode;
  description: string;
  instructions: string;
  endpoint?: string;
  handler?: string;
  category: string;
}

export interface WorkflowRegistry {
  version: string;
  workflows: WorkflowDefinition[];
}

export type LocalWorkflowHandler = (input: WorkflowInput) => Promise<WorkflowOutput>;
