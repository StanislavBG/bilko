/**
 * Newsletter Flow — TEST / Troubleshooting flow
 *
 * Minimal 3-step LLM flow for testing the flow architecture:
 *   Step 1: discover-stories       — LLM discovers 3 trending European football stories
 *   Step 2: write-articles         — LLM writes 3 articles with image descriptions
 *   Step 3: newsletter-summary     — LLM distills the session into an experience summary
 *
 * Inspired by the [EFD] European Football Daily n8n workflow
 * that generates cinematic infographics with stat overlays.
 *
 * The experience summary is returned via onComplete() so bilko-main can
 * adjust its greeting mood on the next loop iteration.
 *
 * Auto-starts immediately when rendered.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StepTracker, type TrackerStep } from "@/components/ui/step-tracker";
import { Newspaper, PenLine, Image, RotateCcw, Sparkles } from "lucide-react";
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
const OWNER_ID = "test-newsletter";

// ── Types ────────────────────────────────────────────────────────────

type FlowState =
  | "discovering"
  | "writing"
  | "summarizing"
  | "done"
  | "error";

interface Story {
  headline: string;
  summary: string;
  league: string;
  keyStat: string;
}

interface Article {
  headline: string;
  article: string;
  imageDescription: string;
  league: string;
}

interface NewsletterResult {
  editionTitle: string;
  topStory: string;
  leaguesCovered: string[];
  mood: string;
  takeaway: string;
}

// ── Prompts ──────────────────────────────────────────────────────────

const DISCOVER_STORIES_PROMPT = bilkoSystemPrompt(
  `You are a senior European football journalist with deep knowledge of the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and UEFA Champions League.

INPUT: You are asked to discover 3 trending European football stories for today's newsletter.

MISSION: Identify 3 compelling stories that European football fans would want to read right now. Mix different leagues and story types — transfers, match results, tactical analysis, player milestones, managerial changes, or breaking news.

For each story provide:
- A punchy newspaper headline (max 10 words)
- A brief summary of what happened (max 30 words)
- Which league or competition it relates to
- One key stat or fact that makes the story compelling

Return ONLY valid JSON:
{"stories":[{"headline":"...","summary":"...","league":"...","keyStat":"..."},{"headline":"...","summary":"...","league":"...","keyStat":"..."},{"headline":"...","summary":"...","league":"...","keyStat":"..."}]}

Rules: exactly 3 stories. headline max 10 words, summary max 30 words, league max 4 words, keyStat max 15 words. No markdown.`,
);

function writeArticlesPrompt(stories: Story[]): string {
  return bilkoSystemPrompt(
    `You are a sports editor producing a daily European football newsletter. You write punchy, engaging articles and commission vivid editorial images.

INPUT: You have 3 trending European football stories:
${stories.map((s, i) => `${i + 1}. "${s.headline}" (${s.league}) — ${s.summary} Key stat: ${s.keyStat}`).join("\n")}

MISSION: For each of the 3 stories, produce:
1. A short newspaper article (60-80 words) — factual, engaging, with a hook opening and the key stat woven in naturally
2. A cinematic image description (max 30 words) — describe a striking editorial photo or infographic that would accompany this article. Think bold compositions, team colors, dramatic lighting, stadium atmospheres.

Return ONLY valid JSON:
{"articles":[{"headline":"...","article":"...","imageDescription":"...","league":"..."},{"headline":"...","article":"...","imageDescription":"...","league":"..."},{"headline":"...","article":"...","imageDescription":"...","league":"..."}]}

Rules: exactly 3 articles matching the 3 input stories. article 60-80 words, imageDescription max 30 words. No markdown.`,
  );
}

function newsletterSummaryPrompt(articles: Article[]): string {
  return bilkoSystemPrompt(
    `You are an experience designer summarizing a newsletter reading session for a coaching AI that will use this summary to personalize its next interaction.

INPUT: Today's European Football Newsletter contained 3 articles:
${articles.map((a, i) => `${i + 1}. "${a.headline}" (${a.league})`).join("\n")}

MISSION: Create a concise experience summary that captures:
1. The overall theme of today's newsletter (what leagues/stories dominated)
2. The most exciting story and why
3. An inferred mood/energy level for a football fan reading this:
   - Big transfer news → "buzzing"
   - Dramatic match results → "thrilled"
   - Tactical/analytical stories → "informed"
   - Mixed bag → "engaged"
4. A one-line takeaway the coaching AI can reference

Return ONLY valid JSON:
{"newsletter":{"editionTitle":"...","topStory":"...","leaguesCovered":["..."],"mood":"...","takeaway":"..."}}

Rules: editionTitle max 8 words, topStory max 20 words, mood is a single word, takeaway max 15 words. No markdown.`,
  );
}

// ── Status messages ──────────────────────────────────────────────────

const DISCOVERING_MESSAGES = [
  "Scanning European football headlines...",
  "Checking the Premier League, La Liga, Serie A...",
  "Finding the top 3 stories for you...",
];

const WRITING_MESSAGES = [
  "Writing your newsletter articles...",
  "Crafting the headlines and image descriptions...",
  "Putting the edition together...",
];

const SUMMARIZING_MESSAGES = [
  "Wrapping up today's edition...",
  "Distilling the key takeaways...",
];

// ── Component ────────────────────────────────────────────────────────

export function NewsletterFlow({ onComplete }: { onComplete?: (summary?: string) => void }) {
  const [flowState, setFlowState] = useState<FlowState>("discovering");
  const [stories, setStories] = useState<Story[] | null>(null);
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [newsletter, setNewsletter] = useState<NewsletterResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(DISCOVERING_MESSAGES[0]);
  const hasStarted = useRef(false);

  const { trackStep, execution } = useFlowExecution("test-newsletter");
  const { definition: flowDef } = useFlowDefinition("test-newsletter");
  const { setStatus: setBusStatus, send: busSend } = useFlowRegistration("test-newsletter", "European Football Newsletter");
  const { pushMessage } = useFlowChat();

  const agent = getFlowAgent("test-newsletter");

  // ── Push agent message to chat ──────────────────────────
  const pushAgentMessage = useCallback(
    (text: string) => {
      pushMessage(OWNER_ID, {
        speaker: "agent",
        text,
        agentName: agent?.chatName ?? "FootballEditor",
        agentDisplayName: agent?.name ?? "Football Editor",
        agentAccent: agent?.accentColor ?? "text-green-500",
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

  const trackerSteps = useMemo<TrackerStep[]>(() => {
    if (!flowDef) return [];
    return flowDef.steps.map((step) => {
      const exec = execution.steps[step.id];
      let status: TrackerStep["status"] = "pending";
      if (exec) {
        if (exec.status === "running") status = "active";
        else if (exec.status === "success") status = "complete";
        else if (exec.status === "error") status = "error";
      }
      return { id: step.id, label: step.name, status };
    });
  }, [flowDef, execution.steps]);

  const trackerActivity = useMemo<string | undefined>(() => {
    switch (flowState) {
      case "discovering":
      case "writing":
      case "summarizing":
        return statusMessage;
      case "done":
        return newsletter
          ? `${newsletter.editionTitle} — ${newsletter.mood}`
          : "Edition complete";
      case "error":
        return error ?? "Something went wrong";
    }
  }, [flowState, statusMessage, newsletter, error]);

  // Sync flowState to flow bus
  useEffect(() => {
    const statusMap: Record<FlowState, "running" | "complete" | "error"> = {
      "discovering": "running",
      "writing": "running",
      "summarizing": "running",
      "done": "complete",
      "error": "error",
    };
    setBusStatus(statusMap[flowState], flowState);
  }, [flowState, setBusStatus]);

  // Rotate status messages during loading states
  useEffect(() => {
    let messages: string[];
    if (flowState === "discovering") messages = DISCOVERING_MESSAGES;
    else if (flowState === "writing") messages = WRITING_MESSAGES;
    else if (flowState === "summarizing") messages = SUMMARIZING_MESSAGES;
    else return;

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setStatusMessage(messages[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, [flowState]);

  // ── Run the flow ────────────────────────────────────────────────────

  const runFlow = useCallback(async () => {
    setFlowState("discovering");
    setError(null);
    setStatusMessage(DISCOVERING_MESSAGES[0]);

    try {
      // Step 1: discover-stories (LLM)
      const { data: storiesResult } = await trackStep(
        "discover-stories",
        { request: "Discover 3 European football stories" },
        () =>
          chatJSON<{ stories: Story[] }>(
            jsonPrompt(
              DISCOVER_STORIES_PROMPT,
              "Discover 3 trending European football stories for today's newsletter.",
            ),
          ),
      );

      const discoveredStories = storiesResult.data.stories;
      setStories(discoveredStories);
      pushAgentMessage(
        `Found 3 stories for today's edition: ${discoveredStories.map((s) => `"${s.headline}" (${s.league})`).join(", ")}. Writing the articles now.`,
      );

      // Step 2: write-articles (LLM)
      setFlowState("writing");
      setStatusMessage(WRITING_MESSAGES[0]);

      const { data: articlesResult } = await trackStep(
        "write-articles",
        { stories: discoveredStories },
        () =>
          chatJSON<{ articles: Article[] }>(
            jsonPrompt(
              writeArticlesPrompt(discoveredStories),
              "Write 3 newspaper articles with image descriptions for these European football stories.",
            ),
          ),
      );

      const writtenArticles = articlesResult.data.articles;
      setArticles(writtenArticles);

      pushAgentMessage(
        `All 3 articles are written with image descriptions. Let me wrap up today's edition.`,
      );

      // Step 3: newsletter-summary (LLM)
      setFlowState("summarizing");
      setStatusMessage(SUMMARIZING_MESSAGES[0]);

      const { data: summaryResult } = await trackStep(
        "newsletter-summary",
        { articles: writtenArticles },
        () =>
          chatJSON<{ newsletter: NewsletterResult }>(
            jsonPrompt(
              newsletterSummaryPrompt(writtenArticles),
              "Create a newsletter experience summary for today's European football edition.",
            ),
          ),
      );

      const nl = summaryResult.data.newsletter;
      setNewsletter(nl);
      pushAgentMessage(`${nl.editionTitle} — ${nl.takeaway}`);

      // Send summary to FlowBus for activity logging
      const exitSummary = `Read "${nl.editionTitle}" covering ${nl.leaguesCovered.join(", ")}. Top story: ${nl.topStory}. Mood: ${nl.mood}. ${nl.takeaway}`;
      busSend("main", "summary", { summary: exitSummary });

      setFlowState("done");
    } catch (err) {
      console.error("Newsletter flow error:", err);
      setError(err instanceof Error ? err.message : "Failed to run newsletter flow.");
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
    setStories(null);
    setArticles(null);
    setNewsletter(null);
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
      <StepTracker
        steps={trackerSteps}
        activity={trackerActivity}
      />

      {/* ── LOADING: Discovering stories ────────────────────── */}
      {flowState === "discovering" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
            <Newspaper className="h-8 w-8 text-green-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            Discovering Today's Stories
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {statusMessage}
          </p>
          <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-green-500 h-full rounded-full animate-pulse" style={{ width: "40%" }} />
          </div>
        </div>
      )}

      {/* ── LOADING: Writing articles ──────────────────────── */}
      {flowState === "writing" && stories && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
            <PenLine className="h-8 w-8 text-green-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            Writing the Articles
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-2">
            {stories.map((s) => s.headline).join(" · ")}
          </p>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {statusMessage}
          </p>
          <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-green-500 h-full rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* ── LOADING: Summarizing ─────────────────────────── */}
      {flowState === "summarizing" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
            <Sparkles className="h-8 w-8 text-green-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            Wrapping Up the Edition
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {statusMessage}
          </p>
          <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-green-500 h-full rounded-full animate-pulse" style={{ width: "85%" }} />
          </div>
        </div>
      )}

      {/* ── DONE: Newsletter card ──────────────────────────── */}
      {flowState === "done" && newsletter && articles && (
        <div className="space-y-6">
          {/* Edition header */}
          <div className="rounded-xl border-2 border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Newspaper className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{newsletter.editionTitle}</h2>
                <p className="text-sm text-muted-foreground">
                  {newsletter.leaguesCovered.join(" · ")}
                </p>
              </div>
            </div>

            {/* Articles */}
            <div className="space-y-4">
              {articles.map((article, i) => (
                <div key={i} className="space-y-2 pt-4 border-t border-border first:border-0 first:pt-0">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 rounded px-1.5 py-0.5 mt-0.5 shrink-0">
                      {article.league}
                    </span>
                    <h3 className="text-sm font-semibold leading-tight">{article.headline}</h3>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {article.article}
                  </p>
                  <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
                    <Image className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground italic">
                      {article.imageDescription}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary footer */}
            <div className="pt-3 border-t border-border space-y-1">
              <p className="text-sm font-medium">
                Top Story: <span className="font-normal">{newsletter.topStory}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Mood: <span className="font-medium capitalize">{newsletter.mood}</span>
              </p>
              <p className="text-xs text-muted-foreground italic">
                {newsletter.takeaway}
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
              New Edition
            </Button>
            {onComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const exitSummary = `Read "${newsletter.editionTitle}" covering ${newsletter.leaguesCovered.join(", ")}. Top story: ${newsletter.topStory}. Mood: ${newsletter.mood}. ${newsletter.takeaway}`;
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
