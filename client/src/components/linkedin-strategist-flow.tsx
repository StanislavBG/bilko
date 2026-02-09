/**
 * LinkedIn Strategist Flow — Goal-driven LinkedIn career flow
 *
 * A multi-phase flow where the user picks a goal (Improve LinkedIn or
 * Interview Based on Roles), provides their LinkedIn URL, then engages
 * in a dynamic conversation with the LLM that adapts to the chosen goal.
 *
 * Phases:
 * 1. intro — Overview of what the flow does
 * 2. goal-selection — Pick "Improve" or "Interview"
 * 3. linkedin-input — URL only (no experience paste)
 * 4. conversation — Multi-turn LLM conversation adapted to goal
 * 5. generating — LLM crafts recommendations or interview summary
 * 6. results — Display final output (branches by goal)
 *
 * Uses chatJSON<T>() for all LLM calls per ARCH-001 D1.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send,
  Loader2,
  Mic,
  ArrowRight,
  RotateCcw,
  Briefcase,
  Check,
  Copy,
  Link,
  ChevronRight,
  Sparkles,
  Target,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { chatJSON, jsonPrompt, useFlowExecution, useFlowDefinition, useFlowChat } from "@/lib/flow-engine";
import { useVoice } from "@/contexts/voice-context";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { useFlowRegistration } from "@/contexts/flow-bus-context";
import { VoiceStatusBar } from "@/components/voice-status-bar";
import { getFlowAgent } from "@/lib/bilko-persona/flow-agents";

// ── Types ────────────────────────────────────────────────

type FlowGoal = "improve" | "interview";

interface DiscoveredRole {
  id: string;
  title: string;
  company: string;
  duration: string;
  notes: string;
}

interface ConversationTurn {
  role: "assistant" | "user";
  message: string;
  context?: string;
}

interface RoleOption {
  id: string;
  label: string;
  description: string;
  keyHighlights: string[];
}

interface RoleRecommendation {
  roleId: string;
  title: string;
  company: string;
  duration: string;
  options: RoleOption[];
}

interface InterviewResult {
  summary: string;
  strengths: string[];
  areasToExplore: string[];
  roleInsights: Array<{ role: string; insight: string }>;
}

type Phase =
  | "intro"
  | "goal-selection"
  | "linkedin-input"
  | "conversation"
  | "generating"
  | "results";

// ── LinkedIn URL validation ──────────────────────────────

const LINKEDIN_URL_REGEX = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?/i;

function isValidLinkedInUrl(url: string): boolean {
  return LINKEDIN_URL_REGEX.test(url.trim());
}

// ── LLM Prompts ──────────────────────────────────────────

function buildImproveConversationPrompt(linkedinUrl: string): string {
  return `You are a world-class LinkedIn career strategist. The user wants to improve their LinkedIn profile descriptions. Their profile is at: ${linkedinUrl}

Your job is to have an exploratory conversation to understand their roles and achievements. You need to:
1. Ask about their current and past professional roles
2. For each role, dig into specific achievements, metrics, impact, responsibilities
3. Understand their career trajectory and what makes them unique
4. Take mental notes on everything they share

Ask ONE question at a time. Be conversational and build on their answers. Show you're listening.
Start by asking about their current role and work backwards through their career.

RESPONSE FORMAT — return ONLY valid JSON:
{
  "message": "Your question or response to the user",
  "context": "Brief note on why you're asking this (1 sentence)",
  "done": false,
  "rolesDiscovered": [
    {
      "id": "role-1",
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Time period or 'unknown'",
      "notes": "Key details gathered so far about this role"
    }
  ]
}

Rules:
- rolesDiscovered should be the CUMULATIVE list of ALL roles mentioned so far
- Update notes for each role as you learn more
- Use "role-1", "role-2", etc. as IDs
- When you have gathered enough detail about their roles (typically after 6-10 exchanges), set done=true
- When done=true, make sure rolesDiscovered contains comprehensive notes for each role
- No markdown. ONLY the JSON object.`;
}

function buildInterviewConversationPrompt(linkedinUrl: string): string {
  return `You are a dynamic interviewer conducting a professional interview based on the user's LinkedIn roles. Their profile is at: ${linkedinUrl}

Your job is to conduct a realistic, engaging interview that:
1. Starts by asking about their current role
2. Dives deep into their experiences, decisions, and leadership
3. Asks behavioral questions tailored to what they share
4. Challenges them to articulate their impact clearly
5. Explores cross-role themes and career progression

Ask ONE question at a time. Be conversational and adapt your questions based on their answers. This should feel like a real professional interview, not an interrogation.

RESPONSE FORMAT — return ONLY valid JSON:
{
  "message": "Your interview question or follow-up",
  "context": "Brief note on what area you're exploring (1 sentence)",
  "done": false,
  "rolesDiscovered": [
    {
      "id": "role-1",
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Time period or 'unknown'",
      "notes": "Key observations from their answers about this role"
    }
  ]
}

Rules:
- rolesDiscovered should be the CUMULATIVE list of ALL roles mentioned so far
- Update notes as you learn more
- Use "role-1", "role-2", etc. as IDs
- After 8-12 exchanges (covering their key roles and experiences), set done=true
- No markdown. ONLY the JSON object.`;
}

function buildGenerateRecommendationsPrompt(
  linkedinUrl: string,
  conversationHistory: string,
  roles: DiscoveredRole[],
): string {
  return `You are a world-class LinkedIn copywriter and career strategist. Using the conversation insights, generate improved LinkedIn role descriptions.

LINKEDIN PROFILE: ${linkedinUrl}

ROLES DISCOVERED:
${roles.map(r => `- ${r.title} at ${r.company} (${r.duration})\n  Notes: ${r.notes}`).join("\n")}

CONVERSATION TRANSCRIPT:
${conversationHistory}

For EACH role, create 2-3 different description OPTIONS with different angles:
- Option A: Impact-focused (metrics, outcomes, business results)
- Option B: Leadership-focused (team, influence, strategy)
- Option C: Technical depth (skills, methodologies, innovations) — only include if relevant to the role

RESPONSE FORMAT — return ONLY valid JSON:
{
  "roles": [
    {
      "roleId": "role-1",
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Time period",
      "options": [
        {
          "id": "option-a",
          "label": "Impact-focused",
          "description": "The updated description (2-4 paragraphs, flowing prose, no bullets). 150-300 words.",
          "keyHighlights": ["3-5 key achievements as punchy one-liners"]
        }
      ]
    }
  ]
}

Rules:
- Each description must be specific — reference real details from the conversation
- Lead with impact, not responsibilities
- Include metrics and numbers where possible
- Professional but human tone — sound like a high-performer, not a bot
- No generic filler like "results-driven professional"
- No markdown in descriptions (plain text with line breaks)
- ONLY the JSON object.`;
}

function buildInterviewSummaryPrompt(
  linkedinUrl: string,
  conversationHistory: string,
  roles: DiscoveredRole[],
): string {
  return `You are a senior interview coach providing feedback on a professional interview. Analyze the conversation and provide actionable feedback.

LINKEDIN PROFILE: ${linkedinUrl}

ROLES DISCUSSED:
${roles.map(r => `- ${r.title} at ${r.company} (${r.duration})\n  Notes: ${r.notes}`).join("\n")}

INTERVIEW TRANSCRIPT:
${conversationHistory}

RESPONSE FORMAT — return ONLY valid JSON:
{
  "summary": "2-3 sentence overall assessment of how well they articulated their experience",
  "strengths": ["3-5 specific things they communicated well, with examples from the conversation"],
  "areasToExplore": ["2-4 areas where they could provide more detail or reframe their narrative"],
  "roleInsights": [
    {
      "role": "Title at Company",
      "insight": "Specific feedback about how they described this role and what they could emphasize more"
    }
  ]
}

Be specific and actionable. Reference actual things they said. This should feel like feedback from a mentor, not a generic template.
No markdown. ONLY the JSON object.`;
}

// ── Component ────────────────────────────────────────────

export function LinkedInStrategistFlow({ onComplete }: { onComplete?: (summary?: string) => void }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [goal, setGoal] = useState<FlowGoal | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [discoveredRoles, setDiscoveredRoles] = useState<DiscoveredRole[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Improve mode results
  const [recommendations, setRecommendations] = useState<RoleRecommendation[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Interview mode results
  const [interviewResult, setInterviewResult] = useState<InterviewResult | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const conversationRef = useRef<Array<{ role: "system" | "user" | "assistant"; content: string }>>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { trackStep, resolveUserInput } = useFlowExecution("linkedin-strategist");
  const { definition: flowDef } = useFlowDefinition("linkedin-strategist");
  const { isListening, isSupported, transcript, speak, onUtteranceEnd } = useVoice();
  const { setStatus: setBusStatus, send: busSend } = useFlowRegistration(
    "linkedin-strategist",
    "LinkedIn Strategist",
  );
  const { pushMessage } = useFlowChat();

  const agent = getFlowAgent("linkedin");
  const pushAgentMessage = useCallback((text: string, speech?: string) => {
    pushMessage("linkedin-strategist", {
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

  // Sync phase to flow bus
  useEffect(() => {
    const statusMap: Record<Phase, "running" | "complete" | "error"> = {
      intro: "running",
      "goal-selection": "running",
      "linkedin-input": "running",
      conversation: "running",
      generating: "running",
      results: "complete",
    };
    setBusStatus(statusMap[phase], phase);
  }, [phase, setBusStatus]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationTurns, phase]);

  // Voice → input sync
  useEffect(() => {
    if (isListening && transcript && phase === "conversation") {
      setUserInput(transcript);
    }
  }, [transcript, isListening, phase]);

  // Auto-send on voice end
  const submitMessageRef = useRef<((overrideText?: string) => Promise<void>) | null>(null);
  useEffect(() => {
    if (!isListening || phase !== "conversation") return;
    return onUtteranceEnd((text) => {
      setUserInput(text);
      submitMessageRef.current?.(text);
    });
  }, [isListening, phase, onUtteranceEnd]);

  // ── Handlers ───────────────────────────────────────────

  const handleUrlChange = useCallback((value: string) => {
    setLinkedinUrl(value);
    if (urlError && isValidLinkedInUrl(value)) {
      setUrlError(null);
    }
  }, [urlError]);

  const handleUrlSubmit = useCallback(async () => {
    if (!isValidLinkedInUrl(linkedinUrl)) {
      setUrlError(
        "That doesn't look like a LinkedIn profile URL. It should look like: linkedin.com/in/your-name",
      );
      return;
    }

    if (!goal) return;

    resolveUserInput("linkedin-input", { linkedinUrl });

    setPhase("conversation");
    setIsThinking(true);
    setError(null);

    // Build system prompt based on goal
    const systemPrompt =
      goal === "improve"
        ? bilkoSystemPrompt(buildImproveConversationPrompt(linkedinUrl))
        : bilkoSystemPrompt(buildInterviewConversationPrompt(linkedinUrl));

    conversationRef.current = [{ role: "system", content: systemPrompt }];

    const starterMessage =
      goal === "improve"
        ? `I'd like to improve my LinkedIn profile. My profile URL is ${linkedinUrl}. Let's start — ask me about my roles.`
        : `I'd like you to interview me based on my professional roles. My profile URL is ${linkedinUrl}. Let's begin.`;

    try {
      const { data: llmResult } = await trackStep(
        "conversation-start",
        { goal, linkedinUrl },
        () =>
          chatJSON<{
            message: string;
            context?: string;
            done: boolean;
            rolesDiscovered: DiscoveredRole[];
          }>([
            ...conversationRef.current,
            { role: "user", content: starterMessage },
          ]),
      );

      const turn = llmResult.data;
      conversationRef.current.push(
        { role: "user", content: starterMessage },
        { role: "assistant", content: JSON.stringify(turn) },
      );

      if (turn.rolesDiscovered?.length) {
        setDiscoveredRoles(turn.rolesDiscovered);
      }

      setConversationTurns([
        { role: "assistant", message: turn.message, context: turn.context },
      ]);

      await speak(turn.message, "Charon");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start the conversation");
      setPhase("linkedin-input");
    } finally {
      setIsThinking(false);
      inputRef.current?.focus();
    }
  }, [linkedinUrl, goal, trackStep, resolveUserInput, speak]);

  // ── Conversation: submit message ───────────────────────

  const submitMessage = useCallback(
    async (overrideText?: string) => {
      const answer = (overrideText ?? userInput).trim();
      if (!answer || isThinking) return;

      setConversationTurns((prev) => [...prev, { role: "user", message: answer }]);
      setUserInput("");
      setIsThinking(true);
      setError(null);

      resolveUserInput(`conversation-turn-${conversationTurns.length}`, { answer });

      // Include currently known roles in context so LLM can maintain the list
      const rolesContext =
        discoveredRoles.length > 0
          ? `\n[Roles discovered so far: ${discoveredRoles.map(r => `${r.title} at ${r.company}`).join(", ")}]`
          : "";

      const userMessage = `${answer}${rolesContext}`;
      conversationRef.current.push({ role: "user", content: userMessage });

      try {
        const { data: llmResult } = await trackStep(
          `conversation-turn-${conversationTurns.length + 1}`,
          { turnNumber: conversationTurns.length + 1 },
          () =>
            chatJSON<{
              message: string;
              context?: string;
              done: boolean;
              rolesDiscovered: DiscoveredRole[];
            }>(conversationRef.current),
        );

        const turn = llmResult.data;
        conversationRef.current.push({
          role: "assistant",
          content: JSON.stringify(turn),
        });

        if (turn.rolesDiscovered?.length) {
          setDiscoveredRoles(turn.rolesDiscovered);
        }

        setConversationTurns((prev) => [
          ...prev,
          { role: "assistant", message: turn.message, context: turn.context },
        ]);

        if (turn.done) {
          // Conversation complete — generate results
          const finalRoles = turn.rolesDiscovered?.length ? turn.rolesDiscovered : discoveredRoles;
          await speak(turn.message, "Charon");
          await generateResults(finalRoles);
        } else {
          await speak(turn.message, "Charon");
          inputRef.current?.focus();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to process your response");
      } finally {
        setIsThinking(false);
      }
    },
    [userInput, isThinking, conversationTurns, discoveredRoles, trackStep, resolveUserInput, speak],
  );

  // Keep ref in sync
  submitMessageRef.current = submitMessage;

  // ── Generate results ──────────────────────────────────

  const generateResults = useCallback(
    async (roles: DiscoveredRole[]) => {
      setPhase("generating");
      setIsThinking(true);
      setError(null);

      // Build conversation transcript for the generation prompt
      const transcript = conversationTurns
        .map((t) => `${t.role === "assistant" ? "Strategist" : "User"}: ${t.message}`)
        .join("\n\n");

      try {
        if (goal === "improve") {
          const { data: llmResult } = await trackStep(
            "generate-recommendations",
            { roleCount: roles.length },
            () =>
              chatJSON<{
                roles: Array<{
                  roleId: string;
                  title: string;
                  company: string;
                  duration: string;
                  options: RoleOption[];
                }>;
              }>(
                jsonPrompt(
                  bilkoSystemPrompt(
                    buildGenerateRecommendationsPrompt(linkedinUrl, transcript, roles),
                  ),
                  `Generate improved LinkedIn descriptions with multiple options for each of these ${roles.length} roles.`,
                ),
              ),
          );

          setRecommendations(llmResult.data.roles);

          // Auto-select first option for each role
          const defaults: Record<string, string> = {};
          for (const role of llmResult.data.roles) {
            if (role.options.length > 0) {
              defaults[role.roleId] = role.options[0].id;
            }
          }
          setSelectedOptions(defaults);

          busSend("main", "summary", {
            summary: `I've crafted ${llmResult.data.roles.reduce((acc, r) => acc + r.options.length, 0)} description options across ${llmResult.data.roles.length} roles. Pick the one that fits best for each role.`,
          });
          await speak(
            `Done. I've written multiple description options for each of your ${llmResult.data.roles.length} roles. Take a look and pick the ones you like best.`,
            "Charon",
          );
        } else {
          // Interview mode — generate summary
          const { data: llmResult } = await trackStep(
            "generate-interview-summary",
            { roleCount: roles.length },
            () =>
              chatJSON<InterviewResult>(
                jsonPrompt(
                  bilkoSystemPrompt(
                    buildInterviewSummaryPrompt(linkedinUrl, transcript, roles),
                  ),
                  `Generate interview feedback and insights based on this conversation about ${roles.length} roles.`,
                ),
              ),
          );

          setInterviewResult(llmResult.data);

          busSend("main", "summary", {
            summary: `Interview complete. Here's your feedback with strengths, areas to explore, and role-specific insights.`,
          });
          await speak(
            `Great interview. I've put together detailed feedback on how you presented your experience, including your strengths and areas you could develop further.`,
            "Charon",
          );
        }

        setPhase("results");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate results");
        setPhase("conversation");
      } finally {
        setIsThinking(false);
      }
    },
    [goal, linkedinUrl, conversationTurns, trackStep, busSend, speak],
  );

  // ── Copy to clipboard ────────────────────────────────

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  // ── Reset ──────────────────────────────────────────────

  const reset = useCallback(() => {
    setPhase("intro");
    setGoal(null);
    setLinkedinUrl("");
    setUrlError(null);
    setConversationTurns([]);
    setDiscoveredRoles([]);
    setUserInput("");
    setIsThinking(false);
    setError(null);
    setRecommendations([]);
    setSelectedOptions({});
    setInterviewResult(null);
    setCopiedId(null);
    conversationRef.current = [];
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-500" />
            <span className="font-semibold text-sm">LinkedIn Strategist</span>
          </div>
          <div className="flex items-center gap-2">
            {goal && phase !== "intro" && phase !== "goal-selection" && (
              <Badge variant="outline" className="text-xs">
                {goal === "improve" ? "Improve Profile" : "Interview Practice"}
              </Badge>
            )}
            {phase === "conversation" && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                {conversationTurns.filter((t) => t.role === "user").length} exchanges
              </Badge>
            )}
            {phase === "generating" && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                {goal === "improve" ? "Crafting options..." : "Analyzing interview..."}
              </Badge>
            )}
            {phase === "results" && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 gap-1">
                  <RotateCcw className="h-3 w-3" />
                  Start Over
                </Button>
                {onComplete && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => onComplete(`Optimized ${updatedRoles.length} LinkedIn role descriptions.`)}
                  >
                    Done
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Intro ── */}
        {phase === "intro" && (
          <div className="p-6 space-y-4">
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold text-lg">LinkedIn Strategist</h3>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Two ways I can help with your LinkedIn presence. Pick your goal
                and share your profile link — I'll handle the rest.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Improve your LinkedIn</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      I'll ask exploratory questions about your roles, take notes on
                      your achievements, and generate multiple description options per
                      role for you to choose from.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-violet-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Interview me based on my roles</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      A dynamic professional interview adapted to your experience.
                      I'll give you detailed feedback on how you present your career.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded-lg p-3">
              <p className="font-medium text-foreground">How it works:</p>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">1.</span>
                <span>Pick your goal — improve or interview</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">2.</span>
                <span>Share your LinkedIn profile URL</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">3.</span>
                <span>Have a focused conversation — I'll ask the right questions</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">4.</span>
                <span>Get actionable results tailored to your experience</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {isSupported && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Mic className="h-3 w-3" /> Voice supported
                </Badge>
              )}
            </div>

            <div className="text-center">
              <Button onClick={() => setPhase("goal-selection")} className="gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Goal Selection ── */}
        {phase === "goal-selection" && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-lg">What would you like to do?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Pick your goal and I'll tailor the conversation accordingly.
              </p>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => {
                  setGoal("improve");
                  resolveUserInput("goal-selection", { goal: "improve" });
                  setPhase("linkedin-input");
                }}
                className="w-full text-left rounded-lg border-2 border-blue-500/30 bg-blue-500/5 p-4 hover:border-blue-500/60 hover:bg-blue-500/10 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">Improve your LinkedIn</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      I'll ask about your roles, dig into your achievements, and craft
                      multiple description options for each role. You pick the one that
                      fits best and copy it straight to LinkedIn.
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-2" />
                </div>
              </button>

              <button
                onClick={() => {
                  setGoal("interview");
                  resolveUserInput("goal-selection", { goal: "interview" });
                  setPhase("linkedin-input");
                }}
                className="w-full text-left rounded-lg border-2 border-violet-500/30 bg-violet-500/5 p-4 hover:border-violet-500/60 hover:bg-violet-500/10 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-violet-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">Interview me based on my roles</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      A dynamic interview that adapts to your experience. I'll ask behavioral
                      and situational questions, then give you feedback on your strengths and
                      areas to develop.
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-2" />
                </div>
              </button>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPhase("intro")}>
                Back
              </Button>
            </div>
          </div>
        )}

        {/* ── LinkedIn Input (URL only) ── */}
        {phase === "linkedin-input" && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-lg">Your LinkedIn Profile</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Share your profile URL so I can ground the conversation in your
                real career data.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Link className="h-3.5 w-3.5 text-blue-500" />
                LinkedIn Profile URL
              </label>
              <Input
                value={linkedinUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://www.linkedin.com/in/your-name"
                className={urlError ? "border-destructive" : ""}
              />
              {urlError && (
                <p className="text-xs text-destructive">{urlError}</p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPhase("goal-selection")}>
                Back
              </Button>
              <Button
                onClick={handleUrlSubmit}
                disabled={isThinking}
                className="gap-2"
              >
                {isThinking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    {goal === "improve" ? "Start Improving" : "Start Interview"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Conversation ── */}
        {phase === "conversation" && (
          <div ref={scrollRef} className="max-h-[600px] overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Conversation turns */}
              {conversationTurns.map((turn, i) => (
                <div key={i} className="space-y-1">
                  {turn.role === "assistant" ? (
                    <div className="flex gap-3">
                      <div className="shrink-0 w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Briefcase className="h-3 w-3 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{turn.message}</p>
                        {turn.context && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">
                            {turn.context}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="ml-9 p-2.5 rounded-md bg-muted/50 border border-border/50">
                      <p className="text-sm">{turn.message}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Thinking */}
              {isThinking && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {goal === "improve" ? "Thinking about what to ask next..." : "Preparing next question..."}
                </div>
              )}

              {/* Roles discovered indicator */}
              {discoveredRoles.length > 0 && !isThinking && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">
                    {discoveredRoles.length} role{discoveredRoles.length !== 1 ? "s" : ""} discovered
                  </Badge>
                  {discoveredRoles.map((r) => (
                    <span key={r.id} className="text-[10px]">
                      {r.title}
                    </span>
                  ))}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
                  {error}
                </div>
              )}
            </div>

            {/* Input area */}
            {!isThinking && conversationTurns.length > 0 && (
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
                      onClick={() => submitMessage()}
                      disabled={!userInput.trim() || isThinking}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press Enter to send
                  </p>
                </div>
                <VoiceStatusBar />
              </div>
            )}
          </div>
        )}

        {/* ── Generating ── */}
        {phase === "generating" && (
          <div className="p-6 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <p className="text-sm font-medium">
              {goal === "improve"
                ? "Crafting description options for each role..."
                : "Analyzing your interview responses..."}
            </p>
            <p className="text-xs text-muted-foreground">
              {goal === "improve"
                ? "Creating multiple angles for each role so you can pick the best fit."
                : "Putting together strengths, areas to explore, and role-specific insights."}
            </p>
          </div>
        )}

        {/* ── Results: Improve Mode ── */}
        {phase === "results" && goal === "improve" && (
          <div ref={scrollRef} className="max-h-[700px] overflow-y-auto">
            <div className="p-4 space-y-5">
              <div className="text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-green-500" />
                </div>
                <h3 className="font-semibold">Your Updated Role Descriptions</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Each role has multiple options — pick the angle that best
                  represents you, then copy it to LinkedIn.
                </p>
              </div>

              {recommendations.map((role) => (
                <div
                  key={role.roleId}
                  className="rounded-xl border-2 border-blue-500/20 bg-blue-500/5 overflow-hidden"
                >
                  {/* Role header */}
                  <div className="px-4 py-3 border-b border-blue-500/10 bg-blue-500/5">
                    <h4 className="font-semibold text-sm">{role.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {role.company} · {role.duration}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="divide-y divide-blue-500/10">
                    {role.options.map((option) => {
                      const isSelected = selectedOptions[role.roleId] === option.id;
                      return (
                        <div key={option.id} className="relative">
                          <button
                            onClick={() =>
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [role.roleId]: option.id,
                              }))
                            }
                            className={`w-full text-left px-4 py-3 transition-colors ${
                              isSelected ? "bg-blue-500/10" : "hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-500"
                                      : "border-muted-foreground/30"
                                  }`}
                                >
                                  {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-5"
                                >
                                  {option.label}
                                </Badge>
                              </div>
                              {isSelected && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 gap-1 text-[10px] shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(option.description, `${role.roleId}-${option.id}`);
                                  }}
                                >
                                  {copiedId === `${role.roleId}-${option.id}` ? (
                                    <>
                                      <Check className="h-2.5 w-2.5 text-green-500" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-2.5 w-2.5" />
                                      Copy
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-line">
                              {option.description}
                            </p>
                            {option.keyHighlights.length > 0 && (
                              <div className="mt-2 space-y-0.5">
                                {option.keyHighlights.map((h, i) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                                  >
                                    <span className="text-blue-500 mt-0.5 shrink-0">-</span>
                                    <span>{h}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Copy all selected */}
              {recommendations.length > 1 && (
                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const allText = recommendations
                        .map((r) => {
                          const selected = r.options.find(
                            (o) => o.id === selectedOptions[r.roleId],
                          );
                          return selected
                            ? `${r.title} — ${r.company} (${r.duration})\n\n${selected.description}`
                            : null;
                        })
                        .filter(Boolean)
                        .join("\n\n---\n\n");
                      copyToClipboard(allText, "all");
                    }}
                  >
                    {copiedId === "all" ? (
                      <>
                        <Check className="h-3 w-3 text-green-500" />
                        All Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy All Selected
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Results: Interview Mode ── */}
        {phase === "results" && goal === "interview" && interviewResult && (
          <div ref={scrollRef} className="max-h-[700px] overflow-y-auto">
            <div className="p-4 space-y-5">
              <div className="text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-violet-500" />
                </div>
                <h3 className="font-semibold">Interview Feedback</h3>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-violet-500/5 border border-violet-500/20">
                <p className="text-sm leading-relaxed">{interviewResult.summary}</p>
              </div>

              {/* Strengths */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Strengths
                </h4>
                <div className="space-y-1.5">
                  {interviewResult.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-0.5 shrink-0">+</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Areas to explore */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  Areas to Explore
                </h4>
                <div className="space-y-1.5">
                  {interviewResult.areasToExplore.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-500 mt-0.5 shrink-0">*</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Role-specific insights */}
              {interviewResult.roleInsights.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-500" />
                    Role Insights
                  </h4>
                  {interviewResult.roleInsights.map((ri, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <p className="text-xs font-medium text-blue-500 mb-1">{ri.role}</p>
                      <p className="text-sm leading-relaxed">{ri.insight}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Copy feedback */}
              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const text = [
                      `Interview Feedback`,
                      ``,
                      interviewResult.summary,
                      ``,
                      `Strengths:`,
                      ...interviewResult.strengths.map((s) => `+ ${s}`),
                      ``,
                      `Areas to Explore:`,
                      ...interviewResult.areasToExplore.map((a) => `* ${a}`),
                      ``,
                      `Role Insights:`,
                      ...interviewResult.roleInsights.map(
                        (ri) => `${ri.role}: ${ri.insight}`,
                      ),
                    ].join("\n");
                    copyToClipboard(text, "interview-all");
                  }}
                >
                  {copiedId === "interview-all" ? (
                    <>
                      <Check className="h-3 w-3 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Feedback
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
