/**
 * Landing Page — Flow-driven split-panel experience.
 *
 * This is the bilko-main flow (registered in flow-inspector/registry).
 *
 * Left panel:  FlowChat — messages only.
 * Right panel:  Delivery surface — mode grid or sub-flow experience.
 *
 * Flow architecture (while-loop):
 *
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │                                                                      │
 *   ▼                                                                      │
 *  [greeting] → [greeting-chat] → [mode-selection] → [run-subflow]        │
 *                                                         │                │
 *                                                    onComplete(summary)   │
 *                                                         ▼                │
 *                                              [summarize-and-recycle] ────┘
 *                                                   (recycleContext)
 *
 * The greeting node generates the text, the greeting-chat node
 * publishes it to the FlowChat panel. This separation makes it
 * explicit what gets pushed to the user-visible chat.
 *
 * Active flows: Video Recommendation, Explore the Site (sidebar toggle)
 * All other flows are on standby — see registry.ts.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { GlobalHeader } from "@/components/global-header";
import { FlowChat } from "@/components/flow-chat";
import { VideoDiscoveryFlow } from "@/components/video-discovery-flow";
import { FakeGameFlow } from "@/components/fake-game-flow";
import {
  AiConsultationFlow,
  RECURSIVE_INTERVIEWER_CONFIG,
  SOCRATIC_ARCHITECT_CONFIG,
} from "@/components/ai-consultation-flow";
import { LinkedInStrategistFlow } from "@/components/linkedin-strategist-flow";
import { WorkWithMeFlow } from "@/components/work-with-me-flow";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { getFlowAgent } from "@/lib/bilko-persona/flow-agents";
import { chat, useFlowExecution, FlowChatProvider, useFlowChat } from "@/lib/bilko-flow";
import { Button } from "@/components/ui/button";
import {
  Play,
  Sparkles,
  ArrowLeft,
  Compass,
  Gamepad2,
} from "lucide-react";
import type { LearningModeId } from "@/lib/workflow";
import { LEARNING_MODES } from "@/lib/workflow/flows/welcome-flow";
import { flowRegistry, activeFlowIds } from "@/lib/bilko-flow/definitions/registry";
import { FlowBusProvider, useFlowBus } from "@/contexts/flow-bus-context";
import { FlowStatusIndicator, FlowProgressBanner } from "@/components/flow-status-indicator";
import { useConversationDesign, matchScreenOption, useScreenOptions, type ScreenOption } from "@/contexts/conversation-design-context";
import { useSidebarSafe } from "@/components/ui/sidebar";

// ── Owner ID for this flow ────────────────────────────────
const OWNER_ID = "bilko-main";

// ── Mode definitions for the delivery surface ────────────
// Only active flows appear as tiles. Standby flows are excluded.

interface ModeOption {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
}

const iconMap: Record<string, ReactNode> = {
  Play: <Play className="h-6 w-6" />,
  Gamepad2: <Gamepad2 className="h-6 w-6" />,
};

/** Menu items — only ACTIVE flows from the registry (excludes bilko-main and standby) */
const MODE_OPTIONS: ModeOption[] = flowRegistry
  .filter((f) => f.location === "landing" && f.id !== "bilko-main" && activeFlowIds.has(f.id))
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

/** Maps flow registry IDs to the short mode IDs used by RightPanelContent */
const FLOW_TO_MODE: Record<string, LearningModeId> = {
  "video-discovery": "video",
  "ai-consultation": "chat",
  "recursive-interviewer": "interviewer",
  "linkedin-strategist": "linkedin",
  "socratic-architect": "socratic",
  "work-with-me": "work-with-me",
  "fake-game": "fake-game",
};

// ── Subflow ID mapping ──────────────────────────────────

