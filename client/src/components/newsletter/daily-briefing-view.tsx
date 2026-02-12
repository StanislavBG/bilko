/**
 * Daily Briefing View — unified presentation of the complete newsletter pipeline.
 *
 * Combines all generated outputs into a single scrollable daily briefing:
 *   1. Edition header with mood and leagues
 *   2. AI-generated infographic hero image
 *   3. AI video player (continuous Veo video or slideshow fallback)
 *   4. Top story highlight
 *   5. Full article list
 *   6. Key takeaway footer
 *
 * This is the "daily briefing" the user sees — the assembled product
 * of the entire 12-step newsletter pipeline.
 */

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Sparkles,
  Video,
} from "lucide-react";
import type { ImageGenerationResult, ContinuousVideoResult } from "@/lib/bilko-flow";
import type { InfographicData } from "./infographic-view";
import type { StoryboardData, NarrativeData } from "./slideshow-player";
import type { VideoPromptsData } from "./video-plan-view";

interface Article {
  headline: string;
  article: string;
  imageDescription: string;
  league: string;
}

interface NewsletterResult {
  editionTitle: string;
  topStory: string;
  leaguesCovered: string[];
  mood: string;
  takeaway: string;
}

interface DailyBriefingViewProps {
  newsletter: NewsletterResult;
  articles: Article[];
  infographic: InfographicData | null;
  infographicImage: ImageGenerationResult | null;
  storyboard: StoryboardData | null;
  narrative: NarrativeData | null;
  sceneImages: (ImageGenerationResult | null)[] | null;
  videoPrompts: VideoPromptsData | null;
  continuousVideo: ContinuousVideoResult | null;
}

const MOOD_EMOJI: Record<string, string> = {
  buzzing: "⚡",
  thrilled: "🔥",
  informed: "📊",
  engaged: "💬",
  excited: "🎉",
};

