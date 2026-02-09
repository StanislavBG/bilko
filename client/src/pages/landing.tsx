/**
 * Landing Page — Flow-driven split-panel experience.
 *
 * This is the bilko-main flow (registered in flow-inspector/registry).
 *
 * Left panel:  FlowChat — messages only.
 * Right panel:  Delivery surface — mode grid or sub-flow experience.
 *
 * Flow architecture (recursive):
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │                                                      │
 *   ▼                                                      │
 *  [greeting(context?)] → [mode-selection] → [run-subflow] │
 *                                                │         │
 *                                       onComplete(summary)│
 *                                                └─────────┘
 *
 * The greeting node is the HEAD of the flow. It runs:
 * - First time: no context → fresh welcome
 * - After a sub-flow exits: with summary → personalized return
 *
 * Sub-flows are autonomous:
 * - They push their own messages to the Chat API
 * - They own the chat during execution
 * - When done, they call onComplete(summary) with an exit message
 * - That summary feeds back into the greeting node for recursive learning
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { GlobalHeader } from "@/components/global-header";
import { FlowChat } from "@/components/flow-chat";
import { VideoDiscoveryFlow } from "@/components/video-discovery-flow";
import {
  AiConsultationFlow,
  RECURSIVE_INTERVIEWER_CONFIG,
  SOCRATIC_ARCHITECT_CONFIG,
} from "@/components/ai-consultation-flow";
import { LinkedInStrategistFlow } from "@/components/linkedin-strategist-flow";
import { WorkWithMeFlow } from "@/components/work-with-me-flow";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { chat, useFlowExecution, FlowChatProvider, useFlowChat } from "@/lib/flow-engine";
import { Button } from "@/components/ui/button";
import {
  Play,
  Sparkles,
  MessageCircle,
  ArrowLeft,
  Lightbulb,
  Briefcase,
  GraduationCap,
  Handshake,
  Compass,
  Construction,
} from "lucide-react";
import type { LearningModeId } from "@/lib/workflow";
import { LEARNING_MODES } from "@/lib/workflow/flows/welcome-flow";
import { flowRegistry } from "@/lib/flow-inspector/registry";
import { FlowBusProvider, useFlowBus } from "@/contexts/flow-bus-context";
import { FlowStatusIndicator } from "@/components/flow-status-indicator";
import { useConversationDesign, matchScreenOption, useScreenOptions, type ScreenOption } from "@/contexts/conversation-design-context";
import { useVoice } from "@/contexts/voice-context";
import { useSidebarSafe } from "@/components/ui/sidebar";

// ── Owner ID for this flow ────────────────────────────────
const OWNER_ID = "bilko-main";

// ── Mode definitions for the delivery surface ────────────
// Built dynamically from the flow registry (all landing-location flows
// except the root bilko-main flow), plus special navigation tiles.

interface ModeOption {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
}

const iconMap: Record<string, ReactNode> = {
  Play: <Play className="h-6 w-6" />,
  MessageCircle: <MessageCircle className="h-6 w-6" />,
  Lightbulb: <Lightbulb className="h-6 w-6" />,
  Briefcase: <Briefcase className="h-6 w-6" />,
  GraduationCap: <GraduationCap className="h-6 w-6" />,
  Handshake: <Handshake className="h-6 w-6" />,
};

/** Menu items sourced from the flow registry — any landing flow (except bilko-main) becomes a tile */
const MODE_OPTIONS: ModeOption[] = flowRegistry
  .filter((f) => f.location === "landing" && f.id !== "bilko-main")
  .map((f) => ({
    id: f.id,
    label: f.name,
    description: f.description,
    icon: f.icon ? (iconMap[f.icon] ?? <Sparkles className="h-5 w-5" />) : <Sparkles className="h-5 w-5" />,
  }));

/** Special tiles that aren't flows but appear in the menu */
const SPECIAL_TILES: ModeOption[] = [
  {
    id: "explore",
    label: "Explore the Site",
    description: "Browse everything Bilko's AI School has to offer",
    icon: <Compass className="h-6 w-6" />,
  },
];

const EXPLORE_OPTION = SPECIAL_TILES[0];

