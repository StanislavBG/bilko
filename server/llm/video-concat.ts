/**
 * Video Concatenation — FFmpeg-based MP4 concatenation
 *
 * Takes an array of base64-encoded MP4 clips and concatenates them
 * into a single continuous MP4 using FFmpeg's concat demuxer.
 *
 * Used after generating individual Veo clips (8+6+6s) to produce
 * the final ~20s continuous video. This is a container-level concat
 * (no re-encoding) — clips must share codec settings.
 */

import { execSync } from "child_process";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  unlinkSync,
  existsSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createLogger } from "../logger";

const log = createLogger("video-concat");

export interface ConcatResult {
  videoBase64: string;
  mimeType: string;
  durationSeconds: number;
}

/**
 * Concatenate multiple MP4 clips into a single video using FFmpeg.
 *
 * Uses the concat demuxer for lossless joining of clips with
 * identical codec settings (same resolution, framerate, codec).
 * All Veo clips share these properties, so this is safe.
 */
export async function concatenateVideos(
  clips: Array<{ videoBase64: string; mimeType?: string }>,
): Promise<ConcatResult> {
  if (clips.length === 0) {
    throw new Error("At least one clip is required for concatenation");
  }

  if (clips.length === 1) {
    const duration = probeVideoDuration(clips[0].videoBase64);
    return {
      videoBase64: clips[0].videoBase64,
      mimeType: clips[0].mimeType ?? "video/mp4",
      durationSeconds: duration,
    };
  }

  const workDir = join(
    tmpdir(),
    `bilko-concat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );

  try {
    mkdirSync(workDir, { recursive: true });

    // Write each clip to a temp file
    const clipPaths: string[] = [];
    for (let i = 0; i < clips.length; i++) {
      const clipPath = join(workDir, `clip_${i}.mp4`);
      writeFileSync(clipPath, Buffer.from(clips[i].videoBase64, "base64"));
      clipPaths.push(clipPath);
      const sizeMB = (clips[i].videoBase64.length * 3) / 4 / 1024 / 1024;
      log.info(
        `Written clip ${i + 1}/${clips.length}: ${sizeMB.toFixed(1)}MB`,
      );
    }

    // Create concat list file (FFmpeg concat demuxer format)
    const listPath = join(workDir, "concat_list.txt");
    const listContent = clipPaths.map((f) => `file '${f}'`).join("\n");
    writeFileSync(listPath, listContent);

    // Run FFmpeg concat — container-level copy, no re-encoding
    const outputPath = join(workDir, "output.mp4");
    const cmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;

    log.info(`Running FFmpeg concat: ${clips.length} clips`);
    execSync(cmd, { timeout: 60_000, stdio: "pipe" });

    if (!existsSync(outputPath)) {
      throw new Error("FFmpeg did not produce output file");
    }

    const outputBuffer = readFileSync(outputPath);
    const outputBase64 = outputBuffer.toString("base64");
    const duration = probeVideoDurationFromFile(outputPath);

    log.info(
      `Concatenated ${clips.length} clips → ${(outputBuffer.length / 1024 / 1024).toFixed(1)}MB, ~${duration}s`,
    );

    return {
      videoBase64: outputBase64,
      mimeType: "video/mp4",
      durationSeconds: duration,
    };
  } finally {
    // Clean up temp directory
    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch {
      log.warn("Failed to clean up temp dir: " + workDir);
    }
  }
}

/**
 * Probe video duration from a file using FFprobe.
 */
function probeVideoDurationFromFile(filePath: string): number {
  try {
    const output = execSync(
      `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { timeout: 10_000, stdio: "pipe" },
    )
      .toString()
      .trim();
    const duration = parseFloat(output);
    return isNaN(duration) ? 0 : Math.round(duration);
  } catch {
    log.warn("FFprobe duration detection failed");
    return 0;
  }
}

/**
 * Probe video duration from base64 data.
 */
function probeVideoDuration(videoBase64: string): number {
  const tempPath = join(tmpdir(), `bilko-probe-${Date.now()}.mp4`);
  try {
    writeFileSync(tempPath, Buffer.from(videoBase64, "base64"));
    return probeVideoDurationFromFile(tempPath);
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {
      /* ignore */
    }
  }
}
