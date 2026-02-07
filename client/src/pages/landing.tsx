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

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { GlobalHeader } from "@/components/global-header";
import {
  ConversationCanvas,
  type ConversationTurn,
} from "@/components/conversation-canvas";
import type { ContentBlock } from "@/components/content-blocks/types";
import { BlockSequence } from "@/components/content-blocks";
import { PromptPlayground } from "@/components/prompt-playground";
import { VideoDiscoveryFlow } from "@/components/video-discovery-flow";
import {
  AiConsultationFlow,
  RECURSIVE_INTERVIEWER_CONFIG,
  LINKEDIN_STRATEGIST_CONFIG,
  SOCRATIC_ARCHITECT_CONFIG,
} from "@/components/ai-consultation-flow";
import { bilkoSays } from "@/lib/bilko-persona";
import { Button } from "@/components/ui/button";
import {
  Play,
  Sparkles,
  Trophy,
  MessageCircle,
  Compass,
  Zap,
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

// ── Mode definitions for the delivery surface ────────────

interface ModeOption {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
}

const iconMap: Record<string, ReactNode> = {
  Play: <Play className="h-5 w-5" />,
  Trophy: <Trophy className="h-5 w-5" />,
  Sparkles: <Sparkles className="h-5 w-5" />,
  Compass: <Compass className="h-5 w-5" />,
  MessageCircle: <MessageCircle className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
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

// ── Content block definitions for each mode ──────────────

const QUIZ_BLOCKS: ContentBlock[] = [
  {
    id: "quiz-intro",
    type: "callout",
    variant: "insight",
    title: "AI Knowledge Quiz",
    body: "Three questions to test your AI fundamentals. No pressure — this is how we learn.",
  },
  {
    id: "q1",
    type: "quiz",
    question: "What does AI stand for?",
    options: [
      { id: "a", text: "Artificial Intelligence" },
      { id: "b", text: "Automated Internet" },
      { id: "c", text: "Advanced Information" },
      { id: "d", text: "Analog Interface" },
    ],
    correctIndex: 0,
    explanation: "Artificial Intelligence — the field of computer science focused on creating systems that can perform tasks typically requiring human intelligence.",
  },
  {
    id: "q2",
    type: "quiz",
    question: "Which of these is an AI language model?",
    options: [
      { id: "a", text: "GPT-4" },
      { id: "b", text: "HTML" },
      { id: "c", text: "SQL" },
      { id: "d", text: "CSS" },
    ],
    correctIndex: 0,
    explanation: "GPT-4 is a large language model by OpenAI. HTML, SQL, and CSS are web/database technologies, not AI models.",
  },
  {
    id: "q3",
    type: "quiz",
    question: "What is a 'prompt' in AI?",
    options: [
      { id: "a", text: "A type of computer virus" },
      { id: "b", text: "The input you give to an AI" },
      { id: "c", text: "A programming language" },
      { id: "d", text: "A hardware component" },
    ],
    correctIndex: 1,
    explanation: "A prompt is the text you provide to an AI model to get a response. Good prompts lead to better results — that's a key skill we'll practice here.",
  },
];

const EXPLORE_BLOCKS: ContentBlock[] = [
  {
    id: "explore-heading",
    type: "heading",
    text: "Training Tracks",
    level: 2,
  },
  {
    id: "explore-intro",
    type: "text",
    content: "The Mental Gym is organized into three tracks. Each builds on the last, taking you from beginner to architect.",
    variant: "lead",
  },
  {
    id: "explore-tracks",
    type: "comparison",
    columns: ["Track", "Focus", "Levels"],
    rows: [
      { label: "Recruit", values: ["From Zero to Builder", "Fundamentals, prompts, first projects", "10"] },
      { label: "Specialist", values: ["Deep Technical Mastery", "Advanced techniques, fine-tuning, evaluation", "10"] },
      { label: "Architect", values: ["Enterprise Scale", "System design, orchestration, production", "10"] },
    ],
  },
  {
    id: "explore-tip",
    type: "callout",
    variant: "tip",
    body: "Start with Recruit even if you have experience. The levels are designed to fill gaps you might not know you have.",
  },
];

const QUICK_START_BLOCKS: ContentBlock[] = [
  {
    id: "qs-heading",
    type: "heading",
    text: "Three Steps. Three Minutes.",
    level: 2,
  },
  {
    id: "qs-steps",
    type: "steps",
    steps: [
      {
        title: "Learn to Prompt",
        body: "Good prompts lead to better results. We'll teach you the patterns that work — specificity, context, constraints, and iteration.",
      },
      {
        title: "Practice Hands-On",
        body: "Try real exercises with immediate feedback. The Gym gives you structured challenges that build real skill, not just knowledge.",
      },
      {
        title: "Track Progress",
        body: "Level up through three tracks. Earn badges. Build a portfolio of completed challenges that proves you know your stuff.",
      },
    ],
  },
  {
    id: "qs-callout",
    type: "callout",
    variant: "insight",
    body: "Most people learn AI by reading about it. At the Mental Gym, you learn by doing it. Every concept comes with practice.",
  },
];

// ── Bilko's contextual responses per mode ────────────────

function getBilkoResponse(mode: LearningModeId): { text: string; speech: string } {
  const speech = bilkoSays({
    event: "choice-made",
    topic: LEARNING_MODES.find((m) => m.id === mode)?.label,
  });
  return { text: speech.text, speech: speech.speech };
}

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
  } = useConversation();

  // Record initial messages on first visit (not on restore)
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current || messages.length > 0) return;
    didInit.current = true;

    if (!skipWelcome) {
      const greeting = bilkoSays({ event: "greeting" });
      addMessage({
        role: "bilko",
        text: greeting.text,
        speech: greeting.speech,
        meta: { type: "greeting" },
      });
    }

    addMessage({
      role: "bilko",
      text: "How do you want to train today?",
      speech: "How do you want to train today?",
      meta: { type: "question" },
    });
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

      // Record Bilko's acknowledgment
      const response = getBilkoResponse(mode);
      addMessage({
        role: "bilko",
        text: response.text,
        speech: response.speech,
        meta: { type: "acknowledgment", modeId: mode },
      });

      selectMode(mode);
    },
    [addMessage, selectMode],
  );

  const handleBack = useCallback(() => {
    addMessage({
      role: "user",
      text: "Ask me something else",
      meta: { type: "back" },
    });
    clearMode();
  }, [addMessage, clearMode]);

  // ── Left panel: conversation LOG only (no interactive cards) ──
  const conversationTurns = useMemo<ConversationTurn[]>(() => {
    const t: ConversationTurn[] = [];

    // Bilko's greeting
    if (!skipWelcome) {
      const greeting = bilkoSays({ event: "greeting" });
      t.push({
        type: "bilko",
        text: greeting.text,
        speech: greeting.speech,
        delay: 200,
      });
    }

    // Bilko asks the question
    t.push({
      type: "bilko",
      text: "How do you want to train today?",
      speech: "How do you want to train today?",
      delay: skipWelcome ? 100 : 400,
    });

    // If user picked a mode, log it as compact text entries
    if (selectedMode) {
      const modeLabel = LEARNING_MODES.find((m) => m.id === selectedMode)?.label ?? selectedMode;
      const modeIcon = LEARNING_MODES.find((m) => m.id === selectedMode)?.icon;

      // User's choice (compact log entry)
      t.push({
        type: "content",
        render: () => (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
              {iconMap[modeIcon ?? ""] ?? <Sparkles className="h-3.5 w-3.5" />}
            </div>
            <span>{modeLabel}</span>
          </div>
        ),
      });

      // Bilko's acknowledgment
      const response = getBilkoResponse(selectedMode);
      t.push({ type: "bilko", ...response, delay: 200 });
    }

    return t;
  }, [skipWelcome, selectedMode]);

  // On restored session, skip animations for all existing turns
  const initialSettledCount = isRestored ? conversationTurns.length : 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel: Conversation log — text-only record of the dialogue */}
      <div className="w-full lg:w-[420px] xl:w-[480px] shrink-0 lg:border-r border-border overflow-auto bg-background">
        <ConversationCanvas
          turns={conversationTurns}
          onChoice={() => {}}
          compact
          initialSettledCount={initialSettledCount}
        />
      </div>

      {/* Right panel: Agent delivery surface — interactive content goes here */}
      <div className="hidden lg:flex flex-1 overflow-auto">
        {selectedMode ? (
          <div className="flex-1 max-w-4xl mx-auto px-6 py-6 w-full">
            <ExperienceBack onBack={handleBack} />
            <RightPanelContent mode={selectedMode} onBack={handleBack} />
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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

// ── Right panel content (experience rendering) ──────────

function RightPanelContent({
  mode,
  onBack,
}: {
  mode: LearningModeId;
  onBack: () => void;
}) {
  if (mode === "quiz") {
    return <BlockSequenceWrapper blocks={QUIZ_BLOCKS} />;
  }
  if (mode === "explore") {
    return <BlockSequenceWrapper blocks={EXPLORE_BLOCKS} />;
  }
  if (mode === "quick") {
    return <BlockSequenceWrapper blocks={QUICK_START_BLOCKS} />;
  }

  // Interactive modes (video, prompt, chat, interviewer, etc.)
  return <ExperiencePanel mode={mode} onBack={onBack} />;
}

function BlockSequenceWrapper({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <BlockSequence blocks={blocks} />
    </div>
  );
}

// ── Experience panel (for non-block modes) ───────────────

function ExperiencePanel({
  mode,
}: {
  mode: LearningModeId;
  onBack?: () => void;
}) {
  return (
    <div className="w-full">
      {mode === "video" && <VideoDiscoveryFlow />}

      {mode === "prompt" && (
        <PromptPlayground
          title="Your First AI Prompt"
          description="Try asking AI anything! Start with something simple like 'Explain AI to a 5 year old'."
          placeholder="Type your prompt here and press Enter..."
          showModelSelector={true}
        />
      )}

      {mode === "chat" && <AiConsultationFlow />}

      {mode === "interviewer" && (
        <AiConsultationFlow config={RECURSIVE_INTERVIEWER_CONFIG} />
      )}

      {mode === "linkedin" && (
        <AiConsultationFlow config={LINKEDIN_STRATEGIST_CONFIG} />
      )}

      {mode === "socratic" && (
        <AiConsultationFlow config={SOCRATIC_ARCHITECT_CONFIG} />
      )}
    </div>
  );
}

/** Landing page shell for unauthenticated users */
export default function Landing() {
  return (
    <ConversationProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <GlobalHeader variant="landing" />
        <main className="flex-1 flex overflow-hidden pt-14">
          <LandingContent />
        </main>
      </div>
    </ConversationProvider>
  );
}
