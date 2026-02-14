/**
 * Video Run Persistence Service
 *
 * Handles saving and loading AI-Video flow runs:
 *   - Metadata (research, script, status) → PostgreSQL via Drizzle
 *   - Video files (clips, combined) → disk at data/video-runs/{runId}/
 *
 * File layout:
 *   data/video-runs/{runId}/
 *     clip-0.mp4
 *     clip-1.mp4
 *     clip-2.mp4
 *     combined.mp4
 */

import path from "path";
import fs from "fs";
import { db } from "../db";
import { videoFlowRuns } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { createLogger } from "../logger";

const log = createLogger("video-runs");

const DATA_DIR = path.resolve(process.cwd(), "data", "video-runs");

/** Ensure the data directory exists */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** Get the directory for a specific run */
function runDir(runId: string): string {
  return path.join(DATA_DIR, runId);
}

/** Ensure a run's directory exists */
function ensureRunDir(runId: string): string {
  const dir = runDir(runId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ── Create ─────────────────────────────────────────────────────────────

export async function createRun(flowId: string, runId: string): Promise<void> {
  ensureDataDir();
  await db.insert(videoFlowRuns).values({
    flowId,
    runId,
    status: "running",
  });
  log.info(`Created video run ${runId} for flow ${flowId}`);
}

// ── Update metadata ────────────────────────────────────────────────────

export interface RunUpdate {
  status?: string;
  research?: unknown;
  script?: unknown;
  clipCount?: number;
  finalDurationSeconds?: number;
  hasFinalVideo?: string;
  error?: string;
  completedAt?: Date;
}

export async function updateRun(runId: string, data: RunUpdate): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.research !== undefined) updateData.research = data.research;
  if (data.script !== undefined) updateData.script = data.script;
  if (data.clipCount !== undefined) updateData.clipCount = data.clipCount;
  if (data.finalDurationSeconds !== undefined) updateData.finalDurationSeconds = data.finalDurationSeconds;
  if (data.hasFinalVideo !== undefined) updateData.hasFinalVideo = data.hasFinalVideo;
  if (data.error !== undefined) updateData.error = data.error;
  if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;

  await db.update(videoFlowRuns).set(updateData).where(eq(videoFlowRuns.runId, runId));
  log.info(`Updated video run ${runId}`, { fields: Object.keys(updateData) });
}

// ── Save video files ───────────────────────────────────────────────────

export async function saveClip(runId: string, clipIndex: number, videoBase64: string): Promise<string> {
  const dir = ensureRunDir(runId);
  const filename = `clip-${clipIndex}.mp4`;
  const filePath = path.join(dir, filename);

  const buffer = Buffer.from(videoBase64, "base64");
  fs.writeFileSync(filePath, buffer);

  log.info(`Saved clip ${clipIndex} for run ${runId}: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
  return filename;
}

export async function saveFinalVideo(runId: string, videoBase64: string): Promise<string> {
  const dir = ensureRunDir(runId);
  const filename = "combined.mp4";
  const filePath = path.join(dir, filename);

  const buffer = Buffer.from(videoBase64, "base64");
  fs.writeFileSync(filePath, buffer);

  log.info(`Saved combined video for run ${runId}: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
  return filename;
}

// ── Read ───────────────────────────────────────────────────────────────

export interface VideoRunSummary {
  id: string;
  flowId: string;
  runId: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  title: string | null;
  headline: string | null;
  league: string | null;
  clipCount: number;
  finalDurationSeconds: number | null;
  hasFinalVideo: boolean;
}

export async function listRuns(flowId?: string): Promise<VideoRunSummary[]> {
  let query = db.select().from(videoFlowRuns).orderBy(desc(videoFlowRuns.createdAt)).limit(50);

  if (flowId) {
    query = query.where(eq(videoFlowRuns.flowId, flowId)) as typeof query;
  }

  const rows = await query;

  return rows.map((row) => {
    const script = row.script as { title?: string } | null;
    const research = row.research as { headline?: string; league?: string } | null;

    return {
      id: row.id,
      flowId: row.flowId,
      runId: row.runId,
      status: row.status,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
      title: script?.title ?? null,
      headline: research?.headline ?? null,
      league: research?.league ?? null,
      clipCount: row.clipCount ?? 0,
      finalDurationSeconds: row.finalDurationSeconds,
      hasFinalVideo: row.hasFinalVideo === "true",
    };
  });
}

export interface VideoRunDetail {
  id: string;
  flowId: string;
  runId: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  research: unknown;
  script: unknown;
  clipCount: number;
  finalDurationSeconds: number | null;
  hasFinalVideo: boolean;
  error: string | null;
  clips: Array<{ index: number; url: string; sizeMB: number }>;
  finalVideoUrl: string | null;
}

export async function getRun(runId: string): Promise<VideoRunDetail | null> {
  const [row] = await db.select().from(videoFlowRuns).where(eq(videoFlowRuns.runId, runId)).limit(1);
  if (!row) return null;

  // Check which clip files exist on disk
  const dir = runDir(runId);
  const clips: Array<{ index: number; url: string; sizeMB: number }> = [];
  if (fs.existsSync(dir)) {
    for (let i = 0; i < (row.clipCount ?? 0); i++) {
      const clipPath = path.join(dir, `clip-${i}.mp4`);
      if (fs.existsSync(clipPath)) {
        const stat = fs.statSync(clipPath);
        clips.push({
          index: i,
          url: `/api/video-runs/${runId}/clips/${i}`,
          sizeMB: Math.round((stat.size / 1024 / 1024) * 10) / 10,
        });
      }
    }
  }

  const combinedPath = path.join(dir, "combined.mp4");
  const hasFinal = fs.existsSync(combinedPath);

  return {
    id: row.id,
    flowId: row.flowId,
    runId: row.runId,
    status: row.status,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    research: row.research,
    script: row.script,
    clipCount: row.clipCount ?? 0,
    finalDurationSeconds: row.finalDurationSeconds,
    hasFinalVideo: hasFinal,
    error: row.error,
    clips,
    finalVideoUrl: hasFinal ? `/api/video-runs/${runId}/video` : null,
  };
}

// ── Serve video files ──────────────────────────────────────────────────

export function getClipFilePath(runId: string, clipIndex: number): string | null {
  const filePath = path.join(runDir(runId), `clip-${clipIndex}.mp4`);
  return fs.existsSync(filePath) ? filePath : null;
}

export function getFinalVideoFilePath(runId: string): string | null {
  const filePath = path.join(runDir(runId), "combined.mp4");
  return fs.existsSync(filePath) ? filePath : null;
}
