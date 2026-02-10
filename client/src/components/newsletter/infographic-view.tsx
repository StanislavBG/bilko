/**
 * Infographic View — cinematic AI-generated infographic with data overlay.
 *
 * When a generated image is available (from Nano Banana), it displays as
 * the hero visual with score/stat callouts overlaid. When no image is
 * available, falls back to the styled HTML layout.
 *
 * Emphasizes: scores, transfer fees, and numerical football data.
 */

import { Download, Image as ImageIcon, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";

export interface InfographicData {
  title: string;
  subtitle: string;
  imagePrompt?: string;
  mainStory: {
    headline: string;
    stat: string;
    statLabel: string;
    summary: string;
    league: string;
    accentColor: string;
  };
  supportingStories: Array<{
    headline: string;
    stat: string;
    statLabel: string;
    summary: string;
    league: string;
  }>;
  footer: string;
  edition: string;
}

interface GeneratedImage {
  imageBase64: string;
  mimeType: string;
  textResponse?: string;
  model: string;
}

const LEAGUE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Premier League": { bg: "bg-purple-600", text: "text-purple-600", border: "border-purple-600" },
  "La Liga": { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500" },
  "Serie A": { bg: "bg-blue-600", text: "text-blue-600", border: "border-blue-600" },
  "Bundesliga": { bg: "bg-red-600", text: "text-red-600", border: "border-red-600" },
  "Ligue 1": { bg: "bg-green-600", text: "text-green-600", border: "border-green-600" },
  "Champions League": { bg: "bg-indigo-600", text: "text-indigo-600", border: "border-indigo-600" },
};

function getLeagueColor(league: string) {
  const match = Object.entries(LEAGUE_COLORS).find(([key]) =>
    league.toLowerCase().includes(key.toLowerCase()),
  );
  return match?.[1] ?? { bg: "bg-green-600", text: "text-green-600", border: "border-green-600" };
}

export function InfographicView({
  data,
  generatedImage,
}: {
  data: InfographicData;
  generatedImage?: GeneratedImage;
}) {
  const mainColor = getLeagueColor(data.mainStory.league);
  const [showDataOverlay, setShowDataOverlay] = useState(true);

  const imageDataUrl = generatedImage
    ? `data:${generatedImage.mimeType};base64,${generatedImage.imageBase64}`
    : null;

  const downloadInfographic = useCallback(() => {
    if (imageDataUrl) {
      // Download the generated image directly
      const a = document.createElement("a");
      a.href = imageDataUrl;
      a.download = `football-infographic-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Fallback: download HTML version
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${data.title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#111; color:#fff; }
    .container { max-width:600px; margin:0 auto; padding:24px; }
    .header { text-align:center; padding:32px 0 24px; border-bottom:2px solid #333; }
    .header h1 { font-size:28px; font-weight:800; letter-spacing:-0.5px; }
    .header p { font-size:14px; color:#999; margin-top:4px; }
    .main-story { padding:32px 0; border-bottom:1px solid #333; }
    .league-badge { display:inline-block; font-size:11px; font-weight:700; padding:3px 10px; border-radius:4px; margin-bottom:12px; }
    .main-headline { font-size:24px; font-weight:700; line-height:1.2; margin-bottom:16px; }
    .stat-block { display:flex; align-items:baseline; gap:8px; margin-bottom:12px; }
    .stat-number { font-size:48px; font-weight:800; line-height:1; }
    .stat-label { font-size:14px; color:#999; }
    .summary { font-size:15px; line-height:1.6; color:#ccc; }
    .supporting { display:grid; grid-template-columns:1fr 1fr; gap:16px; padding:24px 0; }
    .support-card { background:#1a1a1a; border-radius:8px; padding:16px; border-left:3px solid #666; }
    .support-headline { font-size:14px; font-weight:600; margin-bottom:8px; line-height:1.3; }
    .support-stat { font-size:24px; font-weight:800; margin-bottom:2px; }
    .support-label { font-size:11px; color:#999; margin-bottom:8px; }
    .support-summary { font-size:12px; color:#999; line-height:1.4; }
    .footer { text-align:center; padding:16px 0; border-top:1px solid #333; font-size:11px; color:#666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.title}</h1>
      <p>${data.subtitle}</p>
    </div>
    <div class="main-story">
      <span class="league-badge" style="background:${data.mainStory.accentColor || '#16a34a'};color:#fff;">${data.mainStory.league}</span>
      <h2 class="main-headline">${data.mainStory.headline}</h2>
      <div class="stat-block">
        <span class="stat-number" style="color:${data.mainStory.accentColor || '#16a34a'}">${data.mainStory.stat}</span>
        <span class="stat-label">${data.mainStory.statLabel}</span>
      </div>
      <p class="summary">${data.mainStory.summary}</p>
    </div>
    <div class="supporting">
      ${data.supportingStories.map((s) => `
      <div class="support-card">
        <span class="league-badge" style="background:#333;color:#fff;font-size:10px;padding:2px 6px;">${s.league}</span>
        <h3 class="support-headline">${s.headline}</h3>
        <div class="support-stat">${s.stat}</div>
        <div class="support-label">${s.statLabel}</div>
        <p class="support-summary">${s.summary}</p>
      </div>`).join("")}
    </div>
    <div class="footer">${data.footer} &middot; ${data.edition}</div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `football-infographic-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data, imageDataUrl]);

  return (
    <div className="space-y-4">
      {/* ── Generated Image Hero (Nano Banana) ───────────────── */}
      {imageDataUrl && (
        <div className="rounded-xl overflow-hidden relative group">
          {/* The cinematic AI-generated infographic image */}
          <img
            src={imageDataUrl}
            alt={data.title}
            className="w-full object-cover"
          />

          {/* Stat callout overlays */}
          {showDataOverlay && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent">
              {/* Title bar */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-3.5 w-3.5 text-white/60" />
                  <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">
                    AI Generated — {generatedImage.model}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-white mt-1 drop-shadow-lg">
                  {data.title}
                </h2>
                <p className="text-xs text-white/50">{data.subtitle}</p>
              </div>

              {/* Main stat callout — bottom left */}
              <div className="absolute bottom-4 left-4 right-4">
                <span
                  className="inline-block text-[10px] font-bold px-2 py-0.5 rounded text-white mb-2"
                  style={{ backgroundColor: data.mainStory.accentColor || '#16a34a' }}
                >
                  {data.mainStory.league}
                </span>
                <h3 className="text-base font-bold text-white drop-shadow-lg leading-tight mb-2">
                  {data.mainStory.headline}
                </h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <span
                    className="text-4xl font-extrabold drop-shadow-lg"
                    style={{ color: data.mainStory.accentColor || '#16a34a' }}
                  >
                    {data.mainStory.stat}
                  </span>
                  <span className="text-xs text-white/60">{data.mainStory.statLabel}</span>
                </div>

                {/* Supporting stat pills */}
                <div className="flex gap-2 mt-2">
                  {data.supportingStories.map((story, i) => (
                    <div
                      key={i}
                      className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10"
                    >
                      <p className="text-[9px] text-white/50 truncate max-w-[120px]">{story.league}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-extrabold text-white">{story.stat}</span>
                        <span className="text-[9px] text-white/40">{story.statLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Toggle overlay button */}
          <button
            onClick={() => setShowDataOverlay(!showDataOverlay)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
            title={showDataOverlay ? "Hide stats overlay" : "Show stats overlay"}
          >
            <ImageIcon className="h-4 w-4 text-white/80" />
          </button>
        </div>
      )}

      {/* ── Fallback HTML Infographic (when no generated image) ── */}
      {!imageDataUrl && (
        <div className="rounded-xl overflow-hidden bg-[#111] text-white">
          {/* Header */}
          <div className="text-center px-6 pt-8 pb-6 border-b border-white/10">
            <h2 className="text-2xl font-extrabold tracking-tight">{data.title}</h2>
            <p className="text-sm text-white/50 mt-1">{data.subtitle}</p>
          </div>

          {/* Main Story — hero treatment */}
          <div className="px-6 py-8 border-b border-white/10">
            <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded ${mainColor.bg} text-white mb-3`}>
              {data.mainStory.league}
            </span>
            <h3 className="text-xl font-bold leading-tight mb-4">
              {data.mainStory.headline}
            </h3>
            <div className="flex items-baseline gap-2 mb-3">
              <span className={`text-5xl font-extrabold ${mainColor.text}`}>
                {data.mainStory.stat}
              </span>
              <span className="text-sm text-white/50">{data.mainStory.statLabel}</span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              {data.mainStory.summary}
            </p>
          </div>

          {/* Supporting Stories — compact grid */}
          <div className="grid grid-cols-2 gap-px bg-white/10">
            {data.supportingStories.map((story, i) => {
              const color = getLeagueColor(story.league);
              return (
                <div key={i} className={`bg-[#1a1a1a] p-4 border-l-2 ${color.border}`}>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-white/70 mb-2">
                    {story.league}
                  </span>
                  <h4 className="text-sm font-semibold leading-tight mb-2">
                    {story.headline}
                  </h4>
                  <div className="mb-1">
                    <span className={`text-2xl font-extrabold ${color.text}`}>{story.stat}</span>
                  </div>
                  <p className="text-[10px] text-white/40 mb-2">{story.statLabel}</p>
                  <p className="text-xs text-white/50 leading-relaxed">{story.summary}</p>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="text-center px-6 py-3 border-t border-white/10">
            <p className="text-[11px] text-white/30">
              {data.footer} &middot; {data.edition}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadInfographic}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Download {imageDataUrl ? "Image" : "Infographic"}
        </Button>
      </div>
    </div>
  );
}
