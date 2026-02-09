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

/**
 * Parse sample rate from Gemini mimeType string.
 * e.g. "audio/L16;rate=24000" → 24000
 *      "audio/L16;codec=pcm;rate=24000" → 24000
 */
function parseSampleRate(mimeType: string): number {
  const match = mimeType.match(/rate=(\d+)/i);
  return match ? parseInt(match[1], 10) : 24000;
}

/**
 * Check if a mimeType indicates raw PCM data (needs WAV wrapping).
 * Known raw PCM types from Gemini: audio/L16, audio/pcm
 */
function isRawPcm(mimeType: string): boolean {
  const lower = mimeType.toLowerCase();
  return lower.startsWith("audio/l16") || lower.startsWith("audio/pcm");
}

/**
 * Check if audio data already has a WAV/RIFF header.
 */
function hasWavHeader(buffer: Buffer): boolean {
  return buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WAVE";
}

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
      console.error("[TTS] No audio data in Gemini response. Candidates:", JSON.stringify(response.candidates?.map(c => ({
        finishReason: c.finishReason,
        partCount: c.content?.parts?.length,
        partTypes: c.content?.parts?.map(p => Object.keys(p)),
      }))));
      res.status(500).json({ error: "No audio data in Gemini response" });
      return;
    }

    const mimeType = audioPart.inlineData.mimeType || "audio/L16;rate=24000";
    const rawBuffer = Buffer.from(audioPart.inlineData.data, "base64");

    console.info(`[TTS] Gemini response: mimeType="${mimeType}", rawSize=${rawBuffer.length} bytes`);

    if (rawBuffer.length === 0) {
      console.error("[TTS] Gemini returned empty audio data");
      res.status(500).json({ error: "Gemini returned empty audio data" });
      return;
    }

    let audioBuffer: Buffer;
    let contentType: string;

    if (hasWavHeader(rawBuffer)) {
      // Data is already WAV — pass through directly
      console.info("[TTS] Audio already has WAV header — passing through");
      audioBuffer = rawBuffer;
      contentType = "audio/wav";
    } else if (isRawPcm(mimeType)) {
      // Raw PCM (L16) — wrap in WAV header
      const sampleRate = parseSampleRate(mimeType);
      console.info(`[TTS] Raw PCM detected — wrapping in WAV (rate=${sampleRate})`);
      audioBuffer = pcmToWav(rawBuffer, sampleRate);
      contentType = "audio/wav";
    } else if (mimeType.includes("wav")) {
      // mimeType says WAV but no RIFF header detected — wrap as PCM
      console.warn(`[TTS] mimeType="${mimeType}" but no WAV header found — wrapping as PCM`);
      const sampleRate = parseSampleRate(mimeType);
      audioBuffer = pcmToWav(rawBuffer, sampleRate);
      contentType = "audio/wav";
    } else {
      // Unknown format — try passing through with its declared mimeType,
      // falling back to wrapping as PCM if the mimeType is unrecognized
      const knownPassthrough = ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/webm", "audio/aac"];
      const baseMime = mimeType.split(";")[0].toLowerCase().trim();

      if (knownPassthrough.includes(baseMime)) {
        console.info(`[TTS] Passing through audio as ${baseMime}`);
        audioBuffer = rawBuffer;
        contentType = baseMime;
      } else {
        // Unrecognized mimeType — assume raw PCM as safest fallback
        console.warn(`[TTS] Unrecognized mimeType "${mimeType}" — assuming raw PCM, wrapping in WAV`);
        const sampleRate = parseSampleRate(mimeType);
        audioBuffer = pcmToWav(rawBuffer, sampleRate);
        contentType = "audio/wav";
      }
    }

    res.set({
      "Content-Type": contentType,
      "Content-Length": String(audioBuffer.length),
      "Cache-Control": "no-store",
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error("[TTS] Gemini TTS error:", error);
    const message = error instanceof Error ? error.message : "Unknown TTS error";
    res.status(500).json({ error: message });
  }
});

export default router;
