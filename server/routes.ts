import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerOrchestratorRoutes } from "./orchestrator";
import { registerRulesRoutes } from "./rules/routes";
import { registerWorkflowRoutes } from "./workflows/routes";
import { registerImageRoutes } from "./images/routes";
import { getAllEndpoints } from "./endpoint-registry";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth (must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Orchestrator routes for n8n communication
  registerOrchestratorRoutes(app);
  
  // Rules catalog and preview routes
  registerRulesRoutes(app);
  
  // Workflow router for unified workflow execution
  registerWorkflowRoutes(app);
  
  // Image processing routes (branding, etc.)
  registerImageRoutes(app);
  
  // Endpoint registry for UI info icons
  app.get("/api/endpoints", (_req, res) => {
    res.json(getAllEndpoints());
  });

  return httpServer;
}
