/**
 * TTS API Routes — Google Gemini Text-to-Speech
 *
 * POST /api/tts/speak — Convert text to audio via Gemini TTS.
 * GET  /api/tts/status — Check if TTS service is available (has API key).
 *
 * Uses gemini-2.5-flash-preview-tts model with GEMINI_API_KEY.
 * Returns WAV audio (24kHz, 16-bit, mono).
 */

import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

const GEMINI_VOICES = [
  "Kore", "Puck", "Charon", "Fenrir", "Aoede",
  "Leda", "Orus", "Zephyr",
] as const;

const DEFAULT_VOICE = "Kore";

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const wav = Buffer.alloc(headerSize + dataSize);

  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(numChannels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 30);
  wav.writeUInt16LE(bitsPerSample, 32);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wav, headerSize);

  return wav;
}

router.get("/status", (_req: Request, res: Response) => {
  const client = getClient();
  res.json({
    available: client !== null,
    provider: client ? "gemini" : "none",
    voice: DEFAULT_VOICE,
    model: "gemini-2.5-flash-preview-tts",
  });
});

router.post("/speak", async (req: Request, res: Response) => {
  try {
    const client = getClient();
    if (!client) {
      res.status(503).json({ error: "TTS service unavailable — GEMINI_API_KEY not configured" });
      return;
    }

    const { text, voice = DEFAULT_VOICE } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const input = text.slice(0, 4000);
    const safeVoice = GEMINI_VOICES.includes(voice as any) ? voice : DEFAULT_VOICE;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: input }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: safeVoice,
            },
          },
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.[0];
    if (!audioPart?.inlineData?.data) {
      res.status(500).json({ error: "No audio data in Gemini response" });
      return;
    }

    const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64");
    const wavBuffer = pcmToWav(pcmBuffer);

    res.set({
      "Content-Type": "audio/wav",
      "Content-Length": String(wavBuffer.length),
      "Cache-Control": "no-store",
    });
    res.send(wavBuffer);
  } catch (error) {
    console.error("[TTS] Gemini TTS error:", error);
    const message = error instanceof Error ? error.message : "Unknown TTS error";
    res.status(500).json({ error: message });
  }
});

export default router;
