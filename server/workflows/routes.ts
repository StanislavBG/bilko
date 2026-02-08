import type { Express, Request, Response } from "express";
import { routeWorkflow, listWorkflows, getWorkflow } from "./router";
import { initializeHandlers } from "./handlers";
import { syncWorkflowsToN8n, getN8nWorkflowStatus } from "../n8n/sync";
import { createN8nClient } from "../n8n/client";
import { orchestratorStorage } from "../orchestrator/storage";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { createLogger } from "../logger";

const log = createLogger("n8n-routes");

// Static FB2 disclosure text — single source of truth
const FB2_DISCLOSURE_TEXT = `I've developed this AI-driven system to efficiently curate European football news, serving as a professional 'proof of work' for AI integration. Grounded in transparency and the human-in-the-loop principle, this project demonstrates how AI can enhance specialized content. Follow for updates, or visit my bio to learn how to build similar systems.

Bilko Bibitkov Human-Centric AI Curation`;

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
  status: z.enum(["success", "failed", "in_progress"]).default("success"),
  errorMessage: z.string().optional(),
  details: z.record(jsonValue).optional()
});

export function registerWorkflowRoutes(app: Express): void {
  initializeHandlers();

  // ─── n8n-specific routes (/api/n8n/*) ────────────────────────────

  // n8n callback endpoint — receives step results from n8n workflows
  app.post("/api/n8n/callback", async (req: Request, res: Response) => {
    try {
      const parsed = callbackSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid callback payload",
          details: parsed.error.flatten().fieldErrors
        });
      }

      const { workflowId, step, stepIndex, traceId, output, executionId, status, errorMessage, details } = parsed.data;

      let execution = await orchestratorStorage.getExecutionByTriggerTrace(traceId);

      if (!execution) {
        execution = await orchestratorStorage.createExecution({
          workflowId,
          triggerTraceId: traceId,
          externalExecutionId: executionId || null,
          status: "running",
          userId: "system",
        });
        log.info(`Created execution ${execution.id} for trace ${traceId}`);
      }

      const trace = await orchestratorStorage.createTrace({
        traceId,
        executionId: execution.id,
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
        errorDetail: errorMessage || null,
        details: details as Record<string, unknown> | undefined,
        n8nExecutionId: executionId || null
      });

      if (step === "final-output") {
        // Inject FB2 disclosure text into the output
        const enrichedOutput = output && typeof output === "object"
          ? { ...output as Record<string, unknown>, fb2DisclosureText: FB2_DISCLOSURE_TEXT }
          : output;

        await orchestratorStorage.updateExecution(execution.id, {
          status: status === "success" ? "completed" : "failed",
          completedAt: new Date(),
          finalOutput: enrichedOutput as Record<string, unknown> | undefined,
        });
        log.info(`Execution ${execution.id} completed with final output (FB2 disclosure added)`);

        // Record the used topic to prevent duplicates
        if (status === "success" && output && typeof output === "object") {
          const outputData = output as Record<string, unknown>;
          const selectedTopic = outputData.selectedTopic as Record<string, unknown> | undefined;

          log.debug(`selectedTopic keys: ${selectedTopic ? Object.keys(selectedTopic).join(', ') : 'null'}`);

          // Use sourceHeadline (original RSS title) for duplicate prevention, fallback to headline
          const headlineToRecord = (selectedTopic?.sourceHeadline || selectedTopic?.headline) as string | undefined;
          if (headlineToRecord && typeof headlineToRecord === "string") {
            try {
              await orchestratorStorage.recordUsedTopic(
                workflowId,
                headlineToRecord,
                JSON.stringify({
                  traceId,
                  executionId: execution.id,
                  analyzedHeadline: selectedTopic?.headline,
                  sourceHeadlineHash: selectedTopic?.sourceHeadlineHash
                })
              );
              log.info(`Recorded used topic: ${headlineToRecord.substring(0, 50)}...`);
            } catch (topicErr) {
              log.error("Failed to record used topic", topicErr);
            }
          } else {
            log.warn(`No headline to record! sourceHeadline=${selectedTopic?.sourceHeadline}, headline=${selectedTopic?.headline}`);
          }
        }
      }

      log.debug(`${workflowId}/${step}: Received (trace: ${traceId}, step: ${stepIndex})`);

      res.json({
        success: true,
        traceId,
        executionId: execution.id,
        traceRecordId: trace.id
      });
    } catch (error) {
      log.error("Callback error", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal error"
      });
    }
  });

  // n8n used topics — deduplication verification
  app.get("/api/n8n/used-topics", async (req: Request, res: Response) => {
    try {
      const workflowId = (req.query.workflowId as string) || "european-football-daily";
      const hoursBack = parseInt(req.query.hoursBack as string) || 48;

      const topics = await orchestratorStorage.getRecentTopics(workflowId, hoursBack);

      res.json({
        workflowId,
        hoursBack,
        count: topics.length,
        topics: topics.map(t => ({
          id: t.id,
          headline: t.headline,
          usedAt: t.usedAt,
          metadata: t.metadata ? JSON.parse(t.metadata) : null
        }))
      });
    } catch (error) {
      log.error("Used topics error", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal error"
      });
    }
  });

  // n8n workflow output — latest output from an n8n workflow execution
  app.get("/api/n8n/workflows/:id/output", async (req: Request, res: Response) => {
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
          message: "No workflow output found. Execute the workflow to see results.",
          fb2DisclosureText: FB2_DISCLOSURE_TEXT
        });
      }

      // Get execution stats for this workflow
      const execution = finalOutput?.executionId
        ? await orchestratorStorage.getExecution(finalOutput.executionId)
        : null;

      // Get all traces for this execution to show communication flow
      const executionTraces = execution
        ? await orchestratorStorage.getExecutionTraces(execution.id)
        : [];

      // Calculate execution duration
      const startTime = execution?.startedAt ? new Date(execution.startedAt) : null;
      const endTime = execution?.completedAt ? new Date(execution.completedAt) : null;
      const durationMs = startTime && endTime ? endTime.getTime() - startTime.getTime() : null;

      // Extract source URLs from final output for citations
      const finalData = finalOutput?.responsePayload as Record<string, unknown> | undefined;
      const sourceUrls = finalData?.data
        ? (finalData.data as Record<string, unknown>).sourceUrls as string[] | undefined
        : undefined;

      res.json({
        hasOutput: true,
        fb2DisclosureText: FB2_DISCLOSURE_TEXT,
        executionStats: execution ? {
          id: execution.id,
          status: execution.status,
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
          durationMs,
          stepCount: executionTraces.length,
        } : null,
        traces: executionTraces.map((t: { id: string; action: string | null; overallStatus: string; attemptNumber: number; requestedAt: Date; durationMs: number | null }) => ({
          id: t.id,
          action: t.action,
          status: t.overallStatus,
          stepIndex: t.attemptNumber,
          timestamp: t.requestedAt,
          durationMs: t.durationMs,
        })),
        sourceUrls,
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
      log.error("Output error", error);
      res.status(500).json({
        hasOutput: false,
        error: error instanceof Error ? error.message : "Internal error"
      });
    }
  });

  // n8n status — check sync status with n8n instance
  app.get("/api/n8n/status", async (_req: Request, res: Response) => {
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

  // n8n sync — push workflow definitions to n8n (admin only)
  app.post("/api/n8n/sync", async (req: Request, res: Response) => {
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

  // n8n push-prod — push production workflow to n8n (admin only)
  app.post("/api/n8n/push-prod", async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const adminId = process.env.ADMIN_USER_ID;
    if (user.id !== adminId) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const client = createN8nClient();
      if (!client) {
        return res.status(500).json({ error: "n8n client not configured" });
      }

      const prodFilePath = path.join(__dirname, "backups", "oV6WGX5uBeTZ9tRa_PROD.json");
      if (!fs.existsSync(prodFilePath)) {
        return res.status(404).json({ error: "Production workflow file not found" });
      }

      const prodWorkflow = JSON.parse(fs.readFileSync(prodFilePath, "utf-8"));

      // Search by both new and old names for resilience across runs
      let existingWorkflow = await client.findWorkflowByName("[PROD] European Football Daily");
      if (!existingWorkflow) {
        existingWorkflow = await client.findWorkflowByName("European Football Daily");
      }

      if (!existingWorkflow) {
        return res.status(404).json({ error: "Workflow 'European Football Daily' or '[PROD] European Football Daily' not found in n8n" });
      }

      await client.deactivateWorkflow(existingWorkflow.id);

      await client.updateWorkflow(existingWorkflow.id, {
        name: prodWorkflow.name,
        nodes: prodWorkflow.nodes,
        connections: prodWorkflow.connections,
        settings: prodWorkflow.settings,
      });

      await client.activateWorkflow(existingWorkflow.id);

      res.json({
        success: true,
        message: "Production workflow pushed to n8n successfully",
        workflowId: existingWorkflow.id,
        newName: prodWorkflow.name
      });
    } catch (error) {
      log.error("Push prod error", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // n8n workflow executions list
  app.get("/api/n8n/workflows/:id/executions", async (req: Request, res: Response) => {
    try {
      const workflowId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 20;

      const executions = await orchestratorStorage.getWorkflowExecutions(workflowId, limit);
      res.json({ executions });
    } catch (error) {
      log.error("Executions error", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal error"
      });
    }
  });

  // n8n execution detail (with traces)
  app.get("/api/n8n/executions/:id", async (req: Request, res: Response) => {
    try {
      const executionId = req.params.id;

      const execution = await orchestratorStorage.getExecution(executionId);
      if (!execution) {
        return res.status(404).json({ error: "Execution not found" });
      }

      const traces = await orchestratorStorage.getExecutionTracesWithPayloads(executionId);

      res.json({ execution, traces });
    } catch (error) {
      log.error("Execution error", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal error"
      });
    }
  });

  // n8n workflow execute — trigger an n8n workflow
  app.post("/api/n8n/workflows/:id/execute", async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Ensure user.id exists - Replit Auth uses 'id' field
    const userId = user.id || user.claims?.sub;
    if (!userId) {
      log.error("User object missing id", { user: JSON.stringify(user) });
      return res.status(400).json({ error: "User ID not found in authentication" });
    }

    const workflowId = req.params.id;
    const { action = "execute", payload = {} } = req.body;

    const sourceService = "replit:shell" as const;

    try {
      const result = await routeWorkflow(
        workflowId,
        action,
        payload,
        sourceService,
        String(userId)
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

  // ─── Bilko workflow registry routes (/api/workflows/*) ──────────

  // List all registered Bilko workflows (both local and n8n-backed)
  app.get("/api/workflows", (_req: Request, res: Response) => {
    const workflows = listWorkflows();
    res.json({ workflows });
  });

  // Get a single Bilko workflow definition
  app.get("/api/workflows/:id", (req: Request, res: Response) => {
    const workflowId = req.params.id;
    const workflow = getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    res.json(workflow);
  });
}