/** Maps learning mode IDs to their chat owner IDs (used for claimChat) */
const MODE_TO_OWNER: Record<string, string> = {
  video: "video-discovery",
  chat: "ai-consultation",
  interviewer: "recursive-interviewer",
  linkedin: "linkedin-strategist",
  socratic: "socratic-architect",
  "work-with-me": "work-with-me",
  "fake-game": "fake-game",
};

// ── LLM greeting prompts ────────────────────────────────

/** Build greeting context from active flows only */
const activeFlowDescriptions = flowRegistry
  .filter((f) => f.location === "landing" && f.id !== "bilko-main" && activeFlowIds.has(f.id))
  .map((f) => `- ${f.name}: ${f.description}`)
  .join("\n");

const GREETING_FRESH_PROMPT = bilkoSystemPrompt(
  `You are greeting a new visitor to the AI School. This is their first interaction with you.

Generate a warm, natural opening. Welcome them, introduce yourself briefly as Bilko their AI training partner, and ask how they'd like to learn today. Make it feel like meeting a friendly coach — not a scripted bot.

Available experiences they can pick from:
${activeFlowDescriptions}
- Explore the Site: Browse the full AI School navigation

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
2. Match your energy to the mood implied by the summary. If the summary mentions a mood or emotional state (e.g. "energized", "challenged", "humbled"), tune your tone accordingly:
   - Energized/triumphant → high energy, celebrate with them
   - Focused/determined → steady, encouraging, forward-looking
   - Challenged/motivated → supportive, "you're building something here"
   - Humbled/curious → warm, reassuring, "that's how you grow"
3. Ask what they want to do next

Available options:
${activeFlowDescriptions}
- Explore the Site: Browse the full AI School navigation

Rules:
- 2-3 sentences max. Keep it warm and match the energy.
- Reference what they just did AND how it seems to have gone — show you were paying attention.
- End with a question about what's next.
- Plain text only. No formatting, no markdown, no JSON.`,
);

const GREETING_FALLBACK =
  "Welcome to the AI School. I'm Bilko — your AI training partner. What would you like to work on today?";

const GREETING_RETURN_FALLBACK =
  "Good session. I'm back. What do you want to try next?";

// ── Bilko's patience ────────────────────────────────────
const PATIENCE_THRESHOLD = 3;

/** Build guidance from active flows only */
const activeFlowNames = flowRegistry
  .filter((f) => f.location === "landing" && f.id !== "bilko-main" && activeFlowIds.has(f.id))
  .map((f) => f.name);
const flowNameList = [...activeFlowNames, "Explore the Site"].join(", ");

