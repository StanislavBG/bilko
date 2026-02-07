/**
 * Welcome Flow - First interaction with unknown users
 *
 * This flow welcomes users to Bilko's Mental Gym
 * and helps them choose how they want to learn.
 */

import type { Workflow } from "../types";

// Learning mode options - scalable menu
export const LEARNING_MODES = [
  {
    id: "video",
    label: "Watch a Video",
    description: "Learn by watching curated AI tutorials",
    icon: "Play",
    voiceTriggers: ["video", "watch", "tutorial", "show me"],
  },
  {
    id: "quiz",
    label: "Challenge Mode",
    description: "Test your knowledge with interactive quizzes",
    icon: "Trophy",
    voiceTriggers: ["quiz", "challenge", "test", "game"],
  },
  {
    id: "prompt",
    label: "Try a Prompt",
    description: "Jump straight into hands-on AI prompting",
    icon: "Sparkles",
    voiceTriggers: ["prompt", "try", "practice", "hands on"],
  },
  {
    id: "explore",
    label: "Explore the Academy",
    description: "Browse courses, tracks, and curriculum",
    icon: "Compass",
    voiceTriggers: ["explore", "browse", "look around", "courses"],
  },
  {
    id: "chat",
    label: "AI Leverage Consultation",
    description: "Discover where AI fits in your work",
    icon: "MessageCircle",
    voiceTriggers: ["chat", "talk", "consult", "leverage", "consultation", "advice"],
  },
  {
    id: "quick",
    label: "Quick Start Guide",
    description: "3-minute intro to get you started",
    icon: "Zap",
    voiceTriggers: ["quick", "fast", "start", "intro", "beginner"],
  },
] as const;

export type LearningModeId = typeof LEARNING_MODES[number]["id"];

export const welcomeFlow: Workflow = {
  id: "welcome-flow",
  name: "Welcome Flow",
  description: "Welcomes new visitors and helps them choose their learning path",
  version: "1.0.0",
  startNodeId: "start",
  nodes: {
    // Entry point
    start: {
      id: "start",
      type: "start",
      name: "Initialize Welcome",
      initialContext: {
        isNewVisitor: true,
        sessionStarted: new Date().toISOString(),
      },
      next: "welcome-display",
    },

    // Welcome message (visual + audio)
    "welcome-display": {
      id: "welcome-display",
      type: "display",
      name: "Welcome Message",
      mode: "both",
      content: {
        text: "Welcome to Bilko's Mental Gym",
        speech: "Welcome to Bilko's Mental Gym! I'm excited to help you on your AI learning journey.",
        component: "WelcomeHero",
      },
      duration: 3000,
      next: "ask-preference",
    },

    // Ask how they want to learn
    "ask-preference": {
      id: "ask-preference",
      type: "display",
      name: "Ask Learning Preference",
      mode: "both",
      content: {
        text: "How would you like to learn today?",
        speech: "How would you like to learn today? You can watch a video, take a challenge quiz, try a prompt, or explore what we have to offer.",
        component: "LearningModeSelector",
        data: { modes: LEARNING_MODES },
      },
      next: "wait-for-choice",
    },

    // Wait for user to choose
    "wait-for-choice": {
      id: "wait-for-choice",
      type: "wait",
      name: "Wait for Learning Choice",
      inputType: "any",
      options: LEARNING_MODES.map((mode) => ({
        id: mode.id,
        label: mode.label,
        description: mode.description,
        icon: mode.icon,
        voiceTriggers: [...mode.voiceTriggers],
      })),
      storeAs: "selectedMode",
      next: "route-choice",
    },

    // Route based on choice
    "route-choice": {
      id: "route-choice",
      type: "decision",
      name: "Route to Experience",
      condition: "selectedMode",
      branches: {
        video: "video-experience",
        quiz: "quiz-experience",
        prompt: "prompt-experience",
        explore: "explore-experience",
        chat: "chat-experience",
        quick: "quick-experience",
      },
      defaultBranch: "explore-experience",
    },

    // Video experience
    "video-experience": {
      id: "video-experience",
      type: "display",
      name: "Video Experience",
      mode: "visual",
      content: {
        component: "VideoExperience",
        text: "Let's watch a quick intro video about AI",
      },
      next: "end-with-cta",
    },

    // Quiz experience
    "quiz-experience": {
      id: "quiz-experience",
      type: "display",
      name: "Quiz Experience",
      mode: "visual",
      content: {
        component: "QuizExperience",
        text: "Let's test your AI knowledge!",
      },
      next: "end-with-cta",
    },

    // Prompt experience
    "prompt-experience": {
      id: "prompt-experience",
      type: "display",
      name: "Prompt Experience",
      mode: "visual",
      content: {
        component: "PromptExperience",
        text: "Try your first AI prompt right here",
      },
      next: "end-with-cta",
    },

    // Explore experience
    "explore-experience": {
      id: "explore-experience",
      type: "display",
      name: "Explore Experience",
      mode: "visual",
      content: {
        component: "ExploreExperience",
        text: "Explore our learning tracks and courses",
      },
      next: "end-with-cta",
    },

    // Chat experience (agentic)
    "chat-experience": {
      id: "chat-experience",
      type: "agent",
      name: "AI Tutor Chat",
      task: "converse",
      prompt: `You are Bilko, a friendly AI tutor at Bilko's Mental Gym.
The user is new and exploring. Help them understand what they can learn here.
Be encouraging, concise, and guide them toward signing up to save their progress.`,
      next: "end-with-cta",
    },

    // Quick start experience
    "quick-experience": {
      id: "quick-experience",
      type: "display",
      name: "Quick Start",
      mode: "both",
      content: {
        component: "QuickStartGuide",
        speech: "Great choice! Let me give you a quick 3-minute tour of what you can learn here.",
        text: "Quick Start Guide",
      },
      next: "end-with-cta",
    },

    // End with call to action
    "end-with-cta": {
      id: "end-with-cta",
      type: "display",
      name: "Call to Action",
      mode: "both",
      content: {
        component: "SignUpCTA",
        text: "Ready to start your AI journey?",
        speech: "Ready to start your AI journey? Sign up to save your progress and unlock all features.",
      },
      next: "end",
    },

    // End node
    end: {
      id: "end",
      type: "end",
      name: "Flow Complete",
      finalAction: "none",
    },
  },
};

export default welcomeFlow;