/** Maps flow registry IDs to the short mode IDs used by RightPanelContent */
const FLOW_TO_MODE: Record<string, LearningModeId> = {
  "video-discovery": "video",
  "ai-consultation": "chat",
  "recursive-interviewer": "interviewer",
  "linkedin-strategist": "linkedin",
  "socratic-architect": "socratic",
  "work-with-me": "work-with-me",
};

const constructionBadge = (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-amber-400/90 text-amber-950 border border-amber-500/50">
    <Construction className="h-2.5 w-2.5" />
    In Dev
  </span>
);

// ── Subflow ID mapping ──────────────────────────────────

/** Maps learning mode IDs to their chat owner IDs (used for claimChat) */
const MODE_TO_OWNER: Record<string, string> = {
  video: "video-discovery",
  chat: "ai-consultation",
  interviewer: "recursive-interviewer",
  linkedin: "linkedin-strategist",
  socratic: "socratic-architect",
  "work-with-me": "work-with-me",
};

// ── LLM greeting prompts ────────────────────────────────

/** Build greeting context from flow registry — available experiences listed dynamically */
const menuFlowDescriptions = flowRegistry
  .filter((f) => f.location === "landing" && f.id !== "bilko-main")
  .map((f) => `- ${f.name}: ${f.description}`)
  .join("\n");

const GREETING_SYSTEM_PROMPT = bilkoSystemPrompt(
  `You are greeting a new visitor to the AI School. This is their first interaction with you.

Generate a warm, natural opening. Welcome them, introduce yourself briefly as Bilko their AI training partner, and ask how they'd like to learn today. Make it feel like meeting a friendly coach — not a scripted bot.

Available experiences they can pick from:
${menuFlowDescriptions}

Rules:
- 2-3 sentences max. Keep it tight.
- End with a natural question about how they want to train.
- Don't list all the modes — just ask warmly.
- Plain text only. No formatting, no markdown, no JSON.`,
);

/** Return greeting — after a sub-flow exits with a summary */
const GREETING_RETURN_PROMPT = bilkoSystemPrompt(
  `You are Bilko, welcoming the user back after they just finished a learning session with one of your specialist agents.

You'll be given what they did and a brief summary. Use it to:
1. Acknowledge what they just accomplished (briefly — one sentence)
2. Ask what they want to do next

Available training modes:
${LEARNING_MODES.map((m) => `- ${m.label}: ${m.description}`).join("\n")}

Rules:
- 2-3 sentences max. Keep it warm and energetic.
- Reference what they just did — show you were paying attention.
- End with a question about what's next.
- Plain text only. No formatting, no markdown, no JSON.`,
);

const GREETING_FALLBACK =
  "Welcome to the AI School. I'm Bilko — your AI training partner. What would you like to work on today?";

const GREETING_RETURN_FALLBACK =
  "Good session. I'm back. What do you want to try next?";

// ── Bilko's patience ────────────────────────────────────
const PATIENCE_THRESHOLD = 3;

/** Build guidance from flow registry — lists available experiences dynamically */
const menuFlowNames = flowRegistry
  .filter((f) => f.location === "landing" && f.id !== "bilko-main")
  .map((f) => f.name);
const flowNameList = menuFlowNames.join(", ");

const GUIDANCE_MESSAGES = [
  {
    text: "Take your time. When you're ready, just say the name of an experience — or tap one on the right.",
    speech: "Take your time. When you're ready, just say the name of an experience, or tap one on the right.",
  },
  {
    text: "Still here. You can pick an experience by name, or just tap one of the options on the right side.",
    speech: "Still here. You can pick an experience by name, or just tap one of the options on the right side.",
  },
  {
    text: `No rush. The options are: ${flowNameList}. Say any of those or tap one.`,
    speech: `No rush. The options are ${flowNameList}. Say any of those, or tap one.`,
  },
];

// ── Experience back button ───────────────────────────────

function ExperienceBack({ onBack }: { onBack: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onBack}
      className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Ask me something else
    </Button>
  );
}

// ── Main component (flow-driven) ─────────────────────────

