/**
 * TTS API Routes — OpenAI Text-to-Speech
 *
 * POST /api/tts/speak — Convert text to audio via OpenAI TTS.
 * GET  /api/tts/status — Check if TTS service is available (has API key).
 *
 * Falls back gracefully: if OPENAI_API_KEY is not set, status returns
 * available=false and the client falls back to Web Speech API.
 */

import { Router, Request, Response } from "express";
import OpenAI from "openai";

const router = Router();

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  _client = new OpenAI({ apiKey });
  return _client;
}

/** Check if OpenAI TTS is available */
router.get("/status", (_req: Request, res: Response) => {
  const client = getClient();
  res.json({
    available: client !== null,
    provider: client ? "openai" : "none",
    voice: "onyx",
    model: "tts-1",
  });
});

/** Generate speech audio from text */
router.post("/speak", async (req: Request, res: Response) => {
  try {
    const client = getClient();
    if (!client) {
      res.status(503).json({ error: "TTS service unavailable — OPENAI_API_KEY not configured" });
      return;
    }

    const { text, voice = "onyx" } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "text is required" });
      return;
    }

    // Cap at ~4096 chars (OpenAI TTS limit is 4096)
    const input = text.slice(0, 4096);

    const allowedVoices = ["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"] as const;
    const safeVoice = allowedVoices.includes(voice) ? voice : "onyx";

    const response = await client.audio.speech.create({
      model: "tts-1",
      voice: safeVoice,
      input,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    });
    res.send(buffer);
  } catch (error) {
    console.error("[TTS] OpenAI TTS error:", error);
    const message = error instanceof Error ? error.message : "Unknown TTS error";
    res.status(500).json({ error: message });
  }
});

export default router;
