import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerOrchestratorRoutes } from "./orchestrator";
import { registerRulesRoutes } from "./rules/routes";
import { registerWorkflowRoutes } from "./workflows/routes";
import { registerImageRoutes } from "./images/routes";
import { registerComponentRoutes } from "./components/routes";
import { getAllEndpoints } from "./endpoint-registry";
import llmRoutes from "./llm/routes";
import ttsRoutes from "./tts/routes";
import webProxyRoutes from "./web-proxy/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth (must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // n8n orchestrator routes (/api/n8n/orchestrate, /api/n8n/traces, /api/n8n/topics)
  registerOrchestratorRoutes(app);

  // Rules catalog and preview routes
  registerRulesRoutes(app);

  // n8n workflow routes (/api/n8n/*) + Bilko workflow registry (/api/workflows)
  registerWorkflowRoutes(app);
  
  // Image processing routes (branding, etc.)
  registerImageRoutes(app);

  // Component definitions catalog (step type descriptions)
  registerComponentRoutes(app);

  // LLM proxy routes for PromptPlayground
  app.use("/api/llm", llmRoutes);

  // TTS routes (OpenAI Text-to-Speech)
  app.use("/api/tts", ttsRoutes);

  // Web proxy routes for Work With Me flow (page fetching + structure extraction)
  app.use("/api/web-proxy", webProxyRoutes);

  // Endpoint registry for UI info icons
  app.get("/api/endpoints", (_req, res) => {
    res.json(getAllEndpoints());
  });

  return httpServer;
}
