/**
 * Newsletter + Infographic + Video Flow — The full media pipeline v3.
 *
 * 12-step DAG with parallel branches + AI image/video generation:
 *
 *   discover-stories (root)
 *          │
 *    write-articles
 *          │
 *     ┌────┴────┐
 *     │         │
 *  newsletter  rank-stories
 *  -summary        │
 *             ┌────┴────┐
 *             │         │
 *      design-      create-
 *     infographic   narrative
 *          │            │
 *          │       ┌────┴────┐
 *          │       │         │
 *          │  storyboard  video-prompts
 *          │       │         │
 *     ┌────┴───┐   │         │
 *     │        │   │         │
 * infographic scene-    video-clips
 *   image    images     (Veo 3)
 *  (Nano     (Nano
 *  Banana)   Banana)
 *
 * Outputs:
 *   1. Newsletter      — 3 articles with image descriptions
 *   2. Infographic     — Cinematic AI wallpaper (Nano Banana) + score overlays
 *   3. Slideshow Video — AI scene images (Nano Banana) + TTS narration (~60s)
 *   4. AI Video Clips  — Veo-generated 7-8 second cinematic clips
 *
 * Models: Nano Banana (image gen) + Veo 3 (video gen) + Gemini 2.5 Flash (text)
 * Auto-starts immediately when rendered.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FlowProgress, type FlowProgressStep } from "@/components/ui/flow-progress";
import {
  Newspaper,
  PenLine,
  Image,
  RotateCcw,
  Sparkles,
  Download,
  BarChart3,
  Film,
  Video,
  Trophy,
  Wand2,
  Clapperboard,
} from "lucide-react";
import {
  chatJSON,
  jsonPrompt,
  useFlowExecution,
  useFlowDefinition,
  useFlowChat,
  generateImage,
  generateImages,
  generateVideo,
} from "@/lib/bilko-flow";
import type { ImageGenerationResult } from "@/lib/bilko-flow";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { useFlowRegistration } from "@/contexts/flow-bus-context";
import { getFlowAgent } from "@/lib/bilko-persona/flow-agents";
import { InfographicView, type InfographicData } from "@/components/newsletter/infographic-view";
import { SlideshowPlayer, type StoryboardData, type NarrativeData } from "@/components/newsletter/slideshow-player";
import { VideoPlanView, type VideoPromptsData } from "@/components/newsletter/video-plan-view";

// ── Owner ID — must match what landing.tsx uses for claimChat ──
const OWNER_ID = "test-newsletter";

// ── Types ────────────────────────────────────────────────────────────

type FlowState =
  | "discovering"
  | "writing"
  | "summarizing"
  | "ranking"
  | "producing"
  | "assembling"
  | "generating-images"
  | "generating-videos"
  | "done"
  | "error";

type OutputTab = "newsletter" | "infographic" | "slideshow" | "ai-video";

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

function rankStoriesPrompt(articles: Article[], stories: Story[]): string {
  return bilkoSystemPrompt(
    `You are a news editor ranking stories by importance and visual impact for an infographic and video production.

INPUT: 3 European football articles:
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
    `You are a data visualization designer creating a sports infographic layout focused on SCORES, TRANSFER FEES, and NUMERICAL DATA.

INPUT: Ranked stories:
MAIN: "${ranked.main.headline}" (${ranked.main.league}) — Stat: ${ranked.main.keyStat} (${ranked.main.statLabel})
SUPPORTING 1: "${ranked.supporting[0]?.headline}" (${ranked.supporting[0]?.league})
SUPPORTING 2: "${ranked.supporting[1]?.headline}" (${ranked.supporting[1]?.league})

MISSION: Design a structured infographic data model that EMPHASIZES numerical football data:
1. A bold title for the infographic edition
2. A subtitle (date + leagues covered)
3. The MAIN story section with headline, a BIG stat callout (match score like "3-1", transfer fee like "€85M", or stat like "47 goals"), summary, league, and an accent color hex code
4. Two supporting story sections — each MUST have a prominent numerical stat (score, fee, percentage, ranking)
5. An imagePrompt field: a DETAILED prompt for generating a cinematic wallpaper-style infographic image.
   The imagePrompt should describe: dramatic stadium lighting, team colors, overlaid score/stat typography,
   cinematic depth of field, dark moody atmosphere, editorial photo quality, football action frozen in time.
   Make it RICH in visual detail — this will be used to generate an actual AI image.
6. Footer text and edition identifier

Return ONLY valid JSON:
{"infographic":{"title":"...","subtitle":"...","imagePrompt":"...","mainStory":{"headline":"...","stat":"...","statLabel":"...","summary":"...","league":"...","accentColor":"#16a34a"},"supportingStories":[{"headline":"...","stat":"...","statLabel":"...","summary":"...","league":"..."},{"headline":"...","stat":"...","statLabel":"...","summary":"...","league":"..."}],"footer":"European Football Daily","edition":"..."}}

Rules: title max 8 words, subtitle max 12 words, summary max 25 words each. accentColor must be a valid hex. imagePrompt must be 40-80 words, cinematic and visually rich. No markdown.`,
  );
}

function createNarrativePrompt(ranked: RankedStories): string {
  return bilkoSystemPrompt(
    `You are a sports TV narrator creating a 60-second video script for a European football news bulletin.

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
    `You are a video storyboard artist creating a visual shot list for a sports news video.

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

function generateVideoPromptsPrompt(
  narrative: NarrativeData,
  ranked: RankedStories,
): string {
  return bilkoSystemPrompt(
    `You are an AI video production expert who creates prompts optimized for Google Veo and similar video generation models.

INPUT: A 60-second sports news narrative:
MAIN STORY: "${ranked.main.headline}" — ${ranked.main.imageDescription}
SUPPORT 1: "${ranked.supporting[0]?.headline}" — ${ranked.supporting[0]?.imageDescription}
SUPPORT 2: "${ranked.supporting[1]?.headline}" — ${ranked.supporting[1]?.imageDescription}

MISSION: Create Veo-optimized video generation prompts for a ~30 second AI-generated video (10s per story). Each prompt should:
- Be a rich natural language scene description (Veo understands cinematic language)
- Include camera movement (dolly, pan, tracking shot, aerial, etc.)
- Specify lighting and mood
- Be designed for 8-10 second clip generation

EXTENSION TECHNIQUES (explain one that works best):
- Multi-clip chaining: Generate 3 sequential clips with consistent style tokens
- Prompt continuation: End each prompt with motion that the next prompt picks up
- Style anchoring: Use identical style suffixes across all prompts for visual continuity
- Keyframe bridging: Describe the last frame of clip A as the first frame of clip B

Return ONLY valid JSON:
{"videoPrompts":{"scenes":[{"sceneNumber":1,"headline":"...","veoPrompt":"...","durationSec":10,"cameraMovement":"...","visualMood":"...","transitionType":"cut"},{"sceneNumber":2,...},{"sceneNumber":3,...}],"extensionTechnique":"...","productionNotes":"..."}}

Rules: exactly 3 scenes (one per story). veoPrompt max 60 words. extensionTechnique max 80 words. productionNotes max 40 words. No markdown.`,
  );
}

// ── Status messages ──────────────────────────────────────────────────

const STATUS_MESSAGES: Record<string, string[]> = {
  discovering: [
    "Scanning European football headlines...",
    "Checking the Premier League, La Liga, Serie A...",
    "Finding the top 3 stories for you...",
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
    "Generating AI video prompts...",
    "Crafting Veo-optimized scene descriptions...",
  ],
  "generating-images": [
    "Generating cinematic infographic with Nano Banana...",
    "Creating wallpaper-style soccer visuals...",
    "Rendering scene images for slideshow...",
    "AI is painting the stadium atmosphere...",
  ],
  "generating-videos": [
    "Generating 8-second video clips with Veo...",
    "Creating cinematic football footage...",
    "Rendering AI video sequences...",
    "Building the final video package...",
  ],
};

// ── Tab config ───────────────────────────────────────────────────────

const TABS: { id: OutputTab; label: string; icon: typeof Newspaper }[] = [
  { id: "newsletter", label: "Newsletter", icon: Newspaper },
  { id: "infographic", label: "Infographic", icon: BarChart3 },
  { id: "slideshow", label: "Slideshow Video", icon: Film },
  { id: "ai-video", label: "AI Video", icon: Video },
];

// ── Component ────────────────────────────────────────────────────────

export function NewsletterFlow({ onComplete }: { onComplete?: (summary?: string) => void }) {
  // ── Flow state ──
  const [flowState, setFlowState] = useState<FlowState>("discovering");
  const [stories, setStories] = useState<Story[] | null>(null);
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [newsletter, setNewsletter] = useState<NewsletterResult | null>(null);
  const [ranked, setRanked] = useState<RankedStories | null>(null);
  const [infographic, setInfographic] = useState<InfographicData | null>(null);
  const [narrative, setNarrative] = useState<NarrativeData | null>(null);
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [videoPrompts, setVideoPrompts] = useState<VideoPromptsData | null>(null);
  // Generated media (Nano Banana + Veo)
  const [infographicImage, setInfographicImage] = useState<ImageGenerationResult | null>(null);
  const [sceneImages, setSceneImages] = useState<(ImageGenerationResult | null)[] | null>(null);
  const [sceneVideos, setSceneVideos] = useState<Array<{ videoBase64: string; mimeType: string; durationSeconds: number } | null> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(STATUS_MESSAGES.discovering[0]);
  const [activeTab, setActiveTab] = useState<OutputTab>("newsletter");
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
      return { id: step.id, label: step.name, status };
    });
  }, [flowDef, execution.steps]);

  const trackerActivity = useMemo<string | undefined>(() => {
    if (flowState === "done") {
      return newsletter
        ? `${newsletter.editionTitle} — Newsletter + Infographic + 2 Videos`
        : "Complete";
    }
    if (flowState === "error") {
      return error ?? "Something went wrong";
    }
    return statusMessage;
  }, [flowState, statusMessage, newsletter, error]);

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

  // ── Run the flow ────────────────────────────────────────────────────

  const runFlow = useCallback(async () => {
    setFlowState("discovering");
    setError(null);

    try {
      // ═══ Step 1: discover-stories (LLM) ═══
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
        `Found 3 stories: ${discoveredStories.map((s) => `"${s.headline}"`).join(", ")}. Writing the full edition now.`,
      );

      // ═══ Step 2: write-articles (LLM) ═══
      setFlowState("writing");

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
      pushAgentMessage("Articles written. Now producing the full media package — newsletter, infographic, and two video formats.");

      // ═══ Steps 3+4 PARALLEL: newsletter-summary + rank-stories ═══
      setFlowState("summarizing");

      const [summaryResult, rankResult] = await Promise.all([
        // Step 3: newsletter-summary (LLM)
        trackStep(
          "newsletter-summary",
          { articles: writtenArticles },
          () =>
            chatJSON<{ newsletter: NewsletterResult }>(
              jsonPrompt(
                newsletterSummaryPrompt(writtenArticles),
                "Create a newsletter experience summary for today's European football edition.",
              ),
            ),
        ),
        // Step 4: rank-stories (LLM)
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

      // ═══ Steps 5+6 PARALLEL: design-infographic + create-narrative ═══
      setFlowState("producing");

      const [infographicResult, narrativeResult] = await Promise.all([
        // Step 5: design-infographic (LLM)
        trackStep(
          "design-infographic",
          { ranked: rankedStories },
          () =>
            chatJSON<{ infographic: InfographicData }>(
              jsonPrompt(
                designInfographicPrompt(rankedStories),
                "Design a sports infographic layout for the ranked stories.",
              ),
            ),
        ),
        // Step 6: create-narrative (LLM)
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
      pushAgentMessage(`Infographic designed. Narrative scripted at ${narrativeData.totalDurationSec}s. Building storyboard and AI video prompts.`);

      // ═══ Steps 7+8 PARALLEL: generate-storyboard + generate-video-prompts ═══
      setFlowState("assembling");

      const [storyboardResult, videoPromptsResult] = await Promise.all([
        // Step 7: generate-storyboard (LLM)
        trackStep(
          "generate-storyboard",
          { narrative: narrativeData, ranked: rankedStories },
          () =>
            chatJSON<{ storyboard: StoryboardData }>(
              jsonPrompt(
                generateStoryboardPrompt(narrativeData, rankedStories),
                "Create a visual storyboard for the video slideshow.",
              ),
            ),
        ),
        // Step 8: generate-video-prompts (LLM)
        trackStep(
          "generate-video-prompts",
          { narrative: narrativeData, ranked: rankedStories },
          () =>
            chatJSON<{ videoPrompts: VideoPromptsData }>(
              jsonPrompt(
                generateVideoPromptsPrompt(narrativeData, rankedStories),
                "Generate Veo-optimized video prompts for AI video generation.",
              ),
            ),
        ),
      ]);

      const storyboardData = storyboardResult.data.data.storyboard;
      setStoryboard(storyboardData);

      const videoPromptsData = videoPromptsResult.data.data.videoPrompts;
      setVideoPrompts(videoPromptsData);

      pushAgentMessage(
        `Storyboard and video prompts ready. Now generating cinematic images with Nano Banana...`,
      );

      // ═══ Step 9: Generate Images with Nano Banana ═══
      // Infographic image + scene images in parallel
      setFlowState("generating-images");

      const infographicImagePrompt = (infographicData as InfographicData & { imagePrompt?: string }).imagePrompt
        ?? `Cinematic European football infographic wallpaper. Dark moody stadium atmosphere with dramatic lighting. Bold overlaid score typography showing "${infographicData.mainStory.stat}" in large neon text. ${infographicData.mainStory.league} team colors. Editorial photo quality, depth of field, smoke effects. Scores and transfer fees highlighted with glowing callouts. Wallpaper aspect ratio, ultra-detailed, photorealistic.`;

      const sceneImagePrompts = storyboardData.scenes.map((scene) =>
        `Cinematic sports news visual: ${scene.imageDescription}. Style: ${scene.visualStyle}. Dark atmospheric lighting, editorial photography quality, dramatic composition, European football, stadium atmosphere, 16:9 aspect ratio, ultra-detailed.`,
      );

      const [infographicImgResult, ...sceneImgResults] = await Promise.allSettled([
        // Infographic hero image
        trackStep(
          "generate-infographic-image",
          { prompt: infographicImagePrompt },
          () => generateImage(infographicImagePrompt, { aspectRatio: "16:9" }),
        ).catch((err) => {
          console.warn("Infographic image generation failed:", err);
          return null;
        }),
        // Scene images for slideshow
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

      // Extract results (null-safe)
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
        `Generated ${imgCount} cinematic images. Now generating video clips with Veo...`,
      );

      // ═══ Step 10: Generate Video Clips with Veo ═══
      setFlowState("generating-videos");

      const videoClipResults = await Promise.allSettled(
        videoPromptsData.scenes.map((scene, i) =>
          trackStep(
            `generate-video-clip-${i + 1}`,
            { prompt: scene.veoPrompt, sceneNumber: i + 1 },
            () => generateVideo(scene.veoPrompt, {
              durationSeconds: Math.min(8, Math.max(5, scene.durationSec)) as 5 | 6 | 7 | 8,
              aspectRatio: "16:9",
            }),
          ).catch((err) => {
            console.warn(`Video clip ${i + 1} generation failed:`, err);
            return null;
          }),
        ),
      );

      const videoClips = videoClipResults.map((r) => {
        if (r.status === "fulfilled" && r.value) {
          const val = r.value as { data: { videos: Array<{ videoBase64: string; mimeType: string; durationSeconds: number }> } } | null;
          const firstVideo = val?.data?.videos?.[0];
          return firstVideo ?? null;
        }
        return null;
      });
      setSceneVideos(videoClips);

      const videoCount = videoClips.filter(Boolean).length;
      pushAgentMessage(
        `Full media package complete: Newsletter, Cinematic Infographic${infographicImgData ? " (AI image)" : ""}, ${storyboardData.scenes.length}-scene Slideshow${imgCount > 1 ? " with AI visuals" : ""}, and ${videoCount > 0 ? `${videoCount} AI video clips` : `${videoPromptsData.scenes.length}-scene video plan`}. Check all four tabs.`,
      );

      // Send summary to FlowBus for activity logging
      const exitSummary = `Read "${nl.editionTitle}" covering ${nl.leaguesCovered.join(", ")}. Top story: ${nl.topStory}. Mood: ${nl.mood}. ${nl.takeaway}. Generated cinematic infographic, ${imgCount} AI images, and ${videoCount} AI video clips.`;
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
      <p style="margin:0;font-size:12px;color:#999;">European Football Newsletter &middot; Powered by Bilko's Mental Gym</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `football-newsletter-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [articles, newsletter]);

  // ── Reset ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    hasStarted.current = false;
    didGreet.current = false;
    setStories(null);
    setArticles(null);
    setNewsletter(null);
    setRanked(null);
    setInfographic(null);
    setNarrative(null);
    setStoryboard(null);
    setVideoPrompts(null);
    setInfographicImage(null);
    setSceneImages(null);
    setSceneVideos(null);
    setError(null);
    setActiveTab("newsletter");
    setTimeout(() => {
      hasStarted.current = true;
      didGreet.current = true;
      runFlow();
    }, 0);
  }, [runFlow]);

  // ── Loading screen helper ───────────────────────────────────────────

  const loadingIcons: Record<string, typeof Newspaper> = {
    discovering: Newspaper,
    writing: PenLine,
    summarizing: Sparkles,
    ranking: Trophy,
    producing: BarChart3,
    assembling: Film,
    "generating-images": Wand2,
    "generating-videos": Clapperboard,
  };

  const loadingTitles: Record<string, string> = {
    discovering: "Discovering Today's Stories",
    writing: "Writing the Articles",
    summarizing: "Summarizing & Ranking",
    ranking: "Ranking by Newsworthiness",
    producing: "Producing Infographic & Narrative",
    assembling: "Assembling Video Assets",
    "generating-images": "Generating Cinematic Images",
    "generating-videos": "Generating Video Clips",
  };

  const progressWidths: Record<string, string> = {
    discovering: "10%",
    writing: "20%",
    summarizing: "30%",
    ranking: "40%",
    producing: "50%",
    assembling: "60%",
    "generating-images": "75%",
    "generating-videos": "90%",
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <FlowProgress
        mode="compact"
        steps={trackerSteps}
        activity={trackerActivity}
      />

      {/* ── LOADING states ────────────────────────────────────── */}
      {flowState !== "done" && flowState !== "error" && (
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
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {statusMessage}
          </p>
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
          {/* Tab bar */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isReady =
                (tab.id === "newsletter" && !!newsletter) ||
                (tab.id === "infographic" && !!infographic) ||
                (tab.id === "slideshow" && !!storyboard && !!narrative) ||
                (tab.id === "ai-video" && !!videoPrompts);
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
            {/* Newsletter Tab */}
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

            {/* Infographic Tab */}
            {activeTab === "infographic" && infographic && (
              <div className="animate-in fade-in duration-300">
                <InfographicView data={infographic} generatedImage={infographicImage ?? undefined} />
              </div>
            )}

            {/* Slideshow Video Tab */}
            {activeTab === "slideshow" && storyboard && narrative && (
              <div className="animate-in fade-in duration-300">
                <SlideshowPlayer storyboard={storyboard} narrative={narrative} sceneImages={sceneImages ?? undefined} />
              </div>
            )}

            {/* AI Video Tab */}
            {activeTab === "ai-video" && videoPrompts && (
              <div className="animate-in fade-in duration-300">
                <VideoPlanView data={videoPrompts} generatedVideos={sceneVideos ?? undefined} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-3 flex-wrap pt-2">
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
                  const exitSummary = `Read "${newsletter.editionTitle}" covering ${newsletter.leaguesCovered.join(", ")}. Top story: ${newsletter.topStory}. Mood: ${newsletter.mood}. ${newsletter.takeaway}. Full media package: infographic, slideshow video, AI video plan.`;
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
