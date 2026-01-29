import { registerHandler } from "../local-executor";
import type { WorkflowInput, WorkflowOutput } from "../types";

async function rulesAuditHandler(input: WorkflowInput): Promise<WorkflowOutput> {
  const startTime = Date.now();
  
  return {
    success: true,
    data: {
      message: "Rules audit is currently executed via agent reasoning (AGT-002-RULES). This local handler is a placeholder for future automated execution.",
      action: input.action,
      payload: input.payload,
    },
    metadata: {
      workflowId: "rules-audit",
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    },
  };
}

async function codeAuditHandler(input: WorkflowInput): Promise<WorkflowOutput> {
  const startTime = Date.now();
  
  return {
    success: true,
    data: {
      message: "Code audit is currently executed via agent reasoning (AGT-002-CODE). This local handler is a placeholder for future automated execution.",
      action: input.action,
      payload: input.payload,
    },
    metadata: {
      workflowId: "code-audit",
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    },
  };
}

export function initializeHandlers(): void {
  registerHandler("rulesAudit", rulesAuditHandler);
  registerHandler("codeAudit", codeAuditHandler);
}
