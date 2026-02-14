/**
 * Weekly Football Highlight Video Flow — model-aware video pipeline.
 *
 * Pre-screen: user selects model (Free / Veo3) or plays a saved video.
 *
 * 7-step DAG (sequential chain):
 *
 *   [model-selection / play-saved]
 *        │
 *   deep-research (root)
 *        │
 *   write-video-script
 *        │
 *   generate-clip-1  (initial clip, no chaining)
 *        │
 *   generate-clip-2  (chained on clip 1)
 *        │
 *   generate-clip-3  (chained on clip 2)
 *        │
 *   concatenate-clips (FFmpeg)
 *        │
 *   preview-video (display)
 *
 * Pipeline:
 *   0. User selects model (Free / Veo3) or browses saved videos
 *   1. Deep research → find the biggest European football event (last 7 days)
 *   2. Write script pre-planned for equal segment transition points
 *   3. Generate 3 clips chained for visual continuity
 *   4. Concatenate → single continuous video
 *
 * Model-aware clip chaining:
 *   - minimax/video-01 (Hailuo): 6s clips, last-frame extraction → first_frame_image
 *   - Veo (Gemini): 8s clips, source-video grounding (last 2s used as context)
 *
 * Persistence:
 *   - Veo3: saves all individual clips
 *   - Free: saves the combined final video
 *
 * UI: Newsletter-inspired step tracker shows each pipeline stage
 * with live status so the user always knows where the process is.
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
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  AlertTriangle,
  History,
  ArrowLeft,
} from "lucide-react";
import {
  chatJSON,
  jsonPrompt,
  useFlowExecution,
  useFlowChat,
  generateClip,
  concatenateVideos,
  extractLastFrame,
  createVideoRun,
  updateVideoRun,
  saveVideoClip,
  saveVideoFinal,
} from "@/lib/bilko-flow";
import type { ConcatResult } from "@/lib/bilko-flow";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { VideoRunHistory } from "@/components/video-run-history";
import { useFlowRegistration } from "@/contexts/flow-bus-context";
import { getFlowAgent } from "@/lib/bilko-persona/flow-agents";

// ── Owner ID — must match what landing.tsx uses for claimChat ──
const OWNER_ID = "weekly-football-video";

// ── Model options ─────────────────────────────────────────────────────
type VideoModelChoice = "free" | "veo3";

const MODEL_OPTIONS: { id: VideoModelChoice; label: string; modelId: string; description: string }[] = [
  { id: "free", label: "Free", modelId: "minimax/video-01", description: "Hailuo (Replicate) — 6s clips, free tier" },
  { id: "veo3", label: "Veo3", modelId: "", description: "Google Veo 3.1 — higher quality, 8s clips" },
];

// ── Types ────────────────────────────────────────────────────────────

type FlowState =
  | "model-selection"
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

// ── Pipeline step definitions ────────────────────────────────────────

interface PipelineStep {
  id: FlowState;
  label: string;
  shortLabel: string;
  icon: typeof Search;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { id: "researching", label: "Deep Research — Top Event", shortLabel: "Research", icon: Search },
  { id: "scripting", label: "Writing Video Script", shortLabel: "Script", icon: PenLine },
  { id: "generating-clip-1", label: "Generating Clip 1 (opening)", shortLabel: "Clip 1", icon: Film },
  { id: "generating-clip-2", label: "Generating Clip 2 (chained)", shortLabel: "Clip 2", icon: Film },
  { id: "generating-clip-3", label: "Generating Clip 3 (finale)", shortLabel: "Clip 3", icon: Film },
  { id: "concatenating", label: "Concatenating Clips (FFmpeg)", shortLabel: "Concat", icon: Scissors },
  { id: "done", label: "Preview", shortLabel: "Preview", icon: Eye },
];

const STEP_ORDER = PIPELINE_STEPS.map((s) => s.id);

function getStepIndex(state: FlowState): number {
  const idx = STEP_ORDER.indexOf(state);
  return idx >= 0 ? idx : -1;
}

type StepStatus = "pending" | "active" | "complete" | "error";

function deriveStepStatus(
  stepId: FlowState,
  currentState: FlowState,
  failedStep: FlowState | null,
): StepStatus {
  if (failedStep && stepId === failedStep) return "error";
  const stepIdx = getStepIndex(stepId);
  const currentIdx = getStepIndex(currentState === "error" ? (failedStep ?? "researching") : currentState);
  if (stepIdx < currentIdx) return "complete";
  if (stepIdx === currentIdx && currentState !== "error") return "active";
  return "pending";
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

function writeVideoScriptPrompt(research: ResearchResult, segDuration = 6, totalDuration = 18): string {
  const seg2Start = segDuration;
  const seg3Start = segDuration * 2;

  return bilkoSystemPrompt(
    `You are a social media video scriptwriter specializing in short-form sports content.

INPUT: The biggest European football event:
"${research.headline}" (${research.league})
${research.summary}

Key facts:
${research.keyFacts.map((f, i) => `${i + 1}. ${f.fact} — ${f.number}`).join("\n")}

MISSION: Write a ${totalDuration}-SECOND video script split into 3 EQUAL segments of ${segDuration} seconds each:
- SEGMENT 1 (0-${segDuration}s): Opening hook + establish the story. Must end with a STABLE visual scene (the last frame will be extracted to seed the next clip for visual continuity).
- SEGMENT 2 (${seg2Start}-${seg3Start}s): Develop the story with the most shocking stat/fact. The opening must visually CONTINUE from segment 1's ending. Must end with a stable visual scene.
- SEGMENT 3 (${seg3Start}-${totalDuration}s): Payoff + call to action. Opens continuing from segment 2's ending. Ends with a satisfying visual conclusion.

For each segment provide:
1. narration (spoken words, timed to the segment)
2. visualDescription (what the viewer sees — cinematic, social-media style)
3. transitionNote (how the ending frame sets up the next segment's continuity)
4. keyStat (the key fact/stat featured)

Return ONLY valid JSON:
{"script":{"title":"...","segments":[{"segmentNumber":1,"durationSec":${segDuration},"narration":"...","visualDescription":"...","transitionNote":"...","keyStat":"..."},{"segmentNumber":2,"durationSec":${segDuration},"narration":"...","visualDescription":"...","transitionNote":"...","keyStat":"..."},{"segmentNumber":3,"durationSec":${segDuration},"narration":"...","visualDescription":"...","transitionNote":"...","keyStat":"..."}],"totalDurationSec":${totalDuration},"veoStyleTokens":"..."}}

Rules: title max 10 words. narration max 25 words per segment. visualDescription max 40 words. transitionNote max 20 words. veoStyleTokens: shared visual style tokens for all video prompts (lighting, palette, mood — max 30 words). No markdown.

PRIVACY COMPLIANCE (MANDATORY — AI video model content policy):
Each visualDescription and the shared veoStyleTokens go DIRECTLY to an AI video model for generation. You MUST follow these rules strictly:
1. NO REAL PEOPLE: Never name or describe any real, recognizable person (players, managers, referees, pundits). Use generic descriptions like "a midfielder", "the goalkeeper", "a celebrating crowd" instead. NEVER use real names.
2. NO IDENTIFIABLE FACES: Do not request close-ups of faces that could resemble real people. Prefer wide shots, silhouettes, overhead stadium angles, or abstract representations of the action.
3. NO LOGOS OR TRADEMARKS: Do not reference specific team crests, kit designs, jersey numbers tied to real players, sponsor logos, or trademarked visual elements. Use generic "football kit", "stadium", "pitch" descriptions.
4. ABSTRACT OVER LITERAL: Prefer symbolic, cinematic, and artistic representations over photorealistic depictions of real match moments. E.g. "a football arcing into the top corner under golden floodlights" NOT "[Real Player] scoring the winner".
5. NO VIOLENCE: Do not describe tackles causing injury, physical confrontation, or aggressive contact.
6. SAFE LANGUAGE: Ensure visual descriptions would pass content safety filters — no sexual, derogatory, toxic, or hateful content.
If the story involves specific players or teams, translate their actions into generic, symbolic football visuals that capture the ENERGY and EMOTION without identifying anyone.`,
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
    "Writing the video script...",
    "Planning segment transitions for continuity...",
    "Crafting social-media-worthy narration...",
  ],
  "generating-clip-1": [
    "Generating opening clip...",
    "Creating the hook — first impressions matter...",
    "Rendering cinematic football visuals...",
  ],
  "generating-clip-2": [
    "Generating clip 2, chained from clip 1...",
    "Using the last frame for visual continuity...",
    "Building the story with the shocking stat...",
  ],
  "generating-clip-3": [
    "Generating final clip, chained from clip 2...",
    "Creating the payoff sequence...",
    "Wrapping up with a satisfying conclusion...",
  ],
  concatenating: [
    "Concatenating 3 clips with FFmpeg...",
    "Building the final continuous video...",
    "Container-level copy, no re-encoding...",
  ],
};

// ── Step Tracker Component ───────────────────────────────────────────

function StepStatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case "active":
      return <Loader2 className="h-4 w-4 text-rose-500 animate-spin shrink-0" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
  }
}

function PipelineTracker({
  currentState,
  failedStep,
  research,
  script,
  clip1,
  clip2,
  clip3,
  statusMessage,
  elapsedSeconds,
  error,
}: {
  currentState: FlowState;
  failedStep: FlowState | null;
  research: ResearchResult | null;
  script: VideoScript | null;
  clip1: ClipResult | null;
  clip2: ClipResult | null;
  clip3: ClipResult | null;
  statusMessage: string;
  elapsedSeconds: number;
  error: string | null;
}) {
  const completedCount = PIPELINE_STEPS.filter(
    (s) => deriveStepStatus(s.id, currentState, failedStep) === "complete",
  ).length;
  const progressPercent =
    currentState === "done"
      ? 100
      : Math.round((completedCount / PIPELINE_STEPS.length) * 100);

  const clips: Record<string, ClipResult | null> = {
    "generating-clip-1": clip1,
    "generating-clip-2": clip2,
    "generating-clip-3": clip3,
  };

  return (
    <div className="rounded-xl border-2 border-border overflow-hidden">
      {/* Header */}
      <div className="bg-rose-500/5 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-rose-500" />
            <span className="text-sm font-medium">Video Pipeline</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedCount}/{PIPELINE_STEPS.length}
            </span>
          </div>
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step list */}
      <div className="p-3 space-y-0.5">
        {PIPELINE_STEPS.map((step, i) => {
          const status = deriveStepStatus(step.id, currentState, failedStep);
          const isActive = status === "active";
          const isError = status === "error";
          const isComplete = status === "complete";
          const Icon = step.icon;
          const clipData = clips[step.id];

          // Inline detail for completed data steps
          let detail: string | null = null;
          if (isComplete && step.id === "researching" && research) {
            detail = `"${research.headline}" (${research.league})`;
          } else if (isComplete && step.id === "scripting" && script) {
            detail = `"${script.title}" — ${script.segments.length} segments`;
          } else if (isComplete && clipData) {
            detail = `${clipData.durationSeconds}s clip ready`;
          }

          return (
            <div key={step.id}>
              <div
                className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                  isActive
                    ? "bg-rose-500/5"
                    : isError
                      ? "bg-red-500/5"
                      : ""
                }`}
              >
                {/* Status icon */}
                <div className="mt-0.5">
                  <StepStatusIcon status={status} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isActive
                          ? "text-rose-500"
                          : isError
                            ? "text-red-500"
                            : isComplete
                              ? "text-green-500/70"
                              : "text-muted-foreground/40"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        isActive
                          ? "text-foreground font-medium"
                          : isError
                            ? "text-red-500 font-medium"
                            : isComplete
                              ? "text-muted-foreground"
                              : "text-muted-foreground/50"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Completed detail */}
                  {detail && isComplete && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 truncate pl-5.5">
                      {detail}
                    </p>
                  )}

                  {/* Active: rotating status message + elapsed */}
                  {isActive && (
                    <div className="mt-1 pl-5.5">
                      <p className="text-xs text-muted-foreground animate-in fade-in duration-300">
                        {statusMessage}
                      </p>
                      {elapsedSeconds > 5 && (
                        <p className="text-xs text-muted-foreground/50 tabular-nums mt-0.5">
                          {Math.floor(elapsedSeconds / 60)}:
                          {String(elapsedSeconds % 60).padStart(2, "0")} elapsed
                        </p>
                      )}
                    </div>
                  )}

                  {/* Error detail */}
                  {isError && error && (
                    <div className="mt-1 pl-5.5">
                      <p className="text-xs text-red-500/80">{error}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Completed clip inline preview */}
              {isComplete && clipData && clipData.videoBase64 && (
                <div className="ml-9 mr-2 mb-1 mt-0.5">
                  <video
                    controls
                    className="w-full max-w-[240px] aspect-video bg-black rounded-md border border-border"
                    src={`data:${clipData.mimeType || "video/mp4"};base64,${clipData.videoBase64}`}
                  />
                </div>
              )}

              {/* Connecting line between steps */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="ml-[18px] h-1.5">
                  <div
                    className={`w-px h-full mx-auto ${
                      isComplete ? "bg-green-500/30" : "bg-border/40"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────

/** Check if a model uses last-frame chaining (minimax) vs source-video grounding (Veo) */
function usesFrameChaining(model?: string): boolean {
  return !!model && model.startsWith("minimax/");
}

export function WeeklyFootballVideoFlow({ onComplete }: { onComplete?: (summary?: string) => void }) {
  // ── Model selection state ──
  const [selectedModel, setSelectedModel] = useState<VideoModelChoice | null>(null);
  const [showSavedVideos, setShowSavedVideos] = useState(false);

  // Derived model config
  const modelConfig = selectedModel ? MODEL_OPTIONS.find((m) => m.id === selectedModel) : null;
  const model = modelConfig?.modelId || undefined; // empty string → undefined for Veo default
  const isFrameChaining = usesFrameChaining(model);
  const clipDuration = isFrameChaining ? 6 : 8; // minimax: 6s fixed, Veo: 8s

  // ── Flow state ──
  const [flowState, setFlowState] = useState<FlowState>("model-selection");
  const [failedAtStep, setFailedAtStep] = useState<FlowState | null>(null);
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
    if (flowState === "model-selection") return;
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
    if (flowState === "done" || flowState === "error" || flowState === "model-selection") {
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
    setFailedAtStep(null);
    setError(null);

    // Generate a unique run ID for persistence
    const runId = `vr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Fire-and-forget persistence helper (never blocks the pipeline)
    const persist = (fn: () => Promise<unknown>) => {
      fn().catch((err) => console.warn("[video-run] persist failed:", err));
    };

    // Create the run record
    persist(() => createVideoRun("weekly-football-video", runId));

    // Snapshot model values for this run
    const activeModel = model;
    const activeIsFrameChaining = isFrameChaining;
    const activeIsVeo3 = selectedModel === "veo3";

    let currentStep: FlowState = "researching";

    try {
      // ═══ Step 1: deep-research (LLM) ═══
      currentStep = "researching";
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
      persist(() => updateVideoRun(runId, { research: researchData }));
      pushAgentMessage(
        `Found the story: "${researchData.headline}" (${researchData.league}). Writing the script now.`,
      );

      // ═══ Step 2: write-video-script (LLM) ═══
      currentStep = "scripting";
      setFlowState("scripting");

      const { data: scriptResult } = await trackStep(
        "write-video-script",
        { research: researchData },
        () => {
          const totalDur = clipDuration * 3;
          return chatJSON<{ script: VideoScript }>(
            jsonPrompt(
              writeVideoScriptPrompt(researchData, clipDuration, totalDur),
              `Write the ${totalDur}-second video script with 3 equal ${clipDuration}s segments based on the research.`,
            ),
          );
        },
      );

      const scriptData = scriptResult.data.script;
      setScript(scriptData);
      persist(() => updateVideoRun(runId, { script: scriptData }));
      const modelLabel = activeIsFrameChaining ? "Hailuo" : "Veo";
      pushAgentMessage(
        `Script ready: "${scriptData.title}" — ${scriptData.totalDurationSec}s across ${scriptData.segments.length} segments. Generating video clips with ${modelLabel}.`,
      );

      // ═══ Step 3: generate-clip-1 (text-to-video, no grounding) ═══
      currentStep = "generating-clip-1";
      setFlowState("generating-clip-1");

      const seg1 = scriptData.segments[0];
      const clip1Prompt = `${seg1.visualDescription}. Style: ${scriptData.veoStyleTokens}. End with stable, continuing motion. No real people, no identifiable faces, no logos or trademarks. Abstract cinematic visuals only.`;

      const { data: clip1Result } = await trackStep(
        "generate-clip-1",
        { visualDescription: seg1.visualDescription, styleTokens: scriptData.veoStyleTokens, model: activeModel },
        () => generateClip(clip1Prompt, { durationSeconds: clipDuration as 5 | 6 | 7 | 8, aspectRatio: "16:9", model: activeModel }),
      );

      const clip1Video = clip1Result.videos?.[0];
      if (!clip1Video?.videoBase64) {
        throw new Error("Clip 1: generation returned no video data. Check server logs.");
      }
      const clip1Data: ClipResult = {
        videoBase64: clip1Video.videoBase64,
        mimeType: clip1Video.mimeType ?? "video/mp4",
        durationSeconds: clipDuration,
      };
      setClip1(clip1Data);
      // Veo3: persist individual clips. Free: skip (only save combined).
      if (activeIsVeo3) {
        persist(() => saveVideoClip(runId, 0, clip1Data.videoBase64).then(() => updateVideoRun(runId, { clipCount: 1 })));
      }

      // For minimax: extract last frame for chaining. For Veo: use sourceVideoBase64 directly.
      // Frame extraction is best-effort — if it fails, clip 2 generates without chaining.
      let clip1LastFrame: string | undefined;
      if (activeIsFrameChaining) {
        pushAgentMessage("Clip 1 generated. Extracting last frame for continuity chaining.");
        try {
          clip1LastFrame = await extractLastFrame(clip1Data.videoBase64);
        } catch (frameErr) {
          console.warn("[video-flow] Frame extraction failed for clip 1, generating clip 2 without chaining:", frameErr);
          pushAgentMessage("Frame extraction unavailable — generating clip 2 without visual chaining.");
        }
      } else {
        pushAgentMessage("Clip 1 generated. Grounding clip 2 on the last 2 seconds.");
      }

      // ═══ Step 4: generate-clip-2 (grounded/chained on clip 1) ═══
      currentStep = "generating-clip-2";
      setFlowState("generating-clip-2");

      const seg2 = scriptData.segments[1];
      const clip2Prompt = `Continue from previous scene. ${seg2.visualDescription}. Style: ${scriptData.veoStyleTokens}. End with stable motion. No real people, no identifiable faces, no logos or trademarks. Abstract cinematic visuals only.`;

      const { data: clip2Result } = await trackStep(
        "generate-clip-2",
        { visualDescription: seg2.visualDescription, styleTokens: scriptData.veoStyleTokens, model: activeModel },
        () =>
          generateClip(clip2Prompt, {
            durationSeconds: clipDuration as 5 | 6 | 7 | 8,
            aspectRatio: "16:9",
            model: activeModel,
            // Minimax: last frame as first_frame_image. Veo: source video grounding.
            ...(activeIsFrameChaining
              ? { referenceImageBase64: clip1LastFrame }
              : { sourceVideoBase64: clip1Data.videoBase64 }),
          }),
      );

      const clip2Video = clip2Result.videos?.[0];
      if (!clip2Video?.videoBase64) {
        throw new Error("Clip 2: generation returned no video data. Check server logs.");
      }
      const clip2Data: ClipResult = {
        videoBase64: clip2Video.videoBase64,
        mimeType: clip2Video.mimeType ?? "video/mp4",
        durationSeconds: clipDuration,
      };
      setClip2(clip2Data);
      if (activeIsVeo3) {
        persist(() => saveVideoClip(runId, 1, clip2Data.videoBase64).then(() => updateVideoRun(runId, { clipCount: 2 })));
      }

      let clip2LastFrame: string | undefined;
      if (activeIsFrameChaining) {
        pushAgentMessage("Clip 2 ready. Extracting last frame for the final clip.");
        try {
          clip2LastFrame = await extractLastFrame(clip2Data.videoBase64);
        } catch (frameErr) {
          console.warn("[video-flow] Frame extraction failed for clip 2, generating clip 3 without chaining:", frameErr);
          pushAgentMessage("Frame extraction unavailable — generating clip 3 without visual chaining.");
        }
      } else {
        pushAgentMessage("Clip 2 ready (grounded continuation). Generating the final payoff clip.");
      }

      // ═══ Step 5: generate-clip-3 (grounded/chained on clip 2) ═══
      currentStep = "generating-clip-3";
      setFlowState("generating-clip-3");

      const seg3 = scriptData.segments[2];
      const clip3Prompt = `Continue from previous scene. ${seg3.visualDescription}. Style: ${scriptData.veoStyleTokens}. Conclude with a satisfying visual ending. No real people, no identifiable faces, no logos or trademarks. Abstract cinematic visuals only.`;

      const { data: clip3Result } = await trackStep(
        "generate-clip-3",
        { visualDescription: seg3.visualDescription, styleTokens: scriptData.veoStyleTokens, model: activeModel },
        () =>
          generateClip(clip3Prompt, {
            durationSeconds: clipDuration as 5 | 6 | 7 | 8,
            aspectRatio: "16:9",
            model: activeModel,
            ...(activeIsFrameChaining
              ? { referenceImageBase64: clip2LastFrame }
              : { sourceVideoBase64: clip2Data.videoBase64 }),
          }),
      );

      const clip3Video = clip3Result.videos?.[0];
      if (!clip3Video?.videoBase64) {
        throw new Error("Clip 3: generation returned no video data. Check server logs.");
      }
      const clip3Data: ClipResult = {
        videoBase64: clip3Video.videoBase64,
        mimeType: clip3Video.mimeType ?? "video/mp4",
        durationSeconds: clipDuration,
      };
      setClip3(clip3Data);
      if (activeIsVeo3) {
        persist(() => saveVideoClip(runId, 2, clip3Data.videoBase64).then(() => updateVideoRun(runId, { clipCount: 3 })));
      }
      pushAgentMessage("All 3 clips generated. Concatenating into one continuous video.");

      // ═══ Step 6: concatenate-clips (FFmpeg) ═══
      currentStep = "concatenating";
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

      // Persist based on model: Free saves combined video, Veo3 saves clips (already saved above)
      const finalConcat = concatResult as ConcatResult;
      if (activeIsVeo3) {
        // Veo3: clips already saved, just mark complete
        persist(() =>
          updateVideoRun(runId, {
            status: "completed",
            finalDurationSeconds: finalConcat.durationSeconds ?? clipDuration * 3,
          }),
        );
      } else {
        // Free: save the combined video
        persist(() =>
          saveVideoFinal(runId, finalConcat.videoBase64).then(() =>
            updateVideoRun(runId, {
              status: "completed",
              finalDurationSeconds: finalConcat.durationSeconds ?? clipDuration * 3,
            }),
          ),
        );
      }

      const chainingMethod = activeIsFrameChaining ? "last-frame chaining" : "last-2s grounding";
      const exitSummary = `Produced "${scriptData.title}" — a ${(concatResult as ConcatResult).durationSeconds ?? clipDuration * 3}s highlight video about "${researchData.headline}" (${researchData.league}). 3 ${modelLabel} clips via ${chainingMethod} + FFmpeg concat.`;
      pushAgentMessage(
        `Video ready! "${scriptData.title}" — ${(concatResult as ConcatResult).durationSeconds ?? 20} seconds of continuous highlight footage. Check the preview.`,
      );
      busSend("main", "summary", { summary: exitSummary });

      setFlowState("done");
    } catch (err) {
      console.error("Weekly football video flow error:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to run video pipeline.";
      setFailedAtStep(currentStep);
      setError(errMsg);
      setFlowState("error");
      persist(() => updateVideoRun(runId, { status: "failed", error: errMsg }));
    }
  }, [trackStep, pushAgentMessage, busSend, model, isFrameChaining, selectedModel, clipDuration]);

  // Start when model is selected (not on mount — waits for user choice)
  useEffect(() => {
    if (selectedModel && !hasStarted.current) {
      hasStarted.current = true;
      runFlow();
    }
  }, [selectedModel, runFlow]);

  // Handle model selection
  const handleModelSelect = useCallback((choice: VideoModelChoice) => {
    setShowSavedVideos(false);
    setSelectedModel(choice);
    const opt = MODEL_OPTIONS.find((m) => m.id === choice);
    pushAgentMessage(`Using ${opt?.label ?? choice} model. Researching the latest football story.`);
  }, [pushAgentMessage]);

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
    setResearch(null);
    setScript(null);
    setClip1(null);
    setClip2(null);
    setClip3(null);
    setFinalVideo(null);
    setError(null);
    setFailedAtStep(null);
    setSelectedModel(null);
    setShowSavedVideos(false);
    setFlowState("model-selection");
  }, []);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Model selection + Play saved video screen ─── */}
      {flowState === "model-selection" && !showSavedVideos && (
        <div className="rounded-xl border-2 border-border overflow-hidden">
          <div className="bg-rose-500/5 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-medium">AI Video — Choose Model</span>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the AI model for video generation:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {MODEL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleModelSelect(opt.id)}
                  className="group text-left rounded-lg border-2 border-border p-4 transition-all
                    hover:border-rose-500/50 hover:bg-rose-500/5"
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                </button>
              ))}
            </div>
            <div className="border-t border-border pt-3">
              <button
                onClick={() => setShowSavedVideos(true)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <History className="h-4 w-4" />
                Play a saved video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Saved videos browser ─── */}
      {flowState === "model-selection" && showSavedVideos && (
        <div className="space-y-3">
          <button
            onClick={() => setShowSavedVideos(false)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to model selection
          </button>
          <VideoRunHistory flowId="weekly-football-video" />
        </div>
      )}

      {/* ── Pipeline Step Tracker (always visible except done and model-selection) ─── */}
      {flowState !== "done" && flowState !== "model-selection" && (
        <PipelineTracker
          currentState={flowState}
          failedStep={failedAtStep}
          research={research}
          script={script}
          clip1={clip1}
          clip2={clip2}
          clip3={clip3}
          statusMessage={statusMessage}
          elapsedSeconds={elapsedSeconds}
          error={error}
        />
      )}

      {/* ── Error: actions ─────────────────────────────────── */}
      {flowState === "error" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>
              Pipeline stopped at{" "}
              <span className="font-medium text-foreground">
                {PIPELINE_STEPS.find((s) => s.id === failedAtStep)?.shortLabel ?? "unknown step"}
              </span>
            </span>
          </div>
          <Button onClick={reset} variant="outline" size="sm">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Try Again
          </Button>
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
                  const chainingLabel = isFrameChaining ? "last-frame chaining" : "last-2s grounding";
                  const modelLbl = isFrameChaining ? "Hailuo" : "Veo";
                  const exitSummary = `Produced "${script.title}" — a ${finalVideo?.durationSeconds ?? clipDuration * 3}s highlight video about "${research.headline}" (${research.league}). 3 ${modelLbl} clips via ${chainingLabel} + FFmpeg.`;
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
                          {seg.segmentNumber === 1
                            ? `0-${clipDuration}s`
                            : seg.segmentNumber === 2
                              ? `${clipDuration}-${clipDuration * 2}s`
                              : `${clipDuration * 2}-${clipDuration * 3}s`}
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

      {/* ── Past Runs (always visible) ────────────────────────── */}
      <VideoRunHistory flowId="weekly-football-video" />

    </div>
  );
}
