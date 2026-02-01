import type { Express, Request, Response, NextFunction } from "express";
import { orchestratorStorage } from "./storage";
import { randomUUID } from "crypto";
import { authStorage } from "../replit_integrations/auth/storage";
import { getWebhookUrl } from "../n8n/webhook-cache";

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
  const cachedUrl = getWebhookUrl(workflowId);
  const envUrl = process.env[`N8N_WEBHOOK_${workflowId.toUpperCase().replace(/-/g, "_")}`];
  const webhookUrl = cachedUrl || envUrl;
  
  if (!webhookUrl) {
    return {
      success: false,
      error: {
        code: "WORKFLOW_NOT_CONFIGURED",
        message: `Workflow ${workflowId} is not configured. Webhook cache empty and no env var found.`,
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

        let enrichedPayload = { ...payload };
        
        const PROD_CALLBACK_URL = 'https://bilkobibitkov.replit.app/api/workflows/callback';
        let callbackUrl: string;
        if (process.env.CALLBACK_URL_OVERRIDE) {
          callbackUrl = process.env.CALLBACK_URL_OVERRIDE;
        } else if (process.env.REPLIT_DOMAINS) {
          const currentDomain = process.env.REPLIT_DOMAINS.split(',')[0];
          callbackUrl = `https://${currentDomain}/api/workflows/callback`;
        } else {
          callbackUrl = PROD_CALLBACK_URL;
        }
        
        if (workflowId === "european-football-daily") {
          const recentTopics = await orchestratorStorage.getRecentTopics(workflowId, 24);
          enrichedPayload = {
            ...payload,
            geminiApiKey: process.env.GEMINI_API_KEY,
            callbackUrl,
            recentTopics: recentTopics.map(t => ({
              headline: t.headline,
              headlineHash: t.headlineHash,
              usedAt: t.usedAt,
            })),
          };
        }

        const trace = await orchestratorStorage.createTrace({
          traceId,
          attemptNumber: 1,
          sourceService: "bilko",
          destinationService: "n8n",
          workflowId,
          action: action || null,
          userId,
          requestedAt: new Date(),
          requestPayload: enrichedPayload,
          overallStatus: "in_progress",
        });

        const result = await callN8nWorkflow(workflowId, { ...enrichedPayload, action, traceId });

        await orchestratorStorage.updateTrace(trace.id, {
          respondedAt: new Date(),
          durationMs: Date.now() - startTime,
          responsePayload: result.data || result.error,
          overallStatus: result.success ? "success" : "failed",
          errorCode: result.error?.code || null,
          errorDetail: result.error ? JSON.stringify(result.error, null, 2) : null,
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
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const [traces, total] = await Promise.all([
        orchestratorStorage.getRecentTraces(limit, offset),
        orchestratorStorage.countTraces()
      ]);
      res.json({
        traces,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + traces.length < total
        }
      });
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

  app.get("/api/topics/:workflowId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowId = req.params.workflowId as string;
      const hoursBackParam = Array.isArray(req.query.hoursBack) ? req.query.hoursBack[0] : req.query.hoursBack;
      const hoursBack = parseInt(hoursBackParam as string) || 24;
      const topics = await orchestratorStorage.getRecentTopics(workflowId, hoursBack);
      res.json({
        workflowId,
        hoursBack,
        topics: topics.map(t => ({
          headline: t.headline,
          headlineHash: t.headlineHash,
          usedAt: t.usedAt,
        })),
        count: topics.length,
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/topics/:workflowId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowId = req.params.workflowId as string;
      const { headline, metadata } = req.body as { headline: string; metadata?: string };
      
      if (!headline) {
        return res.status(400).json({ error: "headline is required" });
      }
      
      const topic = await orchestratorStorage.recordUsedTopic(workflowId, headline, metadata);
      res.json({ success: true, topic });
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/topics/cleanup", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hoursOldParam = Array.isArray(req.query.hoursOld) ? req.query.hoursOld[0] : req.query.hoursOld;
      const hoursOld = parseInt(hoursOldParam as string) || 48;
      const deleted = await orchestratorStorage.cleanupOldTopics(hoursOld);
      res.json({ success: true, deleted });
    } catch (err) {
      next(err);
    }
  });

}

