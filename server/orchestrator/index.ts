import type { Express, Request, Response, NextFunction } from "express";
import { orchestratorStorage } from "./storage";
import { randomUUID } from "crypto";
import { createEchoTestWorkflow, getWebhookUrl, WEBHOOK_TIMEOUT } from "../n8n/api";
import { authStorage } from "../replit_integrations/auth/storage";

function generateTraceId(): string {
  return `trace_${randomUUID().replace(/-/g, "").substring(0, 16)}`;
}

interface OrchestrateRequest {
  action?: string;
  payload?: Record<string, unknown>;
}

interface OrchestrateResponse {
  success: boolean;
  traceId: string;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

async function callN8nWorkflow(
  workflowId: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string }; executionId?: string }> {
  const webhookUrl = process.env[`N8N_WEBHOOK_${workflowId.toUpperCase()}`];
  
  if (!webhookUrl) {
    return {
      success: false,
      error: {
        code: "WORKFLOW_NOT_CONFIGURED",
        message: `Workflow ${workflowId} is not configured. Set N8N_WEBHOOK_${workflowId.toUpperCase()} environment variable.`,
      },
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: data.message || "Workflow execution failed",
        },
      };
    }

    return {
      success: true,
      data,
      executionId: data.executionId,
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: error.message || "Failed to reach n8n workflow",
      },
    };
  }
}

export function registerOrchestratorRoutes(app: Express) {
  app.post(
    "/api/orchestrate/:workflowId",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const workflowId = req.params.workflowId as string;
        const { action, payload = {} } = req.body as OrchestrateRequest;
        const userId = (req as any).user?.id || "anonymous";
        
        const traceId = generateTraceId();
        const startTime = Date.now();

        const trace = await orchestratorStorage.createTrace({
          traceId,
          attemptNumber: 1,
          service: "n8n",
          workflowId,
          action: action || null,
          userId,
          requestedAt: new Date(),
          requestPayload: payload,
        });

        const result = await callN8nWorkflow(workflowId, { ...payload, action, traceId });

        await orchestratorStorage.updateTrace(trace.id, {
          respondedAt: new Date(),
          durationMs: Date.now() - startTime,
          responsePayload: result.data || result.error,
          success: result.success,
          errorCode: result.error?.code || null,
          errorMessage: result.error?.message || null,
          n8nExecutionId: result.executionId || null,
        });

        const response: OrchestrateResponse = {
          success: result.success,
          traceId,
          ...(result.success ? { data: result.data } : { error: result.error }),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    }
  );

  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const sessionUser = (req as any).user;
    if (!sessionUser || !sessionUser.claims?.sub) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const dbUser = await authStorage.getUser(sessionUser.claims.sub);
      if (!dbUser || !dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      (req as any).dbUser = dbUser;
      next();
    } catch (err) {
      return res.status(500).json({ error: "Failed to verify admin status" });
    }
  };

  app.get("/api/traces", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const traces = await orchestratorStorage.getRecentTraces(limit);
      res.json(traces);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/traces/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trace = await orchestratorStorage.getTrace(req.params.id as string);
      if (!trace) {
        return res.status(404).json({ error: "Trace not found" });
      }
      res.json(trace);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/test-connection", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    const traceId = generateTraceId();
    const startTime = Date.now();
    let trace: any = null;
    
    try {
      const { workflowId, webhookPath } = await createEchoTestWorkflow();
      const webhookUrl = getWebhookUrl(webhookPath);
      
      const userId = (req as any).dbUser?.id || (req as any).user?.claims?.sub || "anonymous";

      const testPayload = {
        action: "test",
        message: "Hello from Bilko Bibitkov!",
        timestamp: new Date().toISOString(),
        traceId,
      };

      trace = await orchestratorStorage.createTrace({
        traceId,
        attemptNumber: 1,
        service: "n8n",
        workflowId: "echo-test",
        action: "test",
        userId,
        requestedAt: new Date(),
        requestPayload: testPayload,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);
      
      let response: Response;
      try {
        response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Bilko-Request-Id": traceId,
          },
          body: JSON.stringify(testPayload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await response.json();
      const success = response.ok;

      await orchestratorStorage.updateTrace(trace.id, {
        respondedAt: new Date(),
        durationMs: Date.now() - startTime,
        responsePayload: data,
        success,
        errorCode: success ? null : `HTTP_${response.status}`,
        errorMessage: success ? null : (data?.error?.message || "Test failed"),
        n8nExecutionId: data?.metadata?.executionId || null,
      });

      res.json({
        success,
        traceId,
        workflowId,
        data,
      });
    } catch (err: any) {
      if (trace) {
        const errorMessage = err.name === "AbortError" ? "Request timeout" : (err.message || "Unknown error");
        await orchestratorStorage.updateTrace(trace.id, {
          respondedAt: new Date(),
          durationMs: Date.now() - startTime,
          responsePayload: null,
          success: false,
          errorCode: err.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
          errorMessage,
          n8nExecutionId: null,
        });
      }
      next(err);
    }
  });
}

