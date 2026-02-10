/**
 * Welcome Flow - First interaction with unknown users
 *
 * This flow welcomes users to Bilko's AI School
 * and helps them choose how they want to learn.
 */

import type { Workflow } from "../types";

// Learning mode options — each is a subflow of the main conversation.
// When a user selects a mode, the right panel activates that subflow
// while the main conversation in the left panel continues independently.
export const LEARNING_MODES = [
  {
    id: "video",
    label: "Watch a Video",
    description: "Learn by watching curated AI tutorials",
    icon: "Play",
    voiceTriggers: ["video", "watch", "tutorial", "show me"],
  },
  {
    id: "chat",
    label: "AI Leverage Consultation",
    description: "Find out where AI can save you time — pick your field and get personalized suggestions",
    icon: "MessageCircle",
    voiceTriggers: ["chat", "talk", "consult", "leverage", "consultation", "advice"],
  },
  {
    id: "interviewer",
    label: "The Recursive Interviewer",
    description: "A deep-dive strategy session that builds on every answer to uncover hidden insights",
    icon: "Lightbulb",
    voiceTriggers: ["interviewer", "recursive", "deep dive", "strategy"],
  },
  {
    id: "linkedin",
    label: "LinkedIn Strategist",
    description: "Build your Master Career Dossier with AI-powered profile and career analysis",
    icon: "Briefcase",
    voiceTriggers: ["linkedin", "career", "resume", "profile", "dossier"],
  },
  {
    id: "socratic",
    label: "The Socratic Architect",
    description: "Pick a ready-made expert or design your own — then get a custom deep-dive session",
    icon: "GraduationCap",
    voiceTriggers: ["socratic", "architect", "custom", "configure", "expert"],
  },
  {
    id: "work-with-me",
    label: "Work With Me",
    description: "Tell me your goal and I'll guide you through each website step by step — I see what you see",
    icon: "Handshake",
    voiceTriggers: ["work with me", "guide", "help me", "walk me through", "assist", "task"],
  },
  {
    id: "fake-game",
    label: "Brain Teaser Game",
    description: "A quick brain-teaser — play a neuroscientist-recommended cognitive challenge against an AI opponent",
    icon: "Gamepad2",
    voiceTriggers: ["game", "brain teaser", "play", "challenge", "puzzle"],
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
        text: "Welcome to Bilko's AI School",
        speech: "Welcome to Bilko's AI School! I'm excited to help you on your AI learning journey.",
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
        chat: "chat-experience",
        interviewer: "chat-experience",
        linkedin: "chat-experience",
        socratic: "chat-experience",
        "work-with-me": "chat-experience",
      },
      defaultBranch: "chat-experience",
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

    // Chat experience (agentic)
    "chat-experience": {
      id: "chat-experience",
      type: "agent",
      name: "AI Tutor Chat",
      task: "converse",
      prompt: `You are Bilko, a friendly AI tutor at Bilko's AI School.
The user is new and exploring. Help them understand what they can learn here.
Be encouraging, concise, and guide them toward signing up to save their progress.`,
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
