/**
 * Flow Registry
 *
 * All inspectable PER-002 flows are registered here.
 * Each entry describes the flow's steps, prompts, and I/O schemas.
 */

import type { FlowDefinition } from "./types";

export const flowRegistry: FlowDefinition[] = [
  {
    id: "video-discovery",
    name: "AI Video Discovery",
    description:
      "Researches trending AI topics, pre-fetches YouTube videos for each topic in parallel, and lets the user pick a video to watch.",
    version: "2.0.0",
    location: "landing",
    componentPath: "client/src/components/video-discovery-flow.tsx",
    tags: ["landing", "ai", "video", "youtube", "gemini"],
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
];

export function getFlowById(id: string): FlowDefinition | undefined {
  return flowRegistry.find((f) => f.id === id);
}
