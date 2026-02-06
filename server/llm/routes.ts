/**
 * LLM API Routes
 *
 * POST /api/llm/chat - Send a chat request to an LLM
 * GET /api/llm/models - List available models
 */

import { Router, Request, Response } from "express";
import { chat, AVAILABLE_MODELS, type ChatRequest } from "./index";

const router = Router();

// List available models
router.get("/models", (_req: Request, res: Response) => {
  res.json({
    models: AVAILABLE_MODELS.map(m => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      description: m.description,
    })),
  });
});

// Chat with an LLM
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { model, messages, temperature, maxTokens } = req.body as ChatRequest;

    if (!model) {
      res.status(400).json({ error: "model is required" });
      return;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    // Validate messages format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        res.status(400).json({ error: "Each message must have role and content" });
        return;
      }
      if (!["system", "user", "assistant"].includes(msg.role)) {
        res.status(400).json({ error: "Invalid message role. Must be system, user, or assistant" });
        return;
      }
    }

    const response = await chat({
      model,
      messages,
      temperature,
      maxTokens,
    });

    res.json(response);
  } catch (error) {
    console.error("LLM chat error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
