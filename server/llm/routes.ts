/**
 * LLM API Routes
 *
 * POST /api/llm/chat  - Send a chat request to an LLM
 * GET  /api/llm/models - List available models
 */

import { Router, Request, Response } from "express";
import { chat, AVAILABLE_MODELS, type ChatRequest } from "./index";
import { generateImage, generateImages, type ImageGenerationRequest } from "./image-generation";
import { generateClip, generateClips, generateVideo, type ClipGenerationRequest } from "./video-generation";
import { generateClipReplicate, isReplicateModel, REPLICATE_VIDEO_MODEL } from "./video-generation-replicate";
import { concatenateVideos } from "./video-concat";
import { extractLastFrame } from "./video-frame-extract";
import { createLogger } from "../logger";

const log = createLogger("llm-routes");

const router = Router();

// List available models
router.get("/models", (_req: Request, res: Response) => {
  res.json({
    models: AVAILABLE_MODELS.map(m => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      description: m.description,
    })),
  });
});

// Chat with an LLM
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { model, messages, temperature, maxTokens, responseFormat } = req.body as ChatRequest;

    if (!model) {
      res.status(400).json({ error: "model is required" });
      return;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    // Validate messages format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        res.status(400).json({ error: "Each message must have role and content" });
        return;
      }
      if (!["system", "user", "assistant"].includes(msg.role)) {
        res.status(400).json({ error: "Invalid message role. Must be system, user, or assistant" });
        return;
      }
    }

    const response = await chat({
      model,
      messages,
      temperature,
      maxTokens,
      responseFormat,
    });

    res.json(response);
  } catch (error) {
    console.error("LLM chat error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.post("/validate-videos", async (req: Request, res: Response) => {
  try {
    const { videos } = req.body;
    if (!Array.isArray(videos)) {
      res.status(400).json({ error: "videos array is required" });
      return;
    }

    const results = await Promise.all(
      videos.map(async (video: { embedId?: string; title?: string }) => {
        if (!video.embedId) return null;
        // Basic format check: YouTube video IDs are 11 characters, alphanumeric + dash + underscore
        if (!/^[a-zA-Z0-9_-]{11}$/.test(video.embedId)) {
          console.warn(`[validate-videos] Invalid embed ID format: "${video.embedId}"`);
          return null;
        }
        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(video.embedId)}&format=json`;
          const resp = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
          if (resp.ok) {
            console.info(`[validate-videos] OK: "${video.title ?? video.embedId}"`);
            return video;
          }
          console.warn(`[validate-videos] Rejected (${resp.status}): "${video.title ?? video.embedId}" [${video.embedId}]`);
          return null;
        } catch (err) {
          console.warn(`[validate-videos] Network error for "${video.embedId}":`, err instanceof Error ? err.message : err);
          return null;
        }
      })
    );

    const validated = results.filter(Boolean);
    console.info(`[validate-videos] ${validated.length}/${videos.length} videos passed validation`);
    res.json({ videos: validated });
  } catch (error) {
    console.error("Video validation error:", error);
    res.status(500).json({ error: "Failed to validate videos" });
  }
});

// ── Image Generation (Nano Banana) ──────────────────────────────────

router.post("/generate-image", async (req: Request, res: Response) => {
  try {
    const { prompt, model, aspectRatio, referenceImageBase64, referenceImageMimeType } =
      req.body as ImageGenerationRequest;

    if (!prompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const result = await generateImage({
      prompt,
      model,
      aspectRatio,
      referenceImageBase64,
      referenceImageMimeType,
    });

    res.json({
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
      textResponse: result.textResponse,
      model: result.model,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.post("/generate-images", async (req: Request, res: Response) => {
  try {
    const { requests } = req.body as { requests: ImageGenerationRequest[] };

    if (!Array.isArray(requests) || requests.length === 0) {
      res.status(400).json({ error: "requests array is required" });
      return;
    }

    if (requests.length > 8) {
      res.status(400).json({ error: "Maximum 8 images per batch" });
      return;
    }

    const results = await generateImages(requests);

    res.json({
      images: results.map((r) =>
        r
          ? {
              imageBase64: r.imageBase64,
              mimeType: r.mimeType,
              textResponse: r.textResponse,
              model: r.model,
            }
          : null,
      ),
    });
  } catch (error) {
    console.error("Batch image generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── Video Generation (Veo) ─────────────────────────────────────────

router.post("/generate-clip", async (req: Request, res: Response) => {
  try {
    const { prompt, model, durationSeconds, aspectRatio, referenceImageBase64, referenceImageMimeType, sourceVideoBase64, sourceVideoMimeType } =
      req.body as ClipGenerationRequest;

    if (!prompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    // Validate durationSeconds early — Veo accepts [4, 8]
    if (durationSeconds !== undefined) {
      const d = Number(durationSeconds);
      if (!Number.isFinite(d) || d < 4 || d > 8) {
        log.warn(`Invalid durationSeconds received: ${JSON.stringify(durationSeconds)}, will be clamped by generator`);
      }
    }

    // Dispatch to Replicate for Wan/Replicate models, otherwise Veo
    const useReplicate = model && isReplicateModel(model);

    log.info(`generate-clip request — model: ${model ?? "(none)"}, useReplicate: ${!!useReplicate}, duration: ${durationSeconds ?? "default"}, durationRaw: ${JSON.stringify(durationSeconds)}`);

    if (!model) {
      log.warn("No model specified in generate-clip request — will fall through to Veo. If this should use Replicate, the client must send model explicitly.");
    }

    const result = useReplicate
      ? await generateClipReplicate({
          prompt,
          model,
          durationSeconds,
          aspectRatio,
        })
      : await generateClip({
          prompt,
          model,
          durationSeconds,
          aspectRatio,
          referenceImageBase64,
          referenceImageMimeType,
          sourceVideoBase64,
          sourceVideoMimeType,
        });

    res.json({
      videos: result.videos,
      model: result.model,
      operationName: result.operationName,
    });
  } catch (error) {
    const backend = (req.body as ClipGenerationRequest)?.model && isReplicateModel((req.body as ClipGenerationRequest).model!)
      ? "Replicate" : "Veo/Gemini";
    log.error(`Clip generation failed (${backend}, model: ${(req.body as ClipGenerationRequest)?.model ?? "(none)"})`, {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.post("/generate-video", async (req: Request, res: Response) => {
  try {
    const { prompts, model, aspectRatio, initialDurationSeconds } = req.body as {
      prompts: string[];
      model?: string;
      aspectRatio?: "16:9" | "9:16";
      initialDurationSeconds?: 4 | 5 | 6 | 7 | 8;
    };

    if (!Array.isArray(prompts) || prompts.length === 0) {
      res.status(400).json({ error: "prompts array is required (1-5 prompts)" });
      return;
    }

    if (prompts.length > 5) {
      res.status(400).json({ error: "Maximum 5 prompts for video (8-6-6-6 methodology)" });
      return;
    }

    const result = await generateVideo(prompts, {
      model,
      aspectRatio,
      initialDurationSeconds,
    });

    res.json(result);
  } catch (error) {
    console.error("Video generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.post("/generate-clips", async (req: Request, res: Response) => {
  try {
    const { requests } = req.body as { requests: ClipGenerationRequest[] };

    if (!Array.isArray(requests) || requests.length === 0) {
      res.status(400).json({ error: "requests array is required" });
      return;
    }

    if (requests.length > 4) {
      res.status(400).json({ error: "Maximum 4 clips per batch" });
      return;
    }

    const results = await generateClips(requests);

    res.json({
      clips: results.map((r) =>
        r
          ? { videos: r.videos, model: r.model }
          : null,
      ),
    });
  } catch (error) {
    console.error("Batch clip generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── Video Concatenation (FFmpeg) ─────────────────────────────────────

router.post("/concat-videos", async (req: Request, res: Response) => {
  try {
    const { clips } = req.body as {
      clips: Array<{ videoBase64: string; mimeType?: string }>;
    };

    if (!Array.isArray(clips) || clips.length < 2) {
      res.status(400).json({ error: "clips array with at least 2 entries is required" });
      return;
    }

    if (clips.length > 5) {
      res.status(400).json({ error: "Maximum 5 clips per concatenation" });
      return;
    }

    const result = await concatenateVideos(clips);
    res.json(result);
  } catch (error) {
    console.error("Video concatenation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── Last Frame Extraction (FFmpeg) ───────────────────────────────────

router.post("/extract-last-frame", async (req: Request, res: Response) => {
  try {
    const { videoBase64, mimeType } = req.body as {
      videoBase64: string;
      mimeType?: string;
    };

    if (!videoBase64) {
      res.status(400).json({ error: "videoBase64 is required" });
      return;
    }

    const frameBase64 = await extractLastFrame(videoBase64, mimeType);
    res.json({ frameBase64, mimeType: "image/png" });
  } catch (error) {
    console.error("Frame extraction error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── YouTube Data API search ──────────────────────────────────────────

function formatViewCount(count: string): string {
  const n = parseInt(count, 10);
  if (isNaN(n)) return count;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return count;
}

router.post("/youtube-search", async (req: Request, res: Response) => {
  try {
    const { queries } = req.body;
    if (!Array.isArray(queries) || queries.length === 0) {
      res.status(400).json({ error: "queries array is required" });
      return;
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });
      return;
    }

    // Search YouTube for each query (max 5 results per query)
    const allVideoIds: string[] = [];
    const searchSnippets: Record<string, { title: string; channelTitle: string; description: string; thumbnailUrl: string; searchQuery: string }> = {};

    await Promise.all(
      queries.slice(0, 5).map(async (query: string) => {
        try {
          const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
          searchUrl.searchParams.set("part", "snippet");
          searchUrl.searchParams.set("q", query);
          searchUrl.searchParams.set("type", "video");
          searchUrl.searchParams.set("maxResults", "5");
          searchUrl.searchParams.set("order", "relevance");
          searchUrl.searchParams.set("videoEmbeddable", "true");
          searchUrl.searchParams.set("key", apiKey);

          const resp = await fetch(searchUrl.toString(), { signal: AbortSignal.timeout(10000) });
          if (!resp.ok) {
            console.warn(`[youtube-search] Search failed for "${query}": ${resp.status}`);
            return;
          }

          const data = await resp.json() as {
            items?: Array<{
              id: { videoId?: string };
              snippet: { title: string; channelTitle: string; description: string; thumbnails?: { medium?: { url: string } } };
            }>;
          };

          for (const item of data.items ?? []) {
            const videoId = item.id?.videoId;
            if (!videoId || searchSnippets[videoId]) continue;
            allVideoIds.push(videoId);
            searchSnippets[videoId] = {
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              description: item.snippet.description,
              thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? "",
              searchQuery: query,
            };
          }
        } catch (err) {
          console.warn(`[youtube-search] Error searching "${query}":`, err instanceof Error ? err.message : err);
        }
      })
    );

    if (allVideoIds.length === 0) {
      console.warn("[youtube-search] No videos found across all queries");
      res.json({ videos: [] });
      return;
    }

    // Fetch statistics for all found videos in one batch
    const uniqueIds = [...new Set(allVideoIds)];
    const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    statsUrl.searchParams.set("part", "statistics");
    statsUrl.searchParams.set("id", uniqueIds.slice(0, 20).join(","));
    statsUrl.searchParams.set("key", apiKey);

    const statsResp = await fetch(statsUrl.toString(), { signal: AbortSignal.timeout(10000) });
    const statsMap: Record<string, { viewCount: string; likeCount: string; commentCount: string }> = {};

    if (statsResp.ok) {
      const statsData = await statsResp.json() as {
        items?: Array<{
          id: string;
          statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
        }>;
      };
      for (const item of statsData.items ?? []) {
        statsMap[item.id] = {
          viewCount: item.statistics.viewCount ?? "0",
          likeCount: item.statistics.likeCount ?? "0",
          commentCount: item.statistics.commentCount ?? "0",
        };
      }
    }

    // Build response — sort by view count descending, deduplicated
    const videos = uniqueIds
      .map((videoId) => {
        const snippet = searchSnippets[videoId];
        const stats = statsMap[videoId];
        if (!snippet) return null;
        return {
          title: snippet.title,
          creator: snippet.channelTitle,
          description: snippet.description.slice(0, 120),
          url: `https://www.youtube.com/watch?v=${videoId}`,
          embedId: videoId,
          whyRecommended: `Found for: ${snippet.searchQuery}`,
          views: stats ? formatViewCount(stats.viewCount) : "",
          likes: stats ? formatViewCount(stats.likeCount) : "",
          comments: stats ? formatViewCount(stats.commentCount) : "",
          thumbnailUrl: snippet.thumbnailUrl,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Sort by raw view count descending
        const aViews = parseInt(statsMap[a!.embedId]?.viewCount ?? "0", 10);
        const bViews = parseInt(statsMap[b!.embedId]?.viewCount ?? "0", 10);
        return bViews - aViews;
      })
      .slice(0, 10);

    console.info(`[youtube-search] Found ${videos.length} videos from ${queries.length} queries`);
    res.json({ videos });
  } catch (error) {
    console.error("YouTube search error:", error);
    res.status(500).json({ error: "Failed to search YouTube" });
  }
});

export default router;
