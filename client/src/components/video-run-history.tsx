/**
 * Video Run History — Browse past AI-Video flow runs.
 *
 * Shows a list of completed (and failed) runs with:
 *   - Title, headline, league, date, duration
 *   - Video player for the combined video (served from disk)
 *   - Individual clip players
 *   - Script and research details
 *   - Download button
 *
 * Available standalone (without running the flow).
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Clapperboard,
  Film,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  Loader2,
  Eye,
  Play,
  History,
  RefreshCw,
} from "lucide-react";
import { listVideoRuns, getVideoRun } from "@/lib/bilko-flow";
import type { VideoRunSummary, VideoRunDetail } from "@/lib/bilko-flow";

// ── Run Card (expanded detail) ───────────────────────────────────────

function RunDetail({ runId }: { runId: string }) {
  const [detail, setDetail] = useState<VideoRunDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getVideoRun(runId)
      .then(setDetail)
      .catch((err) => console.error("Failed to load run detail:", err))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-sm text-muted-foreground py-4">Failed to load run details.</p>;
  }

  const research = detail.research as {
    headline?: string;
    league?: string;
    summary?: string;
    keyFacts?: Array<{ fact: string; number: string }>;
  } | null;

  const script = detail.script as {
    title?: string;
    segments?: Array<{
      segmentNumber: number;
      durationSec: number;
      narration: string;
      visualDescription: string;
      keyStat: string;
    }>;
    totalDurationSec?: number;
  } | null;

  return (
    <div className="space-y-4 pt-2">
      {/* Combined video player */}
      {detail.finalVideoUrl && (
        <div className="rounded-lg border border-border overflow-hidden bg-black">
          <video
            controls
            className="w-full aspect-video"
            src={detail.finalVideoUrl}
          >
            Your browser does not support video playback.
          </video>
        </div>
      )}

      {/* Download */}
      {detail.finalVideoUrl && (
        <div className="flex justify-end">
          <a href={detail.finalVideoUrl} download={`highlight-${detail.runId}.mp4`}>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download Video
            </Button>
          </a>
        </div>
      )}

      {/* Individual clips */}
      {detail.clips.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5" />
            Individual Clips
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {detail.clips.map((clip) => (
              <div key={clip.index} className="rounded-lg border border-border overflow-hidden">
                <video
                  controls
                  className="w-full aspect-video bg-black"
                  src={clip.url}
                />
                <div className="p-2">
                  <p className="text-xs font-medium">
                    Clip {clip.index + 1}
                    {script?.segments?.[clip.index] && (
                      <span className="text-muted-foreground ml-1">
                        — {clip.index === 0 ? "Opening" : clip.index === 1 ? "Story" : "Payoff"}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{clip.sizeMB}MB</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Script segments */}
      {script?.segments && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Script Segments
          </h4>
          <div className="space-y-2">
            {script.segments.map((seg) => (
              <div key={seg.segmentNumber} className="flex gap-3 text-sm">
                <div className="shrink-0 w-14 text-right">
                  <span className="text-xs font-mono text-muted-foreground">
                    {seg.segmentNumber === 1 ? "0-8s" : seg.segmentNumber === 2 ? "8-14s" : "14-20s"}
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-foreground">{seg.narration}</p>
                  <p className="text-xs text-muted-foreground italic">{seg.visualDescription}</p>
                  <span className="inline-block text-xs bg-rose-500/10 text-rose-600 rounded px-1.5 py-0.5">
                    {seg.keyStat}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key facts */}
      {research?.keyFacts && research.keyFacts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" />
            Key Facts
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {research.keyFacts.map((fact, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
                <span className="shrink-0 text-xs font-bold text-rose-500 bg-rose-500/10 rounded px-1.5 py-0.5">
                  {fact.number}
                </span>
                <p className="text-xs text-muted-foreground">{fact.fact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Research summary */}
      {research?.summary && (
        <details className="group">
          <summary className="text-sm font-semibold cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
            Full Research Summary
          </summary>
          <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-1">{research.headline}</p>
            <p>{research.summary}</p>
          </div>
        </details>
      )}

      {/* Error info */}
      {detail.error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-500">{detail.error}</p>
        </div>
      )}
    </div>
  );
}

// ── Run List Item ────────────────────────────────────────────────────

function RunItem({ run }: { run: VideoRunSummary }) {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(run.createdAt);
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isCompleted = run.status === "completed";
  const isFailed = run.status === "failed";

  return (
    <div className="rounded-xl border-2 border-border overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isCompleted
                  ? "bg-rose-500/10"
                  : isFailed
                    ? "bg-red-500/10"
                    : "bg-muted"
              }`}
            >
              {isFailed ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                <Clapperboard
                  className={`h-4 w-4 ${isCompleted ? "text-rose-500" : "text-muted-foreground"}`}
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {run.title ?? run.headline ?? "Untitled run"}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {dateStr} {timeStr}
                </span>
                {run.league && <span>· {run.league}</span>}
                {run.finalDurationSeconds && <span>· {run.finalDurationSeconds}s</span>}
                {run.clipCount > 0 && <span>· {run.clipCount} clips</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isFailed && (
              <span className="text-xs text-red-500 font-medium">Failed</span>
            )}
            {run.status === "running" && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4">
          <RunDetail runId={run.runId} />
        </div>
      )}
    </div>
  );
}

// ── Main History Component ───────────────────────────────────────────

export function VideoRunHistory({ flowId }: { flowId?: string }) {
  const [runs, setRuns] = useState<VideoRunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRuns = useCallback(() => {
    setLoading(true);
    listVideoRuns(flowId)
      .then(setRuns)
      .catch((err) => console.error("Failed to load video runs:", err))
      .finally(() => setLoading(false));
  }, [flowId]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No video runs yet.</p>
        <p className="text-xs mt-1">Runs will appear here after generating a video.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <History className="h-4 w-4" />
          Past Runs
          <span className="text-xs text-muted-foreground font-normal">({runs.length})</span>
        </h3>
        <Button variant="ghost" size="sm" onClick={loadRuns} className="h-7 px-2">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      <div className="space-y-2">
        {runs.map((run) => (
          <RunItem key={run.runId} run={run} />
        ))}
      </div>
    </div>
  );
}