const LEAGUE_COLORS: Record<string, string> = {
  "Premier League": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "La Liga": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Serie A": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Bundesliga: "bg-red-500/10 text-red-600 dark:text-red-400",
  "Ligue 1": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "Champions League": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  "Europa League": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function getLeagueColor(league: string): string {
  for (const [key, val] of Object.entries(LEAGUE_COLORS)) {
    if (league.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return "bg-green-500/10 text-green-600 dark:text-green-400";
}

export function DailyBriefingView({
  newsletter,
  articles,
  infographic,
  infographicImage,
  storyboard,
  narrative,
  sceneImages,
  videoPrompts,
  continuousVideo,
}: DailyBriefingViewProps) {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const moodEmoji = MOOD_EMOJI[newsletter.mood?.toLowerCase()] ?? "📰";
  const hasVideo = !!continuousVideo?.mergedVideo;
  const hasInfographicImg = !!infographicImage?.imageBase64;

  // Download the full briefing as HTML
  const downloadBriefing = useCallback(() => {
    const articleHtml = articles
      .map(
        (a) => `
      <article style="margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #333;">
        <span style="display:inline-block;background:#16a34a33;color:#16a34a;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-bottom:6px;">${a.league}</span>
        <h3 style="margin:0 0 6px;font-size:17px;color:#fff;">${a.headline}</h3>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#ccc;">${a.article}</p>
      </article>`,
      )
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${newsletter.editionTitle} — Daily Briefing</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="text-align:center;padding:32px 0;border-bottom:1px solid #222;">
      <p style="margin:0 0 4px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:2px;">Daily Briefing</p>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;">${newsletter.editionTitle}</h1>
      <p style="margin:0 0 4px;font-size:13px;color:#888;">${today}</p>
      <p style="margin:0;font-size:13px;color:#888;">${newsletter.leaguesCovered.join(" · ")}</p>
    </div>
    <div style="padding:24px 0;border-bottom:1px solid #222;">
      <p style="margin:0 0 4px;font-size:11px;color:#16a34a;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Top Story</p>
      <p style="margin:0;font-size:16px;font-weight:600;color:#fff;">${newsletter.topStory}</p>
    </div>
    <div style="padding:24px 0;">
      ${articleHtml}
    </div>
    <div style="padding:16px 0;border-top:1px solid #222;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;color:#888;font-style:italic;">${newsletter.takeaway}</p>
      <p style="margin:8px 0 0;font-size:11px;color:#555;">Mood: ${newsletter.mood} · Powered by Bilko's Mental Gym</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-briefing-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [articles, newsletter, today]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* ── Edition Header ──────────────────────────────────── */}
      <div className="rounded-xl border-2 border-green-500/30 bg-gradient-to-b from-green-500/5 to-transparent p-6 text-center space-y-2">
        <p className="text-[11px] text-green-500 uppercase tracking-[3px] font-semibold">
          Daily Briefing
        </p>
        <h2 className="text-2xl font-extrabold leading-tight">
          {newsletter.editionTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{today}</p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {newsletter.leaguesCovered.map((league) => (
            <span
              key={league}
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${getLeagueColor(league)}`}
            >
              {league}
            </span>
          ))}
          <span className="text-[10px] font-medium text-muted-foreground/70">
            {moodEmoji} {newsletter.mood}
          </span>
        </div>
      </div>

      {/* ── Hero Media: AI Video or Infographic Image ────── */}
      {hasVideo && (() => {
        const merged = continuousVideo!.mergedVideo!;
        const videoUrl = `data:${merged.mimeType};base64,${merged.videoBase64}`;
        return (
          <div className="rounded-xl overflow-hidden border border-border bg-black">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border-b border-violet-500/20">
              <Video className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-[10px] font-semibold text-violet-500">
                AI-Generated Video — ~{continuousVideo!.totalDurationSeconds}s
              </span>
              <a
                href={videoUrl}
                download={`daily-briefing-video-${new Date().toISOString().slice(0, 10)}.mp4`}
                className="ml-auto"
              >
                <Download className="h-3.5 w-3.5 text-violet-500/60 hover:text-violet-500 transition-colors" />
              </a>
            </div>
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full aspect-video"
              preload="metadata"
            />
          </div>
        );
      })()}

      {!hasVideo && hasInfographicImg && (
        <div className="rounded-xl overflow-hidden border border-border">
          <img
            src={`data:${infographicImage!.mimeType};base64,${infographicImage!.imageBase64}`}
            alt={newsletter.editionTitle}
            className="w-full aspect-video object-cover"
          />
        </div>
      )}

      {/* ── Top Story Highlight ──────────────────────────── */}
      <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
        <p className="text-[10px] text-green-500 uppercase tracking-wider font-semibold mb-1">
          Top Story
        </p>
        <p className="text-sm font-semibold leading-snug">
          {newsletter.topStory}
        </p>
      </div>

      {/* ── Articles ─────────────────────────────────────── */}
      <div className="space-y-3">
        {articles.map((article, i) => (
          <div
            key={i}
            className="rounded-lg border border-border p-4 space-y-2"
          >
            <div className="flex items-start gap-2">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${getLeagueColor(article.league)}`}
              >
                {article.league}
              </span>
              <h3 className="text-sm font-semibold leading-tight">
                {article.headline}
              </h3>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {article.article}
            </p>
            {/* Show scene image if available */}
            {sceneImages && sceneImages[i + 1] && (
              <div className="rounded-md overflow-hidden mt-2">
                <img
                  src={`data:${sceneImages[i + 1]!.mimeType};base64,${sceneImages[i + 1]!.imageBase64}`}
                  alt={article.headline}
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Infographic Stats (if available) ─────────────── */}
      {infographic && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-green-500" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Key Stats
            </span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-center">
              <p className="text-2xl font-black text-green-500">
                {infographic.mainStory?.stat}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {infographic.mainStory?.statLabel}
              </p>
            </div>
            {infographic.supportingStories?.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-lg font-bold text-foreground/80">
                  {s.stat}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {s.statLabel}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Takeaway Footer ──────────────────────────────── */}
      <div className="text-center py-3 space-y-1">
        <p className="text-sm text-muted-foreground italic">
          {newsletter.takeaway}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={downloadBriefing}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download Briefing
          </Button>
        </div>
      </div>
    </div>
  );
}
