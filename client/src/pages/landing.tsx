/**
 * Landing Page - Dynamic, agentic welcome experience
 *
 * This is the face of Bilko's Mental Gym.
 * It welcomes unknown users and helps them discover how they want to learn.
 *
 * LandingContent is exported separately so the authenticated home page
 * can reuse the same experience without the landing shell (header, etc.).
 */

import { useState, useEffect, useCallback } from "react";
import { GlobalHeader } from "@/components/global-header";
import { LearningModeSelector } from "@/components/learning-mode-selector";
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
} from "lucide-react";
import type { LearningModeId } from "@/lib/workflow";
import { LEARNING_MODES } from "@/lib/workflow/flows/welcome-flow";
import { useVoice, useVoiceCommands } from "@/contexts/voice-context";

// Flow states for the welcome experience
type FlowState =
  | "welcome"
  | "choose-mode"
  | "video"
  | "quiz"
  | "prompt"
  | "explore"
  | "chat"
  | "quick";

/**
 * Reusable landing experience content.
 * skipWelcome=true skips the welcome animation and goes straight to mode selection
 * (used for authenticated users who already know the app).
 */
export function LandingContent({ skipWelcome = false }: { skipWelcome?: boolean }) {
  const [flowState, setFlowState] = useState<FlowState>(skipWelcome ? "choose-mode" : "welcome");
  const [selectedMode, setSelectedMode] = useState<LearningModeId | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const { isListening, isSupported: isVoiceSupported } = useVoice();

  const handleModeSelect = useCallback((modeId: LearningModeId) => {
    setSelectedMode(modeId);
    setFlowState(modeId);
  }, []);

  // Register voice commands only when on the choose-mode screen
  useVoiceCommands(
    "landing-modes",
    LEARNING_MODES,
    handleModeSelect as (id: string) => void,
    flowState === "choose-mode"
  );

  // Auto-advance from welcome to mode selection
  useEffect(() => {
    if (flowState === "welcome") {
      const timer = setTimeout(() => {
        setShowWelcome(false);
        setTimeout(() => setFlowState("choose-mode"), 500);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [flowState]);

  const handleBack = () => {
    setFlowState("choose-mode");
    setSelectedMode(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Welcome State */}
      {flowState === "welcome" && (
        <div
          className={`flex-1 flex flex-col items-center justify-center transition-opacity duration-500 ${
            showWelcome ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Welcome
            </h1>
            <p className="text-xl text-muted-foreground">
              to Bilko's Mental Gym
            </p>
          </div>
        </div>
      )}

      {/* Choose Mode State */}
      {flowState === "choose-mode" && (
        <div className="flex-1 flex flex-col items-center px-4 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              How would you like to learn today?
            </h1>
            {isVoiceSupported && (
              <p className="text-sm text-muted-foreground">
                {isListening
                  ? 'Say "video", "quiz", "chat", "explore", "prompt", or "quick start"'
                  : "Click the Voice button in the header to use voice commands"}
              </p>
            )}
          </div>

          <LearningModeSelector
            onSelect={handleModeSelect}
            selectedMode={selectedMode}
          />
        </div>
      )}

      {/* Video Experience */}
      {flowState === "video" && (
        <ExperienceWrapper title="Watch & Learn" onBack={handleBack}>
          <VideoDiscoveryFlow />
        </ExperienceWrapper>
      )}

      {/* Quiz Experience */}
      {flowState === "quiz" && (
        <ExperienceWrapper title="Challenge Mode" onBack={handleBack}>
          <QuizExperience />
        </ExperienceWrapper>
      )}

      {/* Prompt Experience */}
      {flowState === "prompt" && (
        <ExperienceWrapper title="Try a Prompt" onBack={handleBack}>
          <div className="max-w-3xl mx-auto">
            <PromptPlayground
              title="Your First AI Prompt"
              description="Try asking AI anything! Start with something simple like 'Explain AI to a 5 year old' or 'Write a haiku about coding'."
              placeholder="Type your prompt here and press Enter..."
              showModelSelector={true}
            />
          </div>
        </ExperienceWrapper>
      )}

      {/* Explore Experience */}
      {flowState === "explore" && (
        <ExperienceWrapper title="Explore the Academy" onBack={handleBack}>
          <ExploreExperience />
        </ExperienceWrapper>
      )}

      {/* Chat Experience */}
      {flowState === "chat" && (
        <ExperienceWrapper title="Chat with AI Tutor" onBack={handleBack}>
          <div className="max-w-3xl mx-auto">
            <PromptPlayground
              title="AI Tutor"
              description="I'm your AI tutor! Ask me anything about AI, machine learning, or what you can learn at the Academy."
              systemPrompt="You are Bilko, a friendly AI tutor at Bilko's Mental Gym. Help the user understand AI concepts and answer their questions. Be encouraging and helpful."
              placeholder="Ask me anything about AI..."
              showModelSelector={false}
            />
          </div>
        </ExperienceWrapper>
      )}

      {/* Quick Start Experience */}
      {flowState === "quick" && (
        <ExperienceWrapper title="Quick Start Guide" onBack={handleBack}>
          <QuickStartGuide />
        </ExperienceWrapper>
      )}
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

// Wrapper component for all experiences
function ExperienceWrapper({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col px-4 py-8">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

// Quiz mini-experience
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
    <Card className="max-w-2xl mx-auto">
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

// Explore mini-experience
function ExploreExperience() {
  const tracks = [
    {
      name: "Recruit",
      tagline: "From Zero to Builder",
      levels: 10,
      color: "text-emerald-500",
    },
    {
      name: "Specialist",
      tagline: "Deep Technical Mastery",
      levels: 10,
      color: "text-blue-500",
    },
    {
      name: "Architect",
      tagline: "Enterprise Scale",
      levels: 10,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Three Learning Tracks</h2>
        <p className="text-muted-foreground">
          Progress from beginner to expert at your own pace
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {tracks.map((track) => (
          <Card key={track.name} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <GraduationCap className={`h-12 w-12 mx-auto mb-4 ${track.color}`} />
                <h3 className={`text-xl font-bold ${track.color}`}>
                  {track.name}
                </h3>
                <p className="text-muted-foreground mt-1">{track.tagline}</p>
                <Badge variant="outline" className="mt-4">
                  {track.levels} Levels
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Quick Start mini-experience
function QuickStartGuide() {
  const steps = [
    {
      title: "Learn to Prompt",
      description:
        "Start by learning how to talk to AI. Good prompts = better results.",
      icon: Sparkles,
    },
    {
      title: "Practice Hands-On",
      description:
        "Try real exercises with immediate feedback. Learn by doing.",
      icon: Play,
    },
    {
      title: "Track Progress",
      description:
        "Level up through our curriculum. Earn badges and certificates.",
      icon: Trophy,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Get Started in 3 Steps</h2>
        <p className="text-muted-foreground">
          Your AI learning journey begins here
        </p>
      </div>
      <div className="space-y-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card key={index}>
              <CardContent className="flex items-center gap-6 p-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