export function LandingContent({ skipWelcome = false }: { skipWelcome?: boolean }) {
  const { pushMessage, clearMessages, claimChat, releaseChat } = useFlowChat();
  const { trackStep, resolveUserInput } = useFlowExecution("bilko-main");
  const [, navigate] = useLocation();
  const { startListening, isListening } = useVoice();
  const sidebarCtx = useSidebarSafe();

  const [selectedMode, setSelectedMode] = useState<LearningModeId | null>(null);
  const [greetingLoading, setGreetingLoading] = useState(false);

  // Track completed activity summaries for Bilko's recursive learning
  const activityLogRef = useRef<Array<{ modeId: string; modeLabel: string; summary: string }>>([]);

  // ── Greeting Node (HEAD) — reusable, context-aware ──
  //
  // This is the HEAD of the flow. It runs:
  // - First invocation: no context → fresh welcome
  // - After sub-flow exit: with summary → personalized return
  //
  // The greeting node can be "recycled" — called again from the
  // end of any sub-flow, creating the recursive learning loop.

  const runGreeting = useCallback(
    async (context?: { modeLabel: string; summary: string }) => {
      setGreetingLoading(true);

      const isReturn = !!context;
      const stepId = isReturn ? `greeting-return-${Date.now()}` : "greeting";
      const systemPrompt = isReturn ? GREETING_RETURN_PROMPT : GREETING_FRESH_PROMPT;
      const userMessage = isReturn
        ? `The user just finished "${context.modeLabel}". Here's what happened: ${context.summary}. Welcome them back.`
        : "A new visitor just arrived at the AI School.";
      const fallback = isReturn ? GREETING_RETURN_FALLBACK : GREETING_FALLBACK;

      try {
        await trackStep(
          stepId,
          { context: context ?? { visitor: "new" }, isReturn },
          async () => {
            try {
              const result = await chat(
                [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userMessage },
                ],
                { temperature: 0.9 },
              );
              const text = result.data.trim();
              pushMessage(OWNER_ID, {
                speaker: "bilko",
                text,
                speech: text,
              });
              return { greeting: text };
            } catch {
              pushMessage(OWNER_ID, {
                speaker: "bilko",
                text: fallback,
                speech: fallback,
              });
              return { greeting: fallback };
            }
          },
        );
      } finally {
        setGreetingLoading(false);
      }
    },
    [pushMessage, trackStep],
  );

  // ── Initial greeting on mount ──
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    if (skipWelcome) {
      // Authenticated users — shorter opening
      trackStep("greeting", { skipWelcome: true }, async () => {
        const text = "What do you want to train today?";
        pushMessage(OWNER_ID, {
          speaker: "bilko",
          text,
          speech: text,
        });
        return { greeting: text };
      });
      return;
    }

    runGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Flow Step 2: Mode Selection — user picks from right panel ──
  //
  // handleChoice is the simplest possible hand-off:
  // 1. Push user's choice to chat
  // 2. System divider
  // 3. Claim chat for sub-flow
  // 4. Render sub-flow
  //
  // No agent identity mapping — the sub-flow handles its own persona.

  const handleChoice = useCallback(
    (choiceId: string) => {
      // Special tiles — handle non-flow actions
      if (choiceId === "explore") {
        if (sidebarCtx) {
          sidebarCtx.setOpen(true);
        } else {
          window.location.href = "/api/auth/login";
        }
        return;
      }

      // Resolve flow registry ID → short mode ID for component rendering
      const mode = FLOW_TO_MODE[choiceId] ?? (choiceId as LearningModeId);
      const flowDef = flowRegistry.find((f) => f.id === choiceId);
      const modeLabel = flowDef?.name ?? LEARNING_MODES.find((m) => m.id === mode)?.label;
      const agent = getFlowAgent(choiceId);

      // Auto-start mic on first interaction
      if (!isListening) {
        startListening();
      }

      // Track as user-input flow step
      resolveUserInput("mode-selection", { selectedMode: mode, modeLabel });

      // Push user's choice to chat
      pushMessage(OWNER_ID, {
        speaker: "user",
        text: modeLabel ?? choiceId,
      });

      // System divider — starting sub-flow
      pushMessage(OWNER_ID, {
        speaker: "system",
        text: `Starting ${modeLabel ?? mode}`,
      });

      // Transfer chat ownership to the sub-flow.
      // The sub-flow will push its own greeting as the new owner.
      const subflowOwnerId = MODE_TO_OWNER[mode] ?? mode;
      claimChat(subflowOwnerId);

      // Activate the sub-flow (renders in right panel)
      setSelectedMode(mode);
    },
    [pushMessage, resolveUserInput, isListening, startListening, sidebarCtx, claimChat],
  );

  // ── Sub-flow exit — recycle the greeting node ──
  //
  // Called when:
  // 1. Sub-flow calls onComplete(summary) — natural completion
  // 2. User clicks "Ask me something else" — manual exit
  //
  // In both cases: release chat → system divider → recycle greeting with summary

  const handleSubflowExit = useCallback(
    (exitSummary?: string) => {
      const lastActivity = activityLogRef.current[activityLogRef.current.length - 1];
      const summary = exitSummary ?? lastActivity?.summary;
      const modeLabel = lastActivity?.modeLabel ?? "the session";

      // Release chat ownership back to bilko-main
      releaseChat();

      // System return divider
      pushMessage(OWNER_ID, {
        speaker: "system",
        text: "Returning to Bilko",
      });

      // Clear the selected mode — show mode grid again
      setSelectedMode(null);

      // Recycle the greeting node with context from the sub-flow.
      // This is the recursive learning loop: sub-flow summary → greeting context.
      if (summary) {
        runGreeting({ modeLabel, summary });
      } else {
        runGreeting();
      }
    },
    [pushMessage, releaseChat, runGreeting],
  );

  // handleBack is just handleSubflowExit triggered by the back button
  const handleBack = useCallback(() => {
    // Push user's back request to chat
    pushMessage(OWNER_ID, {
      speaker: "user",
      text: "Show me what else you've got",
    });
    handleSubflowExit();
  }, [pushMessage, handleSubflowExit]);

  // ── Conversation design: voice turn-taking ──
  const { onUserUtterance, screenOptions } = useConversationDesign();

  // ── Bilko's patience: voice → option matching ──
  const unmatchedCountRef = useRef(0);
  const guidanceRoundRef = useRef(0);

  useEffect(() => {
    const unsub = onUserUtterance((text: string) => {
      // Push what the user said to the chat (user messages always accepted)
      pushMessage(OWNER_ID, { speaker: "user", text });

      // 1. Try to match against dynamic screen options
      const screenMatch = matchScreenOption(text, screenOptions);
      if (screenMatch) {
        unmatchedCountRef.current = 0;
        screenMatch.action();
        return;
      }

      // If a mode is already selected, the subflow owns the screen
      if (selectedMode) return;

      // 2. Fall back to flow registry voice trigger + name matching
      const lower = text.toLowerCase();
      const menuFlows = flowRegistry.filter((f) => f.location === "landing" && f.id !== "bilko-main");
      const matched = menuFlows.find((f) => {
        // Match on voice triggers defined in the flow registry
        if (f.voiceTriggers?.some((t) => lower.includes(t.toLowerCase()))) return true;
        // Match on flow name
        const name = f.name.toLowerCase();
        if (lower.includes(name)) return true;
        // Match on significant words in name
        if (name.split(/\s+/).some((w) => w.length > 3 && lower.includes(w))) return true;
        return false;
      });

      if (matched) {
        unmatchedCountRef.current = 0;
        handleChoice(matched.id);
        return;
      }

      // No match — patience counter (only when bilko-main owns the chat)
      unmatchedCountRef.current += 1;

      if (unmatchedCountRef.current >= PATIENCE_THRESHOLD) {
        const msg = GUIDANCE_MESSAGES[guidanceRoundRef.current % GUIDANCE_MESSAGES.length];
        pushMessage(OWNER_ID, {
          speaker: "bilko",
          text: msg.text,
          speech: msg.speech,
        });
        unmatchedCountRef.current = 0;
        guidanceRoundRef.current += 1;
      }
    });
    return unsub;
  }, [onUserUtterance, selectedMode, handleChoice, pushMessage, screenOptions]);

  // Subscribe to FlowBus messages addressed to "main" — for ACTIVITY LOGGING only.
  // Subflows push their own chat messages directly. The bus is for metadata.
  const { subscribe } = useFlowBus();
  useEffect(() => {
    const unsub = subscribe("main", (msg) => {
      if (msg.type === "summary" && typeof msg.payload.summary === "string") {
        const fromAgent = getFlowAgent(msg.from);
        const modeLabel = flowRegistry.find((f) => f.id === msg.from)?.name
          ?? LEARNING_MODES.find((m) => m.id === msg.from)?.label
          ?? msg.from;

        activityLogRef.current.push({
          modeId: msg.from,
          modeLabel,
          summary: msg.payload.summary,
        });
      }
    });
    return unsub;
  }, [subscribe]);

  // Reset
  const handleReset = useCallback(() => {
    releaseChat();
    clearMessages();
    navigate("/", { replace: true });
    window.location.reload();
  }, [clearMessages, navigate, releaseChat]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel: Flow Chat — messages only, no options */}
      <div className="w-full lg:w-[420px] xl:w-[480px] shrink-0 lg:border-r border-border flex flex-col bg-background">
        <FlowChat />
        {/* Flow status pinned to bottom of chat panel */}
        <FlowStatusIndicator onReset={handleReset} />
      </div>

      {/* Right panel: Agent delivery surface — interactive content */}
      <div className="hidden lg:flex flex-1 overflow-auto">
        {selectedMode ? (
          <div className="flex-1 max-w-4xl mx-auto px-6 py-6 w-full">
            <ExperienceBack onBack={handleBack} />
            <RightPanelContent
              mode={selectedMode}
              onComplete={handleSubflowExit}
            />
          </div>
        ) : (
          <ModeSelectionGrid onSelect={handleChoice} />
        )}
      </div>
    </div>
  );
}

