import type { WorkflowInput, WorkflowOutput, WorkflowDefinition, WorkflowRegistry } from "./types";
import { executeLocal } from "./local-executor";
import { orchestratorStorage } from "../orchestrator/storage";
import { getWebhookUrl } from "../n8n/webhook-cache";
import registry from "./registry.json";

const workflowRegistry = registry as WorkflowRegistry;

function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function getWorkflow(workflowId: string): WorkflowDefinition | undefined {
  return workflowRegistry.workflows.find(w => w.id === workflowId);
}

export function listWorkflows(): WorkflowDefinition[] {
  return workflowRegistry.workflows;
}

export async function routeWorkflow(
  workflowId: string,
  action: string,
  payload: Record<string, unknown>,
  sourceService: "bilko" | "replit:shell" | "n8n",
  userId: string
): Promise<WorkflowOutput> {
  const workflow = getWorkflow(workflowId);
  
  if (!workflow) {
    return {
      success: false,
      error: {
        code: "WORKFLOW_NOT_FOUND",
        message: `Workflow '${workflowId}' not found in registry`,
        retryable: false,
      },
      metadata: {
        workflowId,
        executedAt: new Date().toISOString(),
        durationMs: 0,
      },
    };
  }

  const traceId = generateTraceId();
  const startTime = Date.now();
  const requestedAt = new Date();

  const input: WorkflowInput = {
    action,
    payload,
    context: {
      userId,
      traceId,
      requestedAt: requestedAt.toISOString(),
      sourceService,
      attempt: 1,
    },
  };

  const destinationService = workflow.mode === "local" ? "local" : "n8n";

  const trace = await orchestratorStorage.createTrace({
    traceId,
    attemptNumber: 1,
    sourceService,
    destinationService,
    workflowId,
    action,
    userId,
    requestedAt,
    requestPayload: input,
    overallStatus: "in_progress",
  });

  let output: WorkflowOutput;

  try {
    if (workflow.mode === "local") {
      if (!workflow.handler) {
        throw new Error(`Local workflow '${workflowId}' has no handler defined`);
      }
      output = await executeLocal(workflow.handler, input);
    } else {
      output = await executeN8nWorkflow(workflow, input);
    }
  } catch (error) {
    output = {
      success: false,
      error: {
        code: "EXECUTION_ERROR",
        message: error instanceof Error ? error.message : String(error),
        retryable: false,
      },
      metadata: {
        workflowId,
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  }

  const endTime = Date.now();

  await orchestratorStorage.updateTrace(trace.id, {
    respondedAt: new Date(),
    durationMs: endTime - startTime,
    responsePayload: output,
    overallStatus: output.success ? "success" : "failed",
    errorCode: output.error?.code || null,
    errorDetail: output.error?.message || null,
  });

  return output;
}

async function executeN8nWorkflow(
  workflow: WorkflowDefinition,
  input: WorkflowInput
): Promise<WorkflowOutput> {
  const cachedUrl = getWebhookUrl(workflow.id);
  const envUrl = workflow.endpoint ? process.env[workflow.endpoint] : undefined;
  const webhookUrl = cachedUrl || envUrl;
  
  if (!webhookUrl) {
    return {
      success: false,
      error: {
        code: "WEBHOOK_NOT_CONFIGURED",
        message: `Webhook URL not found for '${workflow.id}'. Ensure n8n sync completed successfully.`,
        retryable: false,
      },
      metadata: {
        workflowId: workflow.id,
        executedAt: new Date().toISOString(),
        durationMs: 0,
      },
    };
  }

  const startTime = Date.now();

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    // Construct callback URL
    // REPLIT_DOMAINS is set in dev and changes on container restart
    // In prod deployment, REPLIT_DOMAINS is not set, so we use stable prod URL
    let callbackUrl: string;
    
    if (process.env.REPLIT_DOMAINS) {
      // Dev environment: use current Replit domain (handles domain changes)
      const currentDomain = process.env.REPLIT_DOMAINS.split(',')[0];
      callbackUrl = `https://${currentDomain}/api/workflows/callback`;
      console.log(`[n8n] Using dev callback URL: ${callbackUrl}`);
    } else {
      // Production or no REPLIT_DOMAINS: use stable prod URL
      callbackUrl = 'https://bilkobibitkov.replit.app/api/workflows/callback';
      console.log(`[n8n] Using prod callback URL: ${callbackUrl}`);
    }

    // Include secrets needed by n8n workflows (passed via payload per ARCH-000-B)
    const n8nPayload = {
      ...input,
      geminiApiKey: process.env.GEMINI_API_KEY,
      traceId: input.context.traceId,
      callbackUrl, // Dynamic callback URL for n8n to use
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bilko-User-Id": input.context.userId,
        "X-Bilko-Request-Id": requestId,
        "X-Bilko-Trace-Id": input.context.traceId,
        "X-Bilko-Timestamp": input.context.requestedAt,
        "X-Bilko-Attempt": String(input.context.attempt),
      },
      body: JSON.stringify(n8nPayload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    const isSuccess = response.ok && data.success !== false;

    const errorCode = data.error?.code || data.code || "N8N_ERROR";
    const errorMessage = data.error?.message || data.message || "Workflow execution failed";
    const errorHint = data.hint;

    return {
      success: isSuccess,
      data: isSuccess ? (data.data || data) : undefined,
      error: !isSuccess ? {
        code: String(errorCode),
        message: errorHint ? `${errorMessage} ${errorHint}` : errorMessage,
        retryable: data.error?.retryable ?? (response.status >= 500),
        details: data.error?.details || (errorHint ? { hint: errorHint } : undefined),
      } : undefined,
      metadata: {
        workflowId: workflow.id,
        executionId: data.metadata?.executionId,
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: error instanceof Error && error.name === "AbortError" 
          ? "TIMEOUT" 
          : "N8N_ERROR",
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
      },
      metadata: {
        workflowId: workflow.id,
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  }
}
