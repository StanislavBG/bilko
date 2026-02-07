/**
 * AI Leverage Consultation Flow
 *
 * A multi-turn conversational flow where an AI expert asks the user
 * questions one at a time about their workflows, responsibilities,
 * KPIs, and objectives — then delivers 2 obvious + 2 non-obvious
 * recommendations for leveraging AI in their work.
 *
 * Supports voice input (Web Speech API) and text input.
 * Uses chatJSON<T>() for all LLM calls per ARCH-001 D1.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send,
  Loader2,
  Mic,
  MicOff,
  Lightbulb,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { chatJSON, jsonPrompt, useFlowExecution } from "@/lib/flow-engine";
import { useVoice } from "@/contexts/voice-context";

// ── Types ────────────────────────────────────────────────

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

/** LLM response shape for each turn */
interface TurnResponse {
  done: boolean;
  nextQuestion?: string;
  questionContext?: string;
  questionsRemaining?: number;
}

/** LLM response shape for final analysis */
interface AnalysisResponse {
  summary: string;
  obvious: Recommendation[];
  nonObvious: Recommendation[];
}

type Phase = "intro" | "questioning" | "analyzing" | "complete";

// ── System prompts ───────────────────────────────────────

const SYSTEM_PROMPT = `You are an elite AI strategy consultant. Your job is to interview the user to deeply understand their work, then recommend where AI can create the most impact.

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
No markdown. No explanation. ONLY the JSON object.`;

const FIRST_QUESTION_PROMPT = `Start the consultation. Ask your first question to understand who this person is and what they do. Make it warm and conversational — they're here because they want to leverage AI better.`;

const ANALYSIS_SYSTEM_PROMPT = `You are an elite AI strategy consultant. Based on the interview transcript below, provide exactly 2 OBVIOUS recommendations (things the user probably suspects) and exactly 2 NON-OBVIOUS recommendations (creative applications they haven't considered).

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
- No markdown. ONLY the JSON object.`;

// ── Component ────────────────────────────────────────────

