/**
 * TTS audio utility functions — pure helpers for audio format detection and conversion.
 * Extracted from routes.ts for testability.
 */

/**
 * Parse sample rate from Gemini mimeType string.
 * e.g. "audio/L16;rate=24000" → 24000
 *      "audio/L16;codec=pcm;rate=24000" → 24000
 */
export function parseSampleRate(mimeType: string): number {
  const match = mimeType.match(/rate=(\d+)/i);
  return match ? parseInt(match[1], 10) : 24000;
}

/**
 * Check if a mimeType indicates raw PCM data (needs WAV wrapping).
 * Known raw PCM types from Gemini: audio/L16, audio/pcm
 */
export function isRawPcm(mimeType: string): boolean {
  const lower = mimeType.toLowerCase();
  return lower.startsWith("audio/l16") || lower.startsWith("audio/pcm");
}

/**
 * Check if audio data already has a WAV/RIFF header.
 */
export function hasWavHeader(buffer: Buffer): boolean {
  return buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WAVE";
}

/**
 * Swap byte order for 16-bit PCM samples (big-endian ↔ little-endian).
 * audio/L16 per RFC 3551 is big-endian, but WAV requires little-endian.
 */
export function swapEndian16(buffer: Buffer): Buffer {
  const swapped = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length - 1; i += 2) {
    swapped[i] = buffer[i + 1];
    swapped[i + 1] = buffer[i];
  }
  return swapped;
}

/**
 * Wrap raw PCM data in a WAV header.
 */
export function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
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
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wav, headerSize);

  return wav;
}

export const GEMINI_VOICES = [
  "Kore", "Puck", "Charon", "Fenrir", "Aoede",
  "Leda", "Orus", "Zephyr",
] as const;

export const DEFAULT_VOICE = "Kore";
