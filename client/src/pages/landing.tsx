/**
 * Landing Page — Flow-driven split-panel experience.
 *
 * This is the bilko-main flow (registered in flow-inspector/registry).
 * The flow drives the entire landing experience:
 *
 * Left panel:  FlowChat — messages only (NO options, NO interactive cards).
 *              Populated by flow steps pushing (speaker, text) or user voice/typing.
 *              TTS triggers only for bilko/agent messages.
 *
 * Right panel:  Agent DELIVERY SURFACE — mode selection grid, sub-flow experiences.
 *               All interactive content lives here, not in the chat.
 *
 * Flow steps:
 * 1. greeting (llm) → push Bilko's greeting to chat with TTS
 * 2. mode-selection (user-input) → options shown in right panel, user choice pushed to chat
 * 3. agent-handoff (transform) → handoff messages pushed to chat
 * 4. run-subflow (display) → sub-flow renders in right panel
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
import { bilkoSays } from "@/lib/bilko-persona";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { getFlowAgent } from "@/lib/bilko-persona/flow-agents";
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
import { FlowBusProvider, useFlowBus } from "@/contexts/flow-bus-context";
import { FlowStatusIndicator } from "@/components/flow-status-indicator";
import { useConversationDesign, matchScreenOption, useScreenOptions, type ScreenOption } from "@/contexts/conversation-design-context";
import { useVoice } from "@/contexts/voice-context";
import { useSidebarSafe } from "@/components/ui/sidebar";

// ── Mode definitions for the delivery surface ────────────

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

const MODE_OPTIONS: ModeOption[] = LEARNING_MODES.map((mode) => ({
  id: mode.id,
  label: mode.label,
  description: mode.description,
  icon: iconMap[mode.icon] ?? <Sparkles className="h-5 w-5" />,
}));

const EXPLORE_OPTION: ModeOption = {
  id: "explore",
  label: "Explore the Site",
  description: "Browse everything Bilko's AI School has to offer",
  icon: <Compass className="h-6 w-6" />,
};

const constructionBadge = (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-amber-400/90 text-amber-950 border border-amber-500/50">
    <Construction className="h-2.5 w-2.5" />
    In Dev
  </span>
);

// ── LLM greeting prompt ──────────────────────────────────

const GREETING_SYSTEM_PROMPT = bilkoSystemPrompt(
  `You are greeting a new visitor to the AI School. This is their first interaction with you.

Generate a warm, natural opening. Welcome them, introduce yourself briefly as Bilko their AI training partner, and ask how they'd like to learn today. Make it feel like meeting a friendly coach — not a scripted bot.

Available training modes they can pick from:
${LEARNING_MODES.map((m) => `- ${m.label}: ${m.description}`).join("\n")}

Rules:
- 2-3 sentences max. Keep it tight.
- End with a natural question about how they want to train.
- Don't list all the modes — just ask warmly.
- Plain text only. No formatting, no markdown, no JSON.`,
);

const GREETING_FALLBACK =
  "Welcome to the AI School. I'm Bilko — your AI training partner. What would you like to work on today?";

// ── Bilko's patience ────────────────────────────────────
const PATIENCE_THRESHOLD = 3;

const GUIDANCE_MESSAGES = [
  {
    text: "Take your time. When you're ready, just say something like \"video\", \"interview\", or \"chat\" — or tap one on the right.",
    speech: "Take your time. When you're ready, just say something like video, interview, or chat, or tap one on the right.",
  },
  {
    text: "Still here. You can pick a training mode by name, or just tap one of the options on the right side.",
    speech: "Still here. You can pick a training mode by name, or just tap one of the options on the right side.",
  },
  {
    text: "No rush. The modes are: Video Discovery, AI Consultation, Recursive Interview, LinkedIn Strategist, Socratic Architect, and Work With Me. Say any of those or tap one.",
    speech: "No rush. The modes are Video Discovery, AI Consultation, Recursive Interview, LinkedIn Strategist, Socratic Architect, and Work With Me. Say any of those, or tap one.",
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
  const { pushMessage, clearMessages } = useFlowChat();
  const { trackStep, resolveUserInput } = useFlowExecution("bilko-main");
  const [, navigate] = useLocation();
  const { startListening, isListening } = useVoice();
  const sidebarCtx = useSidebarSafe();

  const [selectedMode, setSelectedMode] = useState<LearningModeId | null>(null);
  const [greetingLoading, setGreetingLoading] = useState(false);

  // ── Flow Step 1: Greeting — Bilko speaks first (C1) ──
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    if (skipWelcome) {
      // Authenticated users — shorter opening, tracked as flow step
      trackStep("greeting", { skipWelcome: true }, async () => {
        const text = "What do you want to train today?";
        pushMessage({
          speaker: "bilko",
          text,
          speech: text,
        });
        return { greeting: text };
      });
      return;
    }

    // LLM-generated greeting — tracked as the greeting flow step
    setGreetingLoading(true);
    trackStep("greeting", { visitor: "new" }, async () => {
      try {
        const result = await chat(
          [
            { role: "system", content: GREETING_SYSTEM_PROMPT },
            { role: "user", content: "A new visitor just arrived at the AI School." },
          ],
          { temperature: 0.9 },
        );
        const text = result.data.trim();
        pushMessage({
          speaker: "bilko",
          text,
          speech: text,
        });
        return { greeting: text };
      } catch {
        pushMessage({
          speaker: "bilko",
          text: GREETING_FALLBACK,
          speech: GREETING_FALLBACK,
        });
        return { greeting: GREETING_FALLBACK };
      }
    }).finally(() => setGreetingLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track completed activity summaries for Bilko's context-aware returns
  const activityLogRef = useRef<Array<{ modeId: string; modeLabel: string; summary: string }>>([]);

  // ── Flow Step 2: Mode Selection — user picks from right panel ──
  const handleChoice = useCallback(
    (choiceId: string) => {
      // "Explore the Site" — open sidebar or redirect
      if (choiceId === "explore") {
        if (sidebarCtx) {
          sidebarCtx.setOpen(true);
        } else {
          window.location.href = "/api/auth/login";
        }
        return;
      }

      const mode = choiceId as LearningModeId;
      const modeLabel = LEARNING_MODES.find((m) => m.id === mode)?.label;
      const agent = getFlowAgent(mode);

      // Auto-start mic on first interaction
      if (!isListening) {
        startListening();
      }

      // Track as user-input flow step
      resolveUserInput("mode-selection", { selectedMode: mode, modeLabel });

      // Push user's choice to chat (speaker: user)
      pushMessage({
        speaker: "user",
        text: modeLabel ?? choiceId,
      });

      // ── Flow Step 3: Agent Handoff ──
      // Bilko acknowledges the choice
      const handoff = bilkoSays({ event: "choice-made", topic: modeLabel });
      pushMessage({
        speaker: "bilko",
        text: agent
          ? `${handoff.text} I'm handing you over to ${agent.name}.`
          : handoff.text,
        speech: agent
          ? `${handoff.speech} I'm handing you over to ${agent.name}.`
          : handoff.speech,
      });

      // System handoff message
      if (agent) {
        pushMessage({
          speaker: "system",
          text: `Bilko \u2192 ${agent.name}`,
          handoff: {
            fromName: "Bilko",
            toName: agent.name,
            toChatName: agent.chatName,
          },
        });
      }

      // Specialist agent greets the user
      if (agent) {
        pushMessage({
          speaker: "agent",
          text: agent.greeting,
          speech: agent.greetingSpeech,
          agentName: agent.chatName,
          agentDisplayName: agent.name,
          agentAccent: agent.accentColor,
        });
      }

      // Track handoff as transform step
      resolveUserInput("agent-handoff", { agent, modeLabel });

      // Activate the sub-flow
      setSelectedMode(mode);
    },
    [pushMessage, resolveUserInput, isListening, startListening, sidebarCtx],
  );

  const handleBack = useCallback(() => {
    // Push user's back request to chat
    pushMessage({
      speaker: "user",
      text: "Show me what else you've got",
    });

    // System return message
    pushMessage({
      speaker: "system",
      text: "Returning to Bilko",
    });

    // Bilko returns — context-aware based on past activities
    const activities = activityLogRef.current;
    const lastActivity = activities[activities.length - 1];
    let returnText: string;

    if (lastActivity) {
      returnText = `Good session with ${lastActivity.modeLabel}. I'm back. What do you want to try next?`;
    } else {
      returnText = "I'm back. What else are you interested in?";
    }

    pushMessage({
      speaker: "bilko",
      text: returnText,
      speech: returnText,
    });

    setSelectedMode(null);
  }, [pushMessage]);

  // ── Conversation design: voice turn-taking ──
  const { onUserUtterance, screenOptions } = useConversationDesign();

  // ── Bilko's patience: voice → option matching ──
  const unmatchedCountRef = useRef(0);
  const guidanceRoundRef = useRef(0);

  useEffect(() => {
    const unsub = onUserUtterance((text: string) => {
      // Push what the user said to the chat
      pushMessage({ speaker: "user", text });

      // 1. Try to match against dynamic screen options
      const screenMatch = matchScreenOption(text, screenOptions);
      if (screenMatch) {
        unmatchedCountRef.current = 0;
        screenMatch.action();
        return;
      }

      // If a mode is already selected, the subflow owns the screen
      if (selectedMode) return;

      // 2. Fall back to static learning mode matching
      const lower = text.toLowerCase();
      const matched = LEARNING_MODES.find((m) => {
        const label = m.label.toLowerCase();
        const id = m.id.toLowerCase();
        const desc = m.description.toLowerCase();
        return (
          lower.includes(label) ||
          lower.includes(id) ||
          label.split(/\s+/).some((w) => w.length > 3 && lower.includes(w)) ||
          desc.split(/\s+/).some((w) => w.length > 5 && lower.includes(w))
        );
      });

      if (matched) {
        unmatchedCountRef.current = 0;
        handleChoice(matched.id);
        return;
      }

      // No match — patience counter
      unmatchedCountRef.current += 1;

      if (unmatchedCountRef.current >= PATIENCE_THRESHOLD) {
        const msg = GUIDANCE_MESSAGES[guidanceRoundRef.current % GUIDANCE_MESSAGES.length];
        pushMessage({
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

  // Subscribe to FlowBus messages addressed to "main" conversation
  const { subscribe } = useFlowBus();
  useEffect(() => {
    const unsub = subscribe("main", (msg) => {
      if (msg.type === "summary" && typeof msg.payload.summary === "string") {
        const fromAgent = getFlowAgent(msg.from);
        const modeLabel = LEARNING_MODES.find((m) => m.id === msg.from)?.label ?? msg.from;

        activityLogRef.current.push({
          modeId: msg.from,
          modeLabel,
          summary: msg.payload.summary,
        });

        if (fromAgent) {
          pushMessage({
            speaker: "agent",
            text: msg.payload.summary,
            speech: msg.payload.summary,
            agentName: fromAgent.chatName,
            agentDisplayName: fromAgent.name,
            agentAccent: fromAgent.accentColor,
          });
        } else {
          pushMessage({
            speaker: "bilko",
            text: msg.payload.summary,
            speech: msg.payload.summary,
          });
        }
      }
    });
    return unsub;
  }, [subscribe, pushMessage]);

  // Reset
  const handleReset = useCallback(() => {
    clearMessages();
    navigate("/", { replace: true });
    window.location.reload();
  }, [clearMessages, navigate]);

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
            <RightPanelContent mode={selectedMode} />
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
    {
      id: EXPLORE_OPTION.id,
      label: EXPLORE_OPTION.label,
      keywords: ["explore", "browse", "navigate", "site", "menu"],
      action: () => onSelect(EXPLORE_OPTION.id),
    },
  ],
    [onSelect],
  );
  useScreenOptions(allScreenOptions);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          {/* Explore the Site */}
          <button
            onClick={() => onSelect(EXPLORE_OPTION.id)}
            className="group text-left rounded-xl border-2 border-dashed border-primary/40 p-7 transition-all duration-300
              hover:border-primary hover:bg-primary/5 hover:shadow-lg hover:scale-[1.03]
              animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${MODE_OPTIONS.length * 60}ms` }}
          >
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors
                bg-primary/10 text-primary group-hover:bg-primary/20">
                {EXPLORE_OPTION.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">{EXPLORE_OPTION.label}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {EXPLORE_OPTION.description}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Right panel: subflow experience rendering ────────────

function RightPanelContent({ mode }: { mode: LearningModeId }) {
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {mode === "video" && <VideoDiscoveryFlow />}
      {mode === "chat" && <AiConsultationFlow />}
      {mode === "interviewer" && <AiConsultationFlow config={RECURSIVE_INTERVIEWER_CONFIG} />}
      {mode === "linkedin" && <LinkedInStrategistFlow />}
      {mode === "socratic" && <AiConsultationFlow config={SOCRATIC_ARCHITECT_CONFIG} />}
      {mode === "work-with-me" && <WorkWithMeFlow />}
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