// ── Mode selection grid (right panel) ─────────────────────

function ModeSelectionGrid({ onSelect }: { onSelect: (id: string) => void }) {
  const allScreenOptions = useMemo<ScreenOption[]>(() => [
    ...MODE_OPTIONS.map((opt) => ({
      id: opt.id,
      label: opt.label,
      keywords: opt.description.split(/\s+/).filter((w) => w.length > 4),
      action: () => onSelect(opt.id),
    })),
    ...SPECIAL_TILES.map((tile) => ({
      id: tile.id,
      label: tile.label,
      keywords: tile.description.split(/\s+/).filter((w) => w.length > 4),
      action: () => onSelect(tile.id),
    })),
  ],
    [onSelect],
  );
  useScreenOptions(allScreenOptions);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Flow-registry-driven tiles */}
          {MODE_OPTIONS.map((option, i) => (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className="group relative text-left rounded-xl border-2 border-border p-7 transition-all duration-300
                hover:border-primary/50 hover:bg-muted/50 hover:shadow-lg hover:scale-[1.03]
                animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="absolute top-3 right-3">
                {constructionBadge}
              </div>
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors
                  bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base">{option.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
          {/* Special tiles (non-flow navigation) */}
          {SPECIAL_TILES.map((tile, i) => (
            <button
              key={tile.id}
              onClick={() => onSelect(tile.id)}
              className="group text-left rounded-xl border-2 border-dashed border-primary/40 p-7 transition-all duration-300
                hover:border-primary hover:bg-primary/5 hover:shadow-lg hover:scale-[1.03]
                animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${(MODE_OPTIONS.length + i) * 60}ms` }}
            >
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors
                  bg-primary/10 text-primary group-hover:bg-primary/20">
                  {tile.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base">{tile.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {tile.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Right panel: subflow experience rendering ────────────

function RightPanelContent({
  mode,
  onComplete,
}: {
  mode: LearningModeId;
  onComplete: (summary?: string) => void;
}) {
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {mode === "video" && <VideoDiscoveryFlow onComplete={onComplete} />}
      {mode === "chat" && <AiConsultationFlow onComplete={onComplete} />}
      {mode === "interviewer" && <AiConsultationFlow config={RECURSIVE_INTERVIEWER_CONFIG} onComplete={onComplete} />}
      {mode === "linkedin" && <LinkedInStrategistFlow onComplete={onComplete} />}
      {mode === "socratic" && <AiConsultationFlow config={SOCRATIC_ARCHITECT_CONFIG} onComplete={onComplete} />}
      {mode === "work-with-me" && <WorkWithMeFlow onComplete={onComplete} />}
    </div>
  );
}

/** Landing page shell for unauthenticated users */
export default function Landing() {
  return (
    <FlowBusProvider>
      <FlowChatProvider voiceDefaultOn>
        <div className="h-screen flex flex-col bg-background overflow-hidden">
          <GlobalHeader variant="landing" />
          <main className="flex-1 flex overflow-hidden pt-14">
            <LandingContent />
          </main>
        </div>
      </FlowChatProvider>
    </FlowBusProvider>
  );
}
