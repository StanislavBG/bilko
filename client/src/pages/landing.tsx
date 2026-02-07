/**
 * Landing Page — Split-panel agentic experience.
 *
 * Left panel:  Conversation LOG — text record of the dialogue
 *              between Bilko and the user. No interactive cards here.
 *
 * Right panel:  Agent DELIVERY SURFACE — where Bilko delivers
 *               interactive content (mode selection, experiences,
 *               quizzes, flows). The agent controls both panels but
 *               all deliveries to the user happen in the main area.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { GlobalHeader } from "@/components/global-header";
import {
  ConversationCanvas,
  type ConversationTurn,
} from "@/components/conversation-canvas";
import { VideoDiscoveryFlow } from "@/components/video-discovery-flow";
import {
  AiConsultationFlow,
  RECURSIVE_INTERVIEWER_CONFIG,
  LINKEDIN_STRATEGIST_CONFIG,
  SOCRATIC_ARCHITECT_CONFIG,
} from "@/components/ai-consultation-flow";
import { bilkoSays } from "@/lib/bilko-persona";
import { ENTRANCE_DELAY_MS } from "@/lib/bilko-persona/pacing";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { chat } from "@/lib/flow-engine";
import { Button } from "@/components/ui/button";
import {
  Play,
  Sparkles,
  MessageCircle,
  ArrowLeft,
  Lightbulb,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import type { LearningModeId } from "@/lib/workflow";
import { LEARNING_MODES } from "@/lib/workflow/flows/welcome-flow";
import {
  ConversationProvider,
  useConversation,
} from "@/contexts/conversation-context";
import { FlowBusProvider, useFlowBus } from "@/contexts/flow-bus-context";
import { FlowStatusIndicator } from "@/components/flow-status-indicator";

// ── Mode definitions for the delivery surface ────────────

interface ModeOption {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
}

const iconMap: Record<string, ReactNode> = {
  Play: <Play className="h-5 w-5" />,
  MessageCircle: <MessageCircle className="h-5 w-5" />,
  Lightbulb: <Lightbulb className="h-5 w-5" />,
  Briefcase: <Briefcase className="h-5 w-5" />,
  GraduationCap: <GraduationCap className="h-5 w-5" />,
};

const MODE_OPTIONS: ModeOption[] = LEARNING_MODES.map((mode) => ({
  id: mode.id,
  label: mode.label,
  description: mode.description,
  icon: iconMap[mode.icon] ?? <Sparkles className="h-5 w-5" />,
}));

// ── LLM greeting prompt ──────────────────────────────────

const GREETING_SYSTEM_PROMPT = bilkoSystemPrompt(
  `You are greeting a new visitor to the Mental Gym. This is their first interaction with you.

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
  "Welcome to the Mental Gym. I'm Bilko — your AI training partner. What would you like to work on today?";

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

// ── Main component ───────────────────────────────────────

export function LandingContent({ skipWelcome = false }: { skipWelcome?: boolean }) {
  const {
    messages,
    selectedMode,
    isRestored,
    addMessage,
    selectMode,
    clearMode,
    reset: resetConversation,
  } = useConversation();
  const [, navigate] = useLocation();

  const [greetingLoading, setGreetingLoading] = useState(false);

  // Generate Bilko's opening via LLM on first visit
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current || messages.length > 0) return;
    didInit.current = true;

    if (skipWelcome) {
      // Authenticated users — shorter opening
      addMessage({
        role: "bilko",
        text: "What do you want to train today?",
        speech: "What do you want to train today?",
        meta: { type: "greeting" },
      });
      return;
    }

    // LLM-generated greeting — Bilko opens the conversation dynamically
    setGreetingLoading(true);
    chat(
      [
        { role: "system", content: GREETING_SYSTEM_PROMPT },
        { role: "user", content: "A new visitor just arrived at the Mental Gym." },
      ],
      { temperature: 0.9 },
    )
      .then((result) => {
        const text = result.data.trim();
        addMessage({
          role: "bilko",
          text,
          speech: text,
          meta: { type: "greeting" },
        });
      })
      .catch(() => {
        // Fallback if LLM is unavailable
        addMessage({
          role: "bilko",
          text: GREETING_FALLBACK,
          speech: GREETING_FALLBACK,
          meta: { type: "greeting" },
        });
      })
      .finally(() => setGreetingLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChoice = useCallback(
    (choiceId: string) => {
      const mode = choiceId as LearningModeId;
      const modeLabel = LEARNING_MODES.find((m) => m.id === mode)?.label;

      // Record user's choice
      addMessage({
        role: "user",
        text: modeLabel ?? choiceId,
        meta: { type: "choice", modeId: mode, modeLabel },
      });

      // Bilko acknowledges the choice
      const speech = bilkoSays({
        event: "choice-made",
        topic: modeLabel,
      });
      addMessage({
        role: "bilko",
        text: speech.text,
        speech: speech.speech,
        meta: { type: "acknowledgment", modeId: mode },
      });

      selectMode(mode);
    },
    [addMessage, selectMode],
  );

  const handleBack = useCallback(() => {
    addMessage({
      role: "user",
      text: "Show me what else you've got",
      meta: { type: "back" },
    });

    addMessage({
      role: "bilko",
      text: "What else are you interested in?",
      speech: "What else are you interested in?",
      meta: { type: "question" },
    });

    clearMode();
  }, [addMessage, clearMode]);

  // ── Derive conversation turns from actual messages (single source of truth) ──
  const conversationTurns = useMemo<ConversationTurn[]>(() => {
    // While LLM is generating the greeting, show typing indicator
    if (greetingLoading || messages.length === 0) {
      return [
        {
          type: "content" as const,
          render: () => (
            <div className="flex items-center gap-1.5 py-4">
              <span className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-primary/50 animate-pulse [animation-delay:200ms]" />
              <span className="w-2 h-2 rounded-full bg-primary/50 animate-pulse [animation-delay:400ms]" />
            </div>
          ),
        },
      ];
    }

    return messages.map((msg, i) => {
      // Bilko messages → typewriter turns
      if (msg.role === "bilko") {
        return {
          type: "bilko" as const,
          text: msg.text,
          speech: msg.speech,
          delay: i === 0 ? ENTRANCE_DELAY_MS : 200,
        };
      }

      // User choice → compact icon + label
      if (msg.meta?.type === "choice") {
        const modeIcon = LEARNING_MODES.find((m) => m.id === msg.meta?.modeId)?.icon;
        return {
          type: "content" as const,
          render: () => (
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                {iconMap[modeIcon ?? ""] ?? <Sparkles className="h-3.5 w-3.5" />}
              </div>
              <span>{msg.text}</span>
            </div>
          ),
        };
      }

      // Other user messages (back, etc.)
      return {
        type: "content" as const,
        render: () => (
          <div className="text-sm text-muted-foreground italic">
            {msg.text}
          </div>
        ),
      };
    });
  }, [messages, greetingLoading]);

  // Subscribe to FlowBus messages addressed to "main" conversation
  const { subscribe } = useFlowBus();
  useEffect(() => {
    const unsub = subscribe("main", (msg) => {
      if (msg.type === "summary" && typeof msg.payload.summary === "string") {
        addMessage({
          role: "bilko",
          text: msg.payload.summary,
          speech: msg.payload.summary,
          meta: { type: "subflow-summary", fromFlow: msg.from },
        });
      }
    });
    return unsub;
  }, [subscribe, addMessage]);

  // Reset: clear conversation state and navigate to the root
  // (which renders landing for unauth, home for auth)
  const handleReset = useCallback(() => {
    resetConversation();
    navigate("/", { replace: true });
    // Force a full remount by reloading — ensures greeting re-fires
    window.location.reload();
  }, [resetConversation, navigate]);

  // On restored session, skip animations for all existing turns
  const initialSettledCount = isRestored ? conversationTurns.length : 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel: Conversation log + flow indicator pinned to bottom */}
      <div className="w-full lg:w-[420px] xl:w-[480px] shrink-0 lg:border-r border-border flex flex-col bg-background">
        <div className="flex-1 overflow-auto">
          <ConversationCanvas
            turns={conversationTurns}
            onChoice={() => {}}
            compact
            initialSettledCount={initialSettledCount}
          />
        </div>
        {/* Flow status pinned to bottom of chat panel */}
        <FlowStatusIndicator onReset={handleReset} />
      </div>

      {/* Right panel: Agent delivery surface — interactive content goes here */}
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

