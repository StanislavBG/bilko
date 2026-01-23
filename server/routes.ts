import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerOrchestratorRoutes } from "./orchestrator";
import { registerAuditorRoutes } from "./auditor";
import { registerRulesRoutes } from "./rules/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth (must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Orchestrator routes for n8n communication
  registerOrchestratorRoutes(app);
  
  // Auditor routes for rule compliance checking
  registerAuditorRoutes(app);
  
  // Rules catalog and preview routes
  registerRulesRoutes(app);

  return httpServer;
}
