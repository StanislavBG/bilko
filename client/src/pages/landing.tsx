/**
 * Landing Page — Next-generation conversational experience.
 *
 * The website IS a conversation with Bilko, our AI host.
 * No chat frame. The entire page canvas is the dialogue.
 *
 * Bilko speaks (typewriter + TTS), the user responds by clicking
 * option cards or by voice. Each interaction adds a new turn.
 */

import { useState, useCallback, useMemo, type ReactNode } from "react";
import { GlobalHeader } from "@/components/global-header";
import {
  ConversationCanvas,
  type ConversationTurn,
  type OptionChoice,
} from "@/components/conversation-canvas";
import { PromptPlayground } from "@/components/prompt-playground";
import { VideoDiscoveryFlow } from "@/components/video-discovery-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Sparkles,
  GraduationCap,
  Trophy,
  ChevronRight,
  MessageCircle,
  Compass,
  Zap,
  ArrowLeft,
} from "lucide-react";
import type { LearningModeId } from "@/lib/workflow";
import { LEARNING_MODES } from "@/lib/workflow/flows/welcome-flow";

// ── Map mode definitions to OptionChoice ─────────────────

const iconMap: Record<string, ReactNode> = {
  Play: <Play className="h-5 w-5" />,
  Trophy: <Trophy className="h-5 w-5" />,
  Sparkles: <Sparkles className="h-5 w-5" />,
  Compass: <Compass className="h-5 w-5" />,
  MessageCircle: <MessageCircle className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
};

const MODE_OPTIONS: OptionChoice[] = LEARNING_MODES.map((mode) => ({
  id: mode.id,
  label: mode.label,
  description: mode.description,
  icon: iconMap[mode.icon] ?? <Sparkles className="h-5 w-5" />,
  voiceTriggers: mode.voiceTriggers,
}));

// ── Experience renderers ─────────────────────────────────

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

/**
 * Reusable landing experience content.
 * skipWelcome=true skips the greeting and goes straight to the question
 * (used for authenticated users who already know the app).
 */
export function LandingContent({ skipWelcome = false }: { skipWelcome?: boolean }) {
  const [selectedMode, setSelectedMode] = useState<LearningModeId | null>(null);

  const handleChoice = useCallback((choiceId: string) => {
    setSelectedMode(choiceId as LearningModeId);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedMode(null);
  }, []);

  // Build the conversation turns dynamically based on state
  const turns = useMemo<ConversationTurn[]>(() => {
    const t: ConversationTurn[] = [];

    // Turn 1: Bilko's greeting (skip for returning users)
    if (!skipWelcome) {
      t.push({
        type: "bilko",
        text: "Welcome to Bilko's Mental Gym.",
        speech: "Welcome to Bilko's Mental Gym!",
        delay: 200,
      });
    }

    // Turn 2: Bilko asks the question
    t.push({
      type: "bilko",
      text: "How do you want to train today?",
      speech: "How do you want to train today?",
      delay: skipWelcome ? 100 : 400,
    });

    // Turn 3: User's response options
    t.push({
      type: "user-choice",
      options: MODE_OPTIONS,
    });

    // Turn 4+: If user picked, show Bilko's response + experience
    if (selectedMode) {
      const chosen = LEARNING_MODES.find((m) => m.id === selectedMode);
      const responses: Record<string, { text: string; speech: string }> = {
        video: {
          text: "Great choice. Let's find something worth watching.",
          speech: "Great choice. Let's find something worth watching.",
        },
        quiz: {
          text: "Challenge accepted. Let's see what you know.",
          speech: "Challenge accepted. Let's see what you know.",
        },
        prompt: {
          text: "Hands on. I like it. Go ahead, type anything.",
          speech: "Hands on. I like it. Go ahead, type anything.",
        },
        explore: {
          text: "Let me show you around the gym.",
          speech: "Let me show you around the gym.",
        },
        chat: {
          text: "Let's talk. Ask me anything.",
          speech: "Let's talk. Ask me anything.",
        },
        quick: {
          text: "Three steps. Three minutes. Let's go.",
          speech: "Three steps. Three minutes. Let's go.",
        },
      };

      const response = responses[selectedMode] ?? {
        text: `Let's do ${chosen?.label ?? "this"}.`,
        speech: `Let's do ${chosen?.label ?? "this"}.`,
      };

      t.push({ type: "bilko", ...response, delay: 200 });

      // The actual experience content
      t.push({
        type: "content",
        render: () => (
          <ExperiencePanel mode={selectedMode} onBack={handleBack} />
        ),
      });
    }

    return t;
  }, [skipWelcome, selectedMode, handleBack]);

  return (
    <ConversationCanvas
      turns={turns}
      onChoice={handleChoice}
    />
  );
}

