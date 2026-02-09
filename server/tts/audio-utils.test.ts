/**
 * Unit tests for TTS audio utility functions.
 *
 * Tests the pure helper functions used by the TTS route to detect,
 * convert, and wrap audio data from Gemini's various output formats.
 */

import { describe, it, expect } from "vitest";
import {
  parseSampleRate,
  isRawPcm,
  hasWavHeader,
  swapEndian16,
  pcmToWav,
  GEMINI_VOICES,
  DEFAULT_VOICE,
} from "./audio-utils.js";

// ── parseSampleRate ─────────────────────────────────────

describe("parseSampleRate", () => {
  it("extracts rate from audio/L16;rate=24000", () => {
    expect(parseSampleRate("audio/L16;rate=24000")).toBe(24000);
  });

  it("extracts rate from audio/L16;codec=pcm;rate=48000", () => {
    expect(parseSampleRate("audio/L16;codec=pcm;rate=48000")).toBe(48000);
  });

  it("is case-insensitive for rate parameter", () => {
    expect(parseSampleRate("audio/L16;Rate=22050")).toBe(22050);
  });

  it("defaults to 24000 when no rate parameter exists", () => {
    expect(parseSampleRate("audio/L16")).toBe(24000);
    expect(parseSampleRate("audio/wav")).toBe(24000);
    expect(parseSampleRate("")).toBe(24000);
  });
});

// ── isRawPcm ────────────────────────────────────────────

describe("isRawPcm", () => {
  it("returns true for audio/L16 variants", () => {
    expect(isRawPcm("audio/L16")).toBe(true);
    expect(isRawPcm("audio/L16;rate=24000")).toBe(true);
    expect(isRawPcm("audio/l16")).toBe(true);
  });

  it("returns true for audio/pcm variants", () => {
    expect(isRawPcm("audio/pcm")).toBe(true);
    expect(isRawPcm("audio/PCM;rate=16000")).toBe(true);
  });

  it("returns false for non-PCM types", () => {
    expect(isRawPcm("audio/wav")).toBe(false);
    expect(isRawPcm("audio/mpeg")).toBe(false);
    expect(isRawPcm("audio/ogg")).toBe(false);
    expect(isRawPcm("")).toBe(false);
  });
});

// ── hasWavHeader ────────────────────────────────────────

describe("hasWavHeader", () => {
  it("returns true for valid RIFF/WAVE header", () => {
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.write("WAVE", 8);
    expect(hasWavHeader(header)).toBe(true);
  });

  it("returns false for buffers too short", () => {
    expect(hasWavHeader(Buffer.alloc(8))).toBe(false);
    expect(hasWavHeader(Buffer.alloc(0))).toBe(false);
  });

  it("returns false for non-WAV data", () => {
    const notWav = Buffer.alloc(44, 0);
    expect(hasWavHeader(notWav)).toBe(false);
  });

  it("returns false when RIFF present but not WAVE", () => {
    const buf = Buffer.alloc(44);
    buf.write("RIFF", 0);
    buf.write("AVI ", 8);
    expect(hasWavHeader(buf)).toBe(false);
  });
});

// ── swapEndian16 ────────────────────────────────────────

describe("swapEndian16", () => {
  it("swaps byte order for 16-bit samples", () => {
    // Big-endian [0x01, 0x02, 0x03, 0x04] → little-endian [0x02, 0x01, 0x04, 0x03]
    const input = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const swapped = swapEndian16(input);
    expect(swapped[0]).toBe(0x02);
    expect(swapped[1]).toBe(0x01);
    expect(swapped[2]).toBe(0x04);
    expect(swapped[3]).toBe(0x03);
  });

  it("double-swap returns original data", () => {
    const original = Buffer.from([0xAB, 0xCD, 0xEF, 0x12]);
    const doubleSwapped = swapEndian16(swapEndian16(original));
    expect(doubleSwapped).toEqual(original);
  });

  it("handles empty buffer", () => {
    const empty = Buffer.alloc(0);
    expect(swapEndian16(empty).length).toBe(0);
  });
});

// ── pcmToWav ────────────────────────────────────────────

describe("pcmToWav", () => {
  it("produces a valid 44-byte WAV header + PCM data", () => {
    const pcm = Buffer.alloc(100, 0x42);
    const wav = pcmToWav(pcm, 24000);

    // Must start with RIFF...WAVE
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.toString("ascii", 12, 16)).toBe("fmt ");
    expect(wav.toString("ascii", 36, 40)).toBe("data");

    // Total size = 44-byte header + 100-byte PCM
    expect(wav.length).toBe(144);

    // RIFF chunk size = total - 8
    expect(wav.readUInt32LE(4)).toBe(136);

    // fmt chunk size = 16 (PCM)
    expect(wav.readUInt32LE(16)).toBe(16);

    // audio format = 1 (PCM)
    expect(wav.readUInt16LE(20)).toBe(1);

    // channels = 1
    expect(wav.readUInt16LE(22)).toBe(1);

    // sample rate = 24000
    expect(wav.readUInt32LE(24)).toBe(24000);

    // byte rate = 24000 * 1 * 2 = 48000
    expect(wav.readUInt32LE(28)).toBe(48000);

    // block align = 1 * 2 = 2
    expect(wav.readUInt16LE(32)).toBe(2);

    // bits per sample = 16
    expect(wav.readUInt16LE(34)).toBe(16);

    // data chunk size = 100
    expect(wav.readUInt32LE(40)).toBe(100);
  });

  it("preserves PCM data after the header", () => {
    const pcm = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const wav = pcmToWav(pcm);
    // PCM data starts at byte 44
    expect(wav[44]).toBe(0x01);
    expect(wav[45]).toBe(0x02);
    expect(wav[46]).toBe(0x03);
    expect(wav[47]).toBe(0x04);
  });

  it("uses custom sample rate", () => {
    const wav = pcmToWav(Buffer.alloc(10), 48000);
    expect(wav.readUInt32LE(24)).toBe(48000);
    expect(wav.readUInt32LE(28)).toBe(96000); // byteRate = 48000 * 1 * 2
  });

  it("handles empty PCM buffer", () => {
    const wav = pcmToWav(Buffer.alloc(0));
    expect(wav.length).toBe(44); // Header only
    expect(wav.readUInt32LE(40)).toBe(0); // data size = 0
    expect(hasWavHeader(wav)).toBe(true);
  });

  it("output passes hasWavHeader check", () => {
    const wav = pcmToWav(Buffer.alloc(50));
    expect(hasWavHeader(wav)).toBe(true);
  });
});

// ── Constants ───────────────────────────────────────────

describe("TTS constants", () => {
  it("has 8 Gemini voices", () => {
    expect(GEMINI_VOICES.length).toBe(8);
  });

  it("default voice is Kore", () => {
    expect(DEFAULT_VOICE).toBe("Kore");
  });

  it("default voice is in the voice list", () => {
    expect((GEMINI_VOICES as readonly string[]).includes(DEFAULT_VOICE)).toBe(true);
  });
});
