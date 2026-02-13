/**
 * Weekly Football Highlight Video Flow — 20s social-media video pipeline.
 *
 * 8-step DAG (sequential chain):
 *
 *   deep-research (root)
 *        │
 *   write-video-script
 *        │
 *   generate-clip-1  (8s initial Veo)
 *        │
 *   generate-clip-2  (8s grounded on clip 1)
 *        │
 *   generate-clip-3  (8s grounded on clip 2)
 *        │
 *   concatenate-clips (FFmpeg)
 *        │
 *   preview-video (display)
 *
 * Pipeline:
 *   1. Deep research → find the biggest European football event (last 7 days)
 *   2. Write 20s script pre-planned for 8-6-6 second transition points
 *   3. Generate 3 × 8s Veo clips chained via last-2-second grounding
 *   4. Concatenate → single ~20s continuous video
 *
 * Models: Gemini 2.5 Flash (research + script) + Veo 3.0 (video gen)
 * Auto-starts immediately when rendered.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Search,
  PenLine,
  Film,
  RotateCcw,
  Play,
  Download,
  Clapperboard,
  Scissors,
  Eye,
} from "lucide-react";
import {
  chatJSON,
  jsonPrompt,
  useFlowExecution,
  useFlowChat,
  generateVideo,
  concatenateVideos,
} from "@/lib/bilko-flow";
import type { ConcatResult } from "@/lib/bilko-flow";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { useFlowRegistration } from "@/contexts/flow-bus-context";
import { getFlowAgent } from "@/lib/bilko-persona/flow-agents";

// ── Owner ID — must match what landing.tsx uses for claimChat ──
const OWNER_ID = "weekly-football-video";

// ── Types ────────────────────────────────────────────────────────────

type FlowState =
  | "researching"
  | "scripting"
  | "generating-clip-1"
  | "generating-clip-2"
  | "generating-clip-3"
  | "concatenating"
  | "done"
  | "error";

interface ResearchResult {
  headline: string;
  league: string;
  summary: string;
  keyFacts: Array<{ fact: string; number: string }>;
}

interface ScriptSegment {
  segmentNumber: number;
  durationSec: number;
  narration: string;
  visualDescription: string;
  transitionNote: string;
  keyStat: string;
}

interface VideoScript {
  title: string;
  segments: ScriptSegment[];
  totalDurationSec: number;
  veoStyleTokens: string;
}

interface ClipResult {
  videoBase64: string;
  mimeType: string;
  durationSeconds: number;
}

// ── Prompts ──────────────────────────────────────────────────────────

const DEEP_RESEARCH_PROMPT = bilkoSystemPrompt(
  `You are a senior European football journalist. Research the last 7 DAYS of European football and identify the single MOST IMPORTANT event across the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and Champions League.

Gather deep, interesting facts — surprising stats, record-breaking numbers, transfer fees, historical context, fan reactions. Focus on the most impactful details.

Return ONLY valid JSON:
{"research":{"headline":"...","league":"...","summary":"...","keyFacts":[{"fact":"...","number":"..."}]}}

Rules:
- headline: max 15 words, punchy
- league: the competition name
- summary: 150-200 words with context
- keyFacts: 3 to 7 facts (focus on most impactful), each with a "fact" (max 20 words) and "number" (the key stat)
- No markdown, ONLY the JSON object.`,
);

function writeVideoScriptPrompt(research: ResearchResult): string {
  return bilkoSystemPrompt(
    `You are a social media video scriptwriter specializing in short-form sports content.

INPUT: The biggest European football event:
"${research.headline}" (${research.league})
${research.summary}

Key facts:
${research.keyFacts.map((f, i) => `${i + 1}. ${f.fact} — ${f.number}`).join("\n")}

MISSION: Write a 20-SECOND video script PRE-PLANNED for these EXACT transitions:
- SEGMENT 1 (0-8s): Opening hook + establish the story. Must end with a STABLE visual scene (no hard cuts) because the last 2 seconds (6-8s) will be used as visual grounding for the next clip.
- SEGMENT 2 (8-14s): Develop the story with the most shocking stat/fact. The opening must visually CONTINUE from segment 1's ending. Must end with a stable visual scene (12-14s used as grounding).
- SEGMENT 3 (14-20s): Payoff + call to action. Opens continuing from segment 2's ending. Ends with a satisfying visual conclusion.

For each segment provide:
1. narration (spoken words, timed to the segment)
2. visualDescription (what the viewer sees — cinematic, social-media style)
3. transitionNote (how the last 2s set up the next segment's grounding)
4. keyStat (the key fact/stat featured)

Return ONLY valid JSON:
{"script":{"title":"...","segments":[{"segmentNumber":1,"durationSec":8,"narration":"...","visualDescription":"...","transitionNote":"...","keyStat":"..."},{"segmentNumber":2,"durationSec":6,"narration":"...","visualDescription":"...","transitionNote":"...","keyStat":"..."},{"segmentNumber":3,"durationSec":6,"narration":"...","visualDescription":"...","transitionNote":"...","keyStat":"..."}],"totalDurationSec":20,"veoStyleTokens":"..."}}

Rules: title max 10 words. narration max 25 words per segment. visualDescription max 40 words. transitionNote max 20 words. veoStyleTokens: shared visual style tokens for all Veo prompts (lighting, palette, mood — max 30 words). No markdown.`,
  );
}

// ── Status messages ──────────────────────────────────────────────────

const STATUS_MESSAGES: Record<string, string[]> = {
  researching: [
    "Scanning European football headlines from the last 7 days...",
    "Checking Premier League, La Liga, Serie A, Bundesliga, Ligue 1...",
    "Finding the single biggest event with interesting stats...",
  ],
  scripting: [
    "Writing the 20-second video script...",
    "Planning 8-6-6 second transition points...",
    "Crafting social-media-worthy narration...",
  ],
  "generating-clip-1": [
    "Generating opening 8-second clip with Veo...",
    "Creating the hook — first impressions matter...",
    "Rendering cinematic football visuals...",
  ],
  "generating-clip-2": [
    "Generating clip 2, grounded on clip 1...",
    "Veo is using the last 2 seconds for visual continuity...",
    "Building the story with the shocking stat...",
  ],
  "generating-clip-3": [
    "Generating final clip, grounded on clip 2...",
    "Creating the payoff sequence...",
    "Wrapping up with a satisfying conclusion...",
  ],
  concatenating: [
    "Concatenating 3 clips with FFmpeg...",
    "Building the final ~20-second continuous video...",
    "Container-level copy, no re-encoding...",
  ],
};

// ── Component ────────────────────────────────────────────────────────

export function WeeklyFootballVideoFlow({ onComplete }: { onComplete?: (summary?: string) => void }) {
  // ── Flow state ──
  const [flowState, setFlowState] = useState<FlowState>("researching");
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [clip1, setClip1] = useState<ClipResult | null>(null);
  const [clip2, setClip2] = useState<ClipResult | null>(null);
  const [clip3, setClip3] = useState<ClipResult | null>(null);
  const [finalVideo, setFinalVideo] = useState<ConcatResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(STATUS_MESSAGES.researching[0]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const hasStarted = useRef(false);
  const stateStartRef = useRef<number>(Date.now());

  const { trackStep } = useFlowExecution("weekly-football-video");
  const { setStatus: setBusStatus, send: busSend } = useFlowRegistration("weekly-football-video", "Weekly Football Highlight");
  const { pushMessage } = useFlowChat();

  const agent = getFlowAgent("weekly-football-video");

  // ── Push agent message to chat ──────────────────────────
  const pushAgentMessage = useCallback(
    (text: string) => {
      pushMessage(OWNER_ID, {
        speaker: "agent",
        text,
        agentName: agent?.chatName ?? "HighlightProducer",
        agentDisplayName: agent?.name ?? "Highlight Producer",
        agentAccent: agent?.accentColor ?? "text-rose-500",
      });
    },
    [pushMessage, agent],
  );

  // ── Push greeting on mount ─────────────────────────────
  const didGreet = useRef(false);
  useEffect(() => {
    if (didGreet.current) return;
    didGreet.current = true;
    if (agent) {
      pushAgentMessage(agent.greeting);
    }
  }, [agent, pushAgentMessage]);

  // Sync flowState to flow bus
  useEffect(() => {
    setBusStatus(
      flowState === "done" ? "complete" : flowState === "error" ? "error" : "running",
      flowState,
    );
  }, [flowState, setBusStatus]);

  // Rotate status messages during loading states
  useEffect(() => {
    const messages = STATUS_MESSAGES[flowState];
    if (!messages) return;

    let index = 0;
    setStatusMessage(messages[0]);
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setStatusMessage(messages[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, [flowState]);

  // Track elapsed time per state
  useEffect(() => {
    if (flowState === "done" || flowState === "error") {
      setElapsedSeconds(0);
      return;
    }
    stateStartRef.current = Date.now();
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - stateStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [flowState]);

  // ── Run the flow ────────────────────────────────────────────────────

  const runFlow = useCallback(async () => {
    setFlowState("researching");
    setError(null);

    try {
      // ═══ Step 1: deep-research (LLM) ═══
      const { data: researchResult } = await trackStep(
        "deep-research",
        { request: "Deep research the biggest European football event of the last 7 days" },
        () =>
          chatJSON<{ research: ResearchResult }>(
            jsonPrompt(
              DEEP_RESEARCH_PROMPT,
              "What is the biggest European football event in the last 7 days? Deep-research it with interesting facts and stats for a social media video.",
            ),
          ),
      );

      const researchData = researchResult.data.research;
      setResearch(researchData);
      pushAgentMessage(
        `Found the story: "${researchData.headline}" (${researchData.league}). Writing the script now.`,
      );

      // ═══ Step 2: write-video-script (LLM) ═══
      setFlowState("scripting");

      const { data: scriptResult } = await trackStep(
        "write-video-script",
        { research: researchData },
        () =>
          chatJSON<{ script: VideoScript }>(
            jsonPrompt(
              writeVideoScriptPrompt(researchData),
              "Write the 20-second video script with 8-6-6 transition planning based on the research.",
            ),
          ),
      );

      const scriptData = scriptResult.data.script;
      setScript(scriptData);
      pushAgentMessage(
        `Script ready: "${scriptData.title}" — ${scriptData.totalDurationSec}s across ${scriptData.segments.length} segments. Generating video clips with Veo.`,
      );

      // ═══ Step 3: generate-clip-1 (8s initial Veo) ═══
      setFlowState("generating-clip-1");

      const seg1 = scriptData.segments[0];
      const clip1Prompt = `${seg1.visualDescription}. Style: ${scriptData.veoStyleTokens}. End with stable, continuing motion for grounding.`;

      const { data: clip1Result } = await trackStep(
        "generate-clip-1",
        { visualDescription: seg1.visualDescription, styleTokens: scriptData.veoStyleTokens },
        () => generateVideo(clip1Prompt, { durationSeconds: 8, aspectRatio: "16:9" }),
      );

      const clip1Video = clip1Result.videos?.[0];
      const clip1Data: ClipResult = {
        videoBase64: clip1Video?.videoBase64 ?? "",
        mimeType: clip1Video?.mimeType ?? "video/mp4",
        durationSeconds: 8,
      };
      setClip1(clip1Data);
      pushAgentMessage("Clip 1 generated (8s opening hook). Now grounding clip 2 on the last 2 seconds.");

      // ═══ Step 4: generate-clip-2 (8s, grounded on clip 1) ═══
      setFlowState("generating-clip-2");

      const seg2 = scriptData.segments[1];
      const clip2Prompt = `Continue from previous scene. ${seg2.visualDescription}. Style: ${scriptData.veoStyleTokens}. End with stable motion for grounding.`;

      const { data: clip2Result } = await trackStep(
        "generate-clip-2",
        { visualDescription: seg2.visualDescription, styleTokens: scriptData.veoStyleTokens },
        () =>
          generateVideo(clip2Prompt, {
            durationSeconds: 8,
            aspectRatio: "16:9",
            sourceVideoBase64: clip1Data.videoBase64,
          }),
      );

      const clip2Video = clip2Result.videos?.[0];
      const clip2Data: ClipResult = {
        videoBase64: clip2Video?.videoBase64 ?? "",
        mimeType: clip2Video?.mimeType ?? "video/mp4",
        durationSeconds: 8,
      };
      setClip2(clip2Data);
      pushAgentMessage("Clip 2 ready (grounded continuation). Generating the final payoff clip.");

      // ═══ Step 5: generate-clip-3 (8s, grounded on clip 2) ═══
      setFlowState("generating-clip-3");

      const seg3 = scriptData.segments[2];
      const clip3Prompt = `Continue from previous scene. ${seg3.visualDescription}. Style: ${scriptData.veoStyleTokens}. Conclude with a satisfying visual ending.`;

      const { data: clip3Result } = await trackStep(
        "generate-clip-3",
        { visualDescription: seg3.visualDescription, styleTokens: scriptData.veoStyleTokens },
        () =>
          generateVideo(clip3Prompt, {
            durationSeconds: 8,
            aspectRatio: "16:9",
            sourceVideoBase64: clip2Data.videoBase64,
          }),
      );

      const clip3Video = clip3Result.videos?.[0];
      const clip3Data: ClipResult = {
        videoBase64: clip3Video?.videoBase64 ?? "",
        mimeType: clip3Video?.mimeType ?? "video/mp4",
        durationSeconds: 8,
      };
      setClip3(clip3Data);
      pushAgentMessage("All 3 clips generated. Concatenating into one continuous video.");

      // ═══ Step 6: concatenate-clips (FFmpeg) ═══
      setFlowState("concatenating");

      const { data: concatResult } = await trackStep(
        "concatenate-clips",
        { clipCount: 3 },
        () =>
          concatenateVideos([
            { videoBase64: clip1Data.videoBase64, mimeType: clip1Data.mimeType },
            { videoBase64: clip2Data.videoBase64, mimeType: clip2Data.mimeType },
            { videoBase64: clip3Data.videoBase64, mimeType: clip3Data.mimeType },
          ]),
      );

      setFinalVideo(concatResult as ConcatResult);

      const exitSummary = `Produced "${scriptData.title}" — a ${(concatResult as ConcatResult).durationSeconds ?? 20}s highlight video about "${researchData.headline}" (${researchData.league}). 3 Veo clips chained via last-2s grounding + FFmpeg concat.`;
      pushAgentMessage(
        `Video ready! "${scriptData.title}" — ${(concatResult as ConcatResult).durationSeconds ?? 20} seconds of continuous highlight footage. Check the preview.`,
      );
      busSend("main", "summary", { summary: exitSummary });

      setFlowState("done");
    } catch (err) {
      console.error("Weekly football video flow error:", err);
      setError(err instanceof Error ? err.message : "Failed to run video pipeline.");
      setFlowState("error");
    }
  }, [trackStep, pushAgentMessage, busSend]);

  // Auto-start on mount
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      runFlow();
    }
  }, [runFlow]);

  // ── Download video ─────────────────────────────────────────────────

  const downloadVideo = useCallback(() => {
    if (!finalVideo) return;
    const byteString = atob(finalVideo.videoBase64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: finalVideo.mimeType || "video/mp4" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `football-highlight-${new Date().toISOString().slice(0, 10)}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [finalVideo]);

  // ── Reset ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    hasStarted.current = false;
    didGreet.current = false;
    setResearch(null);
    setScript(null);
    setClip1(null);
    setClip2(null);
    setClip3(null);
    setFinalVideo(null);
    setError(null);
    setTimeout(() => {
      hasStarted.current = true;
      didGreet.current = true;
      runFlow();
    }, 0);
  }, [runFlow]);

  // ── Loading screen helpers ─────────────────────────────────────────

  const loadingIcons: Record<string, typeof Search> = {
    researching: Search,
    scripting: PenLine,
    "generating-clip-1": Film,
    "generating-clip-2": Film,
    "generating-clip-3": Film,
    concatenating: Scissors,
  };

  const loadingTitles: Record<string, string> = {
    researching: "Deep Research — Top Event",
    scripting: "Writing 20s Video Script",
    "generating-clip-1": "Generating Clip 1 (8s opening)",
    "generating-clip-2": "Generating Clip 2 (grounded)",
    "generating-clip-3": "Generating Clip 3 (finale)",
    concatenating: "Concatenating Clips (FFmpeg)",
  };

  const progressWidths: Record<string, string> = {
    researching: "10%",
    scripting: "20%",
    "generating-clip-1": "35%",
    "generating-clip-2": "55%",
    "generating-clip-3": "75%",
    concatenating: "90%",
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── LOADING states ────────────────────────────────────── */}
      {flowState !== "done" && flowState !== "error" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-6">
            {(() => {
              const Icon = loadingIcons[flowState] ?? Clapperboard;
              return <Icon className="h-8 w-8 text-rose-500 animate-pulse" />;
            })()}
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            {loadingTitles[flowState] ?? "Processing..."}
          </h2>
          {research && flowState === "scripting" && (
            <p className="text-sm text-muted-foreground text-center max-w-md mb-2">
              {research.headline} ({research.league})
            </p>
          )}
          {script && flowState.startsWith("generating-clip") && (
            <p className="text-sm text-muted-foreground text-center max-w-md mb-2">
              {script.title}
            </p>
          )}
          <p className="text-muted-foreground text-center max-w-md mb-4">
            {statusMessage}
          </p>
          {elapsedSeconds > 5 && (
            <p className="text-xs text-muted-foreground/60 mb-4 tabular-nums">
              {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")} elapsed
            </p>
          )}
          <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: progressWidths[flowState] ?? "50%" }}
            />
          </div>
          {/* Clip progress indicators */}
          {(flowState === "generating-clip-2" || flowState === "generating-clip-3" || flowState === "concatenating") && (
            <div className="flex gap-2 mt-4">
              <div className={`w-2 h-2 rounded-full ${clip1 ? "bg-rose-500" : "bg-muted"}`} title="Clip 1" />
              <div className={`w-2 h-2 rounded-full ${clip2 ? "bg-rose-500" : "bg-muted"}`} title="Clip 2" />
              <div className={`w-2 h-2 rounded-full ${clip3 ? "bg-rose-500" : "bg-muted"}`} title="Clip 3" />
            </div>
          )}
        </div>
      )}

      {/* ── DONE: Preview display ─────────────────────────────── */}
      {flowState === "done" && script && research && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Actions */}
          <div className="flex justify-center gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              New Video
            </Button>
            {finalVideo && (
              <Button variant="outline" size="sm" onClick={downloadVideo}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download Video
              </Button>
            )}
            {onComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const exitSummary = `Produced "${script.title}" — a ${finalVideo?.durationSeconds ?? 20}s highlight video about "${research.headline}" (${research.league}). 3 Veo clips via grounding + FFmpeg.`;
                  onComplete(exitSummary);
                }}
              >
                Done
              </Button>
            )}
          </div>

          {/* Video preview card */}
          <div className="rounded-xl border-2 border-border overflow-hidden">
            {/* Header */}
            <div className="bg-rose-500/5 border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Clapperboard className="h-5 w-5 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">{script.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {research.league} — {finalVideo?.durationSeconds ?? script.totalDurationSec}s highlight
                  </p>
                </div>
              </div>
            </div>

            {/* Video player */}
            {finalVideo && (
              <div className="bg-black aspect-video flex items-center justify-center">
                <video
                  controls
                  autoPlay
                  className="w-full h-full"
                  src={`data:${finalVideo.mimeType || "video/mp4"};base64,${finalVideo.videoBase64}`}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            )}

            {/* Script overlay & research context */}
            <div className="p-4 space-y-4">
              {/* Segments timeline */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Script Segments
                </h3>
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

              {/* Key facts */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  Key Facts
                </h3>
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

              {/* Individual clips */}
              {(clip1 || clip2 || clip3) && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Film className="h-3.5 w-3.5" />
                    Individual Clips
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { clip: clip1, label: "Clip 1 — Opening Hook", seg: script.segments[0] },
                      { clip: clip2, label: "Clip 2 — Story", seg: script.segments[1] },
                      { clip: clip3, label: "Clip 3 — Payoff", seg: script.segments[2] },
                    ].map(({ clip, label, seg }) =>
                      clip ? (
                        <div key={label} className="rounded-lg border border-border overflow-hidden">
                          <video
                            controls
                            className="w-full aspect-video bg-black"
                            src={`data:${clip.mimeType || "video/mp4"};base64,${clip.videoBase64}`}
                          />
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">{label}</p>
                            {seg && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{seg.narration}</p>
                            )}
                          </div>
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
              )}

              {/* Research summary (collapsible) */}
              <details className="group">
                <summary className="text-sm font-semibold cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  Full Research Summary
                </summary>
                <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  <p className="font-medium text-foreground mb-1">{research.headline}</p>
                  <p>{research.summary}</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* ── Error state ─────────────────────────────────────── */}
      {flowState === "error" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <p className="text-red-500 mb-2 font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">{error}</p>
          <Button onClick={reset} variant="outline" size="sm">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      )}

    </div>
  );
}
