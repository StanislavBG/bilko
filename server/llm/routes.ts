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

router.post("/validate-videos", async (req: Request, res: Response) => {
  try {
    const { videos } = req.body;
    if (!Array.isArray(videos)) {
      res.status(400).json({ error: "videos array is required" });
      return;
    }

    const results = await Promise.all(
      videos.map(async (video: { embedId?: string; title?: string }) => {
        if (!video.embedId) return null;
        // Basic format check: YouTube video IDs are 11 characters, alphanumeric + dash + underscore
        if (!/^[a-zA-Z0-9_-]{11}$/.test(video.embedId)) {
          console.warn(`[validate-videos] Invalid embed ID format: "${video.embedId}"`);
          return null;
        }
        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(video.embedId)}&format=json`;
          const resp = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
          if (resp.ok) {
            console.info(`[validate-videos] OK: "${video.title ?? video.embedId}"`);
            return video;
          }
          console.warn(`[validate-videos] Rejected (${resp.status}): "${video.title ?? video.embedId}" [${video.embedId}]`);
          return null;
        } catch (err) {
          console.warn(`[validate-videos] Network error for "${video.embedId}":`, err instanceof Error ? err.message : err);
          return null;
        }
      })
    );

    const validated = results.filter(Boolean);
    console.info(`[validate-videos] ${validated.length}/${videos.length} videos passed validation`);
    res.json({ videos: validated });
  } catch (error) {
    console.error("Video validation error:", error);
    res.status(500).json({ error: "Failed to validate videos" });
  }
});

export default router;
