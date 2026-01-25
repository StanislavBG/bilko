import type { Express, Request, Response } from "express";
import { routeWorkflow, listWorkflows, getWorkflow } from "./router";
import { initializeHandlers } from "./handlers";

export function registerWorkflowRoutes(app: Express): void {
  initializeHandlers();

  app.get("/api/workflows", (_req: Request, res: Response) => {
    const workflows = listWorkflows();
    res.json({ workflows });
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
