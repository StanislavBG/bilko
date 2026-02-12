/**
 * Fake Game Flow — TEST / Troubleshooting flow
 *
 * Minimal 3-step LLM flow for testing the flow architecture:
 *   Step 1: select-game      — LLM picks a neuroscientist-recommended brain teaser
 *   Step 2: generate-game-summary — LLM simulates a fake game round (user vs AI)
 *   Step 3: experience-summary — LLM distills the session into an experience summary
 *
 * The experience summary is returned via onComplete() so bilko-main can
 * adjust its greeting mood on the next loop iteration.
 *
 * Auto-starts immediately when rendered.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FlowProgress, type FlowProgressStep } from "@/components/ui/flow-progress";
import { Brain, Gamepad2, Trophy, RotateCcw, Sparkles } from "lucide-react";
import {
  chatJSON,
  jsonPrompt,
  useFlowExecution,
  useFlowDefinition,
  useFlowChat,
} from "@/lib/bilko-flow";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { useFlowRegistration } from "@/contexts/flow-bus-context";
import { getFlowAgent } from "@/lib/bilko-persona/flow-agents";

// ── Owner ID — must match what landing.tsx uses for claimChat ──
const OWNER_ID = "fake-game";

// ── Types ────────────────────────────────────────────────────────────

type FlowState =
  | "selecting-game"
  | "simulating"
  | "summarizing"
  | "done"
  | "error";

interface GameSelection {
  name: string;
  description: string;
  cognitiveDomain: string;
  whyBeneficial: string;
  difficulty: string;
}

interface GameSummary {
  setup: string;
  keyMoments: string[];
  winner: string;
  userScore: number;
  aiScore: number;
  highlight: string;
  duration: string;
}

interface ExperienceResult {
  gameName: string;
  cognitiveDomain: string;
  outcome: string;
  summary: string;
  mood: string;
  takeaway: string;
}

// ── Prompts ──────────────────────────────────────────────────────────

const SELECT_GAME_PROMPT = bilkoSystemPrompt(
  `You are a cognitive neuroscience researcher specializing in brain training and neuroplasticity. Your expertise spans peer-reviewed studies on games that produce measurable positive cognitive outcomes.

INPUT: You are given a request to recommend a single brain-teaser game for a user session.

MISSION: Research and select ONE brain-teaser game from the category of games that neuroscientists have validated as beneficial for cognitive health. These include games that exercise:
- Working memory (e.g. N-back variants, memory matrix)
- Pattern recognition (e.g. Set, Raven's matrices)
- Mental flexibility (e.g. Wisconsin card sort variants, task-switching games)
- Creative problem-solving (e.g. lateral thinking puzzles, insight problems)
- Processing speed (e.g. speed matching, visual search)

Pick ONE game at random from your knowledge. Provide the game name, a brief description of how it works, which cognitive domain it exercises, and why neuroscientists consider it beneficial.

Return ONLY valid JSON:
{"game":{"name":"...","description":"...","cognitiveDomain":"...","whyBeneficial":"...","difficulty":"easy|medium|hard"}}

Rules: name max 5 words, description max 30 words, cognitiveDomain max 4 words, whyBeneficial max 25 words. No markdown.`,
);

function simulateGamePrompt(game: GameSelection): string {
  return bilkoSystemPrompt(
    `You are a witty sports commentator narrating a brain-teaser game between a human player and an AI opponent named "Cortex".

INPUT: The game is "${game.name}" — ${game.description}. Difficulty: ${game.difficulty}.

MISSION: Generate a short, entertaining play-by-play summary of a fictional game round. Include:
1. A brief setup (what the game looked like at the start)
2. 2-3 key moments during play (turning points, clever moves, mistakes)
3. The final result — randomly pick a winner (user wins ~60% of the time for positive experience)
4. A memorable highlight moment

Make it feel real and fun. The tone should be light and encouraging — win or lose, the user should feel like they got a good brain workout.

Return ONLY valid JSON:
{"gameSummary":{"setup":"...","keyMoments":["...","..."],"winner":"user|cortex","userScore":0,"aiScore":0,"highlight":"...","duration":"Xm Ys"}}

Rules: setup max 25 words, each keyMoment max 20 words, highlight max 20 words. No markdown.`,
  );
}

function experienceSummaryPrompt(game: GameSelection, summary: GameSummary): string {
  return bilkoSystemPrompt(
    `You are an experience designer summarizing a brain-training session for a coaching AI that will use this summary to personalize its next interaction.

INPUT: The user played "${game.name}" (${game.cognitiveDomain}). Result: ${summary.winner} won ${summary.userScore}-${summary.aiScore}. Highlight: ${summary.highlight}

MISSION: Create a concise experience summary that captures:
1. What game was played and what cognitive skill it exercised
2. How the session went (who won, by how much, key moment)
3. An inferred mood/energy level based on the outcome:
   - User won decisively → "energized", "triumphant"
   - User won narrowly → "focused", "determined"
   - User lost but close → "challenged", "motivated"
   - User lost decisively → "humbled", "curious"
4. A one-line takeaway the coaching AI can reference

Return ONLY valid JSON:
{"experience":{"gameName":"...","cognitiveDomain":"...","outcome":"win|loss","summary":"...","mood":"...","takeaway":"..."}}

Rules: summary max 40 words, takeaway max 15 words, mood is a single word. No markdown.`,
  );
}

// ── Status messages ──────────────────────────────────────────────────

const SELECTING_MESSAGES = [
  "Researching neuroscientist-approved brain teasers...",
  "Scanning cognitive training literature...",
  "Picking the perfect challenge...",
];

const SIMULATING_MESSAGES = [
  "Setting up the game board...",
  "You vs. Cortex — here we go...",
  "Simulating the match...",
];

const SUMMARIZING_MESSAGES = [
  "Analyzing the experience...",
  "Distilling the key takeaways...",
];

// ── Component ────────────────────────────────────────────────────────

export function FakeGameFlow({ onComplete }: { onComplete?: (summary?: string) => void }) {
  const [flowState, setFlowState] = useState<FlowState>("selecting-game");
  const [game, setGame] = useState<GameSelection | null>(null);
  const [gameSummary, setGameSummary] = useState<GameSummary | null>(null);
  const [experience, setExperience] = useState<ExperienceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(SELECTING_MESSAGES[0]);
  const hasStarted = useRef(false);

  const { trackStep, execution } = useFlowExecution("fake-game");
  const { definition: flowDef } = useFlowDefinition("fake-game");
  const { setStatus: setBusStatus, send: busSend } = useFlowRegistration("fake-game", "Brain Teaser Game");
  const { pushMessage } = useFlowChat();

  const agent = getFlowAgent("fake-game");

  // ── Push agent message to chat ──────────────────────────
  const pushAgentMessage = useCallback(
    (text: string) => {
      pushMessage(OWNER_ID, {
        speaker: "agent",
        text,
        agentName: agent?.chatName ?? "BrainCoach",
        agentDisplayName: agent?.name ?? "Brain Coach",
        agentAccent: agent?.accentColor ?? "text-pink-500",
      });
    },
    [pushMessage, agent],
  );

  // ── Push greeting on mount ─────────────────────────────
  const didGreet = useRef(false);
  useEffect(() => {
    if (didGreet.current) return;
    didGreet.current = true;
    if (agent) {
      pushAgentMessage(agent.greeting);
    }
  }, [agent, pushAgentMessage]);

  // ── StepTracker state — derived from flow definition + execution ──

  const trackerSteps = useMemo<FlowProgressStep[]>(() => {
    if (!flowDef) return [];
    return flowDef.steps.map((step) => {
      const exec = execution.steps[step.id];
      let status: FlowProgressStep["status"] = "pending";
      if (exec) {
        if (exec.status === "running") status = "active";
        else if (exec.status === "success") status = "complete";
        else if (exec.status === "error") status = "error";
      }
      return { id: step.id, label: step.name, status, type: step.subtype ? `${step.type}:${step.subtype}` : step.type };
    });
  }, [flowDef, execution.steps]);

  const trackerActivity = useMemo<string | undefined>(() => {
    switch (flowState) {
      case "selecting-game":
      case "simulating":
      case "summarizing":
        return statusMessage;
      case "done":
        return experience
          ? `${experience.gameName} — ${experience.mood}`
          : "Session complete";
      case "error":
        return error ?? "Something went wrong";
    }
  }, [flowState, statusMessage, experience, error]);

  // Sync flowState to flow bus
  useEffect(() => {
    const statusMap: Record<FlowState, "running" | "complete" | "error"> = {
      "selecting-game": "running",
      "simulating": "running",
      "summarizing": "running",
      "done": "complete",
      "error": "error",
    };
    setBusStatus(statusMap[flowState], flowState);
  }, [flowState, setBusStatus]);

  // Rotate status messages during loading states
  useEffect(() => {
    let messages: string[];
    if (flowState === "selecting-game") messages = SELECTING_MESSAGES;
    else if (flowState === "simulating") messages = SIMULATING_MESSAGES;
    else if (flowState === "summarizing") messages = SUMMARIZING_MESSAGES;
    else return;

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setStatusMessage(messages[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, [flowState]);

  // ── Step 1: Select game ────────────────────────────────────────────

  const runFlow = useCallback(async () => {
    setFlowState("selecting-game");
    setError(null);
    setStatusMessage(SELECTING_MESSAGES[0]);

    try {
      // Step 1: select-game (LLM)
      const { data: gameResult } = await trackStep(
        "select-game",
        { request: "Select a brain teaser game" },
        () =>
          chatJSON<{ game: GameSelection }>(
            jsonPrompt(
              SELECT_GAME_PROMPT,
              "Select a random neuroscientist-recommended brain teaser game for me to play.",
            ),
          ),
      );

      const selectedGame = gameResult.data.game;
      setGame(selectedGame);
      pushAgentMessage(
        `Today's challenge: ${selectedGame.name} — ${selectedGame.description} This exercises your ${selectedGame.cognitiveDomain}. Let's see how you do against Cortex.`,
      );

      // Step 2: generate-game-summary (LLM)
      setFlowState("simulating");
      setStatusMessage(SIMULATING_MESSAGES[0]);

      const { data: summaryResult } = await trackStep(
        "generate-game-summary",
        { game: selectedGame },
        () =>
          chatJSON<{ gameSummary: GameSummary }>(
            jsonPrompt(
              simulateGamePrompt(selectedGame),
              `Simulate a round of "${selectedGame.name}" at ${selectedGame.difficulty} difficulty between the user and AI opponent Cortex.`,
            ),
          ),
      );

      const simSummary = summaryResult.data.gameSummary;
      setGameSummary(simSummary);

      const winText =
        simSummary.winner === "user"
          ? `You won ${simSummary.userScore}-${simSummary.aiScore}!`
          : `Cortex won ${simSummary.aiScore}-${simSummary.userScore}.`;
      pushAgentMessage(
        `${simSummary.setup} ${winText} Highlight: ${simSummary.highlight}`,
      );

      // Step 3: experience-summary (LLM)
      setFlowState("summarizing");
      setStatusMessage(SUMMARIZING_MESSAGES[0]);

      const { data: expResult } = await trackStep(
        "experience-summary",
        { game: selectedGame, gameSummary: simSummary },
        () =>
          chatJSON<{ experience: ExperienceResult }>(
            jsonPrompt(
              experienceSummaryPrompt(selectedGame, simSummary),
              `Create an experience summary for the ${selectedGame.name} session. Result: ${simSummary.winner} won ${simSummary.userScore}-${simSummary.aiScore}. Highlight: ${simSummary.highlight}`,
            ),
          ),
      );

      const exp = expResult.data.experience;
      setExperience(exp);
      pushAgentMessage(`${exp.summary} Takeaway: ${exp.takeaway}`);

      // Send summary to FlowBus for activity logging
      const exitSummary = `Played "${exp.gameName}" (${exp.cognitiveDomain}). ${exp.outcome === "win" ? "Won" : "Lost"}. Mood: ${exp.mood}. ${exp.takeaway}`;
      busSend("main", "summary", { summary: exitSummary });

      setFlowState("done");
    } catch (err) {
      console.error("Fake game flow error:", err);
      setError(err instanceof Error ? err.message : "Failed to run game flow.");
      setFlowState("error");
    }
  }, [trackStep, pushAgentMessage, busSend]);

  // Auto-start on mount
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      runFlow();
    }
  }, [runFlow]);

  // ── Reset ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    hasStarted.current = false;
    didGreet.current = false;
    setGame(null);
    setGameSummary(null);
    setExperience(null);
    setError(null);
    setTimeout(() => {
      hasStarted.current = true;
      didGreet.current = true;
      runFlow();
    }, 0);
  }, [runFlow]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <FlowProgress
        mode="compact"
        steps={trackerSteps}
        activity={trackerActivity}
      />

      {/* ── LOADING: Selecting game ────────────────────────── */}
      {flowState === "selecting-game" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mb-6">
            <Brain className="h-8 w-8 text-pink-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            Picking Your Brain Teaser
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {statusMessage}
          </p>
          <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-pink-500 h-full rounded-full animate-pulse" style={{ width: "40%" }} />
          </div>
        </div>
      )}

      {/* ── LOADING: Simulating game ──────────────────────── */}
      {flowState === "simulating" && game && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mb-6">
            <Gamepad2 className="h-8 w-8 text-pink-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            {game.name}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-2">
            {game.description}
          </p>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {statusMessage}
          </p>
          <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-pink-500 h-full rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* ── LOADING: Summarizing ─────────────────────────── */}
      {flowState === "summarizing" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mb-6">
            <Sparkles className="h-8 w-8 text-pink-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            Wrapping Up
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {statusMessage}
          </p>
          <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-pink-500 h-full rounded-full animate-pulse" style={{ width: "85%" }} />
          </div>
        </div>
      )}

      {/* ── DONE: Experience card ─────────────────────────── */}
      {flowState === "done" && experience && gameSummary && game && (
        <div className="space-y-6">
          {/* Game result card */}
          <div className="rounded-xl border-2 border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                <Trophy className={`h-6 w-6 ${experience.outcome === "win" ? "text-yellow-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{experience.gameName}</h2>
                <p className="text-sm text-muted-foreground">{experience.cognitiveDomain}</p>
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center justify-center gap-6 py-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{gameSummary.userScore}</div>
                <div className="text-xs text-muted-foreground mt-1">You</div>
              </div>
              <div className="text-muted-foreground text-lg">vs</div>
              <div className="text-center">
                <div className="text-3xl font-bold">{gameSummary.aiScore}</div>
                <div className="text-xs text-muted-foreground mt-1">Cortex</div>
              </div>
            </div>

            {/* Key moments */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Key Moments</h3>
              {gameSummary.keyMoments.map((moment, i) => (
                <p key={i} className="text-sm pl-3 border-l-2 border-border">
                  {moment}
                </p>
              ))}
            </div>

            {/* Highlight */}
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm">
                <span className="font-medium">Highlight:</span> {gameSummary.highlight}
              </p>
            </div>

            {/* Experience summary */}
            <div className="pt-2 border-t border-border space-y-1">
              <p className="text-sm">{experience.summary}</p>
              <p className="text-xs text-muted-foreground">
                Mood: <span className="font-medium capitalize">{experience.mood}</span>
                {" · "}Duration: {gameSummary.duration}
              </p>
              <p className="text-xs text-muted-foreground italic">
                {experience.takeaway}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Play Again
            </Button>
            {onComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const exitSummary = `Played "${experience.gameName}" (${experience.cognitiveDomain}). ${experience.outcome === "win" ? "Won" : "Lost"} ${gameSummary.userScore}-${gameSummary.aiScore}. Mood: ${experience.mood}. ${experience.takeaway}`;
                  onComplete(exitSummary);
                }}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Error state ─────────────────────────────────────── */}
      {flowState === "error" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <p className="text-red-500 mb-2 font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">{error}</p>
          <Button onClick={reset} variant="outline" size="sm">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