// ── Experience panel ─────────────────────────────────────

function ExperiencePanel({
  mode,
  onBack,
}: {
  mode: LearningModeId;
  onBack: () => void;
}) {
  return (
    <div className="w-full">
      <ExperienceBack onBack={onBack} />

      {mode === "video" && <VideoDiscoveryFlow />}

      {mode === "quiz" && <QuizExperience />}

      {mode === "prompt" && (
        <PromptPlayground
          title="Your First AI Prompt"
          description="Try asking AI anything! Start with something simple like 'Explain AI to a 5 year old'."
          placeholder="Type your prompt here and press Enter..."
          showModelSelector={true}
        />
      )}

      {mode === "explore" && <ExploreExperience />}

      {mode === "chat" && (
        <PromptPlayground
          title="AI Tutor"
          description="I'm your AI tutor! Ask me anything about AI, machine learning, or what you can learn at the Mental Gym."
          systemPrompt="You are Bilko, a friendly AI tutor at Bilko's Mental Gym. Help the user understand AI concepts. Be encouraging and concise."
          placeholder="Ask me anything about AI..."
          showModelSelector={false}
        />
      )}

      {mode === "quick" && <QuickStartGuide />}
    </div>
  );
}

/** Landing page shell for unauthenticated users */
export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <GlobalHeader variant="landing" />
      <main className="flex-1 flex flex-col pt-14">
        <LandingContent />
      </main>
    </div>
  );
}

// ── Mini-experiences ─────────────────────────────────────

function QuizExperience() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const questions = [
    {
      question: "What does AI stand for?",
      options: [
        "Artificial Intelligence",
        "Automated Internet",
        "Advanced Information",
        "Analog Interface",
      ],
      correct: 0,
    },
    {
      question: "Which of these is an AI language model?",
      options: ["GPT-4", "HTML", "SQL", "CSS"],
      correct: 0,
    },
    {
      question: "What is a 'prompt' in AI?",
      options: [
        "A type of computer virus",
        "The input you give to an AI",
        "A programming language",
        "A hardware component",
      ],
      correct: 1,
    },
  ];

  const handleAnswer = (index: number) => {
    if (answered) return;
    setSelectedAnswer(index);
    setAnswered(true);
    if (index === questions[currentQuestion].correct) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setAnswered(false);
      setSelectedAnswer(null);
    }
  };

  const isComplete = currentQuestion === questions.length - 1 && answered;
  const q = questions[currentQuestion];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle>AI Knowledge Quiz</CardTitle>
          </div>
          <Badge variant="outline">
            Question {currentQuestion + 1}/{questions.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!isComplete ? (
          <>
            <h3 className="text-xl font-semibold mb-6">{q.question}</h3>
            <div className="space-y-3">
              {q.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={answered}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    answered
                      ? index === q.correct
                        ? "bg-green-500/20 border-green-500"
                        : index === selectedAnswer
                        ? "bg-red-500/20 border-red-500"
                        : "opacity-50"
                      : "hover:bg-muted cursor-pointer"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {answered && (
              <Button onClick={nextQuestion} className="mt-6 w-full">
                Next Question <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-2xl font-bold mb-2">Quiz Complete!</h3>
            <p className="text-lg text-muted-foreground">
              You scored {score} out of {questions.length}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExploreExperience() {
  const tracks = [
    { name: "Recruit", tagline: "From Zero to Builder", levels: 10, color: "text-emerald-500" },
    { name: "Specialist", tagline: "Deep Technical Mastery", levels: 10, color: "text-blue-500" },
    { name: "Architect", tagline: "Enterprise Scale", levels: 10, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {tracks.map((track) => (
          <Card key={track.name} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <GraduationCap className={`h-10 w-10 mx-auto mb-3 ${track.color}`} />
                <h3 className={`text-lg font-bold ${track.color}`}>{track.name}</h3>
                <p className="text-muted-foreground text-sm mt-1">{track.tagline}</p>
                <Badge variant="outline" className="mt-3">{track.levels} Levels</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QuickStartGuide() {
  const steps = [
    { title: "Learn to Prompt", description: "Good prompts = better results. Start here.", icon: Sparkles },
    { title: "Practice Hands-On", description: "Try real exercises with immediate feedback.", icon: Play },
    { title: "Track Progress", description: "Level up. Earn badges. Get certified.", icon: Trophy },
  ];

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <Card key={index}>
            <CardContent className="flex items-center gap-5 p-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{index + 1}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              <Icon className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
