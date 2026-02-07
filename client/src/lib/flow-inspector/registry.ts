/**
 * Flow Registry
 *
 * All inspectable PER-002 flows are registered here.
 * Each entry describes the flow's steps, prompts, and I/O schemas.
 *
 * Validated at import time by ARCH-005 steel frame validator.
 * Invalid flows are logged and excluded.
 */

import type { FlowDefinition } from "./types";
import { validateRegistry } from "./validate";

const allFlows: FlowDefinition[] = [
  {
    id: "video-discovery",
    name: "AI Video Discovery",
    description:
      "Researches trending AI topics, pre-fetches YouTube videos for each topic in parallel, and lets the user pick a video to watch.",
    version: "2.0.0",
    location: "landing",
    componentPath: "client/src/components/video-discovery-flow.tsx",
    tags: ["landing", "ai", "video", "youtube", "gemini"],
    output: {
      name: "selectedVideo",
      type: "object",
      description: "The YouTube video the user chose to watch, with embed ID, metadata, and engagement stats",
    },
    steps: [
      {
        id: "research-topics",
        name: "Research AI Trends",
        type: "llm",
        description:
          "Asks Gemini to generate 5 trending AI topics suitable for beginners. Returns structured JSON with rank, title, description, and a beginner question for each topic.",
        prompt: `You are an AI education expert. Generate exactly 5 trending AI topics that would be interesting for beginners.

Return ONLY valid JSON. Keep descriptions VERY short (max 10 words each). Example:
{"topics":[{"rank":1,"title":"AI Agents","description":"AI that acts on your behalf","beginnerQuestion":"How do AI agents work?"}]}

Rules: title max 5 words, description max 10 words, beginnerQuestion max 12 words. No markdown, no explanation, ONLY the JSON object.`,
        userMessage:
          "What are the 5 most interesting AI topics trending in the last 6 months that a beginner should learn about?",
        model: "gemini-2.5-flash",
        inputSchema: [],
        outputSchema: [
          {
            name: "topics",
            type: "array",
            description: "Array of 5 trending AI topics",
            example: '[{"rank":1,"title":"AI Agents","description":"AI that acts on your behalf","beginnerQuestion":"How do AI agents work?"}]',
          },
        ],
        dependsOn: [],
      },
      {
        id: "prefetch-videos",
        name: "Pre-fetch Videos (parallel)",
        type: "llm",
        description:
          "For each of the 5 topics, fires a parallel LLM call to find 3 real YouTube videos. Results are cached by topic title. Runs concurrently for all topics.",
        prompt: `You are a YouTube video researcher. Find 3 real YouTube videos about "{topic.title}" for beginners.

Return ONLY valid JSON. Example:
{"videos":[{"title":"Video Title","creator":"Channel","description":"Short desc","url":"https://www.youtube.com/watch?v=ID","embedId":"ID","whyRecommended":"Why good for beginners","views":"1.2M","likes":"45K","comments":"2.3K"}]}

Rules:
- Use REAL YouTube videos from known AI education channels (3Blue1Brown, Fireship, Two Minute Papers, Andrej Karpathy, Computerphile, Yannic Kilcher, etc.)
- Rank by engagement: views > likes > comments
- Keep description under 15 words
- Keep whyRecommended under 15 words
- Return exactly 3 videos, ordered best first
- No markdown, ONLY the JSON object`,
        userMessage:
          'Find 3 best YouTube videos for a beginner about: "{topic.title}" - {topic.description}',
        model: "gemini-2.5-flash",
        inputSchema: [
          {
            name: "topic",
            type: "object",
            description: "The AI topic to search videos for",
            example: '{"title":"AI Agents","description":"AI that acts on your behalf"}',
          },
        ],
        outputSchema: [
          {
            name: "videos",
            type: "array",
            description: "Array of 3 YouTube video results",
            example: '[{"title":"...","creator":"...","embedId":"...","views":"1.2M"}]',
          },
        ],
        dependsOn: ["research-topics"],
        parallel: true,
      },
      {
        id: "validate-videos",
        name: "Validate YouTube Videos",
        type: "validate",
        description:
          "Checks each video's embed ID against YouTube's oEmbed endpoint to filter out hallucinated or unavailable videos. Server-side via POST /api/llm/validate-videos.",
        inputSchema: [
          {
            name: "videos",
            type: "array",
            description: "Candidate videos to validate",
          },
        ],
        outputSchema: [
          {
            name: "videos",
            type: "array",
            description: "Only videos confirmed available on YouTube",
          },
        ],
        dependsOn: ["prefetch-videos"],
      },
      {
        id: "select-topic",
        name: "User Picks Topic",
        type: "user-input",
        description:
          "Displays 5 topic cards in a horizontal grid. Each card shows a loading spinner or green check based on video pre-fetch status. User clicks to select.",
        inputSchema: [
          {
            name: "topics",
            type: "array",
            description: "The 5 researched topics",
          },
          {
            name: "videoCacheStatus",
            type: "object",
            description: "Loading status per topic: loading | done | error",
          },
        ],
        outputSchema: [
          {
            name: "selectedTopic",
            type: "object",
            description: "The topic the user picked",
          },
        ],
        dependsOn: ["research-topics"],
      },
      {
        id: "select-video",
        name: "User Picks Video",
        type: "user-input",
        description:
          "Shows up to 3 validated videos ranked by engagement. User clicks to watch. Includes views, likes, comments, and a 'Top Pick' badge for #1.",
        inputSchema: [
          {
            name: "videos",
            type: "array",
            description: "Pre-fetched and validated videos for the selected topic",
          },
        ],
        outputSchema: [
          {
            name: "selectedVideo",
            type: "object",
            description: "The video the user chose to watch",
          },
        ],
        dependsOn: ["select-topic", "validate-videos"],
      },
      {
        id: "play-video",
        name: "Play Video",
        type: "display",
        description:
          "Embeds the selected YouTube video with autoplay. Shows creator badge, YouTube link, description, engagement stats, and recommendation rationale.",
        inputSchema: [
          {
            name: "selectedVideo",
            type: "object",
            description: "The chosen video with embedId, title, creator, etc.",
          },
        ],
        outputSchema: [],
        dependsOn: ["select-video"],
      },
    ],
  },

  // ── AI Leverage Consultation ──────────────────────────────
  {
    id: "ai-consultation",
    name: "AI Leverage Consultation",
    description:
      "Multi-turn interview flow where an AI expert asks questions about the user's work, then delivers 2 obvious and 2 non-obvious AI leverage recommendations.",
    version: "1.0.0",
    location: "landing",
    componentPath: "client/src/components/ai-consultation-flow.tsx",
    tags: ["landing", "ai", "consultation", "recommendations", "gemini"],
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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
];

/** Validated registry — only flows passing ARCH-005 invariants */
export const flowRegistry: FlowDefinition[] = validateRegistry(allFlows);

export function getFlowById(id: string): FlowDefinition | undefined {
  return flowRegistry.find((f) => f.id === id);
}
