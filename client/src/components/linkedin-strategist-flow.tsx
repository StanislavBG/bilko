/**
 * LinkedIn Strategist Flow — Dedicated LinkedIn-grounded career flow
 *
 * A multi-phase flow that requires a LinkedIn URL for grounding,
 * parses roles/experiences, lets the user choose which to improve,
 * conducts targeted interviews per role, and delivers updated
 * role descriptions in copyable panes.
 *
 * Phases:
 * 1. intro — Explain why LinkedIn URL + profile data are essential
 * 2. linkedin-input — URL + profile text paste
 * 3. parsing — LLM extracts structured roles
 * 4. role-selection — User picks roles to work on
 * 5. interviewing — Targeted questions per selected role
 * 6. generating — LLM crafts updated descriptions
 * 7. results — Copyable formatted role descriptions
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
  ClipboardPaste,
  ChevronRight,
  Sparkles,
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

interface LinkedInRole {
  id: string;
  title: string;
  company: string;
  duration: string;
  description: string;
  isCurrent: boolean;
}

interface InterviewQA {
  roleId: string;
  question: string;
  answer: string;
}

interface UpdatedRole {
  roleId: string;
  title: string;
  company: string;
  duration: string;
  updatedDescription: string;
  keyHighlights: string[];
}

type Phase =
  | "intro"
  | "linkedin-input"
  | "parsing"
  | "role-selection"
  | "interviewing"
  | "generating"
  | "results";

// ── LinkedIn URL validation ──────────────────────────────

const LINKEDIN_URL_REGEX = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?/i;

function isValidLinkedInUrl(url: string): boolean {
  return LINKEDIN_URL_REGEX.test(url.trim());
}

// ── LLM Prompts ──────────────────────────────────────────

const PARSE_ROLES_PROMPT = `You are a LinkedIn profile analyst. Parse the user's LinkedIn profile text and extract ALL professional roles/positions.

For each role extract:
- title: Job title
- company: Company name
- duration: Time period (e.g., "Jan 2020 - Present", "2018 - 2020")
- description: The existing description text (verbatim from their profile)
- isCurrent: Whether this is their current role

RESPONSE FORMAT — return ONLY valid JSON:
{
  "roles": [
    {
      "id": "role-1",
      "title": "Senior Product Manager",
      "company": "Acme Corp",
      "duration": "Jan 2022 - Present",
      "description": "Led cross-functional team...",
      "isCurrent": true
    }
  ],
  "profileSummary": "Brief 1-2 sentence summary of the person's career trajectory"
}

Rules:
- Extract ALL roles, ordered most recent first
- Use "role-1", "role-2", etc. as IDs
- If a description is empty or missing, set it to ""
- Preserve the original text — don't rewrite anything yet
- No markdown. ONLY the JSON object.`;

function buildInterviewPrompt(role: LinkedInRole, allRoles: LinkedInRole[]): string {
  return `You are a world-class LinkedIn career strategist. You are interviewing the user about a SPECIFIC role to gather details that will make their LinkedIn description significantly more impactful.

THE ROLE BEING DISCUSSED:
- Title: ${role.title}
- Company: ${role.company}
- Duration: ${role.duration}
- Current description: "${role.description || "(no description yet)"}"

THEIR FULL CAREER CONTEXT (other roles):
${allRoles.filter(r => r.id !== role.id).map(r => `- ${r.title} at ${r.company} (${r.duration})`).join("\n")}

ASK EXACTLY ONE QUESTION AT A TIME. Your questions should dig into:
- Specific accomplishments with measurable outcomes (numbers, percentages, revenue)
- The invisible responsibilities that aren't in the title
- Cross-functional impact and leadership moments
- Tools, technologies, or methodologies they introduced
- Problems they solved that others couldn't
- Team size, scope of influence, budget responsibility

Build on previous answers — show you're listening. Be conversational, not interrogative.

After 2-3 questions per role (when you have enough detail), set done=true.

RESPONSE FORMAT — return ONLY valid JSON:
{
  "done": false,
  "nextQuestion": "Your single question here",
  "questionContext": "Brief note on why you're asking (1 sentence)",
  "questionsAsked": 1
}

When done=true, omit nextQuestion/questionContext.
No markdown. No explanation. ONLY the JSON object.`;
}

function buildGeneratePrompt(
  role: LinkedInRole,
  interviews: InterviewQA[],
  linkedinUrl: string,
): string {
  const roleInterviews = interviews.filter(i => i.roleId === role.id);
  const transcript = roleInterviews
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`)
    .join("\n\n");

  return `You are a world-class LinkedIn copywriter and career strategist. Using the interview data and the existing role description, craft a DRAMATICALLY improved LinkedIn experience description.

LINKEDIN PROFILE: ${linkedinUrl}

ROLE:
- Title: ${role.title}
- Company: ${role.company}
- Duration: ${role.duration}
- Original Description: "${role.description || "(empty)"}"

INTERVIEW INSIGHTS:
${transcript || "(No additional interview data)"}

RESPONSE FORMAT — return ONLY valid JSON:
{
  "updatedDescription": "The new, polished LinkedIn description (2-4 short paragraphs). Use line breaks between paragraphs. Focus on impact, outcomes, and the story behind the work. Don't use bullet points — write it as flowing professional prose that reads well on LinkedIn.",
  "keyHighlights": [
    "3-5 key achievements or differentiators pulled from the interview, each as a punchy one-liner"
  ]
}

Rules:
- The description must be specific to THIS person — reference real details from the interview
- Lead with impact, not responsibilities
- Include metrics and numbers wherever possible
- Make it sound like a high-performer wrote it, not a bot
- Keep it LinkedIn-appropriate: professional but human
- 150-300 words for the description
- No markdown formatting in the description text (plain text with line breaks)
- No generic filler like "results-driven professional"
- ONLY the JSON object.`;
}

// ── Component ────────────────────────────────────────────

export function LinkedInStrategistFlow() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [profileText, setProfileText] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [roles, setRoles] = useState<LinkedInRole[]>([]);
  const [profileSummary, setProfileSummary] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [interviewQAs, setInterviewQAs] = useState<InterviewQA[]>([]);
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentContext, setCurrentContext] = useState("");
  const [userInput, setUserInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [updatedRoles, setUpdatedRoles] = useState<UpdatedRole[]>([]);
  const [error, setError] = useState<string | null>(null);
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
      "linkedin-input": "running",
      parsing: "running",
      "role-selection": "running",
      interviewing: "running",
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
  }, [interviewQAs, currentQuestion, phase, updatedRoles]);

  // Voice → input sync
  useEffect(() => {
    if (isListening && transcript && phase === "interviewing") {
      setUserInput(transcript);
    }
  }, [transcript, isListening, phase]);

  // Auto-send on voice end
  const submitAnswerRef = useRef<((overrideText?: string) => Promise<void>) | null>(null);
  useEffect(() => {
    if (!isListening || phase !== "interviewing") return;
    return onUtteranceEnd((text) => {
      setUserInput(text);
      submitAnswerRef.current?.(text);
    });
  }, [isListening, phase, onUtteranceEnd]);

  // Derived: selected roles in order
  const selectedRoles = roles.filter((r) => selectedRoleIds.has(r.id));
  const currentInterviewRole = selectedRoles[currentRoleIndex];

  // ── Phase: LinkedIn Input ──────────────────────────────

  const handleUrlChange = useCallback((value: string) => {
    setLinkedinUrl(value);
    if (urlError && isValidLinkedInUrl(value)) {
      setUrlError(null);
    }
  }, [urlError]);

  const handleLinkedInSubmit = useCallback(async () => {
    // Validate URL
    if (!isValidLinkedInUrl(linkedinUrl)) {
      setUrlError(
        "That doesn't look like a LinkedIn profile URL. It should look like: linkedin.com/in/your-name",
      );
      return;
    }

    // Validate profile text
    if (!profileText.trim() || profileText.trim().length < 50) {
      setError(
        "Please paste more of your LinkedIn profile content — I need your experience section to work with.",
      );
      return;
    }

    setPhase("parsing");
    setIsThinking(true);
    setError(null);

    try {
      const { data: llmResult } = await trackStep(
        "parse-roles",
        { linkedinUrl, profileTextLength: profileText.length },
        () =>
          chatJSON<{ roles: LinkedInRole[]; profileSummary: string }>(
            jsonPrompt(
              bilkoSystemPrompt(PARSE_ROLES_PROMPT),
              `LinkedIn URL: ${linkedinUrl}\n\nProfile Content:\n${profileText}`,
            ),
          ),
      );

      const parsed = llmResult.data;

      if (!parsed.roles || parsed.roles.length === 0) {
        setError(
          "I couldn't find any roles in that text. Make sure you're pasting your Experience section from LinkedIn.",
        );
        setPhase("linkedin-input");
        setIsThinking(false);
        return;
      }

      setRoles(parsed.roles);
      setProfileSummary(parsed.profileSummary || "");
      setPhase("role-selection");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse your profile. Try pasting more text.");
      setPhase("linkedin-input");
    } finally {
      setIsThinking(false);
    }
  }, [linkedinUrl, profileText, trackStep]);

  // ── Phase: Role Selection ──────────────────────────────

  const toggleRole = useCallback((roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  }, []);

  const startInterviewing = useCallback(async () => {
    if (selectedRoleIds.size === 0) return;

    resolveUserInput("role-selection", {
      selectedRoleIds: Array.from(selectedRoleIds),
    });

    setCurrentRoleIndex(0);
    setPhase("interviewing");
    setIsThinking(true);
    setError(null);

    const firstRole = roles.filter((r) => selectedRoleIds.has(r.id))[0];
    const systemPrompt = bilkoSystemPrompt(buildInterviewPrompt(firstRole, roles));
    conversationRef.current = [{ role: "system", content: systemPrompt }];

    try {
      const { data: llmResult } = await trackStep(
        "interview-first-question",
        { roleId: firstRole.id },
        () =>
          chatJSON<{
            done: boolean;
            nextQuestion?: string;
            questionContext?: string;
            questionsAsked?: number;
          }>([
            ...conversationRef.current,
            {
              role: "user",
              content: `Start interviewing me about my role as ${firstRole.title} at ${firstRole.company}. Ask your first question to uncover details that will make this role shine on LinkedIn.`,
            },
          ]),
      );

      const turn = llmResult.data;
      if (turn.nextQuestion) {
        conversationRef.current.push(
          {
            role: "user",
            content: `Start interviewing me about my role as ${firstRole.title} at ${firstRole.company}.`,
          },
          { role: "assistant", content: JSON.stringify(turn) },
        );
        setCurrentQuestion(turn.nextQuestion);
        setCurrentContext(turn.questionContext || "");
        await speak(turn.nextQuestion, "Charon");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start the interview");
    } finally {
      setIsThinking(false);
      inputRef.current?.focus();
    }
  }, [selectedRoleIds, roles, trackStep, resolveUserInput, speak]);

  // ── Phase: Interview — submit answer ───────────────────

  const submitAnswer = useCallback(
    async (overrideText?: string) => {
      const answer = (overrideText ?? userInput).trim();
      if (!answer || isThinking || !currentInterviewRole) return;

      const question = currentQuestion;
      const context = currentContext;

      setInterviewQAs((prev) => [
        ...prev,
        { roleId: currentInterviewRole.id, question, answer },
      ]);
      setUserInput("");
      setCurrentQuestion("");
      setIsThinking(true);
      setError(null);

      resolveUserInput(`interview-answer-${interviewQAs.length}`, { answer });

      const userMessage = `User's answer: "${answer}"\n\nAsk your next question about this role OR set done=true if you have enough detail to write an outstanding LinkedIn description.`;
      conversationRef.current.push({ role: "user", content: userMessage });

      try {
        const { data: llmResult } = await trackStep(
          `interview-q-${interviewQAs.length + 1}`,
          { answer, roleId: currentInterviewRole.id },
          () =>
            chatJSON<{
              done: boolean;
              nextQuestion?: string;
              questionContext?: string;
              questionsAsked?: number;
            }>(conversationRef.current),
        );

        const nextTurn = llmResult.data;
        conversationRef.current.push({
          role: "assistant",
          content: JSON.stringify(nextTurn),
        });

        if (nextTurn.done) {
          // Move to next selected role or generate
          const nextIndex = currentRoleIndex + 1;
          if (nextIndex < selectedRoles.length) {
            // Start interview for next role
            setCurrentRoleIndex(nextIndex);
            const nextRole = selectedRoles[nextIndex];
            const nextSystemPrompt = bilkoSystemPrompt(
              buildInterviewPrompt(nextRole, roles),
            );
            conversationRef.current = [
              { role: "system", content: nextSystemPrompt },
            ];

            const bridgeMessage = `Now let's talk about your role as ${nextRole.title} at ${nextRole.company}.`;
            await speak(bridgeMessage, "Charon");

            const { data: nextResult } = await trackStep(
              `interview-role-${nextIndex}-first`,
              { roleId: nextRole.id },
              () =>
                chatJSON<{
                  done: boolean;
                  nextQuestion?: string;
                  questionContext?: string;
                }>(
                  [
                    ...conversationRef.current,
                    {
                      role: "user",
                      content: `Interview me about my role as ${nextRole.title} at ${nextRole.company}. Ask your first question.`,
                    },
                  ],
                ),
            );

            const turn = nextResult.data;
            if (turn.nextQuestion) {
              conversationRef.current.push(
                {
                  role: "user",
                  content: `Interview me about ${nextRole.title} at ${nextRole.company}.`,
                },
                { role: "assistant", content: JSON.stringify(turn) },
              );
              setCurrentQuestion(turn.nextQuestion);
              setCurrentContext(turn.questionContext || "");
              await speak(turn.nextQuestion, "Charon");
            }
          } else {
            // All roles interviewed — generate descriptions
            await generateDescriptions();
          }
        } else if (nextTurn.nextQuestion) {
          setCurrentQuestion(nextTurn.nextQuestion);
          setCurrentContext(nextTurn.questionContext || "");
          await speak(nextTurn.nextQuestion, "Charon");
          inputRef.current?.focus();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to process answer");
        setCurrentQuestion(question);
      } finally {
        setIsThinking(false);
      }
    },
    [
      userInput,
      isThinking,
      currentInterviewRole,
      currentQuestion,
      currentContext,
      interviewQAs,
      currentRoleIndex,
      selectedRoles,
      roles,
      trackStep,
      resolveUserInput,
      speak,
    ],
  );

  // Keep ref in sync
  submitAnswerRef.current = submitAnswer;

  // ── Phase: Generate ────────────────────────────────────

  const generateDescriptions = useCallback(async () => {
    setPhase("generating");
    setIsThinking(true);
    setError(null);

    const results: UpdatedRole[] = [];

    for (const role of selectedRoles) {
      try {
        const { data: llmResult } = await trackStep(
          `generate-${role.id}`,
          { roleId: role.id, linkedinUrl },
          () =>
            chatJSON<{
              updatedDescription: string;
              keyHighlights: string[];
            }>(
              jsonPrompt(
                bilkoSystemPrompt(
                  buildGeneratePrompt(role, interviewQAs, linkedinUrl),
                ),
                `Generate the updated LinkedIn description for: ${role.title} at ${role.company}`,
              ),
            ),
        );

        results.push({
          roleId: role.id,
          title: role.title,
          company: role.company,
          duration: role.duration,
          updatedDescription: llmResult.data.updatedDescription,
          keyHighlights: llmResult.data.keyHighlights,
        });
      } catch (e) {
        // If one role fails, continue with others
        results.push({
          roleId: role.id,
          title: role.title,
          company: role.company,
          duration: role.duration,
          updatedDescription: `(Generation failed for this role: ${e instanceof Error ? e.message : "Unknown error"})`,
          keyHighlights: [],
        });
      }
    }

    setUpdatedRoles(results);
    setPhase("results");
    setIsThinking(false);
    const summaryText = `I've crafted updated LinkedIn descriptions for ${results.length} of your roles. Each one is grounded in the real details you shared.`;
    pushAgentMessage(summaryText);
    busSend("main", "summary", { summary: summaryText });
    await speak(
      `Done. I've written updated descriptions for ${results.length} roles. Each one pulls from the specific details you shared in the interview. Take a look and copy what you like.`,
      "Charon",
    );
  }, [selectedRoles, interviewQAs, linkedinUrl, trackStep, busSend, speak, pushAgentMessage]);

  // ── Copy to clipboard ──────────────────────────────────

  const copyToClipboard = useCallback(async (text: string, roleId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(roleId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(roleId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  // ── Reset ──────────────────────────────────────────────

  const reset = useCallback(() => {
    setPhase("intro");
    setLinkedinUrl("");
    setProfileText("");
    setUrlError(null);
    setRoles([]);
    setProfileSummary("");
    setSelectedRoleIds(new Set());
    setInterviewQAs([]);
    setCurrentRoleIndex(0);
    setCurrentQuestion("");
    setCurrentContext("");
    setUserInput("");
    setIsThinking(false);
    setUpdatedRoles([]);
    setError(null);
    setCopiedId(null);
    conversationRef.current = [];
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  };

  // ── Render ─────────────────────────────────────────────

  // Current role's interview QAs (for display during interviewing)
  const currentRoleQAs = currentInterviewRole
    ? interviewQAs.filter((qa) => qa.roleId === currentInterviewRole.id)
    : [];

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
            {phase === "interviewing" && currentInterviewRole && (
              <Badge variant="outline" className="text-xs">
                Role {currentRoleIndex + 1}/{selectedRoles.length}: {currentInterviewRole.title}
              </Badge>
            )}
            {phase === "generating" && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                Crafting descriptions...
              </Badge>
            )}
            {phase === "results" && (
              <Button variant="ghost" size="sm" onClick={reset} className="h-7 gap-1">
                <RotateCcw className="h-3 w-3" />
                Start Over
              </Button>
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
              <h3 className="font-semibold text-lg">LinkedIn Profile Optimizer</h3>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                This isn't generic career advice. I'm going to work directly from your
                LinkedIn profile data to rewrite your role descriptions so they actually
                reflect the impact you've had.
              </p>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Link className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Your LinkedIn URL is required</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    I need your real LinkedIn profile data to ground my work. Without it,
                    I'd just be guessing — and generic suggestions aren't worth your time.
                    You'll also paste your experience section so I can see every role.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded-lg p-3">
              <p className="font-medium text-foreground">Here's how it works:</p>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">1.</span>
                <span>Share your LinkedIn URL and paste your profile text</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">2.</span>
                <span>I'll extract all your roles — you pick which ones to improve</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">3.</span>
                <span>Quick targeted interview to uncover the details that matter</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">4.</span>
                <span>You get rewritten descriptions — ready to copy into LinkedIn</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {isSupported && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Mic className="h-3 w-3" /> Voice supported
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                ~10-15 min
              </Badge>
            </div>

            <div className="text-center">
              <Button onClick={() => setPhase("linkedin-input")} className="gap-2">
                Let's Optimize Your Profile
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── LinkedIn Input ── */}
        {phase === "linkedin-input" && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-lg">Your LinkedIn Profile</h3>
              <p className="text-sm text-muted-foreground mt-1">
                I need two things: your profile URL and the text from your Experience section.
              </p>
            </div>

            {/* URL input */}
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

            {/* Profile text paste */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <ClipboardPaste className="h-3.5 w-3.5 text-blue-500" />
                Experience Section Text
              </label>
              <p className="text-xs text-muted-foreground">
                Go to your LinkedIn profile, scroll to the Experience section, select all
                the text (including job titles, companies, dates, and descriptions), and
                paste it here.
              </p>
              <Textarea
                value={profileText}
                onChange={(e) => setProfileText(e.target.value)}
                placeholder={`Paste your LinkedIn experience section here...\n\nExample:\nSenior Product Manager\nAcme Corp · Full-time\nJan 2022 - Present · 3 yrs 1 mo\nLed cross-functional team of 12...`}
                rows={8}
                className="resize-none font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                {profileText.length > 0
                  ? `${profileText.length} characters pasted`
                  : "Tip: The more text you paste, the better I can understand your roles"}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPhase("intro")}>
                Back
              </Button>
              <Button
                onClick={handleLinkedInSubmit}
                disabled={isThinking}
                className="gap-2"
              >
                {isThinking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze My Profile
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Parsing (loading state) ── */}
        {phase === "parsing" && (
          <div className="p-6 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <p className="text-sm text-muted-foreground">
              Reading through your profile and extracting every role...
            </p>
          </div>
        )}

        {/* ── Role Selection ── */}
        {phase === "role-selection" && (
          <div className="p-6 space-y-5">
            {profileSummary && (
              <div className="p-3 rounded-md bg-blue-500/5 border border-blue-500/20">
                <p className="text-sm leading-relaxed">{profileSummary}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-lg">
                I found {roles.length} role{roles.length !== 1 ? "s" : ""} on your profile
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Pick the ones you want to improve. I'll interview you about each one
                to uncover the details that'll make your descriptions stand out.
              </p>
            </div>

            <div className="space-y-2">
              {roles.map((role) => {
                const isSelected = selectedRoleIds.has(role.id);
                return (
                  <button
                    key={role.id}
                    onClick={() => toggleRole(role.id)}
                    className={`w-full text-left rounded-lg border-2 p-3 transition-all duration-200 ${
                      isSelected
                        ? "border-blue-500/60 bg-blue-500/5"
                        : "border-border hover:border-border/80 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{role.title}</h4>
                          {role.isCurrent && (
                            <Badge variant="secondary" className="text-[10px] h-4">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {role.company} · {role.duration}
                        </p>
                        {role.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {role.description}
                          </p>
                        )}
                        {!role.description && (
                          <p className="text-xs text-amber-500 mt-1 italic">
                            No description yet — perfect candidate for improvement
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setPhase("linkedin-input")}>
                Back
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {selectedRoleIds.size} selected
                </span>
                <Button
                  onClick={startInterviewing}
                  disabled={selectedRoleIds.size === 0}
                  className="gap-2"
                >
                  Interview Me
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Interviewing ── */}
        {phase === "interviewing" && (
          <div ref={scrollRef} className="max-h-[600px] overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Role being discussed */}
              {currentInterviewRole && (
                <div className="p-3 rounded-md bg-blue-500/5 border border-blue-500/20 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {currentInterviewRole.title} at {currentInterviewRole.company}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentInterviewRole.duration}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    Role {currentRoleIndex + 1} of {selectedRoles.length}
                  </Badge>
                </div>
              )}

              {/* Q&A history for current role */}
              {currentRoleQAs.map((qa, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex gap-3">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-medium text-blue-600">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{qa.question}</p>
                    </div>
                  </div>
                  <div className="ml-9 p-2.5 rounded-md bg-muted/50 border border-border/50">
                    <p className="text-sm">{qa.answer}</p>
                  </div>
                </div>
              ))}

              {/* Current question */}
              {currentQuestion && !isThinking && (
                <div className="flex gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-medium text-blue-600">
                    {currentRoleQAs.length + 1}
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
                  Thinking about the next question...
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
            {currentQuestion && !isThinking && (
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

        {/* ── Generating (loading state) ── */}
        {phase === "generating" && (
          <div className="p-6 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <p className="text-sm font-medium">
              Crafting your updated LinkedIn descriptions...
            </p>
            <p className="text-xs text-muted-foreground">
              Using your interview responses and original profile data to write descriptions
              that actually reflect your impact.
            </p>
          </div>
        )}

        {/* ── Results ── */}
        {phase === "results" && (
          <div ref={scrollRef} className="max-h-[700px] overflow-y-auto">
            <div className="p-4 space-y-5">
              <div className="text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-green-500" />
                </div>
                <h3 className="font-semibold">Your Updated Role Descriptions</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Each description is grounded in your real LinkedIn profile and the
                  details you shared. Copy them directly into LinkedIn.
                </p>
              </div>

              {updatedRoles.map((role) => (
                <div
                  key={role.roleId}
                  className="rounded-xl border-2 border-blue-500/20 bg-blue-500/5 overflow-hidden"
                >
                  {/* Role header */}
                  <div className="px-4 py-3 border-b border-blue-500/10 flex items-center justify-between bg-blue-500/5">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">{role.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {role.company} · {role.duration}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs shrink-0"
                      onClick={() => copyToClipboard(role.updatedDescription, role.roleId)}
                    >
                      {copiedId === role.roleId ? (
                        <>
                          <Check className="h-3 w-3 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy Description
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Updated description */}
                  <div className="px-4 py-3">
                    <div className="text-sm leading-relaxed whitespace-pre-line">
                      {role.updatedDescription}
                    </div>
                  </div>

                  {/* Key highlights */}
                  {role.keyHighlights.length > 0 && (
                    <div className="px-4 py-3 border-t border-blue-500/10 bg-blue-500/3">
                      <p className="text-xs font-medium text-blue-600 mb-2">
                        Key Highlights
                      </p>
                      <div className="space-y-1">
                        {role.keyHighlights.map((highlight, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <span className="text-blue-500 mt-0.5 shrink-0">-</span>
                            <span>{highlight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Copy all button */}
              {updatedRoles.length > 1 && (
                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const allText = updatedRoles
                        .map(
                          (r) =>
                            `${r.title} — ${r.company} (${r.duration})\n\n${r.updatedDescription}`,
                        )
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
                        Copy All Descriptions
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
