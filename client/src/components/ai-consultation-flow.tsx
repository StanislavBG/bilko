/**
 * AI Consultation Flow — Configurable "Recursive Interviewer" Engine
 *
 * A multi-turn conversational flow where an AI persona asks the user
 * questions one at a time, then delivers structured recommendations.
 *
 * Supports:
 * - Configurable personas, prompts, and output labels via ConsultationConfig
 * - Optional setup phase (user fills in blanks before interview starts)
 * - Voice input (Web Speech API) and text input
 * - chatJSON<T>() for all LLM calls per ARCH-001 D1
 */

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import {
  Send,
  Loader2,
  Mic,
  Lightbulb,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Megaphone,
  Code,
  Store,
  GraduationCap,
  Stethoscope,
  Shuffle,
  Rocket,
  Users,
  TrendingUp,
  Briefcase,
  PenTool,
  Cpu,
  HeartPulse,
  CheckCircle2,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { chatJSON, jsonPrompt, useFlowExecution, useFlowDefinition } from "@/lib/flow-engine";
import { useVoice } from "@/contexts/voice-context";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { useFlowRegistration } from "@/contexts/flow-bus-context";
import { VoiceStatusBar } from "@/components/voice-status-bar";

// ── Config type ──────────────────────────────────────────

export interface FlowPreset {
  /** Unique preset ID */
  id: string;
  /** Friendly name shown on the card */
  label: string;
  /** 1-sentence description of who this is for */
  description: string;
  /** Icon component (lucide) */
  icon: ReactNode;
  /** For flows with setupPhase: pre-fills the setup fields */
  setupValues?: Record<string, string>;
  /** For flows without setupPhase: extra context injected into the first question prompt */
  contextHint?: string;
}

export interface ConsultationConfig {
  /** Unique flow ID for execution tracking */
  flowId: string;
  /** Header title */
  title: string;
  /** Intro screen heading */
  introHeading: string;
  /** Intro screen description */
  introDescription: string;
  /** Rich explanation bullets shown below description */
  introExplainer?: {
    /** "What you'll get" bullets */
    whatYouGet: string[];
    /** "How it works" steps */
    howItWorks: string[];
  };
  /** Header icon color (tailwind class) */
  accentColor?: string;
  /** Header icon */
  headerIcon?: ReactNode;
  /** Intro icon */
  introIcon?: ReactNode;
  /** System prompt for the interview phase */
  systemPrompt: string;
  /** Prompt to generate the first question */
  firstQuestionPrompt: string;
  /** System prompt for the final analysis */
  analysisSystemPrompt: string;
  /** Label for the primary results section */
  primaryLabel: string;
  /** Badge text for primary section */
  primaryBadge: string;
  /** Label for the secondary results section */
  secondaryLabel: string;
  /** Badge text for secondary section */
  secondaryBadge: string;
  /** Estimated time badge */
  estimatedTime?: string;
  /** Quick-start presets — clickable cards that skip or pre-fill configuration */
  presets?: FlowPreset[];
  /** Optional setup phase — user fills in fields before interview starts */
  setupPhase?: {
    heading: string;
    description: string;
    fields: Array<{
      id: string;
      label: string;
      placeholder: string;
    }>;
    /** Build the system prompt from filled-in values */
    buildSystemPrompt: (values: Record<string, string>) => string;
    /** Build the analysis prompt from filled-in values */
    buildAnalysisPrompt: (values: Record<string, string>) => string;
    /** Build the first question prompt from filled-in values */
    buildFirstQuestionPrompt: (values: Record<string, string>) => string;
  };
}

// ── Default config (AI Leverage Consultation) ────────────

const DEFAULT_CONFIG: ConsultationConfig = {
  flowId: "ai-consultation",
  title: "AI Leverage Consultation",
  introHeading: "Where Should You Leverage AI?",
  introDescription:
    "A friendly AI expert asks you simple questions about your day-to-day work. No tech knowledge needed — just describe what you do, and you'll get personalized suggestions for where AI can save you time and effort.",
  introExplainer: {
    whatYouGet: [
      "2 quick wins you can start using right away",
      "2 surprising ideas you probably haven't thought of",
      "Specific tool recommendations for each suggestion",
    ],
    howItWorks: [
      "Answer 5-7 simple questions about your work",
      "The AI builds a picture of your daily routine",
      "You get a personalized report with next steps",
    ],
  },
  presets: [
    {
      id: "marketing",
      label: "Marketing & Content",
      description: "I write content, manage social media, or run campaigns",
      icon: <Megaphone className="h-5 w-5" />,
      contextHint: "The user works in marketing, content creation, or social media management. They likely deal with writing copy, scheduling posts, analyzing engagement metrics, and managing campaigns.",
    },
    {
      id: "software",
      label: "Software & Tech",
      description: "I write code, build products, or manage tech teams",
      icon: <Code className="h-5 w-5" />,
      contextHint: "The user is a software developer, engineer, or technical manager. They likely deal with writing code, reviewing pull requests, debugging, documentation, and sprint planning.",
    },
    {
      id: "small-business",
      label: "Small Business Owner",
      description: "I run my own business and wear many hats",
      icon: <Store className="h-5 w-5" />,
      contextHint: "The user runs a small business. They likely handle sales, customer service, bookkeeping, hiring, marketing, and operations all at once.",
    },
    {
      id: "education",
      label: "Teacher or Trainer",
      description: "I teach students, run workshops, or create courses",
      icon: <GraduationCap className="h-5 w-5" />,
      contextHint: "The user works in education or training. They likely create lesson plans, grade assignments, give feedback, design curricula, and manage student engagement.",
    },
    {
      id: "healthcare",
      label: "Healthcare Professional",
      description: "I work in healthcare, wellness, or patient care",
      icon: <Stethoscope className="h-5 w-5" />,
      contextHint: "The user works in healthcare. They likely handle patient documentation, treatment planning, scheduling, research, and compliance tasks.",
    },
  ],
  accentColor: "yellow",
  systemPrompt: `You are an elite AI strategy consultant. Your job is to interview the user to deeply understand their work, then recommend where AI can create the most impact.

INTERVIEW RULES:
- Ask exactly ONE question at a time
- Build on previous answers — show you're listening
- Cover these areas across 5-7 questions: role/industry, daily workflows, pain points, KPIs/objectives, tools they use, team size/structure, data they work with
- Questions should be conversational, not interrogative
- After gathering sufficient context (5-7 questions), set done=true

RESPONSE FORMAT — return ONLY valid JSON:
{
  "done": false,
  "nextQuestion": "Your single question here",
  "questionContext": "Brief note on why you're asking (1 sentence)",
  "questionsRemaining": 4
}

When done=true, omit nextQuestion/questionContext/questionsRemaining.
No markdown. No explanation. ONLY the JSON object.`,
  firstQuestionPrompt:
    "Start the consultation. Ask your first question to understand who this person is and what they do. Make it warm and conversational — they're here because they want to leverage AI better.",
  analysisSystemPrompt: `You are an elite AI strategy consultant. Based on the interview transcript below, provide exactly 2 OBVIOUS recommendations (things the user probably suspects) and exactly 2 NON-OBVIOUS recommendations (creative applications they haven't considered).

RESPONSE FORMAT — return ONLY valid JSON:
{
  "summary": "2-3 sentence summary of their situation",
  "obvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "What to do and why (2-3 sentences)",
      "impact": "Expected impact (1 sentence)",
      "tools": ["Tool1", "Tool2"]
    }
  ],
  "nonObvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "What to do and why (2-3 sentences)",
      "impact": "Expected impact (1 sentence)",
      "tools": ["Tool1", "Tool2"]
    }
  ]
}

Rules:
- obvious array must have exactly 2 items
- nonObvious array must have exactly 2 items
- Be specific to THEIR workflows, not generic advice
- Tools should be real products (ChatGPT, Claude, Zapier, n8n, etc.)
- No markdown. ONLY the JSON object.`,
  primaryLabel: "Obvious Wins",
  primaryBadge: "You probably suspect these",
  secondaryLabel: "Hidden Opportunities",
  secondaryBadge: "You might not have considered these",
  estimatedTime: "~5 min",
};

// ── Preset configs ───────────────────────────────────────

export const LINKEDIN_STRATEGIST_CONFIG: ConsultationConfig = {
  flowId: "linkedin-strategist",
  title: "LinkedIn Strategist & Career Archivist",
  introHeading: "Build Your Master Career Dossier",
  introDescription:
    "I'll interview you about your career history — digging into the invisible responsibilities, KPIs, and nuances of your roles. Then I'll deliver LinkedIn profile edits and a comprehensive career summary.",
  accentColor: "blue",
  headerIcon: <Sparkles className="h-5 w-5 text-blue-500" />,
  introIcon: <Sparkles className="h-6 w-6 text-blue-500" />,
  systemPrompt: `You are a World-Class LinkedIn Brand Strategist and Career Archivist. Your goal is to help the user optimize their professional presence and build a "Master Career Dossier."

INTERVIEW RULES:
- Ask exactly ONE question at a time
- Build on previous answers — dig deeper into specifics
- Focus on extracting "the story behind the bullet point"
- Cover these areas across 5-8 questions: current role details, previous roles, specific achievements with metrics, invisible responsibilities, KPIs they own, skills used daily vs. occasionally, team leadership, cross-functional impact
- Questions should feel like a conversation with a career coach, not an interrogation
- After gathering sufficient context (5-8 questions), set done=true

RESPONSE FORMAT — return ONLY valid JSON:
{
  "done": false,
  "nextQuestion": "Your single question here",
  "questionContext": "Brief note on why you're asking (1 sentence)",
  "questionsRemaining": 4
}

When done=true, omit nextQuestion/questionContext/questionsRemaining.
No markdown. No explanation. ONLY the JSON object.`,
  firstQuestionPrompt:
    "Start the career interview. Ask your first question — you want to understand their current role and how they'd describe what they do to a stranger at a dinner party. Be warm and professional.",
  analysisSystemPrompt: `You are a World-Class LinkedIn Brand Strategist and Career Archivist. Based on the interview transcript, provide:

1. "obvious" — 3 high-impact LinkedIn profile edits (headline, about section, experience bullets) that will immediately strengthen their professional brand
2. "nonObvious" — 3 hidden career assets: responsibilities, skills, or achievements they mentioned casually but which are actually powerful differentiators they should highlight everywhere

RESPONSE FORMAT — return ONLY valid JSON:
{
  "summary": "2-3 sentence professional brand assessment",
  "obvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "Specific edit or rewrite suggestion (2-3 sentences)",
      "impact": "Why this matters for their brand (1 sentence)",
      "tools": ["LinkedIn Section"]
    }
  ],
  "nonObvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "The hidden asset and how to leverage it (2-3 sentences)",
      "impact": "Career positioning impact (1 sentence)",
      "tools": ["Where to use this"]
    }
  ]
}

Rules:
- obvious array must have exactly 3 items
- nonObvious array must have exactly 3 items
- Be specific to THEIR career, not generic LinkedIn advice
- Reference specific things they said in the interview
- No markdown. ONLY the JSON object.`,
  primaryLabel: "High-Impact Profile Edits",
  primaryBadge: "Immediate LinkedIn upgrades",
  secondaryLabel: "Hidden Career Assets",
  secondaryBadge: "Powerful differentiators you're underplaying",
  estimatedTime: "~8 min",
};

export const RECURSIVE_INTERVIEWER_CONFIG: ConsultationConfig = {
  flowId: "recursive-interviewer",
  title: "The Recursive Interviewer",
  introHeading: "Deep-Dive Strategy Session",
  introDescription:
    "Think of this as a conversation with a very smart advisor. Each question builds on your last answer, digging deeper until the AI truly understands your situation. Then it gives you clear, specific advice — not generic tips.",
  introExplainer: {
    whatYouGet: [
      "2 insights that confirm what you already suspect",
      "2 hidden patterns or angles you haven't considered",
      "Specific tools and next steps for each insight",
    ],
    howItWorks: [
      "Pick a topic you'd like to explore (or start fresh)",
      "Answer 5-7 questions — each one builds on the last",
      "The AI delivers a personalized strategy report",
    ],
  },
  presets: [
    {
      id: "career-change",
      label: "Career Change",
      description: "I'm thinking about switching careers or roles",
      icon: <Shuffle className="h-5 w-5" />,
      contextHint: "The user is considering a career transition. They want to explore what skills transfer, what gaps to fill, and whether the change makes sense for them right now.",
    },
    {
      id: "product-launch",
      label: "Product or Service Launch",
      description: "I'm planning to launch something new",
      icon: <Rocket className="h-5 w-5" />,
      contextHint: "The user is planning a product or service launch. They want strategic advice on positioning, audience, timing, and go-to-market approach.",
    },
    {
      id: "team-efficiency",
      label: "Team Productivity",
      description: "I want my team to work better together",
      icon: <Users className="h-5 w-5" />,
      contextHint: "The user wants to improve team efficiency and collaboration. They're looking for patterns in how their team works and where the biggest bottlenecks are.",
    },
    {
      id: "business-growth",
      label: "Growing My Business",
      description: "I need a strategy to scale or grow revenue",
      icon: <TrendingUp className="h-5 w-5" />,
      contextHint: "The user wants to grow their business. They're looking for strategies to scale revenue, reach new markets, or improve their business model.",
    },
  ],
  accentColor: "emerald",
  headerIcon: <Lightbulb className="h-5 w-5 text-emerald-500" />,
  introIcon: <Lightbulb className="h-6 w-6 text-emerald-500" />,
  systemPrompt: `You are an elite AI expert using the "Recursive Interviewer" framework. This framework has three mechanics:

1. ROLE ANCHORING — You are the authority. You guide the conversation.
2. CONSTRAINT-BASED ITERATION — One question at a time, each building recursively on prior answers.
3. SUCCESS CRITERIA — You decide when you have enough context. Don't rush.

Your job: Interview the user to deeply understand their situation, then provide structured recommendations.

INTERVIEW RULES:
- Ask exactly ONE question at a time
- Each question MUST reference or build on something from a previous answer (recursive logic)
- Cover breadth first (role, context, challenges), then depth (specifics, edge cases, hidden patterns)
- 5-7 questions total. Quality over quantity.
- After gathering sufficient context, set done=true

RESPONSE FORMAT — return ONLY valid JSON:
{
  "done": false,
  "nextQuestion": "Your single question here",
  "questionContext": "Brief note on why you're asking (1 sentence)",
  "questionsRemaining": 4
}

When done=true, omit nextQuestion/questionContext/questionsRemaining.
No markdown. No explanation. ONLY the JSON object.`,
  firstQuestionPrompt:
    "Begin the Recursive Interviewer process. Your first question should establish the user's context — who they are, what domain they operate in, and what challenge or goal brought them here today. Be direct but warm.",
  analysisSystemPrompt: `You are an elite AI expert delivering the output of a Recursive Interviewer session. Based on the interview transcript, provide exactly 2 OBVIOUS insights (things the user likely already suspects but you're confirming with evidence) and exactly 2 NON-OBVIOUS insights (creative angles, hidden patterns, or unconventional approaches they haven't considered).

RESPONSE FORMAT — return ONLY valid JSON:
{
  "summary": "2-3 sentence synthesis of what you learned",
  "obvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "The insight and recommended action (2-3 sentences)",
      "impact": "Expected impact (1 sentence)",
      "tools": ["Tool1", "Tool2"]
    }
  ],
  "nonObvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "The hidden insight and recommended action (2-3 sentences)",
      "impact": "Expected impact (1 sentence)",
      "tools": ["Tool1", "Tool2"]
    }
  ]
}

Rules:
- obvious array must have exactly 2 items
- nonObvious array must have exactly 2 items
- Be specific to THEIR situation — reference things they actually said
- For tools, suggest real products, frameworks, or methodologies
- No markdown. ONLY the JSON object.`,
  primaryLabel: "Confirmed Insights",
  primaryBadge: "You suspected these — now confirmed",
  secondaryLabel: "Hidden Patterns",
  secondaryBadge: "Angles you haven't considered",
  estimatedTime: "~5 min",
};

export const SOCRATIC_ARCHITECT_CONFIG: ConsultationConfig = {
  flowId: "socratic-architect",
  title: "The Socratic Architect",
  introHeading: "Build Your Own Expert Session",
  introDescription:
    "Pick a ready-made expert below, or design your own. The AI becomes whatever specialist you need — a business coach, career advisor, writing mentor, or anything else — then interviews you and delivers custom insights.",
  introExplainer: {
    whatYouGet: [
      "A custom AI expert tailored to your exact need",
      "A deep-dive interview that uncovers what matters",
      "Structured findings: what you expected + what surprises you",
    ],
    howItWorks: [
      "Choose a preset expert or define your own",
      "Answer 5-7 targeted questions from your expert",
      "Receive a personalized analysis with actionable insights",
    ],
  },
  presets: [
    {
      id: "business-coach",
      label: "Business Coach",
      description: "Get strategic advice on growing or improving your business",
      icon: <Briefcase className="h-5 w-5" />,
      setupValues: {
        expertise: "Business Strategy Consultant with 20 years of experience advising startups and SMBs",
        goal: "Create an actionable growth plan for my business",
        output: "2 obvious growth strategies I should double down on + 2 non-obvious opportunities I'm missing",
      },
    },
    {
      id: "career-advisor",
      label: "Career Advisor",
      description: "Map out your next career move with expert guidance",
      icon: <TrendingUp className="h-5 w-5" />,
      setupValues: {
        expertise: "Senior Career Development Coach who specializes in career transitions and professional growth",
        goal: "Map out my best career options and next steps",
        output: "2 confirmed career paths that fit my skills + 2 unexpected opportunities I should explore",
      },
    },
    {
      id: "writing-coach",
      label: "Writing Coach",
      description: "Improve your writing, storytelling, or content strategy",
      icon: <PenTool className="h-5 w-5" />,
      setupValues: {
        expertise: "Creative Writing Expert and Content Strategist with published work and editorial experience",
        goal: "Improve my writing quality and develop a stronger voice",
        output: "2 key structural improvements for my writing + 2 creative techniques to make it stand out",
      },
    },
    {
      id: "tech-advisor",
      label: "Tech Strategy Advisor",
      description: "Get advice on technology choices, tools, or architecture",
      icon: <Cpu className="h-5 w-5" />,
      setupValues: {
        expertise: "Technology Strategy Consultant and Solutions Architect with deep experience across cloud, AI, and modern stacks",
        goal: "Choose the right technology approach for my project or business",
        output: "2 solid technology choices I should commit to + 2 innovative alternatives I haven't considered",
      },
    },
    {
      id: "wellness-coach",
      label: "Wellness & Productivity Coach",
      description: "Optimize your energy, habits, and daily routine",
      icon: <HeartPulse className="h-5 w-5" />,
      setupValues: {
        expertise: "Holistic Wellness and Productivity Coach combining behavioral science with practical habit design",
        goal: "Design a sustainable routine that improves my energy and output",
        output: "2 obvious habit changes for immediate impact + 2 surprising adjustments that create long-term results",
      },
    },
  ],
  accentColor: "violet",
  headerIcon: <Sparkles className="h-5 w-5 text-violet-500" />,
  introIcon: <Sparkles className="h-6 w-6 text-violet-500" />,
  // These are placeholders — replaced by setupPhase builders at runtime
  systemPrompt: "",
  firstQuestionPrompt: "",
  analysisSystemPrompt: "",
  primaryLabel: "Primary Insights",
  primaryBadge: "Core findings",
  secondaryLabel: "Unexpected Discoveries",
  secondaryBadge: "What you didn't expect",
  estimatedTime: "~7 min",
  setupPhase: {
    heading: "Define Your Session",
    description:
      "Tell the Socratic Architect what kind of expert you need, what you want to achieve, and what output you expect.",
    fields: [
      {
        id: "expertise",
        label: "Expert Role",
        placeholder: "e.g., Clinical Psychologist, Business Consultant, Script Writer",
      },
      {
        id: "goal",
        label: "Your Goal",
        placeholder: "e.g., Build a character profile, Create a business plan",
      },
      {
        id: "output",
        label: "Desired Output",
        placeholder: "e.g., 2 obvious + 2 non-obvious insights, A 10-point action plan",
      },
    ],
    buildSystemPrompt: (v) => `You are an expert ${v.expertise}. The user wants to achieve: "${v.goal}".

You will conduct a Socratic deep-dive interview to gather all necessary data for delivering: ${v.output}.

INTERVIEW RULES:
- Ask exactly ONE question at a time
- Each question should build on the previous answer (Recursive Logic)
- You are the judge of when context is "Complete" — do not rush
- Cover 5-7 questions, going from broad context to specific details
- After gathering sufficient context, set done=true

RESPONSE FORMAT — return ONLY valid JSON:
{
  "done": false,
  "nextQuestion": "Your single question here",
  "questionContext": "Brief note on why you're asking (1 sentence)",
  "questionsRemaining": 4
}

When done=true, omit nextQuestion/questionContext/questionsRemaining.
No markdown. No explanation. ONLY the JSON object.`,
    buildAnalysisPrompt: (v) => `You are an expert ${v.expertise}. Based on the Socratic interview transcript below, deliver the requested output: ${v.output}.

Structure your response as exactly 2 "obvious" findings (things that confirm what the user likely suspects) and exactly 2 "nonObvious" findings (unexpected insights, hidden patterns, or creative angles).

RESPONSE FORMAT — return ONLY valid JSON:
{
  "summary": "2-3 sentence synthesis of what you discovered",
  "obvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "The finding and recommended action (2-3 sentences)",
      "impact": "Expected impact (1 sentence)",
      "tools": ["Relevant method or tool"]
    }
  ],
  "nonObvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "The hidden insight and recommended action (2-3 sentences)",
      "impact": "Expected impact (1 sentence)",
      "tools": ["Relevant method or tool"]
    }
  ]
}

Rules:
- obvious array must have exactly 2 items
- nonObvious array must have exactly 2 items
- Be specific — reference actual things they said
- No markdown. ONLY the JSON object.`,
    buildFirstQuestionPrompt: (v) =>
      `Begin the Socratic interview. You are an expert ${v.expertise} helping the user achieve: "${v.goal}". Ask your first question to establish their current situation and context. Be warm and professional.`,
  },
};

// ── Internal types ───────────────────────────────────────

interface QAPair {
  question: string;
  context?: string;
  answer: string;
}

interface Recommendation {
  title: string;
  description: string;
  impact: string;
  tools?: string[];
}

interface ConsultationResult {
  summary: string;
  obvious: Recommendation[];
  nonObvious: Recommendation[];
}

interface TurnResponse {
  done: boolean;
  nextQuestion?: string;
  questionContext?: string;
  questionsRemaining?: number;
}

interface AnalysisResponse {
  summary: string;
  obvious: Recommendation[];
  nonObvious: Recommendation[];
}

type Phase = "intro" | "presets" | "setup" | "questioning" | "analyzing" | "complete";

// ── Component ────────────────────────────────────────────

export function AiConsultationFlow({ config }: { config?: ConsultationConfig }) {
  const c = config ?? DEFAULT_CONFIG;
  const hasSetup = !!c.setupPhase;

  const [phase, setPhase] = useState<Phase>("intro");
  const [setupValues, setSetupValues] = useState<Record<string, string>>({});
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentContext, setCurrentContext] = useState("");
  const [questionsRemaining, setQuestionsRemaining] = useState(6);
  const [userInput, setUserInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [result, setResult] = useState<ConsultationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolved prompts (may come from setup phase)
  const resolvedPromptsRef = useRef({
    system: c.systemPrompt,
    firstQuestion: c.firstQuestionPrompt,
    analysis: c.analysisSystemPrompt,
  });

  const conversationRef = useRef<Array<{ role: "system" | "user" | "assistant"; content: string }>>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { trackStep, resolveUserInput } = useFlowExecution(c.flowId);
  const { definition: flowDef } = useFlowDefinition(c.flowId);
  const { isListening, isSupported, transcript, speak, onUtteranceEnd } = useVoice();
  const { setStatus: setBusStatus, send: busSend } = useFlowRegistration(c.flowId, c.title);

  const accent = c.accentColor ?? "yellow";

  // Sync phase changes to the flow bus
  useEffect(() => {
    const statusMap: Record<Phase, "running" | "complete" | "error"> = {
      intro: "running",
      presets: "running",
      setup: "running",
      questioning: "running",
      analyzing: "running",
      complete: "complete",
    };
    setBusStatus(statusMap[phase], phase);
  }, [phase, setBusStatus]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [qaPairs, currentQuestion, phase]);

  // Fill input from voice (live interim results)
  useEffect(() => {
    if (isListening && transcript && phase === "questioning") {
      setUserInput(transcript);
    }
  }, [transcript, isListening, phase]);

  // Auto-send when user finishes speaking (silence detection)
  const submitAnswerRef = useRef<((overrideText?: string) => Promise<void>) | null>(null);
  useEffect(() => {
    if (!isListening || phase !== "questioning") return;
    return onUtteranceEnd((text) => {
      setUserInput(text);
      // Pass text directly to avoid stale closure over userInput
      submitAnswerRef.current?.(text);
    });
  }, [isListening, phase, onUtteranceEnd]);

  // ── Setup phase submit ──────────────────────────────────

  const handleSetupSubmit = useCallback(() => {
    if (!c.setupPhase) return;
    const allFilled = c.setupPhase.fields.every((f) => setupValues[f.id]?.trim());
    if (!allFilled) return;

    resolvedPromptsRef.current = {
      system: c.setupPhase.buildSystemPrompt(setupValues),
      firstQuestion: c.setupPhase.buildFirstQuestionPrompt(setupValues),
      analysis: c.setupPhase.buildAnalysisPrompt(setupValues),
    };
    startInterview();
  }, [c.setupPhase, setupValues]);

  // ── Start interview ─────────────────────────────────────

  const startInterview = useCallback(async () => {
    setPhase("questioning");
    setIsThinking(true);
    setError(null);

    const { system, firstQuestion } = resolvedPromptsRef.current;

    try {
      conversationRef.current = [{ role: "system", content: bilkoSystemPrompt(system) }];

      const { data: llmResult } = await trackStep(
        "first-question",
        { prompt: system },
        () =>
          chatJSON<TurnResponse>(
            [...conversationRef.current, { role: "user", content: firstQuestion }],
          ),
      );
      const turn = llmResult.data;

      if (turn.nextQuestion) {
        conversationRef.current.push(
          { role: "user", content: firstQuestion },
          { role: "assistant", content: JSON.stringify(turn) },
        );
        setCurrentQuestion(turn.nextQuestion);
        setCurrentContext(turn.questionContext || "");
        setQuestionsRemaining(turn.questionsRemaining ?? 5);
        await speak(turn.nextQuestion, "Puck");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start consultation");
    } finally {
      setIsThinking(false);
      inputRef.current?.focus();
    }
  }, [trackStep, speak]);

  const startConsultation = useCallback(() => {
    if (c.presets && c.presets.length > 0) {
      setPhase("presets");
    } else if (hasSetup) {
      setPhase("setup");
    } else {
      startInterview();
    }
  }, [c.presets, hasSetup, startInterview]);

  // ── Preset selection handler ──────────────────────────────

  const handlePresetSelect = useCallback((preset: FlowPreset) => {
    if (preset.setupValues && c.setupPhase) {
      // Socratic Architect: pre-fill setup values and go straight to interview
      setSetupValues(preset.setupValues);
      resolvedPromptsRef.current = {
        system: c.setupPhase.buildSystemPrompt(preset.setupValues),
        firstQuestion: c.setupPhase.buildFirstQuestionPrompt(preset.setupValues),
        analysis: c.setupPhase.buildAnalysisPrompt(preset.setupValues),
      };
      startInterview();
    } else if (preset.contextHint) {
      // Non-setup flows: inject context hint into first question prompt
      resolvedPromptsRef.current = {
        ...resolvedPromptsRef.current,
        firstQuestion: `${c.firstQuestionPrompt}\n\nContext about this user: ${preset.contextHint}\n\nUse this background to ask a more targeted, relevant first question. Don't repeat this context back to them — just let it inform your question.`,
      };
      startInterview();
    } else {
      startInterview();
    }
  }, [c, startInterview]);

  const handleStartFromScratch = useCallback(() => {
    if (hasSetup) {
      setPhase("setup");
    } else {
      startInterview();
    }
  }, [hasSetup, startInterview]);

  // ── Submit answer ───────────────────────────────────────

  const submitAnswer = useCallback(async (overrideText?: string) => {
    const answer = (overrideText ?? userInput).trim();
    if (!answer || isThinking) return;

    const question = currentQuestion;
    const context = currentContext;
    setQaPairs((prev) => [...prev, { question, context, answer }]);
    setUserInput("");
    setCurrentQuestion("");
    setIsThinking(true);
    setError(null);

    resolveUserInput(`answer-${qaPairs.length}`, { answer });

    const userMessage = `User's answer: "${answer}"\n\nBased on everything you know so far, ask your next question OR set done=true if you have enough context.`;
    conversationRef.current.push({ role: "user", content: userMessage });

    try {
      const { data: llmResult } = await trackStep(
        `question-${qaPairs.length + 1}`,
        { answer, questionNumber: qaPairs.length + 1 },
        () => chatJSON<TurnResponse>(conversationRef.current),
      );
      const nextTurn = llmResult.data;

      conversationRef.current.push({ role: "assistant", content: JSON.stringify(nextTurn) });

      if (nextTurn.done) {
        await runAnalysis([...qaPairs, { question, context, answer }]);
      } else if (nextTurn.nextQuestion) {
        setCurrentQuestion(nextTurn.nextQuestion);
        setCurrentContext(nextTurn.questionContext || "");
        setQuestionsRemaining(nextTurn.questionsRemaining ?? 1);
        await speak(nextTurn.nextQuestion, "Puck");
        inputRef.current?.focus();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process answer");
      setCurrentQuestion(question);
    } finally {
      setIsThinking(false);
    }
  }, [userInput, isThinking, currentQuestion, currentContext, qaPairs, trackStep, resolveUserInput, speak]);

  // Keep ref in sync for the utteranceEnd callback (avoids stale closure)
  submitAnswerRef.current = submitAnswer;

  // ── Analysis ────────────────────────────────────────────

  const runAnalysis = useCallback(
    async (allPairs: QAPair[]) => {
      setPhase("analyzing");

      const transcript = allPairs
        .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`)
        .join("\n\n");

      try {
        const { data: llmResult } = await trackStep(
          "analysis",
          { transcript, questionCount: allPairs.length },
          () =>
            chatJSON<AnalysisResponse>(
              jsonPrompt(
                bilkoSystemPrompt(resolvedPromptsRef.current.analysis),
                `Interview transcript:\n\n${transcript}\n\nProvide your analysis and recommendations.`,
              ),
            ),
        );
        const analysis = llmResult.data;

        setResult({
          summary: analysis.summary,
          obvious: analysis.obvious,
          nonObvious: analysis.nonObvious,
        });
        setPhase("complete");
        busSend("main", "summary", { summary: analysis.summary });
        await speak(
          `I've analyzed your responses. ${analysis.summary}`,
          "Puck",
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed");
        setPhase("questioning");
      }
    },
    [trackStep, speak, busSend],
  );

  // ── Reset ───────────────────────────────────────────────

  const reset = useCallback(() => {
    setPhase("intro");
    setSetupValues({});
    setQaPairs([]);
    setCurrentQuestion("");
    setCurrentContext("");
    setQuestionsRemaining(6);
    setUserInput("");
    setIsThinking(false);
    setResult(null);
    setError(null);
    conversationRef.current = [];
    resolvedPromptsRef.current = {
      system: c.systemPrompt,
      firstQuestion: c.firstQuestionPrompt,
      analysis: c.analysisSystemPrompt,
    };
  }, [c]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  };

  // ── Render ──────────────────────────────────────────────

  const headerIcon = c.headerIcon ?? <Lightbulb className={`h-5 w-5 text-${accent}-500`} />;
  const introIcon = c.introIcon ?? <Sparkles className={`h-6 w-6 text-${accent}-500`} />;

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {headerIcon}
            <span className="font-semibold text-sm">{c.title}</span>
          </div>
          {phase !== "intro" && phase !== "setup" && phase !== "presets" && (
            <div className="flex items-center gap-2">
              {phase === "questioning" && (
                <Badge variant="outline" className="text-xs">
                  ~{questionsRemaining} questions left
                </Badge>
              )}
              {phase === "analyzing" && (
                <Badge variant="outline" className={`text-xs bg-${accent}-500/10 text-${accent}-600`}>
                  Analyzing...
                </Badge>
              )}
              {phase === "complete" && (
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 gap-1">
                  <RotateCcw className="h-3 w-3" />
                  Start Over
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Intro screen — rich explanation */}
        {phase === "intro" && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-3">
              <div className={`mx-auto w-12 h-12 rounded-full bg-${accent}-500/10 flex items-center justify-center`}>
                {introIcon}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{c.introHeading}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-lg mx-auto leading-relaxed">
                  {c.introDescription}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                {isSupported && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Mic className="h-3 w-3" /> Voice supported
                  </Badge>
                )}
                {c.estimatedTime && (
                  <Badge variant="secondary" className="text-xs">
                    {c.estimatedTime}
                  </Badge>
                )}
              </div>
            </div>

            {/* What you'll get + How it works */}
            {c.introExplainer && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className={`h-3.5 w-3.5 text-${accent}-500`} />
                    <span className="text-xs font-semibold">What you'll get</span>
                  </div>
                  <ul className="space-y-1.5">
                    {c.introExplainer.whatYouGet.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-1.5">
                        <span className={`text-${accent}-500 shrink-0`}>-</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ListOrdered className={`h-3.5 w-3.5 text-${accent}-500`} />
                    <span className="text-xs font-semibold">How it works</span>
                  </div>
                  <ol className="space-y-1.5">
                    {c.introExplainer.howItWorks.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-1.5">
                        <span className={`text-${accent}-500 font-medium shrink-0`}>{i + 1}.</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            <div className="text-center">
              <Button onClick={startConsultation} className="gap-2">
                {c.presets ? "Choose a Starting Point" : hasSetup ? "Configure & Start" : "Start Consultation"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Preset selection screen — grandma-friendly cards */}
        {phase === "presets" && c.presets && (
          <div className="p-5 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-base">Which sounds most like you?</h3>
              <p className="text-xs text-muted-foreground">
                Pick one to get started faster, or start from scratch.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {c.presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`group text-left rounded-lg border-2 border-border p-3.5 transition-all duration-200
                    hover:border-${accent}-500/50 hover:bg-${accent}-500/5 hover:shadow-sm`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                      bg-muted text-muted-foreground group-hover:bg-${accent}-500/10 group-hover:text-${accent}-600 transition-colors`}>
                      {preset.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{preset.label}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 border-t border-border/50" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t border-border/50" />
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPhase("intro")} className="text-xs">
                Back
              </Button>
              <Button variant="outline" size="sm" onClick={handleStartFromScratch} className="text-xs gap-1.5">
                {hasSetup ? "Design my own expert" : "Start from scratch"}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Setup screen (Socratic Architect) */}
        {phase === "setup" && c.setupPhase && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-lg">{c.setupPhase.heading}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {c.setupPhase.description}
              </p>
            </div>
            <div className="space-y-4">
              {c.setupPhase.fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-sm font-medium">{field.label}</label>
                  <Input
                    value={setupValues[field.id] || ""}
                    onChange={(e) =>
                      setSetupValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPhase("intro")}>
                Back
              </Button>
              <Button
                onClick={handleSetupSubmit}
                disabled={!c.setupPhase.fields.every((f) => setupValues[f.id]?.trim())}
                className="gap-2"
              >
                Start Interview
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Conversation area */}
        {(phase === "questioning" || phase === "analyzing" || phase === "complete") && (
          <div ref={scrollRef} className="max-h-[500px] overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Q&A history */}
              {qaPairs.map((qa, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex gap-3">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{qa.question}</p>
                      {qa.context && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                          {qa.context}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ml-9 p-2.5 rounded-md bg-muted/50 border border-border/50">
                    <p className="text-sm">{qa.answer}</p>
                  </div>
                </div>
              ))}

              {/* Current question */}
              {currentQuestion && !isThinking && phase === "questioning" && (
                <div className="flex gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {qaPairs.length + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{currentQuestion}</p>
                    {currentContext && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                        {currentContext}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Thinking */}
              {isThinking && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {phase === "analyzing"
                    ? "Analyzing your responses and crafting recommendations..."
                    : "Thinking about the next question..."}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
                  {error}
                </div>
              )}

              {/* Results */}
              {result && phase === "complete" && (
                <div className="space-y-5 pt-2">
                  <div className="p-3 rounded-md bg-muted/50 border border-border/50">
                    <p className="text-sm leading-relaxed">{result.summary}</p>
                  </div>

                  {/* Primary section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className={`h-4 w-4 text-${accent}-500`} />
                      <h4 className="font-semibold text-sm">{c.primaryLabel}</h4>
                      <Badge variant="outline" className="text-xs">
                        {c.primaryBadge}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {result.obvious.map((rec, i) => (
                        <RecommendationCard
                          key={`o-${i}`}
                          rec={rec}
                          index={i + 1}
                          accent={accent}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Secondary section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <h4 className="font-semibold text-sm">{c.secondaryLabel}</h4>
                      <Badge variant="outline" className="text-xs">
                        {c.secondaryBadge}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {result.nonObvious.map((rec, i) => (
                        <RecommendationCard
                          key={`n-${i}`}
                          rec={rec}
                          index={i + 1}
                          accent="purple"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            {phase === "questioning" && currentQuestion && !isThinking && (
              <div className="sticky bottom-0 bg-background">
                <div className="border-t p-3 space-y-2">
                  <div className="flex gap-2">
                    <Textarea
                      ref={inputRef}
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your answer or use voice..."
                      rows={2}
                      className="resize-none flex-1"
                      disabled={isThinking}
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 self-end"
                      onClick={() => submitAnswer()}
                      disabled={!userInput.trim() || isThinking}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press Enter to send
                  </p>
                </div>
                {/* Unified voice status — same component as the chat panel */}
                <VoiceStatusBar />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Recommendation card ───────────────────────────────────

function RecommendationCard({
  rec,
  index,
  accent = "yellow",
}: {
  rec: Recommendation;
  index: number;
  accent?: string;
}) {
  return (
    <div
      className={`p-3 rounded-lg border border-${accent}-500/20 bg-${accent}-500/5`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-${accent}-500/20 text-${accent}-600`}
        >
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-sm">{rec.title}</h5>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {rec.description}
          </p>
          <p className={`text-xs mt-2 font-medium text-${accent}-600`}>
            Impact: {rec.impact}
          </p>
          {rec.tools && rec.tools.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {rec.tools.map((tool) => (
                <Badge key={tool} variant="secondary" className="text-[10px] h-5">
                  {tool}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