export function AiConsultationFlow() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentContext, setCurrentContext] = useState("");
  const [questionsRemaining, setQuestionsRemaining] = useState(6);
  const [userInput, setUserInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [result, setResult] = useState<ConsultationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conversationRef = useRef<Array<{ role: "system" | "user" | "assistant"; content: string }>>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { trackStep, resolveUserInput } = useFlowExecution("ai-consultation");
  const { isListening, isSupported, transcript, toggleListening, speak } = useVoice();

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [qaPairs, currentQuestion, phase]);

  // Fill input from voice transcript
  useEffect(() => {
    if (isListening && transcript && phase === "questioning") {
      setUserInput(transcript);
    }
  }, [transcript, isListening, phase]);

  // ── Start the consultation ──────────────────────────────

  const startConsultation = useCallback(async () => {
    setPhase("questioning");
    setIsThinking(true);
    setError(null);

    try {
      conversationRef.current = [{ role: "system", content: SYSTEM_PROMPT }];

      const { data: llmResult } = await trackStep(
        "first-question",
        { prompt: SYSTEM_PROMPT },
        () =>
          chatJSON<TurnResponse>(
            [...conversationRef.current, { role: "user", content: FIRST_QUESTION_PROMPT }],
          ),
      );
      const turn = llmResult.data;

      if (turn.nextQuestion) {
        conversationRef.current.push(
          { role: "user", content: FIRST_QUESTION_PROMPT },
          { role: "assistant", content: JSON.stringify(turn) },
        );
        setCurrentQuestion(turn.nextQuestion);
        setCurrentContext(turn.questionContext || "");
        setQuestionsRemaining(turn.questionsRemaining ?? 5);
        await speak(turn.nextQuestion);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start consultation");
    } finally {
      setIsThinking(false);
      inputRef.current?.focus();
    }
  }, [trackStep, speak]);

  // ── Submit user answer ──────────────────────────────────

  const submitAnswer = useCallback(async () => {
    const answer = userInput.trim();
    if (!answer || isThinking) return;

    const question = currentQuestion;
    const context = currentContext;
    setQaPairs((prev) => [...prev, { question, context, answer }]);
    setUserInput("");
    setCurrentQuestion("");
    setIsThinking(true);
    setError(null);

    resolveUserInput(`answer-${qaPairs.length}`, { answer });

    // Build the message for the LLM
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
        // Enough context gathered — run analysis
        await runAnalysis([...qaPairs, { question, context, answer }]);
      } else if (nextTurn.nextQuestion) {
        setCurrentQuestion(nextTurn.nextQuestion);
        setCurrentContext(nextTurn.questionContext || "");
        setQuestionsRemaining(nextTurn.questionsRemaining ?? 1);
        await speak(nextTurn.nextQuestion);
        inputRef.current?.focus();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process answer");
      // Restore question so user can try again
      setCurrentQuestion(question);
    } finally {
      setIsThinking(false);
    }
  }, [userInput, isThinking, currentQuestion, currentContext, qaPairs, trackStep, resolveUserInput, speak]);

  // ── Run final analysis ──────────────────────────────────

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
                ANALYSIS_SYSTEM_PROMPT,
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
        await speak(
          `I've analyzed your situation. ${analysis.summary} Let me walk you through my four recommendations.`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed");
        setPhase("questioning");
      }
    },
    [trackStep, speak],
  );

  // ── Reset ───────────────────────────────────────────────

  const reset = useCallback(() => {
    setPhase("intro");
    setQaPairs([]);
    setCurrentQuestion("");
    setCurrentContext("");
    setQuestionsRemaining(6);
    setUserInput("");
    setIsThinking(false);
    setResult(null);
    setError(null);
    conversationRef.current = [];
  }, []);

  // ── Key handler ─────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold text-sm">AI Leverage Consultation</span>
          </div>
          {phase !== "intro" && (
            <div className="flex items-center gap-2">
              {phase === "questioning" && (
                <Badge variant="outline" className="text-xs">
                  ~{questionsRemaining} questions left
                </Badge>
              )}
              {phase === "analyzing" && (
                <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600">
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

        {/* Intro screen */}
        {phase === "intro" && (
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Where Should You Leverage AI?</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                I'll ask you a few questions about your work, workflows, and goals.
                Then I'll give you 2 obvious and 2 non-obvious ways to leverage AI
                in your life.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {isSupported && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Mic className="h-3 w-3" /> Voice supported
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                ~5 min
              </Badge>
            </div>
            <Button onClick={startConsultation} className="gap-2">
              Start Consultation
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Conversation area */}
        {phase !== "intro" && (
          <div ref={scrollRef} className="max-h-[500px] overflow-y-auto">
            {/* Q&A history */}
            <div className="p-4 space-y-4">
              {qaPairs.map((qa, i) => (
                <div key={i} className="space-y-2">
                  {/* Question */}
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
                  {/* Answer */}
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

              {/* Thinking indicator */}
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
                  {/* Summary */}
                  <div className="p-3 rounded-md bg-muted/50 border border-border/50">
                    <p className="text-sm leading-relaxed">{result.summary}</p>
                  </div>

                  {/* Obvious recommendations */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <h4 className="font-semibold text-sm">Obvious Wins</h4>
                      <Badge variant="outline" className="text-xs">
                        You probably suspect these
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {result.obvious.map((rec, i) => (
                        <RecommendationCard key={`o-${i}`} rec={rec} index={i + 1} />
                      ))}
                    </div>
                  </div>

                  {/* Non-obvious recommendations */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <h4 className="font-semibold text-sm">Hidden Opportunities</h4>
                      <Badge variant="outline" className="text-xs">
                        You might not have considered these
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {result.nonObvious.map((rec, i) => (
                        <RecommendationCard key={`n-${i}`} rec={rec} index={i + 1} variant="nonObvious" />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            {phase === "questioning" && currentQuestion && !isThinking && (
              <div className="sticky bottom-0 border-t bg-background p-3 space-y-2">
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
                  <div className="flex flex-col gap-1">
                    {isSupported && (
                      <Button
                        variant={isListening ? "default" : "outline"}
                        size="icon"
                        className="h-9 w-9"
                        onClick={toggleListening}
                        title={isListening ? "Stop listening" : "Start voice input"}
                      >
                        {isListening ? (
                          <Mic className="h-4 w-4 animate-pulse" />
                        ) : (
                          <MicOff className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      className="h-9 w-9"
                      onClick={submitAnswer}
                      disabled={!userInput.trim() || isThinking}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Press Enter to send{isSupported ? " · Click mic for voice" : ""}
                </p>
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
  variant = "obvious",
}: {
  rec: Recommendation;
  index: number;
  variant?: "obvious" | "nonObvious";
}) {
  const accent = variant === "obvious" ? "yellow" : "purple";

  return (
    <div
      className={`p-3 rounded-lg border ${
        variant === "obvious"
          ? "border-yellow-500/20 bg-yellow-500/5"
          : "border-purple-500/20 bg-purple-500/5"
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            variant === "obvious"
              ? "bg-yellow-500/20 text-yellow-600"
              : "bg-purple-500/20 text-purple-600"
          }`}
        >
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-sm">{rec.title}</h5>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {rec.description}
          </p>
          <p
            className={`text-xs mt-2 font-medium ${
              variant === "obvious" ? "text-yellow-600" : "text-purple-600"
            }`}
          >
            Impact: {rec.impact}
          </p>
          {rec.tools && rec.tools.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {rec.tools.map((tool) => (
                <Badge
                  key={tool}
                  variant="secondary"
                  className="text-[10px] h-5"
                >
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
