import type { Express, Request, Response } from "express";
import { routeWorkflow, listWorkflows, getWorkflow } from "./router";
import { initializeHandlers } from "./handlers";
import { syncWorkflowsToN8n, getN8nWorkflowStatus } from "../n8n/sync";
import { orchestratorStorage } from "../orchestrator/storage";
import { z } from "zod";

const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(jsonValue)])
);

const callbackSchema = z.object({
  workflowId: z.string().min(1),
  step: z.string().min(1),
  stepIndex: z.number().int().min(1),
  traceId: z.string().min(1),
  output: jsonValue.optional(),
  executionId: z.string().optional(),
  status: z.enum(["success", "failed", "in_progress"]).default("success")
});

export function registerWorkflowRoutes(app: Express): void {
  initializeHandlers();

  app.post("/api/workflows/callback", async (req: Request, res: Response) => {
    try {
      const parsed = callbackSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid callback payload",
          details: parsed.error.flatten().fieldErrors
        });
      }

      const { workflowId, step, stepIndex, traceId, output, executionId, status } = parsed.data;
      
      const trace = await orchestratorStorage.createTrace({
        traceId,
        attemptNumber: stepIndex,
        sourceService: "n8n",
        destinationService: "bilko",
        workflowId,
        action: step,
        userId: "system",
        requestedAt: new Date(),
        respondedAt: new Date(),
        durationMs: 0,
        requestPayload: { step, stepIndex },
        responsePayload: output as Record<string, unknown> | undefined,
        overallStatus: status,
        n8nExecutionId: executionId || null
      });

      console.log(`[callback] ${workflowId}/${step}: Received (trace: ${traceId}, step: ${stepIndex})`);

      res.json({ 
        success: true, 
        traceId,
        traceRecordId: trace.id 
      });
    } catch (error) {
      console.error("[callback] Error:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Internal error" 
      });
    }
  });

  app.get("/api/workflows", (_req: Request, res: Response) => {
    const workflows = listWorkflows();
    res.json({ workflows });
  });

  app.get("/api/workflows/:id/output", async (req: Request, res: Response) => {
    try {
      const workflowId = req.params.id;
      const traces = await orchestratorStorage.getRecentTraces(50);
      
      const workflowTraces = traces
        .filter(t => t.workflowId === workflowId && t.sourceService === "n8n")
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

      const finalOutput = workflowTraces.find(t => t.action === "final-output");
      const sentimentOutput = workflowTraces.find(t => t.action === "sentiment-analysis");
      const articlesOutput = workflowTraces.find(t => t.action === "extract-articles");

      if (!finalOutput && !sentimentOutput && !articlesOutput) {
        return res.json({ 
          hasOutput: false,
          message: "No workflow output found. Execute the workflow to see results."
        });
      }

      res.json({
        hasOutput: true,
        outputs: {
          final: finalOutput ? {
            traceId: finalOutput.traceId,
            timestamp: finalOutput.requestedAt,
            data: finalOutput.responsePayload
          } : null,
          sentiment: sentimentOutput ? {
            traceId: sentimentOutput.traceId,
            timestamp: sentimentOutput.requestedAt,
            data: sentimentOutput.responsePayload
          } : null,
          articles: articlesOutput ? {
            traceId: articlesOutput.traceId,
            timestamp: articlesOutput.requestedAt,
            data: articlesOutput.responsePayload
          } : null
        }
      });
    } catch (error) {
      console.error("[output] Error:", error);
      res.status(500).json({ 
        hasOutput: false,
        error: error instanceof Error ? error.message : "Internal error" 
      });
    }
  });

  app.get("/api/workflows/n8n/status", async (_req: Request, res: Response) => {
    try {
      const status = await getN8nWorkflowStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/workflows/n8n/sync", async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const adminId = process.env.ADMIN_USER_ID;
    if (user.id !== adminId) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const result = await syncWorkflowsToN8n();
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/workflows/:id", (req: Request, res: Response) => {
    const workflowId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const workflow = getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    res.json(workflow);
  });

  app.post("/api/workflows/:id/execute", async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const workflowId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { action = "execute", payload = {} } = req.body;

    const sourceService = "replit:shell" as const;

    try {
      const result = await routeWorkflow(
        workflowId,
        action,
        payload,
        sourceService,
        user.id
      );
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : String(error),
          retryable: false,
        },
      });
    }
  });
}
