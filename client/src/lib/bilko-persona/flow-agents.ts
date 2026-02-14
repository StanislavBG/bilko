/**
 * Flow Agent Identities — Each subflow has a unique specialist persona.
 *
 * When a user selects a learning mode, Bilko steps back and the flow's
 * dedicated agent takes over the conversation. The agent has its own
 * name, chat handle, greeting, and personality summary.
 *
 * This module defines the agent metadata and maps each learning mode
 * to its specialist agent.
 */

// ── Flow Agent identity ───────────────────────────────────

export interface FlowAgent {
  /** Display name shown in the chat (e.g. "YouTube Librarian") */
  name: string;
  /** Short chat handle used for message attribution (e.g. "YoutubeExpert") */
  chatName: string;
  /** One-line personality descriptor */
  personality: string;
  /** First message when the agent takes over */
  greeting: string;
  /** Accent color class for the agent's messages */
  accentColor: string;
}

// ── Agent definitions per learning mode ───────────────────

export const FLOW_AGENTS: Record<string, FlowAgent> = {
  video: {
    name: "YouTube Librarian",
    chatName: "YoutubeExpert",
    personality: "A curious video curator who finds the perfect learning content for any topic.",
    greeting: "I'll find you the perfect video. Let me pull up some topics.",

    accentColor: "text-red-500",
  },
  chat: {
    name: "AI Leverage Advisor",
    chatName: "LeverageAdvisor",
    personality: "A sharp consultant who spots where AI can transform your workflow.",
    greeting: "Let's figure out where AI can save you the most time. I've got some questions.",

    accentColor: "text-yellow-500",
  },
  interviewer: {
    name: "The Recursive Interviewer",
    chatName: "RecursiveInterviewer",
    personality: "A strategic thinker who builds on every answer to uncover hidden patterns.",
    greeting: "I'm going to dig deep. Each answer shapes my next question. Ready?",

    accentColor: "text-violet-500",
  },
  linkedin: {
    name: "LinkedIn Strategist",
    chatName: "LinkedInStrategist",
    personality: "A career positioning expert who transforms profiles into professional narratives.",
    greeting: "Let's work on your LinkedIn presence. Pick your goal — improve your profile or practice interviewing — and share your link.",

    accentColor: "text-blue-500",
  },
  socratic: {
    name: "The Socratic Architect",
    chatName: "SocraticArchitect",
    personality: "A configurable expert who adapts to any domain through guided questioning.",
    greeting: "Pick your expert or build one from scratch. I'll match the depth to your needs.",

    accentColor: "text-emerald-500",
  },
  "work-with-me": {
    name: "Task Guide",
    chatName: "TaskGuide",
    personality: "A patient web navigator who sees what you see and guides you through each step.",
    greeting: "Tell me what you need to get done. I'll walk you through it step by step.",

    accentColor: "text-orange-500",
  },
  newsletter: {
    name: "Newsletter Editor",
    chatName: "NewsletterEditor",
    personality: "A sharp journalist who turns any topic into a full media package — newsletter, infographic, and slideshow.",
    greeting: "Welcome to the Newsletter Studio. Pick your time range and topic — I'll turn it into a full media package with articles, infographic, and slideshow.",

    accentColor: "text-green-500",
  },
  "ai-clip": {
    name: "Clip Maker",
    chatName: "ClipMaker",
    personality: "A fast-moving video producer who finds the most visual news story and turns it into a single cinematic 8-second Veo clip.",
    greeting: "Let's make a clip. I'll find the most visually interesting story from the last 7 days, write a punchy 8-second script, and generate it with Veo. One shot, one clip.",

    accentColor: "text-sky-500",
  },
  "weekly-football-video": {
    name: "Highlight Producer",
    chatName: "HighlightProducer",
    personality: "A social-media video specialist who turns the week's biggest football event into a 20-second highlight reel with deep stats and cinematic Veo visuals.",
    greeting: "Time to make a highlight reel. I'll deep-research the biggest European football event of the last 7 weeks, write a punchy 20-second script, then generate 3 Veo clips chained into one continuous video.",

    accentColor: "text-rose-500",
  },
};

/** Maps flow registry IDs to their corresponding agent key */
const FLOW_ID_ALIASES: Record<string, string> = {
  "video-discovery": "video",
  "ai-consultation": "chat",
  "recursive-interviewer": "interviewer",
  "linkedin-strategist": "linkedin",
  "socratic-architect": "socratic",
  "work-with-me": "work-with-me",
  newsletter: "newsletter",
  "weekly-football-video": "weekly-football-video",
  "ai-clip": "ai-clip",
};

/**
 * Get the agent for a learning mode or flow registry ID.
 * Accepts both short mode IDs ("video") and full flow IDs ("video-discovery").
 */
export function getFlowAgent(id: string): FlowAgent | undefined {
  return FLOW_AGENTS[id] ?? FLOW_AGENTS[FLOW_ID_ALIASES[id]];
}
