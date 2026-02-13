/**
 * Bilko Flow API — Flow Registry
 *
 * All inspectable PER-002 flows are registered here.
 * Each entry describes the flow's steps, prompts, and I/O schemas.
 *
 * Validated at import time by ARCH-005 steel frame validator.
 * Invalid flows are logged and excluded.
 *
 * All flows have corresponding bilko-flow DSL definitions in
 * server/bilko-flow/ for deterministic engine integration.
 *
 * ═══════════════════════════════════════════════════════════
 * ACTIVE FLOWS:  bilko-main, video-discovery, test-newsletter,
 *                weekly-football-video, ai-clip, work-with-me,
 *                ai-consultation, recursive-interviewer,
 *                linkedin-strategist, socratic-architect
 * ═══════════════════════════════════════════════════════════
 */

import type { FlowDefinition } from "../types";
import { validateRegistry } from "./validate";

const allFlows: FlowDefinition[] = [
  // ── ACTIVE — Bilko Main Flow ──────────────────────────────
  // This is the root flow that governs the landing page.
  // It greets the user (chat node), shows two options
  // (Video Recommendation + Explore the Site), and runs the
  // selected sub-flow.
  {
    id: "bilko-main",
    name: "Bilko Main Flow",
    description:
      "The main landing experience — a recursive while-loop. Bilko greets, user picks a sub-flow, the sub-flow runs, its exit summary feeds back into the greeting node, and the loop repeats. This is the root flow that governs the entire conversational landing page.",
    version: "3.0.0",
    location: "landing",
    componentPath: "client/src/pages/landing.tsx",
    tags: ["landing", "main", "greeting", "routing", "root", "recursive", "while-loop"],
    phases: [
      { id: "greeting", label: "Welcome", stepIds: ["greeting", "greeting-chat"] },
      { id: "mode-selection", label: "Choose", stepIds: ["mode-selection"] },
      { id: "running-subflow", label: "Experience", stepIds: ["run-subflow"] },
      { id: "recycle", label: "Return", stepIds: ["summarize-and-recycle", "receive-experience"] },
    ],
    output: {
      name: "recycleContext",
      type: "object",
      description: "The summary context fed back to the greeting node for the next iteration of the loop",
    },
    steps: [
      {
        id: "greeting",
        name: "Greetings from Bilko",
        type: "llm",
        description:
          "HEAD of the while-loop. Bilko generates a context-aware greeting. On first run: fresh welcome. On recycle: personalized return referencing the previous sub-flow's summary. Bilko speaks first (C1).",
        prompt:
          "You are greeting a new visitor to the AI School. Generate a warm, natural opening. Welcome them, introduce yourself briefly as Bilko their AI training partner, and ask how they'd like to learn today. 2-3 sentences max. Plain text only.",
        userMessage: "A new visitor just arrived at the AI School.",

        inputSchema: [
          {
            name: "recycleContext",
            type: "object",
            description: "Optional context from the previous loop iteration — contains modeLabel and summary from the last sub-flow. Null on first run.",
          },
        ],
        outputSchema: [
          {
            name: "greeting",
            type: "string",
            description: "Bilko's welcome message — 2-3 sentences, conversational",
          },
        ],
        dependsOn: [],
      },
      {
        id: "greeting-chat",
        name: "Push Greeting to Chat",
        type: "chat",
        description:
          "Pushes the generated greeting text to the FlowChat panel. This is the explicit chat-publish step — the greeting LLM output is only visible to the user after this step runs.",
        inputSchema: [
          {
            name: "greeting",
            type: "string",
            description: "The greeting text from the LLM step",
          },
        ],
        dependsOn: ["greeting"],
      },
      {
        id: "mode-selection",
        name: "User Selects Experience",
        type: "user-input",
        subtype: "menu",
        description:
          "A menu with two options: 'Video Recommendation' (launches the video-discovery sub-flow) and 'Explore the Site' (opens the sidebar navigation). Supports click and voice selection.",
        inputSchema: [
          {
            name: "availableFlows",
            type: "array",
            description: "Active sub-flows available for selection (currently only video-discovery)",
          },
          {
            name: "specialTiles",
            type: "array",
            description: "Navigation tiles (Explore the Site)",
          },
        ],
        outputSchema: [
          {
            name: "selectedMode",
            type: "string",
            description: "Short mode ID the user selected (e.g. 'video', 'chat')",
          },
          {
            name: "modeLabel",
            type: "string",
            description: "Human-readable label of the selected flow (e.g. 'Video Recommendation')",
          },
        ],
        dependsOn: ["greeting-chat"],
      },
      {
        id: "run-subflow",
        name: "Run Sub-Flow",
        type: "display",
        description:
          "Starts the selected sub-flow by ID. The sub-flow is autonomous — it claims the chat, pushes its own agent greeting and messages, and manages its own persona identity. When the sub-flow calls onComplete(summary), control passes to the summarize-and-recycle step.",
        inputSchema: [
          {
            name: "selectedMode",
            type: "string",
            description: "Which sub-flow to render (maps to a sub-flow ID)",
          },
        ],
        outputSchema: [
          {
            name: "exitSummary",
            type: "string",
            description: "The sub-flow's exit summary passed via onComplete(summary)",
          },
        ],
        dependsOn: ["mode-selection"],
      },
      {
        id: "summarize-and-recycle",
        name: "Summarize & Recycle to Head",
        type: "transform",
        description:
          "TAIL of the while-loop. Captures the sub-flow's exit summary, releases chat ownership back to bilko-main, logs the activity, and produces the recycleContext that feeds back into the greeting node for the next iteration. This step closes the loop: run-subflow → summarize-and-recycle → greeting (recycled).",
        inputSchema: [
          {
            name: "exitSummary",
            type: "string",
            description: "The summary string from the completed sub-flow",
          },
          {
            name: "modeLabel",
            type: "string",
            description: "Human-readable label of the sub-flow that just completed",
          },
        ],
        outputSchema: [
          {
            name: "recycleContext",
            type: "object",
            description: "Context object { modeLabel, summary } passed to the greeting node on the next loop iteration",
          },
        ],
        dependsOn: ["run-subflow"],
      },
      {
        id: "receive-experience",
        name: "Receive Sub-Flow Experience",
        type: "external-input",
        subtype: "flow-output",
        description:
          "Receives the experience summary from a completed sub-flow (e.g. test-newsletter). This external-input node injects mood and context data into the greeting node's next iteration, allowing Bilko to adjust tone and references based on what the user just experienced.",
        outputSchema: [
          {
            name: "experienceSummary",
            type: "string",
            description: "A narrative summary of the user's experience in the sub-flow (e.g. game result, video watched)",
          },
          {
            name: "mood",
            type: "string",
            description: "The inferred mood/energy level from the experience (e.g. 'energized', 'relaxed', 'challenged', 'amused')",
          },
          {
            name: "sourceFlow",
            type: "string",
            description: "The ID of the sub-flow that produced this experience",
          },
        ],
        dependsOn: ["summarize-and-recycle"],
      },
    ],
  },

  // ── ACTIVE — Video Discovery ──────────────────────────────
  // The primary learning flow. Topic → question → YouTube search → play.
  {
    id: "video-discovery",
    name: "Video Recommendation",
    description:
      "Pick a topic, ask a question, and discover real YouTube videos — powered by YouTube Data API search, not AI-hallucinated links.",
    version: "3.0.0",
    location: "landing",
    componentPath: "client/src/components/video-discovery-flow.tsx",
    tags: ["landing", "learning", "video", "youtube", "gemini"],
    icon: "Play",
    voiceTriggers: ["video", "watch", "tutorial", "show me", "recommend"],
    websiteUrl: "https://bilkobibitkov.replit.app/",
    phases: [
      { id: "generating-topics", label: "Research", stepIds: ["generate-topics"] },
      { id: "select-topic", label: "Pick Topic", stepIds: ["select-topic", "generate-questions", "select-question"] },
      { id: "searching-videos", label: "Find Videos", stepIds: ["generate-search-terms", "youtube-search"] },
      { id: "select-video", label: "Pick Video", stepIds: ["select-video"] },
      { id: "watching", label: "Watch", stepIds: ["play-video"] },
    ],
    output: {
      name: "selectedVideo",
      type: "object",
      description: "The YouTube video the user chose to watch, with embed ID, metadata, and engagement stats",
    },
    steps: [
      {
        id: "generate-topics",
        name: "Generate Topic Suggestions",
        type: "llm",
        description:
          "Generates ~10 interesting learning topics across a wide range of subjects. User can pick one or type/voice their own.",
        prompt: `Generate exactly 10 interesting learning topics that someone curious would want to explore via YouTube videos. Cover a wide range — technology, science, history, psychology, business, health, creative skills, etc.

Return ONLY valid JSON. Example:
{"topics":[{"title":"How Batteries Work","description":"The chemistry behind energy storage"}]}

Rules: title max 6 words, description max 12 words. No markdown, ONLY the JSON object.`,
        userMessage:
          "What are 10 interesting topics someone curious would enjoy learning about right now?",

        inputSchema: [],
        outputSchema: [
          {
            name: "topics",
            type: "array",
            description: "Array of ~10 learning topics with title and description",
            example: '[{"title":"How Batteries Work","description":"The chemistry behind energy storage"}]',
          },
        ],
        dependsOn: [],
      },
      {
        id: "select-topic",
        name: "User Picks Topic",
        type: "user-input",
        description:
          "Displays ~10 topic cards in a grid. User clicks a suggestion or types/voices a custom topic.",
        inputSchema: [
          {
            name: "topics",
            type: "array",
            description: "The generated topic suggestions",
          },
        ],
        outputSchema: [
          {
            name: "selectedTopic",
            type: "string",
            description: "The topic the user picked or typed",
          },
        ],
        dependsOn: ["generate-topics"],
      },
      {
        id: "generate-questions",
        name: "Generate Question Suggestions",
        type: "llm",
        description:
          "For the selected topic, generates 5 questions the user might want answered — from beginner-friendly to thought-provoking.",
        prompt: `The user wants to learn about "{topic}". Generate exactly 5 questions they might want answered.

Return ONLY valid JSON. Example:
{"questions":[{"question":"How does X actually work?"}]}

Rules: each question max 15 words. No markdown, ONLY the JSON object.`,
        userMessage:
          'What are 5 interesting questions someone new to "{topic}" would want answered?',

        inputSchema: [
          {
            name: "topic",
            type: "string",
            description: "The selected learning topic",
          },
        ],
        outputSchema: [
          {
            name: "questions",
            type: "array",
            description: "Array of 5 question suggestions",
            example: '[{"question":"How does X actually work?"}]',
          },
        ],
        dependsOn: ["select-topic"],
      },
      {
        id: "select-question",
        name: "User Picks Question",
        type: "user-input",
        description:
          "Displays 5 question cards. 'If you had one question to be answered, what would it be?' User picks a suggestion or types/voices their own.",
        inputSchema: [
          {
            name: "questions",
            type: "array",
            description: "The generated question suggestions",
          },
        ],
        outputSchema: [
          {
            name: "selectedQuestion",
            type: "string",
            description: "The question the user picked or typed",
          },
        ],
        dependsOn: ["generate-questions"],
      },
      {
        id: "generate-search-terms",
        name: "Generate YouTube Search Terms",
        type: "llm",
        description:
          "From topic + question, generates 3-4 targeted YouTube search queries to surface the best educational content.",
        prompt: `Generate 3-4 YouTube search queries to find the best videos about "{topic}" that answer: "{question}"

Return ONLY valid JSON. Example:
{"searchTerms":["how neural networks learn explained","neural network tutorial beginner"]}

Rules: each search term max 8 words. Return 3-4 terms. No markdown, ONLY the JSON object.`,
        userMessage:
          'Generate YouTube search queries for topic "{topic}", question: "{question}"',

        inputSchema: [
          {
            name: "topic",
            type: "string",
            description: "The selected topic",
          },
          {
            name: "question",
            type: "string",
            description: "The user's question",
          },
        ],
        outputSchema: [
          {
            name: "searchTerms",
            type: "array",
            description: "3-4 YouTube search queries",
          },
        ],
        dependsOn: ["select-question"],
      },
      {
        id: "youtube-search",
        name: "Search YouTube API",
        type: "transform",
        description:
          "Searches YouTube Data API v3 with the generated search terms. Returns real videos with titles, channels, view counts, and embed IDs — no hallucination possible.",
        inputSchema: [
          {
            name: "searchTerms",
            type: "array",
            description: "YouTube search queries to execute",
          },
        ],
        outputSchema: [
          {
            name: "videos",
            type: "array",
            description: "Real YouTube videos with metadata and stats, sorted by popularity",
          },
        ],
        dependsOn: ["generate-search-terms"],
      },
      {
        id: "select-video",
        name: "User Picks Video",
        type: "user-input",
        description:
          "Shows YouTube search results ranked by popularity. User clicks to watch. Includes views, likes, comments, and a 'Top Pick' badge for #1.",
        inputSchema: [
          {
            name: "videos",
            type: "array",
            description: "Real YouTube videos from API search",
          },
        ],
        outputSchema: [
          {
            name: "selectedVideo",
            type: "object",
            description: "The video the user chose to watch",
          },
        ],
        dependsOn: ["youtube-search"],
      },
      {
        id: "play-video",
        name: "Play Video",
        type: "display",
        description:
          "Embeds the selected YouTube video. Shows creator badge, YouTube link, description, engagement stats, and the topic + question context.",
        inputSchema: [
          {
            name: "selectedVideo",
            type: "object",
            description: "The chosen video with embedId, title, creator, etc.",
          },
        ],
        outputSchema: [
          {
            name: "exitSummary",
            type: "string",
            description: "Summary of what the user watched, passed back to bilko-main via onComplete(summary)",
          },
        ],
        dependsOn: ["select-video"],
      },
    ],
  },

  // ── ACTIVE — Newsletter + Infographic + Slideshow Pipeline ──
  // The media pipeline. Discovers stories, writes articles,
  // then branches into parallel production of:
  //   1. Newsletter summary
  //   2. Cinematic infographic (Nano Banana AI image + data overlay)
  //   3. Slideshow video (AI-generated scene images + TTS narration)
  // AI video generation has been moved to the dedicated weekly-football-video flow.
  {
    id: "test-newsletter",
    name: "European Football Newsletter",
    description:
      "The media pipeline — discovers 3 trending European football stories, writes articles, then produces a complete package: newsletter, cinematic AI infographic (Nano Banana, emphasizing scores & transfer fees), and slideshow with AI-generated scene images.",
    version: "5.0.0",
    location: "landing",
    componentPath: "client/src/components/newsletter-flow.tsx",
    tags: ["landing", "newsletter", "football", "european", "infographic", "media-pipeline", "nano-banana"],
    icon: "Newspaper",
    voiceTriggers: ["newsletter", "football", "news", "newspaper", "daily", "infographic"],
    websiteUrl: "https://bilkobibitkov.replit.app/",
    phases: [
      { id: "discovering", label: "Discover", stepIds: ["discover-stories"] },
      { id: "writing", label: "Write", stepIds: ["write-articles"] },
      { id: "summarizing", label: "Rank & Summarize", stepIds: ["newsletter-summary", "rank-stories"] },
      { id: "producing", label: "Produce", stepIds: ["design-infographic", "create-narrative"] },
      { id: "assembling", label: "Assemble", stepIds: ["generate-storyboard"] },
      { id: "generating-images", label: "Generate Images", stepIds: ["generate-infographic-image", "generate-scene-images"] },
      { id: "assembling-briefing", label: "Daily Briefing", stepIds: ["assemble-daily-briefing"] },
    ],
    output: {
      name: "mediaPackage",
      type: "object",
      description: "The complete media package: newsletter, cinematic AI infographic image, and slideshow with AI scene images",
    },
    steps: [
      {
        id: "discover-stories",
        name: "Discover Stories",
        type: "llm",
        description:
          "Acts as a European football journalist to discover 3 trending stories from across the major leagues — Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and Champions League.",
        prompt: "Discover 3 trending European football stories with headline, summary, league, and keyStat.",
        userMessage: "Discover 3 trending European football stories for today's newsletter.",

        inputSchema: [],
        outputSchema: [
          {
            name: "stories",
            type: "array",
            description: "Array of 3 trending stories with headline, summary, league, keyStat",
          },
        ],
        dependsOn: [],
      },
      {
        id: "write-articles",
        name: "Write Articles",
        type: "llm",
        description:
          "Writes short newspaper articles and cinematic image descriptions for each discovered story.",
        prompt: "Write 3 newspaper articles (60-80 words each) with image descriptions.",
        userMessage: "Write 3 newspaper articles with image descriptions.",

        inputSchema: [
          { name: "stories", type: "array", description: "The 3 discovered stories" },
        ],
        outputSchema: [
          { name: "articles", type: "array", description: "3 articles with headline, article, imageDescription, league" },
        ],
        dependsOn: ["discover-stories"],
      },
      {
        id: "newsletter-summary",
        name: "Newsletter Summary",
        type: "llm",
        description:
          "Distills articles into an experience summary with mood and takeaway. Runs in parallel with rank-stories.",
        prompt: "Create a newsletter experience summary with editionTitle, topStory, mood, takeaway.",
        userMessage: "Create a newsletter experience summary.",

        inputSchema: [
          { name: "articles", type: "array", description: "The 3 completed articles" },
        ],
        outputSchema: [
          { name: "newsletter", type: "object", description: "Summary with editionTitle, topStory, leaguesCovered, mood, takeaway" },
        ],
        dependsOn: ["write-articles"],
        parallel: true,
      },
      {
        id: "rank-stories",
        name: "Rank Stories",
        type: "llm",
        description:
          "Ranks the 3 stories by newsworthiness. #1 becomes the infographic/video lead. Runs in parallel with newsletter-summary.",
        prompt: "Rank stories: pick 1 main + 2 supporting with stat callouts for infographic and video.",
        userMessage: "Rank the 3 stories by newsworthiness for infographic and video production.",

        inputSchema: [
          { name: "articles", type: "array", description: "The 3 articles" },
          { name: "stories", type: "array", description: "Original story data with keyStats" },
        ],
        outputSchema: [
          { name: "ranked", type: "object", description: "main story + supporting array + rankingRationale" },
        ],
        dependsOn: ["write-articles"],
        parallel: true,
      },
      {
        id: "design-infographic",
        name: "Design Infographic",
        type: "llm",
        description:
          "Creates structured infographic data emphasizing SCORES, TRANSFER FEES, and NUMERICAL DATA from ranked stories — plus a rich imagePrompt for Nano Banana cinematic wallpaper generation. Runs in parallel with create-narrative.",
        prompt: "Design an infographic layout with title, mainStory (60% space), 2 supporting cards, and a cinematic imagePrompt for AI image generation emphasizing scores and transfer fees.",
        userMessage: "Design a sports infographic for the ranked stories with scores and transfer fee emphasis.",

        inputSchema: [
          { name: "ranked", type: "object", description: "Ranked stories with main + supporting" },
        ],
        outputSchema: [
          { name: "infographic", type: "object", description: "Infographic data with title, mainStory, supportingStories, colors, imagePrompt for Nano Banana" },
        ],
        dependsOn: ["rank-stories"],
        parallel: true,
      },
      {
        id: "create-narrative",
        name: "Create Narrative",
        type: "llm",
        description:
          "Writes a 60-second broadcast narration script (10s intro, 20s main, 15s+15s supporting). Runs in parallel with design-infographic.",
        prompt: "Write a 60-second sports TV narration: intro(10s) + main(20s) + 2 supporting(15s each).",
        userMessage: "Write a 60-second broadcast narration script.",

        inputSchema: [
          { name: "ranked", type: "object", description: "Ranked stories" },
        ],
        outputSchema: [
          { name: "narrative", type: "object", description: "Script with intro + segments array + totalDurationSec" },
        ],
        dependsOn: ["rank-stories"],
        parallel: true,
      },
      {
        id: "generate-storyboard",
        name: "Generate Storyboard",
        type: "llm",
        description:
          "Creates a 4-scene visual storyboard for the slideshow video — image descriptions, visual styles, transitions. Runs in parallel with generate-video-prompts.",
        prompt: "Create 4 storyboard scenes with image descriptions, visual style, transitions.",
        userMessage: "Create a visual storyboard for the video slideshow.",

        inputSchema: [
          { name: "narrative", type: "object", description: "The narration script" },
          { name: "ranked", type: "object", description: "Ranked stories for visual context" },
        ],
        outputSchema: [
          { name: "storyboard", type: "object", description: "4 scenes with imageDescription, visualStyle, transitions, narrationText" },
        ],
        dependsOn: ["create-narrative"],
        parallel: true,
      },
      // ── Image Generation Phase (Nano Banana) ──
      {
        id: "generate-infographic-image",
        name: "Generate Infographic Image",
        type: "llm",
        subtype: "image",
        description:
          "Generates a cinematic wallpaper-style infographic image using Nano Banana (Gemini native image gen). Focuses on scores, transfer fees, and dramatic football visuals with stat callouts.",
        prompt: "Generate a cinematic infographic image for European football with scores and transfer fee emphasis.",
        userMessage: "Generate the infographic hero image with Nano Banana.",

        inputSchema: [
          { name: "infographic", type: "object", description: "Infographic data with imagePrompt" },
        ],
        outputSchema: [
          { name: "imageBase64", type: "string", description: "Base64-encoded cinematic infographic image" },
          { name: "mimeType", type: "string", description: "Image MIME type (image/png)" },
        ],
        dependsOn: ["design-infographic", "generate-storyboard"],
        parallel: true,
      },
      {
        id: "generate-scene-images",
        name: "Generate Scene Images",
        type: "llm",
        subtype: "image",
        description:
          "Generates cinematic AI images for each storyboard scene using Nano Banana. Each image focuses on one key event with dramatic football visuals.",
        prompt: "Generate cinematic scene images for each storyboard scene, one per key football event.",
        userMessage: "Generate AI images for the slideshow scenes.",

        inputSchema: [
          { name: "storyboard", type: "object", description: "Storyboard with scene image descriptions" },
        ],
        outputSchema: [
          { name: "images", type: "array", description: "Array of generated scene images (base64)" },
        ],
        dependsOn: ["generate-storyboard"],
        parallel: true,
      },
      // ── Assembly Phase — Daily Briefing ──
      {
        id: "assemble-daily-briefing",
        name: "Assemble Daily Briefing",
        type: "display",
        description:
          "Assembles all generated outputs into the unified Daily Briefing view: newsletter articles, AI infographic image, and slideshow. This is the final presentation the user sees.",
        inputSchema: [
          { name: "newsletter", type: "object", description: "Edition summary with mood and takeaway" },
          { name: "articles", type: "array", description: "The 3 written articles" },
          { name: "infographic", type: "object", description: "Infographic data with stats" },
          { name: "infographicImage", type: "object", description: "AI-generated infographic image" },
          { name: "storyboard", type: "object", description: "4-scene storyboard" },
          { name: "narrative", type: "object", description: "60s broadcast narration script" },
          { name: "sceneImages", type: "array", description: "AI-generated scene images" },
        ],
        outputSchema: [
          { name: "exitSummary", type: "string", description: "Summary of the daily briefing for bilko-main recycling" },
        ],
        dependsOn: ["newsletter-summary", "generate-infographic-image", "generate-scene-images"],
      },
    ],
  },

  // ── ACTIVE — Weekly Football Highlight Video ─────────────
  // Dedicated 20-second social-media video pipeline.
  // Separated from the newsletter flow for independent iteration.
  //
  // Pipeline:
  //   1. Deep research → find the biggest European football event (last 7 weeks)
  //   2. Write 20s script pre-planned for 8-6-6 second transition points
  //   3. Generate 3 × 8s Veo clips chained via last-2-second grounding
  //   4. Concatenate → single ~20s continuous video
  {
    id: "weekly-football-video",
    name: "Weekly Football Highlight",
    description:
      "Deep-research the biggest European football event of the last 7 days, then produce a 20-second social-media video. The script is pre-planned for 8-6-6 second transitions. Three 8-second Veo clips are chained using last-2-second grounding to create a single continuous video packed with interesting facts and stats.",
    version: "1.0.0",
    location: "landing",
    componentPath: "client/src/components/weekly-football-video-flow.tsx",
    tags: ["landing", "football", "european", "video", "social-media", "veo", "highlight", "weekly"],
    icon: "Clapperboard",
    voiceTriggers: ["video", "highlight", "weekly", "football video", "social media", "clip"],
    websiteUrl: "https://bilkobibitkov.replit.app/",
    phases: [
      { id: "researching", label: "Research", stepIds: ["deep-research"] },
      { id: "scripting", label: "Script", stepIds: ["write-video-script"] },
      { id: "generating-clip-1", label: "Clip 1", stepIds: ["generate-clip-1"] },
      { id: "generating-clip-2", label: "Clip 2", stepIds: ["generate-clip-2"] },
      { id: "generating-clip-3", label: "Clip 3", stepIds: ["generate-clip-3"] },
      { id: "assembling", label: "Assemble", stepIds: ["concatenate-clips"] },
      { id: "complete", label: "Preview", stepIds: ["preview-video"] },
    ],
    output: {
      name: "continuousVideo",
      type: "object",
      description: "A single ~20-second continuous social-media video covering the week's biggest European football event",
    },
    steps: [
      {
        id: "deep-research",
        name: "Deep Research — Top Event",
        type: "llm",
        description:
          "Researches European football across Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and Champions League over the last 7 days. Identifies the single most important event and gathers the most impactful facts, stats, transfer fees, and details.",
        prompt: "You are a senior European football journalist. Research the last 7 DAYS of European football and identify the single MOST IMPORTANT event. Gather deep, interesting facts — surprising stats, record-breaking numbers, transfer fees, historical context, fan reactions. Focus on the most impactful details. Return: event headline (max 15 words), league, a detailed summary (150-200 words), and 3-7 key facts with numbers.",
        userMessage: "What is the biggest European football event in the last 7 days? Deep-research it with interesting facts and stats for a social media video.",

        inputSchema: [],
        outputSchema: [
          { name: "headline", type: "string", description: "Punchy headline for the event (max 15 words)" },
          { name: "league", type: "string", description: "League or competition" },
          { name: "summary", type: "string", description: "Detailed summary with context (150-200 words)" },
          { name: "keyFacts", type: "array", description: "3-7 most impactful facts with numbers/stats" },
        ],
        dependsOn: [],
      },
      {
        id: "write-video-script",
        name: "Write 20s Video Script (8-6-6 transitions)",
        type: "llm",
        description:
          "Writes a precisely timed 20-second video script PRE-PLANNED for the BO3 generation pattern: 8s first segment, then two 6s segments. Each segment transition must be designed so the last 2 seconds provide clean visual grounding for the next clip. The script weaves in the most compelling facts and stats from the research.",
        prompt: "You are a social media video scriptwriter specializing in short-form sports content. Write a 20-SECOND video script for the researched football event.\n\nCRITICAL: The script MUST be pre-planned for these EXACT transitions:\n- SEGMENT 1 (0-8s): Opening hook + establish the story. Must end with a STABLE visual scene (no hard cuts) because the last 2 seconds (6-8s) will be used as visual grounding for the next clip.\n- SEGMENT 2 (8-14s): Develop the story with the most shocking stat/fact. The opening must visually CONTINUE from segment 1's ending. Must end with a stable visual scene (12-14s used as grounding).\n- SEGMENT 3 (14-20s): Payoff + call to action. Opens continuing from segment 2's ending. Ends with a satisfying visual conclusion.\n\nFor each segment provide:\n1. Narration text (spoken words, timed to the segment)\n2. Visual description (what the viewer sees — cinematic, social-media style)\n3. Transition note (how the last 2s set up the next segment's grounding)\n4. The key fact/stat featured in that segment\n\nMake it ENGAGING — this is for social media. Short punchy sentences, dramatic reveals, surprising numbers.",
        userMessage: "Write the 20-second video script with 8-6-6 transition planning based on the research.",

        inputSchema: [
          { name: "research", type: "object", description: "The deep research output (headline, league, summary, keyFacts)" },
        ],
        outputSchema: [
          { name: "title", type: "string", description: "Video title for social media (max 10 words)" },
          { name: "segments", type: "array", description: "3 segments with narration, visualDescription, transitionNote, keyStat, durationSec (8, 6, 6)" },
          { name: "totalDurationSec", type: "number", description: "Total duration — must be 20" },
          { name: "veoStyleTokens", type: "string", description: "Shared visual style tokens for all 3 Veo prompts (lighting, palette, mood)" },
        ],
        dependsOn: ["deep-research"],
      },
      {
        id: "generate-clip-1",
        name: "Generate Clip 1 (8s initial)",
        type: "llm",
        subtype: "video",
        description:
          "Generates the initial 8-second video clip using Veo/BO3. Fresh text-to-video generation from the first segment's visual description. The last 2 seconds must show a stable, continuing scene that Veo can use as grounding for clip 2.",
        prompt: "Generate the opening 8-second video clip from segment 1's visual description. End with stable motion for grounding.",
        userMessage: "Generate the opening 8-second video clip.",

        inputSchema: [
          { name: "visualDescription", type: "string", description: "Segment 1 visual description from the script" },
          { name: "styleTokens", type: "string", description: "Shared Veo style tokens" },
        ],
        outputSchema: [
          { name: "videoBase64", type: "string", description: "Base64-encoded 8s video clip (MP4)" },
          { name: "mimeType", type: "string", description: "Video MIME type" },
          { name: "durationSeconds", type: "number", description: "Clip duration (8s)" },
        ],
        dependsOn: ["write-video-script"],
      },
      {
        id: "generate-clip-2",
        name: "Generate Clip 2 (8s, grounded on clip 1)",
        type: "llm",
        subtype: "video",
        description:
          "Generates the second 8-second clip using Veo/BO3 with the last 2 seconds of clip 1 as visual grounding. The effective new content is ~6 seconds (2s overlap from grounding). Continues the visual narrative from segment 2 of the script.",
        prompt: "Generate an 8-second video extending clip 1. Veo uses the last 2 seconds of clip 1 as visual grounding seed. The visual must continue seamlessly.",
        userMessage: "Generate clip 2 grounded on the last 2 seconds of clip 1.",

        inputSchema: [
          { name: "visualDescription", type: "string", description: "Segment 2 visual description from the script" },
          { name: "styleTokens", type: "string", description: "Shared Veo style tokens" },
          { name: "sourceVideoBase64", type: "string", description: "Clip 1 video — last 2s used as grounding" },
        ],
        outputSchema: [
          { name: "videoBase64", type: "string", description: "Base64-encoded 8s video clip (MP4)" },
          { name: "mimeType", type: "string", description: "Video MIME type" },
          { name: "durationSeconds", type: "number", description: "Clip duration (8s, ~6s net new)" },
        ],
        dependsOn: ["generate-clip-1"],
      },
      {
        id: "generate-clip-3",
        name: "Generate Clip 3 (8s, grounded on clip 2)",
        type: "llm",
        subtype: "video",
        description:
          "Generates the final 8-second clip using Veo/BO3 with the last 2 seconds of clip 2 as visual grounding. The effective new content is ~6 seconds. Concludes the video with the payoff from segment 3 of the script.",
        prompt: "Generate the final 8-second video extending clip 2. Veo uses the last 2 seconds of clip 2 as grounding. Conclude the sequence satisfyingly.",
        userMessage: "Generate final clip 3 grounded on the last 2 seconds of clip 2.",

        inputSchema: [
          { name: "visualDescription", type: "string", description: "Segment 3 visual description from the script" },
          { name: "styleTokens", type: "string", description: "Shared Veo style tokens" },
          { name: "sourceVideoBase64", type: "string", description: "Clip 2 video — last 2s used as grounding" },
        ],
        outputSchema: [
          { name: "videoBase64", type: "string", description: "Base64-encoded 8s video clip (MP4)" },
          { name: "mimeType", type: "string", description: "Video MIME type" },
          { name: "durationSeconds", type: "number", description: "Clip duration (8s, ~6s net new)" },
        ],
        dependsOn: ["generate-clip-2"],
      },
      {
        id: "concatenate-clips",
        name: "Concatenate Clips (FFmpeg)",
        type: "transform",
        description:
          "Concatenates the 3 individual 8-second Veo clips into a single ~20-second continuous video using server-side FFmpeg concat demuxer. Container-level copy, no re-encoding. The 2-second grounding overlaps are trimmed during concatenation.",
        inputSchema: [
          { name: "clips", type: "array", description: "Array of 3 base64-encoded 8s MP4 clips" },
        ],
        outputSchema: [
          { name: "videoBase64", type: "string", description: "Base64-encoded concatenated ~20s video (MP4)" },
          { name: "mimeType", type: "string", description: "Video MIME type (video/mp4)" },
          { name: "durationSeconds", type: "number", description: "Total duration of concatenated video (~20s)" },
        ],
        dependsOn: ["generate-clip-3"],
      },
      {
        id: "preview-video",
        name: "Preview & Export",
        type: "display",
        description:
          "Displays the final ~20-second continuous video with the script overlay, key facts, and social media export options. Shows each segment's narration text alongside the video playback.",
        inputSchema: [
          { name: "research", type: "object", description: "Original research data" },
          { name: "script", type: "object", description: "The 20s video script with segments" },
          { name: "continuousVideo", type: "object", description: "The concatenated ~20s video" },
        ],
        outputSchema: [
          { name: "exitSummary", type: "string", description: "Summary for bilko-main recycling" },
        ],
        dependsOn: ["concatenate-clips"],
      },
    ],
  },

  // ── AI Clip — Single 8s Veo clip ────────────────────────────
  //
  // The simplest video building block:
  //   1. Deep research → find a visually compelling story
  //   2. Write 8-second clip script
  //   3. Generate a single 8s Veo clip
  {
    id: "ai-clip",
    name: "AI Clip",
    description:
      "Research the top news story and generate a single 8-second AI video clip with Veo. The simplest building block — one research, one script, one clip.",
    version: "1.0.0",
    location: "landing",
    componentPath: "client/src/components/ai-clip-flow.tsx",
    tags: ["landing", "video", "veo", "clip", "ai", "news", "single"],
    icon: "Film",
    voiceTriggers: ["ai clip", "single clip", "one clip", "quick clip", "8 second"],
    websiteUrl: "https://bilkobibitkov.replit.app/",
    phases: [
      { id: "researching", label: "Research", stepIds: ["deep-research"] },
      { id: "scripting", label: "Script", stepIds: ["write-clip-script"] },
      { id: "generating", label: "Generate", stepIds: ["generate-clip"] },
      { id: "complete", label: "Preview", stepIds: ["preview-clip"] },
    ],
    output: {
      name: "videoClip",
      type: "object",
      description: "A single 8-second AI-generated video clip about a top news story",
    },
    steps: [
      {
        id: "deep-research",
        name: "Deep Research — Top Story",
        type: "llm",
        description:
          "Researches global news over the last 7 days and finds the single most visually interesting story. Focuses on stories with cinematic potential (sports, space, nature, technology).",
        prompt: "You are a senior news researcher. Research the last 7 DAYS of global news and identify the single MOST INTERESTING story — something visually compelling that would make a great short video clip.",
        userMessage: "What is the most visually interesting news story of the last 7 days?",

        inputSchema: [],
        outputSchema: [
          { name: "headline", type: "string", description: "Punchy headline (max 12 words)" },
          { name: "topic", type: "string", description: "Category (e.g. Space, Football, Technology)" },
          { name: "summary", type: "string", description: "Vivid visual context (80-120 words)" },
          { name: "keyFacts", type: "array", description: "2-4 facts with numbers" },
        ],
        dependsOn: [],
      },
      {
        id: "write-clip-script",
        name: "Write 8s Clip Script",
        type: "llm",
        description:
          "Writes a self-contained 8-second micro-story clip script with narration text, detailed visual description for Veo, and Veo style tokens.",
        prompt: "Write a single 8-SECOND clip script. This clip must be a self-contained micro-story — hook, reveal, payoff in 8 seconds.",
        userMessage: "Write a punchy 8-second clip script based on the research.",

        inputSchema: [
          { name: "research", type: "object", description: "The deep research output" },
        ],
        outputSchema: [
          { name: "title", type: "string", description: "Social-media punchy title (max 8 words)" },
          { name: "narration", type: "string", description: "Voiceover text (max 20 words)" },
          { name: "visualDescription", type: "string", description: "Cinematic Veo prompt (max 50 words)" },
          { name: "keyStat", type: "string", description: "The single most impressive stat" },
          { name: "veoStyleTokens", type: "string", description: "Visual style for Veo" },
        ],
        dependsOn: ["deep-research"],
      },
      {
        id: "generate-clip",
        name: "Generate Clip (8s Veo)",
        type: "llm",
        subtype: "video",
        description:
          "Generates a single 8-second video clip using Veo. Fresh text-to-video generation — no source grounding. This is the atomic unit.",
        prompt: "Generate an 8-second video clip from the visual description and style tokens.",
        userMessage: "Generate the 8-second video clip.",

        inputSchema: [
          { name: "visualDescription", type: "string", description: "Clip visual description" },
          { name: "styleTokens", type: "string", description: "Veo style tokens" },
        ],
        outputSchema: [
          { name: "videoBase64", type: "string", description: "Base64-encoded 8s video clip (MP4)" },
          { name: "mimeType", type: "string", description: "Video MIME type" },
          { name: "durationSeconds", type: "number", description: "Clip duration (8s)" },
        ],
        dependsOn: ["write-clip-script"],
      },
      {
        id: "preview-clip",
        name: "Preview & Export",
        type: "display",
        description:
          "Displays the generated 8-second clip with the script, narration, key facts, and download option.",
        inputSchema: [
          { name: "research", type: "object", description: "Original research data" },
          { name: "script", type: "object", description: "The clip script" },
          { name: "clip", type: "object", description: "The generated video clip" },
        ],
        outputSchema: [
          { name: "exitSummary", type: "string", description: "Summary for bilko-main recycling" },
        ],
        dependsOn: ["generate-clip"],
      },
    ],
  },

  // ── Work With Me ──────────────────────────────────────────
  {
    id: "work-with-me",
    name: "Work With Me",
    description:
      "Tell the agent your objective (e.g. 'register a business in WA') and it finds every step, then wireframes each website inside the app so the agent can see through your eyes and guide you with element-level overlays — every recommendation justified.",
    version: "1.0.0",
    location: "landing",
    componentPath: "client/src/components/work-with-me-flow.tsx",
    tags: ["landing", "guidance", "web", "assistant", "wireframe", "gemini"],
    icon: "Handshake",
    voiceTriggers: ["work with me", "guide", "help me", "walk me through", "assist", "task"],
    output: {
      name: "completedSteps",
      type: "object",
      description: "The steps the user completed with guidance from the agent",
    },
    steps: [
      {
        id: "objective-input",
        name: "User Enters Objective",
        type: "user-input",
        description:
          "User describes their goal in natural language (e.g. 'Register a business in Washington State'). Free-text input with example suggestions.",
        inputSchema: [
          {
            name: "exampleSuggestions",
            type: "array",
            description: "Pre-defined example objectives shown as clickable suggestions",
          },
        ],
        outputSchema: [
          {
            name: "objective",
            type: "string",
            description: "The user's goal in natural language",
          },
        ],
        dependsOn: [],
      },
      {
        id: "research-steps",
        name: "Research Step-by-Step Plan",
        type: "llm",
        description:
          "Agent analyzes the objective and finds 3-7 concrete steps with real, actionable URLs from official sources. Each step includes a title, description, URL, estimated time, and justification.",
        prompt:
          "Given a user objective, find the exact step-by-step process with real URLs from official websites.",
        userMessage: 'Find the step-by-step process for: "{objective}"',

        inputSchema: [
          {
            name: "objective",
            type: "string",
            description: "The user's goal",
          },
        ],
        outputSchema: [
          {
            name: "taskTitle",
            type: "string",
            description: "Short title for the task",
          },
          {
            name: "overview",
            type: "string",
            description: "1-2 sentence overview",
          },
          {
            name: "steps",
            type: "array",
            description:
              "Array of steps with stepNumber, title, description, url, estimatedTime, whyThisStep",
          },
        ],
        dependsOn: ["objective-input"],
      },
      {
        id: "select-step",
        name: "User Picks Step",
        type: "user-input",
        description:
          "Displays the step-by-step plan as cards. User picks which step to work on. Completed steps are shown with a green checkmark.",
        inputSchema: [
          {
            name: "steps",
            type: "array",
            description: "The researched steps",
          },
        ],
        outputSchema: [
          {
            name: "selectedStep",
            type: "object",
            description: "The step the user chose to work on",
          },
        ],
        dependsOn: ["research-steps"],
      },
      {
        id: "fetch-page",
        name: "Fetch & Parse Website",
        type: "transform",
        description:
          "Server-side proxy fetches the selected URL, parses the HTML with jsdom, and extracts a structured representation of the page: headings, links, buttons, form fields, paragraphs, lists, and images.",
        inputSchema: [
          {
            name: "url",
            type: "string",
            description: "The URL to fetch",
          },
        ],
        outputSchema: [
          {
            name: "pageStructure",
            type: "object",
            description:
              "Structured page with url, title, description, and elements array",
          },
        ],
        dependsOn: ["select-step"],
      },
      {
        id: "analyze-page",
        name: "Generate Visual Guidance",
        type: "llm",
        description:
          "Agent reads the page structure and generates element-level guidance: which elements to click, fill, or read — each with a justification explaining why that action matters for the user's goal.",
        prompt:
          "Analyze the page structure and generate element-level guidance with justifications for achieving the user's objective.",
        userMessage:
          "Guide the user through this page to help them achieve their goal.",

        inputSchema: [
          {
            name: "objective",
            type: "string",
            description: "The user's original goal",
          },
          {
            name: "stepContext",
            type: "object",
            description: "The current step being worked on",
          },
          {
            name: "pageStructure",
            type: "object",
            description: "The structured page representation",
          },
        ],
        outputSchema: [
          {
            name: "pageSummary",
            type: "string",
            description: "What this page is about",
          },
          {
            name: "guidanceItems",
            type: "array",
            description:
              "Element-level guidance with elementId, action, instruction, justification, order, priority",
          },
          {
            name: "nextAction",
            type: "string",
            description: "What happens after following the guidance",
          },
        ],
        dependsOn: ["fetch-page"],
      },
      {
        id: "guided-view",
        name: "Interactive Wireframe",
        type: "display",
        description:
          "Renders the website as a wireframe with guidance overlays. Highlighted elements have colored borders and inline tooltips. Links are clickable and navigate to the next page (which gets fetched and analyzed in turn). User can mark steps complete and move to the next one.",
        inputSchema: [
          {
            name: "pageStructure",
            type: "object",
            description: "The structured page to wireframe",
          },
          {
            name: "guidance",
            type: "object",
            description: "The agent's element-level guidance",
          },
        ],
        outputSchema: [],
        dependsOn: ["analyze-page"],
      },
    ],
  },

  // ── AI Leverage Consultation ──────────────────────────────
  {
    id: "ai-consultation",
    name: "AI Leverage Consultation",
    description:
      "Pick your field (marketing, tech, small business, education, or healthcare) and an AI expert asks simple questions about your daily work. You'll get 2 quick wins you can start using right away, plus 2 surprising AI opportunities you probably haven't thought of — with specific tool recommendations.",
    version: "1.0.0",
    location: "landing",
    componentPath: "client/src/components/ai-consultation-flow.tsx",
    tags: ["landing", "ai", "consultation", "recommendations", "gemini"],
    icon: "MessageCircle",
    voiceTriggers: ["chat", "talk", "consult", "leverage", "consultation", "advice"],
    phases: [
      { id: "intro", label: "Start", stepIds: ["first-question"] },
      { id: "setup", label: "Setup", stepIds: [] },
      { id: "questioning", label: "Interview", stepIds: ["follow-up-questions", "user-answers"] },
      { id: "analyzing", label: "Analyzing", stepIds: ["analysis"] },
      { id: "complete", label: "Done", stepIds: ["display-results"] },
    ],
    output: {
      name: "recommendations",
      type: "object",
      description:
        "Summary + 2 obvious and 2 non-obvious AI leverage recommendations with tools and impact",
    },
    steps: [
      {
        id: "first-question",
        name: "Ask First Question",
        type: "llm",
        description:
          "Generates the opening question to understand who the user is and what they do.",
        prompt:
          "You are an elite AI strategy consultant. Ask your first warm, conversational question to understand the user's role and industry.",
        userMessage:
          "Start the consultation. Ask your first question to understand who this person is and what they do.",

        inputSchema: [],
        outputSchema: [
          {
            name: "nextQuestion",
            type: "string",
            description: "The question to ask the user",
          },
          {
            name: "done",
            type: "boolean",
            description: "Whether enough context has been gathered",
            example: "false",
          },
        ],
        dependsOn: [],
      },
      {
        id: "follow-up-questions",
        name: "Follow-up Questions (iterative)",
        type: "llm",
        description:
          "For each user answer, evaluates context completeness and generates the next question. Covers: role/industry, daily workflows, pain points, KPIs, tools, team, data. Sets done=true after 5-7 questions.",
        prompt:
          "Given the interview so far, ask the next question OR set done=true if you have enough context for recommendations.",
        userMessage: "User's latest answer + full conversation history",

        inputSchema: [
          {
            name: "conversationHistory",
            type: "array",
            description: "All prior Q&A pairs",
          },
        ],
        outputSchema: [
          {
            name: "nextQuestion",
            type: "string",
            description: "Next interview question (if not done)",
          },
          {
            name: "done",
            type: "boolean",
            description: "True when enough context gathered",
          },
        ],
        dependsOn: ["first-question"],
      },
      {
        id: "user-answers",
        name: "User Answers (voice/text)",
        type: "user-input",
        description:
          "User provides free-text answers via keyboard or voice input. Each answer feeds back into the follow-up question step.",
        inputSchema: [
          {
            name: "question",
            type: "string",
            description: "The current question being answered",
          },
        ],
        outputSchema: [
          {
            name: "answer",
            type: "string",
            description: "The user's free-text response",
          },
        ],
        dependsOn: ["first-question"],
      },
      {
        id: "analysis",
        name: "Generate Recommendations",
        type: "llm",
        description:
          "Analyzes the complete interview transcript and generates 2 obvious + 2 non-obvious AI leverage recommendations, each with title, description, impact, and suggested tools.",
        prompt:
          "Based on the interview transcript, provide exactly 2 obvious and 2 non-obvious AI recommendations specific to the user's workflows.",
        userMessage: "Full interview transcript with all Q&A pairs",

        inputSchema: [
          {
            name: "transcript",
            type: "string",
            description: "Complete Q&A transcript from the interview",
          },
        ],
        outputSchema: [
          {
            name: "summary",
            type: "string",
            description: "2-3 sentence summary of the user's situation",
          },
          {
            name: "obvious",
            type: "array",
            description: "2 obvious AI leverage recommendations",
          },
          {
            name: "nonObvious",
            type: "array",
            description: "2 non-obvious AI leverage recommendations",
          },
        ],
        dependsOn: ["follow-up-questions", "user-answers"],
      },
      {
        id: "display-results",
        name: "Display Recommendations",
        type: "display",
        description:
          "Renders the final consultation results: summary, 2 obvious wins, and 2 hidden opportunities with tool suggestions and impact estimates.",
        inputSchema: [
          {
            name: "recommendations",
            type: "object",
            description: "The analysis result with summary, obvious, and nonObvious arrays",
          },
        ],
        outputSchema: [],
        dependsOn: ["analysis"],
      },
    ],
  },

  // ── Recursive Interviewer ─────────────────────────────────
  {
    id: "recursive-interviewer",
    name: "The Recursive Interviewer",
    description:
      "Choose a topic — career change, product launch, team productivity, or business growth — then have a deep conversation where each question builds on your last answer. The AI digs deeper until it truly understands your situation, then delivers confirmed insights and hidden patterns you haven't considered.",
    version: "1.0.0",
    location: "landing",
    componentPath: "client/src/components/ai-consultation-flow.tsx",
    tags: ["landing", "ai", "strategy", "recursive", "framework", "gemini"],
    icon: "Lightbulb",
    voiceTriggers: ["interviewer", "recursive", "deep dive", "strategy"],
    phases: [
      { id: "intro", label: "Start", stepIds: ["first-question"] },
      { id: "setup", label: "Setup", stepIds: [] },
      { id: "questioning", label: "Interview", stepIds: ["recursive-questions", "user-answers"] },
      { id: "analyzing", label: "Analyzing", stepIds: ["analysis"] },
      { id: "complete", label: "Done", stepIds: ["display-results"] },
    ],
    output: {
      name: "insights",
      type: "object",
      description: "Confirmed insights + hidden patterns from the recursive interview",
    },
    steps: [
      {
        id: "first-question",
        name: "Establish Context",
        type: "llm",
        description: "Opens with a question to understand who the user is and what challenge brought them here.",
        prompt: "Begin the Recursive Interviewer. Establish context.",
        userMessage: "Ask first question: role, domain, challenge/goal.",

        inputSchema: [],
        outputSchema: [{ name: "nextQuestion", type: "string", description: "Opening question" }],
        dependsOn: [],
      },
      {
        id: "recursive-questions",
        name: "Recursive Follow-ups",
        type: "llm",
        description: "Each question references prior answers. Breadth first, then depth. 5-7 total.",
        prompt: "Build recursively on prior answers.",
        userMessage: "Full conversation history",

        inputSchema: [{ name: "history", type: "array", description: "Prior Q&A pairs" }],
        outputSchema: [{ name: "nextQuestion", type: "string", description: "Next interview question" }, { name: "done", type: "boolean", description: "Whether interview is complete" }],
        dependsOn: ["first-question"],
      },
      {
        id: "user-answers",
        name: "User Answers",
        type: "user-input",
        description: "Free-text or voice responses to each interview question.",
        inputSchema: [{ name: "question", type: "string", description: "The current question being answered" }],
        outputSchema: [{ name: "answer", type: "string", description: "The user's free-text response" }],
        dependsOn: ["first-question"],
      },
      {
        id: "analysis",
        name: "Generate Insights",
        type: "llm",
        description: "Delivers 2 confirmed insights and 2 hidden patterns with tools and impact.",
        prompt: "Analyze transcript for confirmed + hidden insights.",
        userMessage: "Full interview transcript",

        inputSchema: [{ name: "transcript", type: "string", description: "Complete interview Q&A transcript" }],
        outputSchema: [{ name: "obvious", type: "array", description: "Primary recommendations" }, { name: "nonObvious", type: "array", description: "Secondary/hidden recommendations" }],
        dependsOn: ["recursive-questions", "user-answers"],
      },
      {
        id: "display-results",
        name: "Display Insights",
        type: "display",
        description: "Renders confirmed insights and hidden patterns with tool recommendations.",
        inputSchema: [{ name: "insights", type: "object", description: "The analysis result" }],
        outputSchema: [],
        dependsOn: ["analysis"],
      },
    ],
  },

  // ── LinkedIn Strategist ───────────────────────────────────
  {
    id: "linkedin-strategist",
    name: "LinkedIn Strategist",
    description:
      "Goal-driven LinkedIn flow: user picks a goal (Improve Profile or Interview Practice), provides their LinkedIn URL, and engages in a dynamic conversation. For Improve mode, generates multiple description options per role. For Interview mode, provides detailed feedback on how the user presents their experience.",
    version: "3.0.0",
    location: "landing",
    componentPath: "client/src/components/linkedin-strategist-flow.tsx",
    tags: ["landing", "career", "linkedin", "profile", "optimization", "gemini"],
    icon: "Briefcase",
    voiceTriggers: ["linkedin", "career", "resume", "profile", "dossier"],
    phases: [
      { id: "intro", label: "Start", stepIds: [] },
      { id: "goal", label: "Goal", stepIds: ["goal-selection"] },
      { id: "setup", label: "Setup", stepIds: ["linkedin-input"] },
      { id: "conversation", label: "Conversation", stepIds: ["conversation", "user-responses"] },
      { id: "analyzing", label: "Analyzing", stepIds: ["generate-results"] },
      { id: "complete", label: "Done", stepIds: ["display-results"] },
    ],
    output: {
      name: "goalDrivenResults",
      type: "object",
      description: "Either updated role descriptions with multiple options (improve) or interview feedback with strengths and insights (interview)",
    },
    steps: [
      {
        id: "goal-selection",
        name: "Pick Your Goal",
        type: "user-input",
        description: "User selects their goal: 'Improve your LinkedIn' (exploratory questions → multiple description options per role) or 'Interview me based on my roles' (dynamic interview → feedback and insights).",
        inputSchema: [
          { name: "goalOptions", type: "array", description: "Available goal options: 'improve' (LinkedIn descriptions) or 'interview' (professional interview feedback)" },
        ],
        outputSchema: [
          { name: "goal", type: "string", description: "'improve' or 'interview'" },
        ],
        dependsOn: [],
      },
      {
        id: "linkedin-input",
        name: "LinkedIn URL Input",
        type: "user-input",
        description: "User provides their LinkedIn profile URL (validated format). URL grounds the conversation in the user's real career data.",
        inputSchema: [
          {
            name: "urlFormat",
            type: "string",
            description: "Expected URL format: linkedin.com/in/<username> — validated before submission",
          },
        ],
        outputSchema: [
          { name: "linkedinUrl", type: "string", description: "Validated linkedin.com/in/ URL" },
        ],
        dependsOn: ["goal-selection"],
      },
      {
        id: "conversation",
        name: "Dynamic Conversation",
        type: "llm",
        description: "Multi-turn conversation adapted to the selected goal. For 'improve': asks exploratory questions about roles and achievements, discovers roles, takes notes. For 'interview': conducts a dynamic professional interview based on the user's roles. The LLM tracks discovered roles and signals when conversation is complete.",
        prompt: "Conduct a goal-adapted conversation: explore roles for improvement or conduct a professional interview.",
        userMessage: "User's responses to conversational questions",

        inputSchema: [
          { name: "goal", type: "string", description: "The user's selected goal" },
          { name: "linkedinUrl", type: "string", description: "The user's LinkedIn URL" },
        ],
        outputSchema: [
          { name: "message", type: "string", description: "LLM's question or response" },
          { name: "done", type: "boolean", description: "Whether conversation is complete" },
          { name: "rolesDiscovered", type: "array", description: "Cumulative list of discovered roles" },
        ],
        dependsOn: ["linkedin-input"],
      },
      {
        id: "user-responses",
        name: "User Conversation Responses",
        type: "user-input",
        description: "User provides free-text or voice answers during the multi-turn conversation.",
        inputSchema: [
          { name: "message", type: "string", description: "The current question from the LLM" },
        ],
        outputSchema: [
          { name: "answer", type: "string", description: "User's response" },
        ],
        dependsOn: ["conversation"],
      },
      {
        id: "generate-results",
        name: "Generate Results",
        type: "llm",
        description: "For 'improve' goal: generates 2-3 description options per discovered role (impact-focused, leadership-focused, technical depth). For 'interview' goal: generates interview feedback with summary, strengths, areas to explore, and role-specific insights.",
        prompt: "Generate goal-appropriate results from the conversation: description options (improve) or interview feedback (interview).",
        userMessage: "Conversation transcript + discovered roles + goal",

        inputSchema: [
          { name: "goal", type: "string", description: "The user's selected goal" },
          { name: "conversationTranscript", type: "string", description: "Full conversation history" },
          { name: "rolesDiscovered", type: "array", description: "All discovered roles with notes" },
        ],
        outputSchema: [
          { name: "roles", type: "array", description: "Role recommendations with options (improve mode)" },
          { name: "interviewFeedback", type: "object", description: "Interview summary and insights (interview mode)" },
        ],
        dependsOn: ["conversation", "user-responses"],
      },
      {
        id: "display-results",
        name: "Display Results",
        type: "display",
        description: "For 'improve': renders role cards with selectable description options, copy buttons, and key highlights. For 'interview': renders feedback summary, strengths, areas to explore, and role-specific insights with a copy-all button.",
        inputSchema: [
          { name: "results", type: "object", description: "Goal-appropriate results to display" },
        ],
        outputSchema: [],
        dependsOn: ["generate-results"],
      },
    ],
  },

  // ── Socratic Architect ────────────────────────────────────
  {
    id: "socratic-architect",
    name: "The Socratic Architect",
    description:
      "Pick a ready-made expert (business coach, career advisor, writing coach, tech strategist, or wellness coach) or design your own. The AI becomes your chosen specialist, interviews you with targeted questions, and delivers custom findings — both the expected insights and the surprising ones.",
    version: "1.0.0",
    location: "landing",
    componentPath: "client/src/components/ai-consultation-flow.tsx",
    tags: ["landing", "socratic", "configurable", "template", "interview", "gemini"],
    icon: "GraduationCap",
    voiceTriggers: ["socratic", "architect", "custom", "configure", "expert"],
    phases: [
      { id: "intro", label: "Start", stepIds: ["setup"] },
      { id: "setup", label: "Setup", stepIds: ["first-question"] },
      { id: "questioning", label: "Interview", stepIds: ["socratic-questions", "user-answers"] },
      { id: "analyzing", label: "Analyzing", stepIds: ["analysis"] },
      { id: "complete", label: "Done", stepIds: ["display-results"] },
    ],
    output: {
      name: "findings",
      type: "object",
      description: "Customized findings based on user-defined output requirements",
    },
    steps: [
      {
        id: "setup",
        name: "Configure Expert",
        type: "user-input",
        description: "User fills in: Expert Role, Goal, Desired Output. These values are interpolated into the system prompt.",
        inputSchema: [
          { name: "expertise", type: "string", description: "Prompt for expert role selection" },
          { name: "goal", type: "string", description: "Prompt for goal definition" },
          { name: "output", type: "string", description: "Prompt for desired output format" },
        ],
        outputSchema: [
          { name: "expertise", type: "string", description: "The expert role" },
          { name: "goal", type: "string", description: "What the user wants to achieve" },
          { name: "output", type: "string", description: "Desired output format" },
        ],
        dependsOn: [],
      },
      {
        id: "first-question",
        name: "Socratic Opening",
        type: "llm",
        description: "First question from the configured expert persona.",
        prompt: "Dynamic — built from setup values.",
        userMessage: "Begin the Socratic interview.",

        inputSchema: [{ name: "setupValues", type: "object", description: "User-configured expertise, goal, output" }],
        outputSchema: [{ name: "nextQuestion", type: "string", description: "Opening interview question" }],
        dependsOn: ["setup"],
      },
      {
        id: "socratic-questions",
        name: "Recursive Socratic Questions",
        type: "llm",
        description: "Each question builds on prior answers. Expert judges when context is complete.",
        prompt: "Dynamic — built from setup values.",
        userMessage: "Conversation history",

        inputSchema: [{ name: "history", type: "array", description: "Prior Q&A pairs" }],
        outputSchema: [{ name: "nextQuestion", type: "string", description: "Next interview question" }, { name: "done", type: "boolean", description: "Whether interview is complete" }],
        dependsOn: ["first-question"],
      },
      {
        id: "user-answers",
        name: "User Responses",
        type: "user-input",
        description: "Free-text or voice answers to Socratic questions.",
        inputSchema: [{ name: "question", type: "string", description: "The current question being answered" }],
        outputSchema: [{ name: "answer", type: "string", description: "The user's free-text response" }],
        dependsOn: ["first-question"],
      },
      {
        id: "analysis",
        name: "Generate Custom Findings",
        type: "llm",
        description: "Delivers findings structured as 2 obvious + 2 non-obvious based on the user-defined output requirement.",
        prompt: "Dynamic — built from setup values.",
        userMessage: "Full interview transcript",

        inputSchema: [{ name: "transcript", type: "string", description: "Complete interview Q&A transcript" }],
        outputSchema: [{ name: "obvious", type: "array", description: "Primary recommendations" }, { name: "nonObvious", type: "array", description: "Secondary/hidden recommendations" }],
        dependsOn: ["socratic-questions", "user-answers"],
      },
      {
        id: "display-results",
        name: "Display Findings",
        type: "display",
        description: "Renders the customized findings.",
        inputSchema: [{ name: "findings", type: "object", description: "Customized findings result" }],
        outputSchema: [],
        dependsOn: ["analysis"],
      },
    ],
  },
];

/** Validated registry — only flows passing ARCH-005 invariants */
export const flowRegistry: FlowDefinition[] = validateRegistry(allFlows);

/** All active flows available on the landing page */
export const activeFlowIds = new Set([
  "bilko-main",
  "video-discovery",
  "test-newsletter",
  "weekly-football-video",
  "ai-clip",
  "work-with-me",
  "ai-consultation",
  "recursive-interviewer",
  "linkedin-strategist",
  "socratic-architect",
]);

export function getFlowById(id: string): FlowDefinition | undefined {
  return flowRegistry.find((f) => f.id === id);
}
