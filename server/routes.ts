import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerOrchestratorRoutes } from "./orchestrator";
import { registerRulesRoutes } from "./rules/routes";
import { registerWorkflowRoutes } from "./workflows/routes";
import { registerImageRoutes } from "./images/routes";
import { registerUploadRoutes } from "./uploads/routes";
import { registerComponentRoutes } from "./components/routes";
import { registerProjectRoutes } from "./projects/routes";
import { getAllEndpoints } from "./endpoint-registry";
import llmRoutes from "./llm/routes";
import webProxyRoutes from "./web-proxy/routes";
import bilkoFlowRoutes from "./bilko-flow/routes";
import videoRunRoutes from "./video-runs/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth (must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // n8n orchestrator routes (/api/n8n/orchestrate, /api/n8n/topics)
  registerOrchestratorRoutes(app);

  // Rules catalog and preview routes
  registerRulesRoutes(app);

  // n8n workflow routes (/api/n8n/*) + Bilko workflow registry (/api/workflows)
  registerWorkflowRoutes(app);
  
  // Image processing routes (branding, etc.)
  registerImageRoutes(app);

  // File upload routes (Bilko's Way media: video, infographic, PDF)
  registerUploadRoutes(app);

  // Component definitions catalog (step type descriptions)
  registerComponentRoutes(app);

  // Project unfurl and image proxy routes
  registerProjectRoutes(app);

  // LLM proxy routes (chat, models, video validation, YouTube search)
  app.use("/api/llm", llmRoutes);

  // Web proxy routes for Work With Me flow (page fetching + structure extraction)
  app.use("/api/web-proxy", webProxyRoutes);

  // bilko-flow integration routes (DEMO workflow engine test)
  app.use("/api/bilko-flow", bilkoFlowRoutes);

  // Video run persistence (AI-Video flow history + file serving)
  app.use("/api/video-runs", videoRunRoutes);

  // Endpoint registry for UI info icons
  app.get("/api/endpoints", (_req, res) => {
    res.json(getAllEndpoints());
  });

  return httpServer;
}
