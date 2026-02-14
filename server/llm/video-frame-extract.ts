/**
 * Video Frame Extraction — FFmpeg
 *
 * Extracts the last frame of a video as a PNG base64 string.
 * Used for minimax/video-01 clip chaining: last frame → first_frame_image.
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { createLogger } from "../logger";

const log = createLogger("video-frame-extract");

/**
 * Extract the last frame of a base64-encoded video as a PNG base64 string.
 *
 * Uses FFmpeg with -sseof to seek near the end, then grabs the final frame.
 * Returns a PNG base64 string suitable for use as `first_frame_image`.
 */
export async function extractLastFrame(videoBase64: string, mimeType = "video/mp4"): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "frame-extract-"));
  const ext = mimeType.includes("webm") ? ".webm" : ".mp4";
  const inputPath = path.join(tmpDir, `input${ext}`);
  const outputPath = path.join(tmpDir, "last-frame.png");

  try {
    // Write video to temp file
    const videoBuffer = Buffer.from(videoBase64, "base64");
    fs.writeFileSync(inputPath, videoBuffer);
    log.info(`Extracting last frame from ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB video`);

    // Run FFmpeg to extract last frame
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-sseof", "-1",        // seek to last 1 second
        "-i", inputPath,       // input file
        "-vsync", "0",         // no frame dropping
        "-update", "true",     // overwrite output (last frame wins)
        "-frames:v", "1",      // only 1 frame
        "-y",                  // overwrite output file
        outputPath,
      ]);

      let stderr = "";
      ffmpeg.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code !== 0) {
          log.error(`FFmpeg frame extraction failed (code ${code})`, { stderr: stderr.slice(-500) });
          reject(new Error(`FFmpeg exited with code ${code}`));
        } else {
          resolve();
        }
      });

      ffmpeg.on("error", (err) => {
        reject(new Error(`FFmpeg spawn error: ${err.message}`));
      });
    });

    // Read the PNG and convert to base64
    if (!fs.existsSync(outputPath)) {
      throw new Error("FFmpeg did not produce an output frame");
    }

    const frameBuffer = fs.readFileSync(outputPath);
    const frameBase64 = frameBuffer.toString("base64");
    log.info(`Last frame extracted: ${(frameBuffer.length / 1024).toFixed(0)}KB PNG`);

    return frameBase64;
  } finally {
    // Clean up temp files
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      fs.rmdirSync(tmpDir);
    } catch {
      // ignore cleanup errors
    }
  }
}