// ── Mode selection grid (main area delivery) ─────────────

function ModeSelectionGrid({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-3xl w-full space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODE_OPTIONS.map((option, i) => (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className="group text-left rounded-xl border-2 border-border p-5 transition-all duration-300
                hover:border-primary/50 hover:bg-muted/50 hover:shadow-md hover:scale-[1.02]
                animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
                  bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{option.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {option.description}
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
// Each mode is a subflow of the main conversation. The left panel
// continues logging independently while the subflow runs here.

function RightPanelContent({ mode }: { mode: LearningModeId }) {
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {mode === "video" && <VideoDiscoveryFlow />}
      {mode === "chat" && <AiConsultationFlow />}
      {mode === "interviewer" && <AiConsultationFlow config={RECURSIVE_INTERVIEWER_CONFIG} />}
      {mode === "linkedin" && <AiConsultationFlow config={LINKEDIN_STRATEGIST_CONFIG} />}
      {mode === "socratic" && <AiConsultationFlow config={SOCRATIC_ARCHITECT_CONFIG} />}
    </div>
  );
}

/** Landing page shell for unauthenticated users */
export default function Landing() {
  return (
    <FlowBusProvider>
      <ConversationProvider>
        <div className="h-screen flex flex-col bg-background overflow-hidden">
          <GlobalHeader variant="landing" />
          <main className="flex-1 flex overflow-hidden pt-14">
            <LandingContent />
          </main>
        </div>
      </ConversationProvider>
    </FlowBusProvider>
  );
}
