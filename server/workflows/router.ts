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
  let webhookUrl = cachedUrl || envUrl;
  
  // Note: DEV and PROD workflows have SEPARATE webhook paths (per ENV-001 v1.3.0)
  // PROD: european-football-daily | DEV: dev-european-football-daily
  // Both can be active simultaneously - no need to deactivate one to test the other
  
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

  // Create execution record BEFORE triggering - this tracks the async workflow
  const execution = await orchestratorStorage.createExecution({
    workflowId: workflow.id,
    triggerTraceId: input.context.traceId,
    externalExecutionId: null,
    status: "running",
    userId: input.context.userId,
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    // Construct callback URL per ENV-001
    // Priority: Explicit env var > Dynamic domain detection > Prod fallback
    let callbackUrl: string;
    const PROD_CALLBACK_URL = 'https://bilkobibitkov.replit.app/api/workflows/callback';
    
    if (process.env.CALLBACK_URL_OVERRIDE) {
      // Explicit override (for testing or custom deployments)
      callbackUrl = process.env.CALLBACK_URL_OVERRIDE;
      console.log(`[n8n] Using override callback URL: ${callbackUrl}`);
    } else if (process.env.REPLIT_DOMAINS) {
      // Dev environment: use current Replit domain (dynamic, changes on restart)
      const currentDomain = process.env.REPLIT_DOMAINS.split(',')[0];
      callbackUrl = `https://${currentDomain}/api/workflows/callback`;
      console.log(`[n8n] Using dev callback URL: ${callbackUrl}`);
    } else {
      // Production: use stable prod URL per ENV-001
      callbackUrl = PROD_CALLBACK_URL;
      console.log(`[n8n] Using prod callback URL: ${callbackUrl}`);
    }

    // Fetch recent topics for deduplication (per ARCH-000)
    const recentTopicsRaw = await orchestratorStorage.getRecentTopics(workflow.id, 48);
    const recentTopics = recentTopicsRaw.map(t => ({
      headline: t.headline,
      usedAt: t.usedAt?.toISOString(),
    }));
    console.log(`[n8n] Sending ${recentTopics.length} recent topics for deduplication`);

    // Include secrets needed by n8n workflows (passed via payload per ARCH-000-B)
    const n8nPayload = {
      ...input,
      geminiApiKey: process.env.GEMINI_API_KEY,
      traceId: input.context.traceId,
      callbackUrl, // Dynamic callback URL for n8n to use
      recentTopics, // Recent topics for duplicate prevention
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
    const webhookSuccess = response.ok && data.success !== false;

    if (!webhookSuccess) {
      // Webhook trigger failed - mark execution as failed
      await orchestratorStorage.updateExecution(execution.id, {
        status: "failed",
        completedAt: new Date(),
      });
      
      const errorCode = data.error?.code || data.code || "N8N_ERROR";
      const errorMessage = data.error?.message || data.message || "Workflow trigger failed";
      const errorHint = data.hint;

      return {
        success: false,
        error: {
          code: String(errorCode),
          message: errorHint ? `${errorMessage} ${errorHint}` : errorMessage,
          retryable: data.error?.retryable ?? (response.status >= 500),
          details: data.error?.details || (errorHint ? { hint: errorHint } : undefined),
        },
        metadata: {
          workflowId: workflow.id,
          executionId: execution.id,
          executedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      };
    }

    // Webhook trigger succeeded - workflow is now running in n8n
    // Return "running" status with execution ID for polling
    return {
      success: true,
      data: {
        status: "running",
        message: "Workflow triggered successfully. Processing in background...",
        executionId: execution.id,
      },
      metadata: {
        workflowId: workflow.id,
        executionId: execution.id,
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    // Network/timeout error - mark execution as failed
    await orchestratorStorage.updateExecution(execution.id, {
      status: "failed",
      completedAt: new Date(),
    });
    
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
        executionId: execution.id,
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  }
}
