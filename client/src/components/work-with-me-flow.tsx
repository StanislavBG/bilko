/**
 * Work With Me Flow — Guided web task assistant
 *
 * The user specifies an objective (e.g. "register a business in WA").
 * The agent researches step-by-step links, then renders each website
 * as a wireframe inside the app. The agent "sees" the page through
 * the user's eyes and provides element-level guidance with justifications.
 *
 * Flow steps:
 *   1. objective-input   (user-input)  — User enters their goal
 *   2. research-steps    (llm)         — Agent finds step-by-step plan with URLs
 *   3. select-step       (user-input)  — User picks which step to work on
 *   4. fetch-page        (transform)   — Proxy fetches + structures the page
 *   5. analyze-page      (llm)         — Agent reads page, generates guidance
 *   6. guided-view       (display)     — Wireframe with guidance overlays
 *
 * Uses flow-engine abstractions:
 *   - chatJSON<T>()        for all LLM calls
 *   - useFlowExecution()   for execution tracing
 *   - apiPost()            for web proxy calls
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  Circle,
  ArrowRight,
  ExternalLink,
  MousePointerClick,
  Eye,
  FileText,
  FormInput,
  Link2,
  Type,
  List,
  Image,
  Navigation,
  AlertCircle,
  ChevronRight,
  RotateCcw,
  Compass,
  Target,
  Handshake,
} from "lucide-react";
import {
  chatJSON,
  jsonPrompt,
  apiPost,
  useFlowExecution,
  useFlowDefinition,
  useFlowChat,
} from "@/lib/flow-engine";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { useFlowRegistration } from "@/contexts/flow-bus-context";
import { useVoice } from "@/contexts/voice-context";
import { getFlowAgent } from "@/lib/bilko-persona/flow-agents";

// ── Types ──────────────────────────────────────────────────

type FlowPhase =
  | "objective-input"
  | "researching"
  | "select-step"
  | "fetching-page"
  | "analyzing"
  | "guided-view"
  | "error";

interface TaskStep {
  stepNumber: number;
  title: string;
  description: string;
  url: string;
  estimatedTime: string;
  whyThisStep: string;
}

interface ResearchResponse {
  taskTitle: string;
  overview: string;
  steps: TaskStep[];
}

interface PageElement {
  id: string;
  type: string;
  tag: string;
  text: string;
  href?: string;
  level?: number;
  fieldType?: string;
  label?: string;
  alt?: string;
}

interface PageStructure {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  elements: PageElement[];
  fetchedAt: number;
}

interface GuidanceItem {
  elementId: string;
  action: "click" | "fill" | "read" | "select" | "scroll-to";
  instruction: string;
  justification: string;
  order: number;
  priority: "primary" | "secondary" | "info";
}

interface PageGuidance {
  pageSummary: string;
  currentStepContext: string;
  guidanceItems: GuidanceItem[];
  nextAction: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  status: "pending" | "active" | "complete" | "error";
  detail?: string;
}

// ── Prompts ────────────────────────────────────────────────

const RESEARCH_SYSTEM_PROMPT = bilkoSystemPrompt(`You are a task research specialist. Given a user's objective, find the exact steps they need to complete it online.

Return ONLY valid JSON with this structure:
{
  "taskTitle": "Short title for the task",
  "overview": "1-2 sentence overview of what needs to be done",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "description": "What to do in this step (1-2 sentences)",
      "url": "https://exact-url-to-visit",
      "estimatedTime": "5 min",
      "whyThisStep": "Why this step is necessary (1 sentence)"
    }
  ]
}

Rules:
- Find 3-7 concrete steps with REAL, working URLs
- URLs must be official government, organization, or service websites — not blog posts or articles
- Each step should be actionable — something the user actually does on that website
- Order steps logically — what comes first, what depends on what
- Keep descriptions concise and action-oriented
- estimatedTime should be realistic
- whyThisStep explains why this step matters in the overall process
- No markdown, ONLY the JSON object`);

function makeGuidancePrompt(
  objective: string,
  stepContext: TaskStep,
  page: PageStructure,
): string {
  // Build a concise page representation for the LLM
  const elementSummary = page.elements
    .map((el) => {
      let desc = `[${el.id}] ${el.type}: "${el.text}"`;
      if (el.href) desc += ` → ${el.href}`;
      if (el.fieldType) desc += ` (${el.fieldType})`;
      return desc;
    })
    .join("\n");

  return bilkoSystemPrompt(`You are guiding a user through a website to help them achieve their goal.

USER'S OBJECTIVE: ${objective}
CURRENT STEP: Step ${stepContext.stepNumber} — ${stepContext.title}
STEP DESCRIPTION: ${stepContext.description}

The user is now viewing this page:
PAGE TITLE: ${page.title}
PAGE URL: ${page.finalUrl}
PAGE DESCRIPTION: ${page.description}

PAGE ELEMENTS (the user sees these — reference them by ID):
${elementSummary}

Return ONLY valid JSON with this structure:
{
  "pageSummary": "What this page is about and how it relates to the user's goal (1-2 sentences)",
  "currentStepContext": "Where the user is in their overall journey (1 sentence)",
  "guidanceItems": [
    {
      "elementId": "the-element-id",
      "action": "click|fill|read|select|scroll-to",
      "instruction": "Clear instruction for what to do with this element",
      "justification": "Why this action matters for achieving the user's goal",
      "order": 1,
      "priority": "primary|secondary|info"
    }
  ],
  "nextAction": "What happens after following the guidance (1 sentence)"
}

Rules:
- Reference elements by their exact IDs from the page elements list
- Limit to 3-5 guidance items — focus on what matters most
- Primary = must do, Secondary = should do, Info = good to know
- Every guidance item MUST have a justification explaining WHY
- Instructions should be specific and actionable
- Order guidance items in the sequence the user should follow them
- If the page is a form, guide through the form fields
- If the page has navigation, point to the right link to click
- No markdown, ONLY the JSON object`);
}

// ── Status messages ────────────────────────────────────────

const RESEARCH_STATUS_MESSAGES = [
  "Understanding your objective...",
  "Searching for official resources...",
  "Mapping out the steps you'll need...",
  "Finding the right starting points...",
  "Building your step-by-step plan...",
];

const ANALYSIS_STATUS_MESSAGES = [
  "Reading the page through your eyes...",
  "Identifying key elements...",
  "Figuring out what you need to do here...",
  "Preparing your guidance...",
];

// ── Element type icons ─────────────────────────────────────

function ElementIcon({ type }: { type: string }) {
  switch (type) {
    case "heading":
      return <Type className="h-3.5 w-3.5" />;
    case "link":
    case "nav-link":
      return <Link2 className="h-3.5 w-3.5" />;
    case "button":
      return <MousePointerClick className="h-3.5 w-3.5" />;
    case "form-field":
      return <FormInput className="h-3.5 w-3.5" />;
    case "paragraph":
      return <FileText className="h-3.5 w-3.5" />;
    case "list-item":
      return <List className="h-3.5 w-3.5" />;
    case "image":
      return <Image className="h-3.5 w-3.5" />;
    default:
      return <Eye className="h-3.5 w-3.5" />;
  }
}

// ── Guidance action colors ─────────────────────────────────

function getGuidanceColor(priority: GuidanceItem["priority"]): string {
  switch (priority) {
    case "primary":
      return "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "secondary":
      return "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "info":
      return "border-gray-400 bg-gray-100/50 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400";
  }
}

function getActionLabel(action: GuidanceItem["action"]): string {
  switch (action) {
    case "click":
      return "Click";
    case "fill":
      return "Fill in";
    case "read":
      return "Read";
    case "select":
      return "Select";
    case "scroll-to":
      return "Find";
  }
}

// ── Component ──────────────────────────────────────────────

export function WorkWithMeFlow({ onComplete }: { onComplete?: (summary?: string) => void }) {
  const [phase, setPhase] = useState<FlowPhase>("objective-input");
  const [objective, setObjective] = useState("");
  const [research, setResearch] = useState<ResearchResponse | null>(null);
  const [selectedStep, setSelectedStep] = useState<TaskStep | null>(null);
  const [pageStructure, setPageStructure] = useState<PageStructure | null>(null);
  const [guidance, setGuidance] = useState<PageGuidance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const { trackStep, resolveUserInput } = useFlowExecution("work-with-me");
  const { definition: flowDef } = useFlowDefinition("work-with-me");
  const { setStatus: setBusStatus, send: busSend } = useFlowRegistration(
    "work-with-me",
    "Work With Me",
  );
  const { speak } = useVoice();
  const { pushMessage } = useFlowChat();

  const agent = getFlowAgent("work-with-me");
  const pushAgentMessage = useCallback((text: string, speech?: string) => {
    pushMessage("work-with-me", {
      speaker: "agent",
      text,
      speech: speech ?? text,
      agentName: agent?.chatName,
      agentDisplayName: agent?.name,
      agentAccent: agent?.accentColor,
    });
  }, [pushMessage, agent]);

  // Push greeting on mount
  const didGreet = useRef(false);
  useEffect(() => {
    if (didGreet.current) return;
    didGreet.current = true;
    if (agent) {
      pushAgentMessage(agent.greeting, agent.greetingSpeech);
    }
  }, [agent, pushAgentMessage]);

  const [steps, setSteps] = useState<WorkflowStep[]>([
    { id: "objective", name: "Set Your Goal", status: "active" },
    { id: "research", name: "Find the Steps", status: "pending" },
    { id: "guide", name: "Follow the Guide", status: "pending" },
  ]);

  const updateStep = (
    stepId: string,
    status: WorkflowStep["status"],
    detail?: string,
  ) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status, detail } : s)),
    );
  };

  // Sync phase to flow bus
  useEffect(() => {
    const statusMap: Record<FlowPhase, "running" | "complete" | "error"> = {
      "objective-input": "running",
      researching: "running",
      "select-step": "running",
      "fetching-page": "running",
      analyzing: "running",
      "guided-view": "running",
      error: "error",
    };
    setBusStatus(statusMap[phase], phase);
  }, [phase, setBusStatus]);

  // Rotate status messages
  useEffect(() => {
    const messages =
      phase === "researching"
        ? RESEARCH_STATUS_MESSAGES
        : phase === "analyzing"
          ? ANALYSIS_STATUS_MESSAGES
          : null;
    if (!messages) return;

    let index = 0;
    setStatusMessage(messages[0]);
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setStatusMessage(messages[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Step 1: Submit objective ─────────────────────────────

  const handleObjectiveSubmit = useCallback(async () => {
    if (!objective.trim()) return;

    resolveUserInput("objective-input", { objective: objective.trim() });
    setPhase("researching");
    setError(null);
    updateStep("objective", "complete", objective.trim());
    updateStep("research", "active", "Researching your task...");

    try {
      const { data: result } = await trackStep(
        "research-steps",
        {
          prompt: RESEARCH_SYSTEM_PROMPT,
          userMessage: `Find the step-by-step process for: "${objective.trim()}"`,
        },
        () =>
          chatJSON<ResearchResponse>(
            jsonPrompt(
              RESEARCH_SYSTEM_PROMPT,
              `Find the step-by-step process for: "${objective.trim()}"`,
            ),
          ),
      );

      setResearch(result.data);
      updateStep("research", "complete", `${result.data.steps.length} steps found`);
      updateStep("guide", "active", "Pick a step to start");
      setPhase("select-step");
      speak(
        `Found ${result.data.steps.length} steps to ${result.data.taskTitle}. Pick one to get started.`,
        "Fenrir",
      );
    } catch (err) {
      console.error("Research error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to research your task.",
      );
      updateStep("research", "error", "Something went wrong");
      setPhase("error");
      speak("Something went wrong researching your task. Let me try again.", "Fenrir");
    }
  }, [objective, trackStep, resolveUserInput, speak]);

  // ── Step 3: Select a step and fetch page ─────────────────

  const handleStepSelect = useCallback(
    async (step: TaskStep) => {
      setSelectedStep(step);
      setGuidance(null);
      setPageStructure(null);
      setHighlightedElement(null);
      resolveUserInput("select-step", { selectedStep: step });

      // Fetch the page
      setPhase("fetching-page");
      updateStep("guide", "active", `Loading ${step.title}...`);

      try {
        const page = await trackStep(
          "fetch-page",
          { url: step.url },
          () => apiPost<PageStructure>("/api/web-proxy/fetch", { url: step.url }),
        );

        setPageStructure(page.data);

        // Now analyze the page
        setPhase("analyzing");
        updateStep("guide", "active", "Reading the page...");

        const guidancePrompt = makeGuidancePrompt(
          objective,
          step,
          page.data,
        );

        const { data: guidanceResult } = await trackStep(
          "analyze-page",
          { objective, step: step.title, pageTitle: page.data.title },
          () =>
            chatJSON<PageGuidance>(
              jsonPrompt(
                guidancePrompt,
                `Guide the user through this page to help them: "${step.description}"`,
              ),
            ),
        );

        setGuidance(guidanceResult.data);
        setPhase("guided-view");
        updateStep("guide", "active", `Viewing: ${page.data.title}`);
        speak(guidanceResult.data.pageSummary, "Fenrir");
      } catch (err) {
        console.error("Page fetch/analyze error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load the page.",
        );
        setPhase("error");
      }
    },
    [objective, trackStep, resolveUserInput, speak],
  );

  // ── Navigate to a link within the guided view ────────────

  const handleNavigateToLink = useCallback(
    async (href: string) => {
      if (!selectedStep || !href) return;

      setGuidance(null);
      setPageStructure(null);
      setHighlightedElement(null);
      setPhase("fetching-page");
      updateStep("guide", "active", "Following link...");

      try {
        const page = await apiPost<PageStructure>("/api/web-proxy/fetch", {
          url: href,
        });
        setPageStructure(page);

        setPhase("analyzing");
        updateStep("guide", "active", "Reading the new page...");

        const guidancePrompt = makeGuidancePrompt(objective, selectedStep, page);
        const { data: guidanceResult } = await chatJSON<PageGuidance>(
          jsonPrompt(
            guidancePrompt,
            `The user clicked a link and is now on a new page. Guide them through it for: "${selectedStep.description}"`,
          ),
        );

        setGuidance(guidanceResult);
        setPhase("guided-view");
        updateStep("guide", "active", `Viewing: ${page.title}`);
        speak(guidanceResult.pageSummary, "Fenrir");
      } catch (err) {
        console.error("Navigation error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load the page.",
        );
        setPhase("error");
      }
    },
    [objective, selectedStep, speak],
  );

  // ── Mark step complete and go back to step list ──────────

  const handleStepComplete = useCallback(() => {
    if (selectedStep) {
      setCompletedSteps((prev) => new Set([...Array.from(prev), selectedStep.stepNumber]));
    }
    setSelectedStep(null);
    setPageStructure(null);
    setGuidance(null);
    setHighlightedElement(null);
    setPhase("select-step");
    updateStep("guide", "active", "Pick your next step");

    if (selectedStep) {
      const summaryText = `Completed step ${selectedStep.stepNumber}: ${selectedStep.title}`;
      pushAgentMessage(summaryText);
      busSend("main", "summary", { summary: summaryText });
    }
  }, [selectedStep, busSend, pushAgentMessage]);

  // ── Full reset ───────────────────────────────────────────

  const handleReset = useCallback(() => {
    setPhase("objective-input");
    setObjective("");
    setResearch(null);
    setSelectedStep(null);
    setPageStructure(null);
    setGuidance(null);
    setError(null);
    setHighlightedElement(null);
    setCompletedSteps(new Set());
    setSteps([
      { id: "objective", name: "Set Your Goal", status: "active" },
      { id: "research", name: "Find the Steps", status: "pending" },
      { id: "guide", name: "Follow the Guide", status: "pending" },
    ]);
  }, []);

  // ── Build element lookup for highlighting ────────────────

  const guidedElementIds = useMemo(() => {
    if (!guidance) return new Set<string>();
    return new Set(guidance.guidanceItems.map((g) => g.elementId));
  }, [guidance]);

  const guidanceByElement = useMemo(() => {
    if (!guidance) return new Map<string, GuidanceItem>();
    const map = new Map<string, GuidanceItem>();
    guidance.guidanceItems.forEach((g) => map.set(g.elementId, g));
    return map;
  }, [guidance]);

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Progress tracker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            Work With Me
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tell me what you need to do online — I'll find the steps and guide
            you through each website.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3">
                {step.status === "pending" && (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                {step.status === "active" && (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                )}
                {step.status === "complete" && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {step.status === "error" && (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      step.status === "pending"
                        ? "text-muted-foreground"
                        : step.status === "error"
                          ? "text-red-500"
                          : ""
                    }`}
                  >
                    {step.name}
                  </p>
                  {step.detail && (
                    <p className="text-xs text-muted-foreground">
                      {step.detail}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    step.status === "complete"
                      ? "default"
                      : step.status === "active"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-xs"
                >
                  {index + 1}/3
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Phase 1: Objective input */}
      {phase === "objective-input" && (
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">What do you need to do?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Describe your task — I'll find the websites and walk you
                    through each one step by step.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleObjectiveSubmit();
                    }
                  }}
                  placeholder="e.g., Register a business in Washington State, Apply for a passport renewal, File a tax extension..."
                  className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleObjectiveSubmit}
                    disabled={!objective.trim()}
                    className="gap-2"
                  >
                    Find the Steps
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Example objectives */}
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Try one of these:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Register an LLC in Washington State",
                    "Apply for a US passport renewal",
                    "File for a small business tax extension",
                    "Set up a Google Workspace for my team",
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => setObjective(example)}
                      className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: Researching */}
      {phase === "researching" && (
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Compass className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-lg font-semibold">Researching your task...</h3>
                <p className="text-muted-foreground text-sm">{statusMessage}</p>
                <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                  "{objective}"
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full animate-pulse"
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 3: Step selection */}
      {phase === "select-step" && research && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{research.taskTitle}</h3>
              <p className="text-sm text-muted-foreground">
                {research.overview}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {research.steps.map((step) => {
              const isCompleted = completedSteps.has(step.stepNumber);
              return (
                <Card
                  key={step.stepNumber}
                  className={`cursor-pointer transition-all ${
                    isCompleted
                      ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20"
                      : "hover:border-primary hover:shadow-sm"
                  }`}
                  onClick={() => handleStepSelect(step)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          step.stepNumber
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{step.title}</h4>
                          {isCompleted && (
                            <Badge
                              variant="outline"
                              className="text-xs text-green-600 border-green-300"
                            >
                              Done
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {step.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {new URL(step.url).hostname}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ~{step.estimatedTime}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-1 italic">
                          {step.whyThisStep}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Start over with a new goal
            </Button>
            {onComplete && completedSteps.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onComplete(`Completed ${completedSteps.size} steps for: ${research?.taskTitle ?? objective}.`)}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Phase 4/5: Fetching or analyzing page */}
      {(phase === "fetching-page" || phase === "analyzing") && (
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Eye className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-lg font-semibold">
                  {phase === "fetching-page"
                    ? "Loading the website..."
                    : "Analyzing the page..."}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {phase === "fetching-page"
                    ? `Fetching ${selectedStep?.url}`
                    : statusMessage}
                </p>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full animate-pulse"
                    style={{ width: phase === "fetching-page" ? "40%" : "70%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 6: Guided view — wireframe + guidance */}
      {phase === "guided-view" && pageStructure && guidance && (
        <div className="space-y-4">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Navigation className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{pageStructure.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {pageStructure.finalUrl}
                </p>
              </div>
            </div>
            <a
              href={pageStructure.finalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Open in browser <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Agent context bar */}
          <Card className="border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="py-3 px-4">
              <p className="text-sm">{guidance.pageSummary}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {guidance.currentStepContext}
              </p>
            </CardContent>
          </Card>

          {/* Guidance items */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What to do on this page
            </h4>
            {guidance.guidanceItems
              .sort((a, b) => a.order - b.order)
              .map((item) => (
                <Card
                  key={item.elementId + item.order}
                  className={`border-l-4 transition-all cursor-pointer ${getGuidanceColor(item.priority)} ${
                    highlightedElement === item.elementId
                      ? "ring-2 ring-blue-400 shadow-md"
                      : ""
                  }`}
                  onClick={() =>
                    setHighlightedElement(
                      highlightedElement === item.elementId
                        ? null
                        : item.elementId,
                    )
                  }
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      <Badge
                        variant="outline"
                        className="shrink-0 text-xs mt-0.5"
                      >
                        {item.order}. {getActionLabel(item.action)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {item.instruction}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Why: {item.justification}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Wireframe: page elements */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Page Content
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Wireframe view — highlighted elements have guidance. Click to interact.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-2">
                {pageStructure.elements.map((el) => {
                  const isGuided = guidedElementIds.has(el.id);
                  const isHighlighted = highlightedElement === el.id;
                  const guidanceItem = guidanceByElement.get(el.id);

                  return (
                    <div
                      key={el.id}
                      id={`wireframe-${el.id}`}
                      className={`rounded-md px-3 py-2 transition-all ${
                        isHighlighted
                          ? "ring-2 ring-blue-500 bg-blue-100/80 dark:bg-blue-900/40 shadow-md"
                          : isGuided
                            ? "border-2 border-dashed border-blue-400/60 bg-blue-50/30 dark:bg-blue-950/20 cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
                            : "border border-border/50 hover:border-border"
                      }`}
                      onClick={() => {
                        if (isGuided) {
                          setHighlightedElement(
                            isHighlighted ? null : el.id,
                          );
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <ElementIcon type={el.type} />
                        <div className="flex-1 min-w-0">
                          {/* Render based on type */}
                          {el.type === "heading" && (
                            <p
                              className={`font-semibold ${
                                el.level === 1
                                  ? "text-base"
                                  : el.level === 2
                                    ? "text-sm"
                                    : "text-xs"
                              }`}
                            >
                              {el.text}
                            </p>
                          )}

                          {(el.type === "link" || el.type === "nav-link") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (el.href) handleNavigateToLink(el.href);
                              }}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline text-left"
                            >
                              {el.text}
                              {el.href && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({new URL(el.href).hostname})
                                </span>
                              )}
                            </button>
                          )}

                          {el.type === "button" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (el.href) handleNavigateToLink(el.href);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                            >
                              <MousePointerClick className="h-3 w-3" />
                              {el.text}
                            </button>
                          )}

                          {el.type === "form-field" && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {el.label}:
                              </span>
                              <div className="flex-1 h-7 rounded border border-dashed border-muted-foreground/30 bg-muted/30 px-2 flex items-center">
                                <span className="text-xs text-muted-foreground/50">
                                  {el.fieldType === "select"
                                    ? "Select..."
                                    : el.fieldType === "textarea"
                                      ? "Enter text..."
                                      : `Enter ${el.fieldType || "text"}...`}
                                </span>
                              </div>
                            </div>
                          )}

                          {el.type === "paragraph" && (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {el.text}
                            </p>
                          )}

                          {el.type === "list-item" && (
                            <p className="text-xs text-muted-foreground">
                              • {el.text}
                            </p>
                          )}

                          {el.type === "image" && (
                            <p className="text-xs text-muted-foreground italic">
                              [Image: {el.alt || el.text}]
                            </p>
                          )}

                          {el.type === "section" && (
                            <p className="text-xs font-medium text-muted-foreground">
                              {el.text}
                            </p>
                          )}
                        </div>

                        {/* Guided indicator */}
                        {isGuided && guidanceItem && (
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-[10px] ${
                              guidanceItem.priority === "primary"
                                ? "border-blue-400 text-blue-600"
                                : guidanceItem.priority === "secondary"
                                  ? "border-amber-400 text-amber-600"
                                  : "border-gray-300 text-gray-500"
                            }`}
                          >
                            {getActionLabel(guidanceItem.action)}
                          </Badge>
                        )}
                      </div>

                      {/* Inline guidance tooltip when highlighted */}
                      {isHighlighted && guidanceItem && (
                        <div className="mt-2 pl-6 border-l-2 border-blue-400">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                            {guidanceItem.instruction}
                          </p>
                          <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5 italic">
                            {guidanceItem.justification}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Next action */}
          <Card className="border-green-500/20 bg-green-50/30 dark:bg-green-950/20">
            <CardContent className="py-3 px-4">
              <p className="text-sm">
                <span className="font-medium">Next:</span> {guidance.nextAction}
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleStepComplete}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Mark step complete
            </Button>
            <a
              href={pageStructure.finalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open actual website
              </Button>
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedStep(null);
                setPageStructure(null);
                setGuidance(null);
                setHighlightedElement(null);
                setPhase("select-step");
                updateStep("guide", "active", "Pick a step");
              }}
            >
              Back to steps
            </Button>
          </div>
        </div>
      )}

      {/* Error state */}
      {phase === "error" && (
        <Card className="border-red-200">
          <CardContent className="pt-6 text-center">
            <p className="text-red-500 mb-2 font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <div className="flex justify-center gap-3">
              <Button onClick={handleReset} variant="outline">
                Start Over
              </Button>
              {selectedStep && (
                <Button
                  onClick={() => handleStepSelect(selectedStep)}
                  variant="outline"
                >
                  Retry This Step
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