const GUIDANCE_MESSAGES = [
  { text: "Take your time. When you're ready, just say the name of an experience — or tap one on the right." },
  { text: "Still here. You can pick an experience by name, or just tap one of the options on the right side." },
  { text: `No rush. The options are: ${flowNameList}. Say any of those or tap one.` },
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

export function LandingContent() {
  const { pushMessage, clearMessages, claimChat, releaseChat } = useFlowChat();
  const { trackStep, resolveUserInput } = useFlowExecution("bilko-main");
  const { userTurnDone } = useConversationDesign();
  const [, navigate] = useLocation();
  const sidebarCtx = useSidebarSafe();

  const [selectedMode, setSelectedMode] = useState<LearningModeId | null>(null);
  const [greetingLoading, setGreetingLoading] = useState(false);

  // AbortController for in-flight LLM calls — aborted on unmount
  const abortRef = useRef<AbortController>(new AbortController());

  // Track completed activity summaries for Bilko's recursive learning
  const activityLogRef = useRef<Array<{ modeId: string; modeLabel: string; summary: string }>>([]);

  // ── App-switch teardown ──────────────────────────────────
  // When the user navigates away from Dynamic Learning,
  // immediately halt all flow activity — like swapping apps on iPhone.
  useEffect(() => {
    return () => {
      // 1. Abort any in-flight LLM requests
      abortRef.current.abort();

      // 2. Reset conversation floor to idle so other apps start clean
      userTurnDone();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Greeting Node (HEAD) — reusable, context-aware ──
  //
  // This is the HEAD of the flow. It runs:
  // - First invocation: no context → fresh welcome
  // - After sub-flow exit: with summary → personalized return
  //
  // The greeting node generates text (LLM step), then immediately
  // publishes it to the chat panel (CHAT step: greeting-chat).

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
        // Step 1: greeting (LLM) — generate the text
        // Race the LLM call against a timeout so the greeting always appears
        // even if the Gemini API is slow or unavailable.
        const { data: greetingResult } = await trackStep(
          stepId,
          { context: context ?? { visitor: "new" }, isReturn },
          async () => {
            let text: string;
            try {
              const result = await Promise.race([
                chat(
                  [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage },
                  ],
                  { temperature: 0.9, signal: abortRef.current.signal },
                ),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error("greeting timeout")), 5000),
                ),
              ]);
              text = result.data.trim() || fallback;
            } catch (err) {
              // If aborted (user navigated away), bail out entirely
              if (abortRef.current.signal.aborted) return { greeting: "" };
              text = fallback;
            }

            return { greeting: text };
          },
        );

        // Step 2: greeting-chat (chat) — publish to FlowChat panel
        // If aborted (user navigated away), skip publishing
        const greetingText = greetingResult.greeting;
        if (!greetingText || abortRef.current.signal.aborted) return;

        await trackStep(
          isReturn ? `greeting-chat-return-${Date.now()}` : "greeting-chat",
          { greeting: greetingText },
          async () => {
            pushMessage(OWNER_ID, {
              speaker: "bilko",
              text: greetingText,
            });
            return {};
          },
        );
      } catch {
        // If aborted (user navigated away), don't push fallback
        if (abortRef.current.signal.aborted) return;

        // If the entire greeting flow fails, push the fallback directly
        pushMessage(OWNER_ID, {
          speaker: "bilko",
          text: fallback,
        });
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
  // "Explore the Site" opens the sidebar — no login redirect.

  const handleChoice = useCallback(
    (choiceId: string) => {
      // Special tiles — handle non-flow actions
      if (choiceId === "explore") {
        // "Explore the Site" = open the sidebar navigation.
        // Works for both auth and unauth (Landing is wrapped in SidebarProvider).
        // Never redirects to login.
        if (sidebarCtx) {
          sidebarCtx.setOpen(true);
        }
        return;
      }

      // Resolve flow registry ID → short mode ID for component rendering
      const mode = FLOW_TO_MODE[choiceId] ?? (choiceId as LearningModeId);
      const flowDef = flowRegistry.find((f) => f.id === choiceId);
      const modeLabel = flowDef?.name ?? LEARNING_MODES.find((m) => m.id === mode)?.label;
      const _agent = getFlowAgent(choiceId);

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

      // Track run-subflow step start (display step — stays running until onComplete)
      trackStep(
        `run-subflow-${Date.now()}`,
        { selectedMode: mode },
        async () => {
          // Activate the sub-flow (renders in right panel)
          setSelectedMode(mode);
          return { status: "running", subflowOwner: subflowOwnerId };
        },
      );
    },
    [pushMessage, resolveUserInput, sidebarCtx, claimChat, trackStep],
  );

  // ── Sub-flow exit — summarize-and-recycle step ──
  //
  // Called when:
  // 1. Sub-flow calls onComplete(summary) — natural completion
  // 2. User clicks "Ask me something else" — manual exit
  //
  // This is the TAIL of the while-loop:
  //   run-subflow → summarize-and-recycle → greeting (recycled)
  //
  // The summarize-and-recycle step:
  // 1. Captures exit summary from sub-flow
  // 2. Releases chat ownership back to bilko-main
  // 3. Logs the activity
  // 4. Produces recycleContext and feeds it back to the greeting node

  const handleSubflowExit = useCallback(
    (exitSummary?: string) => {
      const lastActivity = activityLogRef.current[activityLogRef.current.length - 1];
      const summary = exitSummary ?? lastActivity?.summary;
      const modeLabel = lastActivity?.modeLabel ?? "the session";

      // ── summarize-and-recycle step (tracked) ──
      trackStep(
        `summarize-and-recycle-${Date.now()}`,
        { exitSummary, modeLabel },
        async () => {
          // Release chat ownership back to bilko-main
          releaseChat();

          // System return divider
          pushMessage(OWNER_ID, {
            speaker: "system",
            text: "Returning to Bilko",
          });

          // Clear the selected mode — show mode grid again
          setSelectedMode(null);

          const recycleContext = summary
            ? { modeLabel, summary }
            : null;

          return { recycleContext };
        },
      ).then(() => {
        // ── receive-experience step (external-input) ──
        // Track the external-input node that captures the experience data
        // for mood-aware greeting on the next loop iteration.
        if (summary) {
          trackStep(
            `receive-experience-${Date.now()}`,
            { source: "subflow-exit" },
            async () => ({
              experienceSummary: summary,
              mood: "inferred-from-summary",
              sourceFlow: modeLabel,
            }),
          );
        }

        // ── Recycle to HEAD: re-run greeting with summary context ──
        if (summary) {
          runGreeting({ modeLabel, summary });
        } else {
          runGreeting();
        }
      });
    },
    [pushMessage, releaseChat, runGreeting, trackStep],
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

      // 2. Fall back to active flow voice trigger + name matching
      const lower = text.toLowerCase();
      const menuFlows = flowRegistry.filter(
        (f) => f.location === "landing" && f.id !== "bilko-main" && activeFlowIds.has(f.id),
      );
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

      // Check for "explore" voice trigger
      if (lower.includes("explore") || lower.includes("browse") || lower.includes("navigate")) {
        unmatchedCountRef.current = 0;
        handleChoice("explore");
        return;
      }

      // No match — patience counter (only when bilko-main owns the chat)
      unmatchedCountRef.current += 1;

      if (unmatchedCountRef.current >= PATIENCE_THRESHOLD) {
        const msg = GUIDANCE_MESSAGES[guidanceRoundRef.current % GUIDANCE_MESSAGES.length];
        pushMessage(OWNER_ID, {
          speaker: "bilko",
          text: msg.text,
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
        const _fromAgent = getFlowAgent(msg.from);
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
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Maximized flow progress banner — full width at top when subflow is active */}
      {selectedMode && <FlowProgressBanner onReset={handleReset} />}

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left panel: Flow Chat — messages only, no options */}
        <div className="w-full lg:w-[420px] xl:w-[480px] flex-1 lg:flex-none min-h-0 border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-background">
          <FlowChat />
          {/* Compact flow status at bottom of chat — only when banner isn't showing */}
          {!selectedMode && <FlowStatusIndicator onReset={handleReset} />}
        </div>

        {/* Right panel: Agent delivery surface — interactive content */}
        <div className="flex flex-1 overflow-auto min-h-0">
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
    </div>
  );
}

// ── Mode selection grid (right panel) ─────────────────────
// Shows only two tiles: Video Recommendation + Explore the Site

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
      <div className="max-w-2xl w-full space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Active flow tiles */}
          {MODE_OPTIONS.map((option, i) => (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className="group text-left rounded-xl border-2 border-border p-7 transition-all duration-300
                hover:border-primary/50 hover:bg-muted/50 hover:shadow-lg hover:scale-[1.03]
                animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${i * 60}ms` }}
            >
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
// Only video-discovery is active. Other modes kept for backward compat
// when standby flows are re-activated.

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
      {mode === "fake-game" && <FakeGameFlow onComplete={onComplete} />}
    </div>
  );
}

/** Landing page shell — wraps in SidebarProvider so "Explore the Site" works */
export default function Landing() {
  return (
    <FlowBusProvider>
      <FlowChatProvider>
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
