/**
 * TTS Integration Tests — Gemini API
 *
 * These tests make REAL calls to the Gemini TTS API.
 * Requires GEMINI_API_KEY environment variable.
 *
 * Skipped automatically when GEMINI_API_KEY is not set.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { GoogleGenAI } from "@google/genai";
import {
  parseSampleRate,
  isRawPcm,
  hasWavHeader,
  swapEndian16,
  pcmToWav,
  GEMINI_VOICES,
  DEFAULT_VOICE,
} from "./audio-utils.js";

const API_KEY = process.env.GEMINI_API_KEY;
const skip = !API_KEY;

describe.skipIf(skip)("TTS integration (live Gemini API)", () => {
  let client: GoogleGenAI;

  beforeAll(() => {
    client = new GoogleGenAI({ apiKey: API_KEY! });
  });

  it("generates audio for simple text with default voice", async () => {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: "Hello, this is a test." }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: DEFAULT_VOICE,
            },
          },
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.[0];
    expect(audioPart).toBeDefined();
    expect(audioPart?.inlineData?.data).toBeTruthy();

    const mimeType = audioPart!.inlineData!.mimeType || "";
    const rawBuffer = Buffer.from(audioPart!.inlineData!.data!, "base64");

    expect(rawBuffer.length).toBeGreaterThan(0);

    // Process through the same pipeline as routes.ts
    let audioBuffer: Buffer;
    if (hasWavHeader(rawBuffer)) {
      audioBuffer = rawBuffer;
    } else if (isRawPcm(mimeType)) {
      const sampleRate = parseSampleRate(mimeType);
      const isL16 = mimeType.toLowerCase().startsWith("audio/l16");
      const pcmData = isL16 ? swapEndian16(rawBuffer) : rawBuffer;
      audioBuffer = pcmToWav(pcmData, sampleRate);
    } else {
      audioBuffer = pcmToWav(rawBuffer, parseSampleRate(mimeType));
    }

    // Result should be valid WAV
    expect(hasWavHeader(audioBuffer)).toBe(true);
    expect(audioBuffer.length).toBeGreaterThan(44); // More than just header

    // Verify WAV header values are sane
    const fmt = audioBuffer.readUInt16LE(20);
    const ch = audioBuffer.readUInt16LE(22);
    const rate = audioBuffer.readUInt32LE(24);
    const bits = audioBuffer.readUInt16LE(34);
    const dataSize = audioBuffer.readUInt32LE(40);

    expect(fmt).toBe(1); // PCM format
    expect(ch).toBe(1); // mono
    expect([8000, 16000, 22050, 24000, 44100, 48000]).toContain(rate);
    expect(bits).toBe(16);
    expect(dataSize).toBeGreaterThan(0);
    expect(dataSize).toBe(audioBuffer.length - 44);

    console.log(`[integration] WAV: ${rate}Hz, ${bits}-bit, ${ch}ch, ${dataSize} bytes audio data`);
  });

  it("generates audio for each available voice", async () => {
    // Test a subset to avoid rate limits — first 3 voices
    const testVoices = GEMINI_VOICES.slice(0, 3);

    for (const voice of testVoices) {
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: "Test." }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.[0];
      expect(audioPart?.inlineData?.data, `voice ${voice} returned no audio`).toBeTruthy();

      const rawBuffer = Buffer.from(audioPart!.inlineData!.data!, "base64");
      expect(rawBuffer.length, `voice ${voice} returned empty buffer`).toBeGreaterThan(0);
      console.log(`[integration] Voice "${voice}": ${rawBuffer.length} bytes raw audio`);
    }
  });

  it("handles longer text input", async () => {
    const longText = "Welcome to Bilko's Mental Gym. " +
      "Today we're going to explore something fascinating about how your brain processes information. " +
      "Let's start with a simple exercise.";

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: longText }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: DEFAULT_VOICE,
            },
          },
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.[0];
    expect(audioPart?.inlineData?.data).toBeTruthy();

    const rawBuffer = Buffer.from(audioPart!.inlineData!.data!, "base64");
    // Longer text should produce more audio data than short text
    expect(rawBuffer.length).toBeGreaterThan(1000);
    console.log(`[integration] Long text: ${rawBuffer.length} bytes raw audio`);
  });

  it("returns consistent mime type format", async () => {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: "Check mime type." }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: DEFAULT_VOICE,
            },
          },
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.[0];
    const mimeType = audioPart?.inlineData?.mimeType || "";

    // Log the actual mime type for debugging — this tells us what format Gemini is currently returning
    console.log(`[integration] Gemini mimeType: "${mimeType}"`);

    // It should be some audio type
    expect(mimeType).toMatch(/^audio\//);
  });
});

describe("TTS integration skip check", () => {
  it("reports whether integration tests ran", () => {
    if (skip) {
      console.log("[integration] GEMINI_API_KEY not set — integration tests skipped");
    } else {
      console.log("[integration] GEMINI_API_KEY is set — integration tests will run");
    }
    expect(true).toBe(true);
  });
});
