/**
 * Newsletter Flow — Custom media pipeline v6.
 *
 * Interactive flow: user selects time range + topic + subtopic,
 * then the pipeline discovers stories, writes articles, and produces
 * a full media package.
 *
 * New DAG (steps 1-2 are interactive):
 *
 *   select-range-and-topic  (user-input)
 *          │
 *   generate-subtopics      (LLM)
 *          │
 *   select-subtopic          (user-input)
 *          │
 *   discover-stories         (LLM)
 *          │
 *    write-articles           (LLM)
 *          │
 *     ┌────┴────┐
 *     │         │
 *  newsletter  rank-stories   (parallel LLM)
 *  -summary        │
 *             ┌────┴────┐
 *             │         │
 *      design-      create-
 *     infographic   narrative  (parallel LLM)
 *          │            │
 *          │        storyboard
 *          │            │
 *     ┌────┴───┐        │
 *     │        │        │
 * infographic scene-images    (parallel Nano Banana)
 *   image
 *
 * Outputs:
 *   1. Newsletter      — 3 articles with image descriptions
 *   2. Infographic     — Cinematic AI wallpaper (Nano Banana) + data overlays
 *   3. Slideshow Video — AI scene images (Nano Banana) + TTS narration (~60s)
 *
 * Models: Nano Banana (image gen) + Gemini 2.5 Flash (text)
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Newspaper,
  PenLine,
  Image,
  RotateCcw,
  Sparkles,
  Download,
  BarChart3,
  Film,
  Trophy,
  Wand2,
  Layout,
  Pencil,
  Mic,
  MicOff,
  Clock,
  HelpCircle,
  ArrowLeft,
  Search,
} from "lucide-react";
import {
  chatJSON,
  jsonPrompt,
  useFlowExecution,
  useFlowChat,
  generateImage,
} from "@/lib/bilko-flow";
import type { ImageGenerationResult } from "@/lib/bilko-flow";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { useFlowRegistration } from "@/contexts/flow-bus-context";
import { useScreenOptions, type ScreenOption } from "@/contexts/conversation-design-context";
import { getFlowAgent } from "@/lib/bilko-persona/flow-agents";
import { InfographicView, type InfographicData } from "@/components/newsletter/infographic-view";
import { SlideshowPlayer, type StoryboardData, type NarrativeData } from "@/components/newsletter/slideshow-player";
import { DailyBriefingView } from "@/components/newsletter/daily-briefing-view";

// ── Owner ID — must match what landing.tsx uses for claimChat ──
const OWNER_ID = "newsletter";

// ── Types ────────────────────────────────────────────────────────────

type FlowState =
  | "select-range-and-topic"
  | "generating-subtopics"
  | "select-subtopic"
  | "discovering"
  | "writing"
  | "summarizing"
  | "ranking"
  | "producing"
  | "assembling"
  | "generating-images"
  | "done"
  | "error";

type OutputTab = "daily-briefing" | "newsletter" | "infographic" | "slideshow";

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

interface RankedStories {
  main: {
    headline: string;
    article: string;
    imageDescription: string;
    league: string;
    whyMain: string;
    keyStat: string;
    statLabel: string;
  };
  supporting: Array<{
    headline: string;
    article: string;
    imageDescription: string;
    league: string;
    keyStat: string;
    statLabel: string;
  }>;
  rankingRationale: string;
}

interface SubtopicSuggestion {
  question: string;
  description: string;
}

// ── Time range options ──────────────────────────────────────────────

interface TimeRange {
  id: string;
  label: string;
  description: string;
}

const TIME_RANGES: TimeRange[] = [
  { id: "1d", label: "1 Day", description: "Last 24 hours" },
  { id: "1w", label: "1 Week", description: "Last 7 days" },
  { id: "1m", label: "1 Month", description: "Last 30 days" },
  { id: "1y", label: "1 Year", description: "Last 12 months" },
  { id: "5y", label: "5 Years", description: "2021–2026" },
  { id: "10y", label: "10 Years", description: "2016–2026" },
  { id: "10y+", label: "10y+", description: "Historical" },
];

// ── Pre-built topic choices (significant world events 2024-2026) ──

interface TopicChoice {
  title: string;
  description: string;
}

const TOPIC_CHOICES: TopicChoice[] = [
  { title: "AI & Technology", description: "AI breakthroughs, chip wars, and the race for AGI" },
  { title: "US Politics & Elections", description: "Trump tariffs, trade wars, and policy shifts" },
  { title: "Ukraine-Russia War", description: "Frontline changes, drone warfare, NATO tensions" },
  { title: "Middle East Conflicts", description: "Gaza ceasefire, Israel-Iran escalation, regional shifts" },
  { title: "Climate & Environment", description: "Extreme weather, energy transition, COP summits" },
  { title: "Global Economy", description: "Tariff wars, inflation, markets, and trade deals" },
  { title: "Space Exploration", description: "SpaceX Polaris Dawn, lunar missions, commercial space" },
  { title: "European Football", description: "Premier League, Champions League, transfers, tactics" },
  { title: "FIFA World Cup 2026", description: "US-Canada-Mexico hosting, qualifiers, 48 teams" },
  { title: "Health & Science", description: "Medical breakthroughs, pandemics, biotech advances" },
  { title: "Social Movements", description: "Gen Z protests, cultural shifts, digital activism" },
  { title: "Cybersecurity", description: "State-sponsored attacks, pager explosions, digital warfare" },
];

// ── Prompts ──────────────────────────────────────────────────────────

function subtopicsPrompt(timeRange: string, topic: string): string {
  return bilkoSystemPrompt(
    `You are a senior journalist and researcher specializing in "${topic}".

INPUT: The user wants a newsletter about "${topic}" covering the time range: ${timeRange}.

MISSION: Generate exactly 5 compelling subtopics, angles, or open questions that would make for engaging newsletter content. These should be:
- Currently discussed or debated aspects of this topic
- Interesting angles a reader might not have considered
- Mix of breaking developments, analysis, and deeper questions

For each subtopic provide:
- A clear question or angle (max 12 words)
- A brief description of why it's interesting (max 20 words)

Return ONLY valid JSON:
{"subtopics":[{"question":"...","description":"..."}]}

Rules: exactly 5 subtopics. No markdown.`,
  );
}

function discoverStoriesPrompt(timeRange: string, topic: string, subtopic: string): string {
  return bilkoSystemPrompt(
    `You are a senior journalist with deep expertise in "${topic}".

INPUT: The user wants 3 stories about "${topic}" focused on the angle: "${subtopic}". Time range: ${timeRange}.

MISSION: Identify 3 compelling stories that readers interested in this angle would want to read. Mix different aspects — breaking news, analysis, data-driven insights, human interest, or surprising developments.

For each story provide:
- A punchy newspaper headline (max 10 words)
- A brief summary of what happened (max 30 words)
- Which category or domain it relates to (max 4 words, e.g. "AI Research", "Transfer Market", "Climate Policy")
- One key stat or fact that makes the story compelling

Return ONLY valid JSON:
{"stories":[{"headline":"...","summary":"...","league":"...","keyStat":"..."},{"headline":"...","summary":"...","league":"...","keyStat":"..."},{"headline":"...","summary":"...","league":"...","keyStat":"..."}]}

Rules: exactly 3 stories. headline max 10 words, summary max 30 words, league max 4 words, keyStat max 15 words. No markdown.`,
  );
}

function writeArticlesPrompt(stories: Story[], topic: string): string {
  return bilkoSystemPrompt(
    `You are an editor producing a newsletter about "${topic}". You write punchy, engaging articles and commission vivid editorial images.

INPUT: You have 3 trending stories:
${stories.map((s, i) => `${i + 1}. "${s.headline}" (${s.league}) — ${s.summary} Key stat: ${s.keyStat}`).join("\n")}

MISSION: For each of the 3 stories, produce:
1. A short newspaper article (60-80 words) — factual, engaging, with a hook opening and the key stat woven in naturally
2. A cinematic image description (max 30 words) — describe a striking editorial photo or infographic that would accompany this article. Think bold compositions, dramatic lighting, vivid atmospheres.

Return ONLY valid JSON:
{"articles":[{"headline":"...","article":"...","imageDescription":"...","league":"..."},{"headline":"...","article":"...","imageDescription":"...","league":"..."},{"headline":"...","article":"...","imageDescription":"...","league":"..."}]}

Rules: exactly 3 articles matching the 3 input stories. article 60-80 words, imageDescription max 30 words. No markdown.`,
  );
}

function newsletterSummaryPrompt(articles: Article[], topic: string): string {
  return bilkoSystemPrompt(
    `You are an experience designer summarizing a newsletter reading session for a coaching AI.

INPUT: Today's "${topic}" Newsletter contained 3 articles:
${articles.map((a, i) => `${i + 1}. "${a.headline}" (${a.league})`).join("\n")}

MISSION: Create a concise experience summary:
1. The overall theme (what categories/stories dominated)
2. The most compelling story and why
3. An inferred mood/energy level:
   - Big breaking news → "buzzing"
   - Dramatic developments → "thrilled"
   - Analytical/data stories → "informed"
   - Mixed bag → "engaged"
4. A one-line takeaway

Return ONLY valid JSON:
{"newsletter":{"editionTitle":"...","topStory":"...","leaguesCovered":["..."],"mood":"...","takeaway":"..."}}

Rules: editionTitle max 8 words, topStory max 20 words, mood is a single word, takeaway max 15 words. No markdown.`,
  );
}

function rankStoriesPrompt(articles: Article[], stories: Story[]): string {
  return bilkoSystemPrompt(
    `You are a news editor ranking stories by importance and visual impact for an infographic and video production.

INPUT: 3 articles:
${articles.map((a, i) => `${i + 1}. "${a.headline}" (${a.league}) — ${a.article}\nImage: ${a.imageDescription}\nKey stat: ${stories[i]?.keyStat ?? "N/A"}`).join("\n\n")}

MISSION: Rank the stories from most to least newsworthy. The #1 story becomes the MAIN story for the infographic (60% visual space) and video lead. Stories #2 and #3 become supporting stories.

Consider: breaking news value, statistical significance, visual potential, emotional impact.

For the main story, extract or create a bold stat number (e.g. "47M", "3-0", "12th", "98%") and a short stat label.
For each supporting story, also extract a stat number and label.

Return ONLY valid JSON:
{"ranked":{"main":{"headline":"...","article":"...","imageDescription":"...","league":"...","whyMain":"...","keyStat":"...","statLabel":"..."},"supporting":[{"headline":"...","article":"...","imageDescription":"...","league":"...","keyStat":"...","statLabel":"..."},{"headline":"...","article":"...","imageDescription":"...","league":"...","keyStat":"...","statLabel":"..."}],"rankingRationale":"..."}}

Rules: keyStat max 6 chars (e.g. "47M", "3-0"), statLabel max 8 words. whyMain max 20 words. No markdown.`,
  );
}

function designInfographicPrompt(ranked: RankedStories): string {
  return bilkoSystemPrompt(
    `You are a data visualization designer creating an infographic layout focused on KEY NUMBERS and DATA.

INPUT: Ranked stories:
MAIN: "${ranked.main.headline}" (${ranked.main.league}) — Stat: ${ranked.main.keyStat} (${ranked.main.statLabel})
SUPPORTING 1: "${ranked.supporting[0]?.headline}" (${ranked.supporting[0]?.league})
SUPPORTING 2: "${ranked.supporting[1]?.headline}" (${ranked.supporting[1]?.league})

MISSION: Design a structured infographic data model:
1. A bold title for the infographic edition
2. A subtitle (date + topics covered)
3. The MAIN story section with headline, a BIG stat callout, summary, category, and an accent color hex code
4. Two supporting story sections — each MUST have a prominent numerical stat
5. An imagePrompt field: a DETAILED prompt for generating a cinematic wallpaper-style infographic image.
   The imagePrompt should describe: dramatic lighting, bold typography overlays, cinematic depth of field,
   dark moody atmosphere, editorial quality. Make it RICH in visual detail.
6. Footer text and edition identifier

Return ONLY valid JSON:
{"infographic":{"title":"...","subtitle":"...","imagePrompt":"...","mainStory":{"headline":"...","stat":"...","statLabel":"...","summary":"...","league":"...","accentColor":"#16a34a"},"supportingStories":[{"headline":"...","stat":"...","statLabel":"...","summary":"...","league":"..."},{"headline":"...","stat":"...","statLabel":"...","summary":"...","league":"..."}],"footer":"Custom Newsletter","edition":"..."}}

Rules: title max 8 words, subtitle max 12 words, summary max 25 words each. accentColor must be a valid hex. imagePrompt must be 40-80 words, cinematic and visually rich. No markdown.`,
  );
}

function createNarrativePrompt(ranked: RankedStories): string {
  return bilkoSystemPrompt(
    `You are a TV narrator creating a 60-second video script for a news bulletin.

INPUT: Ranked stories:
MAIN: "${ranked.main.headline}" (${ranked.main.league}) — ${ranked.main.article}
SUPPORTING 1: "${ranked.supporting[0]?.headline}" (${ranked.supporting[0]?.league}) — ${ranked.supporting[0]?.article}
SUPPORTING 2: "${ranked.supporting[1]?.headline}" (${ranked.supporting[1]?.league}) — ${ranked.supporting[1]?.article}

MISSION: Write a broadcast-style narration script:
- Intro (10 seconds): Hook the viewer + edition intro. Short, punchy, sets the tone.
- Main story (20 seconds): Dramatic telling with the key stat. This is the lead.
- Supporting story 1 (15 seconds): Quick coverage with a hook opening.
- Supporting story 2 (15 seconds): Quick coverage closing the bulletin.

Total: ~60 seconds. Write for SPOKEN delivery — short sentences, dramatic pauses marked with "...", natural rhythm. Each segment's narration should be 2-4 sentences.

Return ONLY valid JSON:
{"narrative":{"intro":{"text":"...","durationSec":10},"segments":[{"storyIndex":0,"headline":"...","narration":"...","durationSec":20},{"storyIndex":1,"headline":"...","narration":"...","durationSec":15},{"storyIndex":2,"headline":"...","narration":"...","durationSec":15}],"totalDurationSec":60}}

Rules: intro text max 30 words. Each narration max 50 words. No markdown.`,
  );
}

function generateStoryboardPrompt(
  narrative: NarrativeData,
  ranked: RankedStories,
): string {
  return bilkoSystemPrompt(
    `You are a video storyboard artist creating a visual shot list for a news video.

INPUT: A 60-second narrative with ${narrative.segments.length + 1} segments:
INTRO (${narrative.intro.durationSec}s): "${narrative.intro.text}"
${narrative.segments.map((s) => `SEGMENT ${s.storyIndex + 1} (${s.durationSec}s): "${s.narration}"`).join("\n")}

Visual context:
MAIN: ${ranked.main.imageDescription}
SUPPORT 1: ${ranked.supporting[0]?.imageDescription}
SUPPORT 2: ${ranked.supporting[1]?.imageDescription}

MISSION: For each narrative segment (intro + 3 stories = 4 scenes), create:
1. A detailed image description (what the viewer sees — cinematic, editorial quality)
2. A visual style note (color palette, mood, composition approach)
3. Transition types (fade-in, dissolve, slide-left, slide-up, zoom)
4. The narration text that plays over this scene

Return ONLY valid JSON:
{"storyboard":{"scenes":[{"sceneNumber":1,"headline":"Intro","imageDescription":"...","visualStyle":"...","durationSec":10,"narrationText":"...","transitionIn":"fade-in","transitionOut":"dissolve"},{"sceneNumber":2,"headline":"...","imageDescription":"...","visualStyle":"...","durationSec":20,"narrationText":"...","transitionIn":"dissolve","transitionOut":"dissolve"},{"sceneNumber":3,...},{"sceneNumber":4,...}]}}

Rules: exactly 4 scenes. imageDescription max 40 words, visualStyle max 15 words. transitionIn/Out must be one of: fade-in, dissolve, slide-left, slide-up, zoom. No markdown.`,
  );
}

// ── Status messages ──────────────────────────────────────────────────

const STATUS_MESSAGES: Record<string, string[]> = {
  "generating-subtopics": [
    "Finding the most interesting angles...",
    "Researching open questions and debates...",
    "Curating subtopics for your newsletter...",
  ],
  discovering: [
    "Scanning for the top stories...",
    "Finding the 3 most compelling stories...",
    "Researching your topic in depth...",
  ],
  writing: [
    "Writing your newsletter articles...",
    "Crafting the headlines and image descriptions...",
    "Putting the edition together...",
  ],
  summarizing: [
    "Wrapping up today's edition...",
    "Distilling the key takeaways...",
  ],
  ranking: [
    "Ranking stories by newsworthiness...",
    "Identifying the lead story for infographic and video...",
  ],
  producing: [
    "Designing the infographic layout...",
    "Writing the video narrative script...",
    "Creating visual compositions...",
  ],
  assembling: [
    "Building the video storyboard...",
    "Crafting scene descriptions...",
  ],
  "generating-images": [
    "Generating cinematic infographic with Nano Banana...",
    "Creating wallpaper-style visuals...",
    "Rendering scene images for slideshow...",
    "AI is painting the atmosphere...",
  ],
};

// ── Tab config ───────────────────────────────────────────────────────

const TABS: { id: OutputTab; label: string; icon: typeof Newspaper }[] = [
  { id: "daily-briefing", label: "Daily Briefing", icon: Layout },
  { id: "newsletter", label: "Newsletter", icon: Newspaper },
  { id: "infographic", label: "Infographic", icon: BarChart3 },
  { id: "slideshow", label: "Slideshow Video", icon: Film },
];

// ── Component ────────────────────────────────────────────────────────

export function NewsletterFlow({ onComplete }: { onComplete?: (summary?: string) => void }) {
  // ── Interactive selection state ──
  const [selectedTimeRange, setSelectedTimeRange] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [subtopics, setSubtopics] = useState<SubtopicSuggestion[]>([]);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>("");
  const [customInput, setCustomInput] = useState("");
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ── Flow pipeline state ──
  const [flowState, setFlowState] = useState<FlowState>("select-range-and-topic");
  const [stories, setStories] = useState<Story[] | null>(null);
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [newsletter, setNewsletter] = useState<NewsletterResult | null>(null);
  const [ranked, setRanked] = useState<RankedStories | null>(null);
  const [infographic, setInfographic] = useState<InfographicData | null>(null);
  const [narrative, setNarrative] = useState<NarrativeData | null>(null);
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [infographicImage, setInfographicImage] = useState<ImageGenerationResult | null>(null);
  const [sceneImages, setSceneImages] = useState<(ImageGenerationResult | null)[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTab, setActiveTab] = useState<OutputTab>("daily-briefing");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const stateStartRef = useRef<number>(Date.now());

  const { trackStep, resolveUserInput } = useFlowExecution("newsletter");
  const { setStatus: setBusStatus, send: busSend } = useFlowRegistration("newsletter", "Newsletter");
  const { pushMessage } = useFlowChat();

  const agent = getFlowAgent("newsletter");

  // ── Push agent message to chat ──────────────────────────
  const pushAgentMessage = useCallback(
    (text: string) => {
      pushMessage(OWNER_ID, {
        speaker: "agent",
        text,
        agentName: agent?.chatName ?? "NewsletterEditor",
        agentDisplayName: agent?.name ?? "Newsletter Editor",
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

  // Sync flowState to flow bus
  useEffect(() => {
    setBusStatus(
      flowState === "done" ? "complete" : flowState === "error" ? "error" : "running",
      flowState,
    );
  }, [flowState, setBusStatus]);

  // Rotate status messages during loading states
  useEffect(() => {
    const messages = STATUS_MESSAGES[flowState];
    if (!messages) return;

    let index = 0;
    setStatusMessage(messages[0]);
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setStatusMessage(messages[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, [flowState]);

  // Track elapsed time per state (resets on state change)
  useEffect(() => {
    if (flowState === "done" || flowState === "error" || flowState === "select-range-and-topic" || flowState === "select-subtopic") {
      setElapsedSeconds(0);
      return;
    }
    stateStartRef.current = Date.now();
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - stateStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [flowState]);

  // ── Voice input ─────────────────────────────────────────
  const toggleVoiceInput = useCallback(() => {
    if (isVoiceListening && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsVoiceListening(false);
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) {
        setCustomInput(transcript.trim());
      }
      setIsVoiceListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsVoiceListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsVoiceListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsVoiceListening(true);
  }, [isVoiceListening]);

  // ── Step 1: Handle time range + topic selection ─────────
  const handleTopicSelect = useCallback((topic: string) => {
    if (!selectedTimeRange) return;
    setSelectedTopic(topic);
    setCustomInput("");
    resolveUserInput("select-range-and-topic", { timeRange: selectedTimeRange, topic });
    pushAgentMessage(`Got it — "${topic}" over ${TIME_RANGES.find(t => t.id === selectedTimeRange)?.label ?? selectedTimeRange}. Let me find the best angles.`);
    generateSubtopics(selectedTimeRange, topic);
  }, [selectedTimeRange, resolveUserInput, pushAgentMessage]);

  const handleCustomTopicSubmit = useCallback(() => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    handleTopicSelect(trimmed);
  }, [customInput, handleTopicSelect]);

  // ── Step 2: Generate subtopics ──────────────────────────
  const generateSubtopics = useCallback(async (timeRange: string, topic: string) => {
    setFlowState("generating-subtopics");
    setError(null);

    try {
      const timeLabel = TIME_RANGES.find(t => t.id === timeRange)?.label ?? timeRange;
      const { data: result } = await trackStep(
        "generate-subtopics",
        { timeRange, topic },
        () =>
          chatJSON<{ subtopics: SubtopicSuggestion[] }>(
            jsonPrompt(
              subtopicsPrompt(timeLabel, topic),
              `Find 5 interesting angles about "${topic}" for the time range "${timeLabel}".`,
            ),
          ),
      );

      const fetched = result.data.subtopics.slice(0, 5);
      setSubtopics(fetched);
      setFlowState("select-subtopic");
      pushAgentMessage("Here are 5 angles. Pick one or type your own.");
    } catch (err) {
      console.error("Subtopic generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate subtopics.");
      setFlowState("error");
    }
  }, [trackStep, pushAgentMessage]);

  // ── Step 3: Handle subtopic selection ───────────────────
  const handleSubtopicSelect = useCallback((subtopic: string) => {
    setSelectedSubtopic(subtopic);
    setCustomInput("");
    resolveUserInput("select-subtopic", { selectedSubtopic: subtopic });
    pushAgentMessage(`Locked in: "${subtopic}". Discovering stories now.`);
    runPipeline(selectedTimeRange!, selectedTopic, subtopic);
  }, [resolveUserInput, selectedTimeRange, selectedTopic, pushAgentMessage]);

  const handleCustomSubtopicSubmit = useCallback(() => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    handleSubtopicSelect(trimmed);
  }, [customInput, handleSubtopicSelect]);

  // ── Pipeline: discover → write → produce ────────────────
  const runPipeline = useCallback(async (timeRange: string, topic: string, subtopic: string) => {
    setFlowState("discovering");
    setError(null);

    try {
      const timeLabel = TIME_RANGES.find(t => t.id === timeRange)?.label ?? timeRange;

      // ═══ Step 3: discover-stories (LLM) ═══
      const { data: storiesResult } = await trackStep(
        "discover-stories",
        { timeRange, topic, subtopic },
        () =>
          chatJSON<{ stories: Story[] }>(
            jsonPrompt(
              discoverStoriesPrompt(timeLabel, topic, subtopic),
              `Discover 3 stories about "${topic}" focused on "${subtopic}" (${timeLabel}).`,
            ),
          ),
      );

      const discoveredStories = storiesResult.data.stories;
      setStories(discoveredStories);
      pushAgentMessage(
        `Found 3 stories: ${discoveredStories.map((s) => `"${s.headline}"`).join(", ")}. Writing the full edition now.`,
      );

      // ═══ Step 4: write-articles (LLM) ═══
      setFlowState("writing");

      const { data: articlesResult } = await trackStep(
        "write-articles",
        { stories: discoveredStories },
        () =>
          chatJSON<{ articles: Article[] }>(
            jsonPrompt(
              writeArticlesPrompt(discoveredStories, topic),
              `Write 3 newsletter articles about "${topic}".`,
            ),
          ),
      );

      const writtenArticles = articlesResult.data.articles;
      setArticles(writtenArticles);
      pushAgentMessage("Articles written. Now producing the full media package — newsletter, infographic, and slideshow.");

      // ═══ Steps 5+6 PARALLEL: newsletter-summary + rank-stories ═══
      setFlowState("summarizing");

      const [summaryResult, rankResult] = await Promise.all([
        trackStep(
          "newsletter-summary",
          { articles: writtenArticles },
          () =>
            chatJSON<{ newsletter: NewsletterResult }>(
              jsonPrompt(
                newsletterSummaryPrompt(writtenArticles, topic),
                `Create a newsletter experience summary for "${topic}".`,
              ),
            ),
        ),
        trackStep(
          "rank-stories",
          { articles: writtenArticles, stories: discoveredStories },
          () =>
            chatJSON<{ ranked: RankedStories }>(
              jsonPrompt(
                rankStoriesPrompt(writtenArticles, discoveredStories),
                "Rank the 3 stories by newsworthiness for infographic and video production.",
              ),
            ),
        ),
      ]);

      const nl = summaryResult.data.data.newsletter;
      setNewsletter(nl);

      const rankedStories = rankResult.data.data.ranked;
      setRanked(rankedStories);
      pushAgentMessage(`Lead story: "${rankedStories.main.headline}" — ${rankedStories.rankingRationale}`);

      // ═══ Steps 7+8 PARALLEL: design-infographic + create-narrative ═══
      setFlowState("producing");

      const [infographicResult, narrativeResult] = await Promise.all([
        trackStep(
          "design-infographic",
          { ranked: rankedStories },
          () =>
            chatJSON<{ infographic: InfographicData }>(
              jsonPrompt(
                designInfographicPrompt(rankedStories),
                "Design an infographic layout for the ranked stories.",
              ),
            ),
        ),
        trackStep(
          "create-narrative",
          { ranked: rankedStories },
          () =>
            chatJSON<{ narrative: NarrativeData }>(
              jsonPrompt(
                createNarrativePrompt(rankedStories),
                "Write a 60-second broadcast narration script for the ranked stories.",
              ),
            ),
        ),
      ]);

      const infographicData = infographicResult.data.data.infographic;
      setInfographic(infographicData);

      const narrativeData = narrativeResult.data.data.narrative;
      setNarrative(narrativeData);
      pushAgentMessage(`Infographic designed. Narrative scripted at ${narrativeData.totalDurationSec}s. Building storyboard.`);

      // ═══ Step 9: generate-storyboard ═══
      setFlowState("assembling");

      const storyboardResult = await trackStep(
        "generate-storyboard",
        { narrative: narrativeData, ranked: rankedStories },
        () =>
          chatJSON<{ storyboard: StoryboardData }>(
            jsonPrompt(
              generateStoryboardPrompt(narrativeData, rankedStories),
              "Create a visual storyboard for the video slideshow.",
            ),
          ),
      );

      const storyboardData = storyboardResult.data.data.storyboard;
      setStoryboard(storyboardData);

      pushAgentMessage(
        `Storyboard ready. Now generating cinematic images with Nano Banana...`,
      );

      // ═══ Step 10: Generate Images with Nano Banana ═══
      setFlowState("generating-images");

      const infographicImagePrompt = (infographicData as InfographicData & { imagePrompt?: string }).imagePrompt
        ?? `Cinematic infographic wallpaper. Dark moody atmosphere with dramatic lighting. Bold overlaid typography showing "${infographicData.mainStory.stat}" in large neon text. ${infographicData.mainStory.league} theme colors. Editorial photo quality, depth of field, smoke effects. Key numbers highlighted with glowing callouts. Wallpaper aspect ratio, ultra-detailed, photorealistic.`;

      const sceneImagePrompts = storyboardData.scenes.map((scene) =>
        `Cinematic news visual: ${scene.imageDescription}. Style: ${scene.visualStyle}. Dark atmospheric lighting, editorial photography quality, dramatic composition, 16:9 aspect ratio, ultra-detailed.`,
      );

      const [infographicImgResult, ...sceneImgResults] = await Promise.allSettled([
        trackStep(
          "generate-infographic-image",
          { prompt: infographicImagePrompt },
          () => generateImage(infographicImagePrompt, { aspectRatio: "16:9" }),
        ).catch((err) => {
          console.warn("Infographic image generation failed:", err);
          return null;
        }),
        ...sceneImagePrompts.map((prompt, i) =>
          trackStep(
            `generate-scene-image-${i + 1}`,
            { prompt, sceneNumber: i + 1 },
            () => generateImage(prompt, { aspectRatio: "16:9" }),
          ).catch((err) => {
            console.warn(`Scene image ${i + 1} generation failed:`, err);
            return null;
          }),
        ),
      ]);

      const infographicImgData = infographicImgResult.status === "fulfilled" && infographicImgResult.value
        ? (infographicImgResult.value as { data: ImageGenerationResult }).data ?? infographicImgResult.value
        : null;
      setInfographicImage(infographicImgData as ImageGenerationResult | null);

      const sceneImgData = sceneImgResults.map((r) => {
        if (r.status === "fulfilled" && r.value) {
          const val = r.value as { data: ImageGenerationResult } | null;
          return val?.data ?? val;
        }
        return null;
      });
      setSceneImages(sceneImgData as (ImageGenerationResult | null)[]);

      const imgCount = [infographicImgData, ...sceneImgData].filter(Boolean).length;

      pushAgentMessage(
        `Newsletter ready! "${topic}" edition with ${storyboardData.scenes.length}-scene Slideshow${imgCount > 0 ? " and AI visuals" : ""}. Check your Daily Briefing tab.`,
      );

      const exitSummary = `Read "${nl.editionTitle}" about ${topic} (${subtopic}). Top story: ${nl.topStory}. Mood: ${nl.mood}. ${nl.takeaway}. Generated infographic and ${imgCount} AI images.`;
      busSend("main", "summary", { summary: exitSummary });

      setFlowState("done");
    } catch (err) {
      console.error("Newsletter flow error:", err);
      setError(err instanceof Error ? err.message : "Failed to run newsletter flow.");
      setFlowState("error");
    }
  }, [trackStep, pushAgentMessage, busSend]);

  // ── Download newsletter as HTML ─────────────────────────────────────

  const downloadNewsletter = useCallback(() => {
    if (!articles || !newsletter) return;

    const today = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const articleBlocks = articles
      .map(
        (a) => `
      <article style="margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e5e5e5;">
        <span style="display:inline-block;background:#16a34a;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-bottom:8px;">${a.league}</span>
        <h2 style="margin:0 0 8px;font-size:20px;line-height:1.3;">${a.headline}</h2>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333;">${a.article}</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:12px 16px;display:flex;align-items:flex-start;gap:8px;">
          <span style="font-size:18px;line-height:1;">&#128247;</span>
          <p style="margin:0;font-size:13px;color:#666;font-style:italic;">${a.imageDescription}</p>
        </div>
      </article>`,
      )
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${newsletter.editionTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:24px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#16a34a;color:#fff;padding:32px 24px;text-align:center;">
      <h1 style="margin:0 0 4px;font-size:26px;">${newsletter.editionTitle}</h1>
      <p style="margin:0;font-size:14px;opacity:0.85;">${today}</p>
      <p style="margin:8px 0 0;font-size:13px;opacity:0.7;">${newsletter.leaguesCovered.join(" &middot; ")}</p>
    </div>
    <div style="padding:24px;">
      ${articleBlocks}
      <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin-top:8px;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:600;">Top Story</p>
        <p style="margin:0 0 8px;font-size:14px;color:#333;">${newsletter.topStory}</p>
        <p style="margin:0;font-size:13px;color:#666;">${newsletter.takeaway}</p>
      </div>
    </div>
    <div style="padding:16px 24px;text-align:center;border-top:1px solid #e5e5e5;">
      <p style="margin:0;font-size:12px;color:#999;">Custom Newsletter &middot; Powered by Bilko's Mental Gym</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [articles, newsletter]);

  // ── Reset ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    didGreet.current = false;
    setSelectedTimeRange(null);
    setSelectedTopic("");
    setSubtopics([]);
    setSelectedSubtopic("");
    setCustomInput("");
    setIsVoiceListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setStories(null);
    setArticles(null);
    setNewsletter(null);
    setRanked(null);
    setInfographic(null);
    setNarrative(null);
    setStoryboard(null);
    setInfographicImage(null);
    setSceneImages(null);
    setError(null);
    setActiveTab("daily-briefing");
    setFlowState("select-range-and-topic");
    setTimeout(() => {
      didGreet.current = true;
    }, 0);
  }, []);

  // ── Register screen options for voice matching ─────────────────────

  const screenOptions = useMemo<ScreenOption[]>(() => {
    if (flowState === "select-range-and-topic" && selectedTimeRange) {
      return TOPIC_CHOICES.map((topic, idx) => ({
        id: `topic-${idx}`,
        label: topic.title,
        keywords: topic.description.split(/\s+/).filter((w) => w.length > 4),
        action: () => handleTopicSelect(topic.title),
      }));
    }

    if (flowState === "select-subtopic" && subtopics.length > 0) {
      return subtopics.map((s, idx) => ({
        id: `subtopic-${idx}`,
        label: s.question,
        keywords: s.description.split(/\s+/).filter((w) => w.length > 4),
        action: () => handleSubtopicSelect(s.question),
      }));
    }

    return [];
  }, [flowState, selectedTimeRange, subtopics, handleTopicSelect, handleSubtopicSelect]);

  useScreenOptions(screenOptions);

  // ── Loading screen helper ───────────────────────────────────────────

  const loadingIcons: Record<string, typeof Newspaper> = {
    "generating-subtopics": Search,
    discovering: Newspaper,
    writing: PenLine,
    summarizing: Sparkles,
    ranking: Trophy,
    producing: BarChart3,
    assembling: Film,
    "generating-images": Wand2,
  };

  const loadingTitles: Record<string, string> = {
    "generating-subtopics": "Finding Angles",
    discovering: "Discovering Stories",
    writing: "Writing the Articles",
    summarizing: "Summarizing & Ranking",
    ranking: "Ranking by Newsworthiness",
    producing: "Producing Infographic & Narrative",
    assembling: "Assembling Storyboard",
    "generating-images": "Generating Cinematic Images",
  };

  const progressWidths: Record<string, string> = {
    "generating-subtopics": "8%",
    discovering: "15%",
    writing: "30%",
    summarizing: "45%",
    ranking: "55%",
    producing: "65%",
    assembling: "78%",
    "generating-images": "92%",
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── STEP 1: Select Time Range + Topic ──────────────── */}
      {flowState === "select-range-and-topic" && (
        <div className="space-y-6">
          <div className="text-center py-2">
            <h2 className="text-xl font-semibold">
              {selectedTimeRange ? "Now pick a topic" : "Choose your time range"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedTimeRange
                ? "Select from world events or type your own"
                : "How far back should we look?"}
            </p>
          </div>

          {/* Time range pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {TIME_RANGES.map((range) => (
              <button
                key={range.id}
                onClick={() => setSelectedTimeRange(range.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedTimeRange === range.id
                    ? "bg-green-500 text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <Clock className="h-3.5 w-3.5 inline mr-1.5" />
                {range.label}
              </button>
            ))}
          </div>

          {/* Show topic selection after time range is picked */}
          {selectedTimeRange && (
            <>
              {/* Custom topic input — prominent at top */}
              <div className="max-w-lg mx-auto">
                <div className="flex gap-2 items-center rounded-xl border-2 border-green-500/40 bg-card p-2 shadow-sm shadow-green-500/5 transition-all focus-within:border-green-500 focus-within:shadow-md focus-within:shadow-green-500/10">
                  <Pencil className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomTopicSubmit()}
                    placeholder="Type your own topic..."
                    className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`shrink-0 rounded-lg p-2 transition-colors ${
                      isVoiceListening
                        ? "bg-red-500/15 text-red-500 animate-pulse"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    title={isVoiceListening ? "Stop listening" : "Speak your topic"}
                  >
                    {isVoiceListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <Button
                    size="sm"
                    onClick={handleCustomTopicSubmit}
                    disabled={!customInput.trim()}
                  >
                    Go
                  </Button>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 max-w-lg mx-auto">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground/50 uppercase tracking-wider">or pick a topic</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Topic grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TOPIC_CHOICES.map((topic, idx) => (
                  <button
                    key={idx}
                    className="group relative rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-green-500 hover:shadow-md hover:shadow-green-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                    onClick={() => handleTopicSelect(topic.title)}
                  >
                    <h3 className="font-semibold text-base mb-1 group-hover:text-green-500 transition-colors">
                      {topic.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {topic.description}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground/60 group-hover:text-green-500/60 transition-colors">
                      <Newspaper className="h-3.5 w-3.5" />
                      <span>Create newsletter</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STEP 2: Select Subtopic ────────────────────────── */}
      {flowState === "select-subtopic" && subtopics.length > 0 && (
        <div className="space-y-4">
          <div className="text-center py-2">
            <h2 className="text-xl font-semibold">
              What angle interests you?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              About <span className="font-medium text-foreground">{selectedTopic}</span>
              {" "}({TIME_RANGES.find(t => t.id === selectedTimeRange)?.label})
            </p>
          </div>

          {/* Subtopic cards */}
          <div className="grid gap-3 max-w-xl mx-auto">
            {subtopics.map((s, idx) => (
              <button
                key={idx}
                className="group rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-green-500 hover:shadow-md hover:shadow-green-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                onClick={() => handleSubtopicSelect(s.question)}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <HelpCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-green-500 transition-colors">
                      {s.question}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Custom subtopic input */}
          <div className="max-w-md mx-auto">
            <div className="flex gap-2 items-center rounded-xl border border-border bg-card p-2 transition-all focus-within:border-green-500">
              <Pencil className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomSubtopicSubmit()}
                placeholder="Type your own angle or question..."
                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`shrink-0 rounded-lg p-2 transition-colors ${
                  isVoiceListening
                    ? "bg-red-500/15 text-red-500 animate-pulse"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                title={isVoiceListening ? "Stop listening" : "Speak your angle"}
              >
                {isVoiceListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <Button
                size="sm"
                onClick={handleCustomSubtopicSubmit}
                disabled={!customInput.trim()}
              >
                Go
              </Button>
            </div>
          </div>

          {/* Back action */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubtopics([]);
                setSelectedTopic("");
                setCustomInput("");
                setFlowState("select-range-and-topic");
              }}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Topics
            </Button>
          </div>
        </div>
      )}

      {/* ── LOADING states (pipeline running) ──────────────── */}
      {!["select-range-and-topic", "select-subtopic", "done", "error"].includes(flowState) && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
            {(() => {
              const Icon = loadingIcons[flowState] ?? Newspaper;
              return <Icon className="h-8 w-8 text-green-500 animate-pulse" />;
            })()}
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            {loadingTitles[flowState] ?? "Processing..."}
          </h2>
          {stories && flowState === "writing" && (
            <p className="text-sm text-muted-foreground text-center max-w-md mb-2">
              {stories.map((s) => s.headline).join(" · ")}
            </p>
          )}
          <p className="text-muted-foreground text-center max-w-md mb-4">
            {statusMessage}
          </p>
          {/* Context line showing user's selection */}
          {selectedTopic && (
            <p className="text-xs text-muted-foreground/60 mb-2">
              {selectedTopic} · {selectedSubtopic}
            </p>
          )}
          {elapsedSeconds > 5 && (
            <p className="text-xs text-muted-foreground/60 mb-4 tabular-nums">
              {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")} elapsed
            </p>
          )}
          <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-green-500 h-full rounded-full transition-all duration-500"
              style={{ width: progressWidths[flowState] ?? "50%" }}
            />
          </div>
        </div>
      )}

      {/* ── DONE: Tabbed output display ──────────────────────── */}
      {flowState === "done" && newsletter && articles && (
        <div className="space-y-4">
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
                  const exitSummary = `Read "${newsletter.editionTitle}" about ${selectedTopic}. Top story: ${newsletter.topStory}. Mood: ${newsletter.mood}. ${newsletter.takeaway}. Full media package: infographic and slideshow.`;
                  onComplete(exitSummary);
                }}
              >
                Done
              </Button>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isReady =
                (tab.id === "daily-briefing" && !!newsletter && !!articles) ||
                (tab.id === "newsletter" && !!newsletter) ||
                (tab.id === "infographic" && !!infographic) ||
                (tab.id === "slideshow" && !!storyboard && !!narrative);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={!isReady}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : isReady
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-muted-foreground/40 cursor-not-allowed"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="min-h-[300px]">
            {activeTab === "daily-briefing" && (
              <DailyBriefingView
                newsletter={newsletter}
                articles={articles}
                infographic={infographic}
                infographicImage={infographicImage}
                storyboard={storyboard}
                narrative={narrative}
                sceneImages={sceneImages}
              />
            )}

            {activeTab === "newsletter" && (
              <div className="space-y-6 animate-in fade-in duration-300">
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

                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={downloadNewsletter}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download Newsletter
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "infographic" && infographic && (
              <div className="animate-in fade-in duration-300">
                <InfographicView data={infographic} generatedImage={infographicImage ?? undefined} />
              </div>
            )}

            {activeTab === "slideshow" && storyboard && narrative && (
              <div className="animate-in fade-in duration-300">
                <SlideshowPlayer storyboard={storyboard} narrative={narrative} sceneImages={sceneImages ?? undefined} />
              </div>
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
