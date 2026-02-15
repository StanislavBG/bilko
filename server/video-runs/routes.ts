/**
 * Video Run API Routes
 *
 * Persistence + retrieval for AI-Video flow runs.
 * Video files served directly from disk for efficiency.
 */

import { Router } from "express";
import { createLogger } from "../logger";
import * as service from "./service";

const log = createLogger("video-runs-routes");
const router = Router();

// ── POST /api/video-runs — Create a new run ────────────────────────────

router.post("/", async (req, res) => {
  try {
    const { flowId, runId } = req.body;
    if (!flowId || !runId) {
      return res.status(400).json({ error: "flowId and runId are required" });
    }
    await service.createRun(flowId, runId);
    res.json({ success: true, runId });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    log.error("Failed to create run", { error: detail });
    res.status(500).json({ error: `Failed to create run: ${detail}` });
  }
});

// ── PATCH /api/video-runs/:runId — Update run metadata ─────────────────

router.patch("/:runId", async (req, res) => {
  try {
    const { runId } = req.params;
    const { status, research, script, clipCount, finalDurationSeconds, hasFinalVideo, error } = req.body;

    const update: service.RunUpdate = {};
    if (status !== undefined) update.status = status;
    if (research !== undefined) update.research = research;
    if (script !== undefined) update.script = script;
    if (clipCount !== undefined) update.clipCount = clipCount;
    if (finalDurationSeconds !== undefined) update.finalDurationSeconds = finalDurationSeconds;
    if (hasFinalVideo !== undefined) update.hasFinalVideo = hasFinalVideo;
    if (error !== undefined) update.error = error;
    if (status === "completed" || status === "failed") update.completedAt = new Date();

    await service.updateRun(runId, update);
    res.json({ success: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    log.error("Failed to update run", { error: detail });
    res.status(500).json({ error: `Failed to update run: ${detail}` });
  }
});

// ── POST /api/video-runs/:runId/clips/:index — Save a clip file ────────

router.post("/:runId/clips/:index", async (req, res) => {
  try {
    const { runId, index } = req.params;
    const clipIndex = parseInt(index, 10);
    if (isNaN(clipIndex) || clipIndex < 0) {
      return res.status(400).json({ error: "Invalid clip index" });
    }

    const { videoBase64 } = req.body;
    if (!videoBase64) {
      return res.status(400).json({ error: "videoBase64 is required" });
    }

    const filename = await service.saveClip(runId, clipIndex, videoBase64);
    res.json({ success: true, filename });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    log.error("Failed to save clip", { error: detail });
    res.status(500).json({ error: `Failed to save clip: ${detail}` });
  }
});

// ── POST /api/video-runs/:runId/video — Save combined video ────────────

router.post("/:runId/video", async (req, res) => {
  try {
    const { runId } = req.params;
    const { videoBase64 } = req.body;
    if (!videoBase64) {
      return res.status(400).json({ error: "videoBase64 is required" });
    }

    const filename = await service.saveFinalVideo(runId, videoBase64);
    await service.updateRun(runId, { hasFinalVideo: "true" });
    res.json({ success: true, filename });
  } catch (err) {
    log.error("Failed to save final video", { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "Failed to save final video" });
  }
});

// ── GET /api/video-runs — List all runs ────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const flowId = req.query.flowId as string | undefined;
    const runs = await service.listRuns(flowId);
    res.json({ runs });
  } catch (err) {
    log.error("Failed to list runs", { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "Failed to list runs" });
  }
});

// ── GET /api/video-runs/:runId — Get run details ───────────────────────

router.get("/:runId", async (req, res) => {
  try {
    const run = await service.getRun(req.params.runId);
    if (!run) {
      return res.status(404).json({ error: "Run not found" });
    }
    res.json(run);
  } catch (err) {
    log.error("Failed to get run", { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "Failed to get run" });
  }
});

// ── GET /api/video-runs/:runId/clips/:index — Serve clip file ──────────

router.get("/:runId/clips/:index", (req, res) => {
  const clipIndex = parseInt(req.params.index, 10);
  if (isNaN(clipIndex) || clipIndex < 0) {
    return res.status(400).json({ error: "Invalid clip index" });
  }

  const filePath = service.getClipFilePath(req.params.runId, clipIndex);
  if (!filePath) {
    return res.status(404).json({ error: "Clip not found" });
  }

  res.setHeader("Content-Type", "video/mp4");
  res.sendFile(filePath);
});

// ── GET /api/video-runs/:runId/video — Serve combined video ────────────

router.get("/:runId/video", (req, res) => {
  const filePath = service.getFinalVideoFilePath(req.params.runId);
  if (!filePath) {
    return res.status(404).json({ error: "Video not found" });
  }

  res.setHeader("Content-Type", "video/mp4");
  res.sendFile(filePath);
});

export default router;
