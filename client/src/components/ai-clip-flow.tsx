/**
 * AI Clip Flow — Single 5-second clip from top news via Replicate (Wan 2.1).
 *
 * The simplest video building block:
 *
 *   deep-research (root)
 *        │
 *   write-clip-script
 *        │
 *   generate-clip (5s Wan 2.1 via Replicate)
 *        │
 *   preview-clip (display)
 *
 * Pipeline:
 *   1. Deep research → find the biggest news story (last 7 days)
 *   2. Write a 5-second clip script with visual description
 *   3. Generate a single 5s clip via Replicate (Wan 2.1 open-source model)
 *   4. Preview + download
 *
 * This is the atomic unit — if this works, the 3-clip AI-Video
 * flow is just 3 of these chained together.
 *
 * Models: Gemini 2.5 Flash (research + script) + Wan 2.1 via Replicate (video gen)
 * Auto-starts immediately when rendered.
 *
 * UI: Vertical pipeline tracker (inspired by Newsletter/AI-Video).
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Search,
  PenLine,
  Film,
  RotateCcw,
  Download,
  Eye,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  chatJSON,
  jsonPrompt,
  useFlowExecution,
  useFlowChat,
  generateClip,
} from "@/lib/bilko-flow";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { useFlowRegistration } from "@/contexts/flow-bus-context";
import { getFlowAgent } from "@/lib/bilko-persona/flow-agents";

// ── Owner ID — must match what landing.tsx uses for claimChat ──
const OWNER_ID = "ai-clip";

// ── Types ────────────────────────────────────────────────────────────

type FlowState =
  | "researching"
  | "scripting"
  | "generating"
  | "done"
  | "error";

interface ResearchResult {
  headline: string;
  topic: string;
  summary: string;
  keyFacts: Array<{ fact: string; number: string }>;
}

interface ClipScript {
  title: string;
  narration: string;
  visualDescription: string;
  keyStat: string;
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
  { id: "researching", label: "Deep Research — Top Story", shortLabel: "Research", icon: Search },
  { id: "scripting", label: "Writing 5s Clip Script", shortLabel: "Script", icon: PenLine },
  { id: "generating", label: "Generating Clip (Wan 2.1)", shortLabel: "Clip", icon: Film },
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
  `You are a senior news researcher. Research the last 7 DAYS of global news and identify the single MOST INTERESTING story — something visually compelling that would make a great short video clip.

Focus on stories with striking visuals: sports events, natural phenomena, space, technology breakthroughs, cultural moments, architecture, wildlife. Avoid politics and conflict.

Return ONLY valid JSON:
{"research":{"headline":"...","topic":"...","summary":"...","keyFacts":[{"fact":"...","number":"..."}]}}

Rules:
- headline: max 12 words, punchy and visual
- topic: category (e.g. "Space", "Football", "Technology", "Nature")
- summary: 80-120 words with vivid visual context
- keyFacts: 2 to 4 facts, each with a "fact" (max 15 words) and "number" (the key stat)
- No markdown, ONLY the JSON object.
- The clip will be 5 seconds, so pick something with a single striking visual moment.`,
);

function writeClipScriptPrompt(research: ResearchResult): string {
  return bilkoSystemPrompt(
    `You are a social media video scriptwriter specializing in 5-second attention-grabbing clips.

INPUT: The most visually interesting story:
"${research.headline}" (${research.topic})
${research.summary}

Key facts:
${research.keyFacts.map((f, i) => `${i + 1}. ${f.fact} — ${f.number}`).join("\n")}

MISSION: Write a single 5-SECOND clip script. This clip must be a self-contained micro-story — hook and payoff in 5 seconds.

Return ONLY valid JSON:
{"script":{"title":"...","narration":"...","visualDescription":"...","keyStat":"...","veoStyleTokens":"..."}}

Rules:
- title: max 8 words, social-media punchy
- narration: max 12 words — what a voiceover would say in 5 seconds
- visualDescription: max 40 words — cinematic description of what the viewer SEES. Be specific about motion, camera angle, lighting. This goes directly to an AI video model.
- keyStat: the single most impressive number/fact
- veoStyleTokens: visual style keywords (lighting, palette, mood, camera — max 25 words)
- No markdown.

CONTENT POLICY (MANDATORY):
The visualDescription and veoStyleTokens go DIRECTLY to an AI video generation model. You MUST follow these rules strictly:
1. NO REAL PEOPLE: Never name or describe any real, recognizable person (athletes, politicians, celebrities, public figures). Use generic descriptions like "a person", "a scientist", "a footballer" instead.
2. NO IDENTIFIABLE FACES: Do not request close-ups of faces that could resemble real people. Prefer wide shots, silhouettes, overhead angles, or abstract representations.
3. NO LOGOS OR TRADEMARKS: Do not reference specific team crests, brand logos, jersey numbers tied to real players, or trademarked visual elements.
4. ABSTRACT OVER LITERAL: Prefer symbolic, cinematic, and artistic representations over photorealistic depictions of real events. E.g. "a football soaring into a stadium net under dramatic floodlights" NOT "[Real Player Name] scoring the winning goal".
5. NO VIOLENCE: Do not describe physical confrontation, injury, or graphic impact.
6. SAFE LANGUAGE: Ensure the visual description would pass content safety filters — no sexual, derogatory, toxic, or hateful content.
If the news story involves specific people, translate their actions into generic, symbolic visuals that capture the ENERGY and EMOTION without identifying anyone.`,
  );
}

// ── Status messages ──────────────────────────────────────────────────

const STATUS_MESSAGES: Record<string, string[]> = {
  researching: [
    "Scanning the last 7 days for a visually compelling story...",
    "Looking for something cinematic — sports, space, nature...",
    "Finding the most interesting story for an 8-second clip...",
  ],
  scripting: [
    "Writing the 5-second clip script...",
    "Crafting a micro-story — hook, reveal, payoff...",
    "Designing the visual description for Wan 2.1...",
  ],
  generating: [
    "Generating clip with Wan 2.1 via Replicate...",
    "Rendering cinematic visuals (open-source model)...",
    "This usually takes 30-60 seconds...",
  ],
};

// ── Step Tracker ─────────────────────────────────────────────────────

function StepStatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case "active":
      return <Loader2 className="h-4 w-4 text-sky-500 animate-spin shrink-0" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
  }
}

/** Copyable code block for prompts and error details */
function CopyableBlock({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1.5 rounded-md border border-border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/50 bg-muted/50">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
        >
          <Copy className="h-2.5 w-2.5" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-2 py-1.5 text-[11px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-words font-mono max-h-[200px] overflow-y-auto">
        {content}
      </pre>
    </div>
  );
}

/** Expandable details section */
function ExpandableDetail({ label, children, defaultOpen }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {label}
      </button>
      {open && <div className="mt-0.5">{children}</div>}
    </div>
  );
}

