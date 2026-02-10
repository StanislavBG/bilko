/**
 * LLM API Routes
 *
 * POST /api/llm/chat  - Send a chat request to an LLM
 * GET  /api/llm/models - List available models (includes ttsAvailable flag)
 * POST /api/llm/tts   - Text-to-speech via Gemini TTS
 */

import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { chat, AVAILABLE_MODELS, type ChatRequest } from "./index";
import {
  parseSampleRate,
  isRawPcm,
  hasWavHeader,
  swapEndian16,
  pcmToWav,
  GEMINI_VOICES,
  DEFAULT_VOICE,
} from "./audio-utils.js";

const router = Router();

// ── Gemini TTS client (lazy singleton) ───────────────────

let _ttsClient: GoogleGenAI | null = null;

function getTtsClient(): GoogleGenAI | null {
  if (_ttsClient) return _ttsClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  _ttsClient = new GoogleGenAI({ apiKey });
  return _ttsClient;
}

// List available models + TTS availability
router.get("/models", (_req: Request, res: Response) => {
  res.json({
    models: AVAILABLE_MODELS.map(m => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      description: m.description,
    })),
    ttsAvailable: getTtsClient() !== null,
  });
});

// Chat with an LLM
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { model, messages, temperature, maxTokens } = req.body as ChatRequest;

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

// ── Text-to-Speech via Gemini TTS ────────────────────────

router.post("/tts", async (req: Request, res: Response) => {
  try {
    const client = getTtsClient();
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
      console.error("[TTS] No audio data in Gemini response");
      res.status(500).json({ error: "No audio data in Gemini response" });
      return;
    }

    const mimeType = audioPart.inlineData.mimeType || "audio/L16;rate=24000";
    const rawBuffer = Buffer.from(audioPart.inlineData.data, "base64");

    if (rawBuffer.length === 0) {
      res.status(500).json({ error: "Gemini returned empty audio data" });
      return;
    }

    let audioBuffer: Buffer;
    let contentType: string;

    if (hasWavHeader(rawBuffer)) {
      audioBuffer = rawBuffer;
      contentType = "audio/wav";
    } else if (isRawPcm(mimeType)) {
      const sampleRate = parseSampleRate(mimeType);
      const isL16 = mimeType.toLowerCase().startsWith("audio/l16");
      const pcmData = isL16 ? swapEndian16(rawBuffer) : rawBuffer;
      audioBuffer = pcmToWav(pcmData, sampleRate);
      contentType = "audio/wav";
    } else if (mimeType.includes("wav")) {
      audioBuffer = pcmToWav(rawBuffer, parseSampleRate(mimeType));
      contentType = "audio/wav";
    } else {
      const knownPassthrough = ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/webm", "audio/aac"];
      const baseMime = mimeType.split(";")[0].toLowerCase().trim();
      if (knownPassthrough.includes(baseMime)) {
        audioBuffer = rawBuffer;
        contentType = baseMime;
      } else {
        audioBuffer = pcmToWav(rawBuffer, parseSampleRate(mimeType));
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