function PipelineTracker({
  currentState,
  failedStep,
  research,
  script,
  clip,
  veoPrompt,
  statusMessage,
  elapsedSeconds,
  error,
}: {
  currentState: FlowState;
  failedStep: FlowState | null;
  research: ResearchResult | null;
  script: ClipScript | null;
  clip: ClipResult | null;
  veoPrompt: string | null;
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

  return (
    <div className="rounded-xl border-2 border-border overflow-hidden">
      {/* Header */}
      <div className="bg-sky-500/5 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-sky-500" />
            <span className="text-sm font-medium">AI Clip Pipeline</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedCount}/{PIPELINE_STEPS.length}
            </span>
          </div>
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-500"
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

          // Inline detail for completed steps
          let detail: string | null = null;
          if (isComplete && step.id === "researching" && research) {
            detail = `"${research.headline}" (${research.topic})`;
          } else if (isComplete && step.id === "scripting" && script) {
            detail = `"${script.title}" — ${script.narration.split(" ").length} words`;
          } else if (isComplete && step.id === "generating" && clip) {
            detail = `${clip.durationSeconds}s clip ready`;
          }

          return (
            <div key={step.id}>
              <div
                className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                  isActive
                    ? "bg-sky-500/5"
                    : isError
                      ? "bg-red-500/5"
                      : ""
                }`}
              >
                <div className="mt-0.5">
                  <StepStatusIcon status={status} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isActive
                          ? "text-sky-500"
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

                  {detail && isComplete && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 truncate pl-5.5">
                      {detail}
                    </p>
                  )}

                  {/* Script details — show after scripting completes */}
                  {(isComplete || isActive || isError) && step.id === "scripting" && script && (
                    <div className="pl-5.5">
                      <ExpandableDetail label="Script details" defaultOpen={isError && failedStep === "generating"}>
                        <div className="space-y-1 text-[11px]">
                          <div>
                            <span className="text-muted-foreground font-medium">Narration: </span>
                            <span className="text-foreground/80">{script.narration}</span>
                          </div>
                          <CopyableBlock label="Visual Description (sent to Wan 2.1)" content={script.visualDescription} />
                          <CopyableBlock label="Style Tokens" content={script.veoStyleTokens} />
                          <div>
                            <span className="text-muted-foreground font-medium">Key Stat: </span>
                            <span className="text-foreground/80">{script.keyStat}</span>
                          </div>
                        </div>
                      </ExpandableDetail>
                    </div>
                  )}

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

                  {/* Veo prompt — show during/after generation step */}
                  {(isActive || isComplete || isError) && step.id === "generating" && veoPrompt && (
                    <div className="pl-5.5">
                      <ExpandableDetail label="Exact Wan 2.1 prompt" defaultOpen={isError}>
                        <CopyableBlock label="Prompt sent to Replicate API" content={veoPrompt} />
                      </ExpandableDetail>
                    </div>
                  )}

                  {isError && error && (
                    <div className="mt-1.5 pl-5.5">
                      <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2">
                        <p className="text-xs font-medium text-red-500 mb-1">Error Details</p>
                        <p className="text-xs text-red-400/90 whitespace-pre-wrap break-words leading-relaxed">
                          {error}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Completed clip inline preview */}
              {isComplete && step.id === "generating" && clip && clip.videoBase64 && (
                <div className="ml-9 mr-2 mb-1 mt-0.5">
                  <video
                    controls
                    className="w-full max-w-[280px] aspect-video bg-black rounded-md border border-border"
                    src={`data:${clip.mimeType || "video/mp4"};base64,${clip.videoBase64}`}
                  />
                </div>
              )}

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

export function AiClipFlow({ onComplete }: { onComplete?: (summary?: string) => void }) {
  const [flowState, setFlowState] = useState<FlowState>("researching");
  const [failedAtStep, setFailedAtStep] = useState<FlowState | null>(null);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [script, setScript] = useState<ClipScript | null>(null);
  const [clip, setClip] = useState<ClipResult | null>(null);
  const [veoPrompt, setVeoPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(STATUS_MESSAGES.researching[0]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const hasStarted = useRef(false);
  const stateStartRef = useRef<number>(Date.now());

  const { trackStep } = useFlowExecution("ai-clip");
  const { setStatus: setBusStatus, send: busSend } = useFlowRegistration("ai-clip", "AI Clip");
  const { pushMessage } = useFlowChat();

  const agent = getFlowAgent("ai-clip");

  const pushAgentMessage = useCallback(
    (text: string) => {
      pushMessage(OWNER_ID, {
        speaker: "agent",
        text,
        agentName: agent?.chatName ?? "ClipMaker",
        agentDisplayName: agent?.name ?? "Clip Maker",
        agentAccent: agent?.accentColor ?? "text-sky-500",
      });
    },
    [pushMessage, agent],
  );

  // Greeting on mount
  const didGreet = useRef(false);
  useEffect(() => {
    if (didGreet.current) return;
    didGreet.current = true;
    if (agent) {
      pushAgentMessage(agent.greeting);
    }
  }, [agent, pushAgentMessage]);

  // Sync to flow bus
  useEffect(() => {
    setBusStatus(
      flowState === "done" ? "complete" : flowState === "error" ? "error" : "running",
      flowState,
    );
  }, [flowState, setBusStatus]);

  // Rotate status messages
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

  // Track elapsed time
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

  // ── Run the flow ──────────────────────────────────────────

  const runFlow = useCallback(async () => {
    setFlowState("researching");
    setFailedAtStep(null);
    setError(null);
    setVeoPrompt(null);

    let currentStep: FlowState = "researching";

    try {
      // ═══ Step 1: deep-research (LLM) ═══
      currentStep = "researching";
      const { data: researchResult } = await trackStep(
        "deep-research",
        { request: "Find the most visually interesting news story of the last 7 days" },
        () =>
          chatJSON<{ research: ResearchResult }>(
            jsonPrompt(
              DEEP_RESEARCH_PROMPT,
              "What is the most visually interesting news story of the last 7 days? Find something that would make a stunning 5-second video clip.",
            ),
          ),
      );

      const researchData = researchResult.data.research;
      setResearch(researchData);
      pushAgentMessage(
        `Found the story: "${researchData.headline}" (${researchData.topic}). Writing the 5s clip script.`,
      );

      // ═══ Step 2: write-clip-script (LLM) ═══
      currentStep = "scripting";
      setFlowState("scripting");

      const { data: scriptResult } = await trackStep(
        "write-clip-script",
        { research: researchData },
        () =>
          chatJSON<{ script: ClipScript }>(
            jsonPrompt(
              writeClipScriptPrompt(researchData),
              "Write a punchy 5-second clip script based on the research. Make it social-media ready.",
            ),
          ),
      );

      const scriptData = scriptResult.data.script;
      setScript(scriptData);
      pushAgentMessage(
        `Script ready: "${scriptData.title}". Sending to Wan 2.1 via Replicate for generation.`,
      );

      // ═══ Step 3: generate-clip (5s Wan 2.1 via Replicate) ═══
      currentStep = "generating";
      setFlowState("generating");

      const clipPrompt = `${scriptData.visualDescription}. Style: ${scriptData.veoStyleTokens}. No real people, no identifiable faces, no logos or trademarks. Abstract cinematic visuals only.`;
      setVeoPrompt(clipPrompt);

      const { data: clipResult } = await trackStep(
        "generate-clip",
        { visualDescription: scriptData.visualDescription, styleTokens: scriptData.veoStyleTokens },
        () => generateClip(clipPrompt, { durationSeconds: 5, aspectRatio: "16:9", model: "wavespeedai/wan-2.1-t2v-480p" }),
      );

      const clipVideo = clipResult.videos?.[0];
      if (!clipVideo?.videoBase64) {
        throw new Error("Clip generation returned no video data. Check server logs for Replicate API response details.");
      }
      const clipData: ClipResult = {
        videoBase64: clipVideo.videoBase64,
        mimeType: clipVideo.mimeType ?? "video/mp4",
        durationSeconds: 5,
      };
      setClip(clipData);

      const exitSummary = `Generated "${scriptData.title}" — a 5-second AI clip about "${researchData.headline}" (${researchData.topic}). Wan 2.1 via Replicate.`;
      pushAgentMessage(
        `Clip ready! "${scriptData.title}" — 5 seconds of cinematic footage via Wan 2.1. Check the preview.`,
      );
      busSend("main", "summary", { summary: exitSummary });

      setFlowState("done");
    } catch (err) {
      console.error("AI clip flow error:", err);
      setFailedAtStep(currentStep);
      setError(err instanceof Error ? err.message : "Failed to run clip pipeline.");
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

  // ── Download ──────────────────────────────────────────────

  const downloadClip = useCallback(() => {
    if (!clip) return;
    const byteString = atob(clip.videoBase64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: clip.mimeType || "video/mp4" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-clip-${new Date().toISOString().slice(0, 10)}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [clip]);

  // ── Reset ─────────────────────────────────────────────────

  const reset = useCallback(() => {
    hasStarted.current = false;
    didGreet.current = false;
    setResearch(null);
    setScript(null);
    setClip(null);
    setVeoPrompt(null);
    setError(null);
    setFailedAtStep(null);
    setTimeout(() => {
      hasStarted.current = true;
      didGreet.current = true;
      runFlow();
    }, 0);
  }, [runFlow]);

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Pipeline tracker (visible during execution & error) */}
      {flowState !== "done" && (
        <PipelineTracker
          currentState={flowState}
          failedStep={failedAtStep}
          research={research}
          script={script}
          clip={clip}
          veoPrompt={veoPrompt}
          statusMessage={statusMessage}
          elapsedSeconds={elapsedSeconds}
          error={error}
        />
      )}

      {/* Error actions */}
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

      {/* Done: preview */}
      {flowState === "done" && script && research && clip && (
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
              New Clip
            </Button>
            <Button variant="outline" size="sm" onClick={downloadClip}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download Clip
            </Button>
            {onComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const exitSummary = `Generated "${script.title}" — 5s AI clip about "${research.headline}" (${research.topic}). Wan 2.1 via Replicate.`;
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
            <div className="bg-sky-500/5 border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <Film className="h-5 w-5 text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">{script.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {research.topic} — 5s clip (Wan 2.1)
                  </p>
                </div>
              </div>
            </div>

            {/* Video player */}
            <div className="bg-black aspect-video flex items-center justify-center">
              <video
                controls
                autoPlay
                className="w-full h-full"
                src={`data:${clip.mimeType || "video/mp4"};base64,${clip.videoBase64}`}
              >
                Your browser does not support video playback.
              </video>
            </div>

            {/* Script & facts */}
            <div className="p-4 space-y-4">
              {/* Narration */}
              <div>
                <h3 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Script
                </h3>
                <p className="text-sm text-foreground">{script.narration}</p>
                <p className="text-xs text-muted-foreground italic mt-1">{script.visualDescription}</p>
                <span className="inline-block text-xs bg-sky-500/10 text-sky-600 rounded px-1.5 py-0.5 mt-1.5">
                  {script.keyStat}
                </span>
              </div>

              {/* Key facts */}
              <div>
                <h3 className="text-sm font-semibold mb-1.5">Key Facts</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {research.keyFacts.map((fact, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
                      <span className="shrink-0 text-xs font-bold text-sky-500 bg-sky-500/10 rounded px-1.5 py-0.5">
                        {fact.number}
                      </span>
                      <p className="text-xs text-muted-foreground">{fact.fact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Research summary */}
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
    </div>
  );
}
