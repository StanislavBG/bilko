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
      "Pick your field (marketing, tech, small business, education, or healthcare) and an AI expert asks simple questions about your daily work. You'll get 2 quick wins you can start using right away, plus 2 surprising AI opportunities you probably haven't thought of — with specific tool recommendations.",
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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

  // ── LinkedIn Strategist — LinkedIn-grounded profile optimizer ─
  {
    id: "linkedin-strategist",
    name: "LinkedIn Profile Optimizer",
    description:
      "LinkedIn-grounded flow that requires a real profile URL, parses roles/experiences from pasted profile data, lets the user select which roles to improve, conducts targeted per-role interviews, and generates updated role descriptions in copyable panes.",
    version: "2.0.0",
    location: "landing",
    componentPath: "client/src/components/linkedin-strategist-flow.tsx",
    tags: ["landing", "career", "linkedin", "profile", "optimization", "gemini"],
    output: {
      name: "updatedRoleDescriptions",
      type: "object",
      description: "Updated LinkedIn role descriptions with key highlights, ready to copy",
    },
    steps: [
      {
        id: "linkedin-input",
        name: "LinkedIn URL & Profile Input",
        type: "user-input",
        description: "User provides their LinkedIn profile URL (validated format) and pastes their Experience section text. URL is required — without real LinkedIn data the flow cannot produce grounded results.",
        inputSchema: [],
        outputSchema: [
          { name: "linkedinUrl", type: "string", description: "Validated linkedin.com/in/ URL" },
          { name: "profileText", type: "string", description: "Pasted Experience section text" },
        ],
        dependsOn: [],
      },
      {
        id: "parse-roles",
        name: "Parse LinkedIn Roles",
        type: "llm",
        description: "Extracts all professional roles from the pasted profile text. Returns structured data: title, company, duration, description, isCurrent for each role.",
        prompt: "Parse LinkedIn profile text into structured roles with title, company, duration, description, and isCurrent flag.",
        userMessage: "LinkedIn URL + pasted profile content",
        model: "gemini-2.5-flash",
        inputSchema: [
          { name: "linkedinUrl", type: "string", description: "The user's LinkedIn URL" },
          { name: "profileText", type: "string", description: "Pasted profile content" },
        ],
        outputSchema: [
          { name: "roles", type: "array", description: "Array of structured role objects" },
          { name: "profileSummary", type: "string", description: "Career trajectory summary" },
        ],
        dependsOn: ["linkedin-input"],
      },
      {
        id: "role-selection",
        name: "User Selects Roles",
        type: "user-input",
        description: "Displays all parsed roles with checkboxes. User selects which roles they want to improve. Shows existing description (or marks as empty).",
        inputSchema: [
          { name: "roles", type: "array", description: "All parsed roles from the profile" },
        ],
        outputSchema: [
          { name: "selectedRoleIds", type: "array", description: "IDs of roles the user wants to work on" },
        ],
        dependsOn: ["parse-roles"],
      },
      {
        id: "role-interview",
        name: "Targeted Role Interview",
        type: "llm",
        description: "For each selected role, conducts a 2-3 question interview to uncover specific achievements, metrics, invisible responsibilities, and impact. Questions are tailored to the role context and career trajectory.",
        prompt: "Interview the user about a specific LinkedIn role to extract impactful details for description rewriting.",
        userMessage: "Role details + career context + user answers",
        model: "gemini-2.5-flash",
        inputSchema: [
          { name: "role", type: "object", description: "The role being discussed" },
          { name: "allRoles", type: "array", description: "Full career context" },
          { name: "answers", type: "array", description: "Prior Q&A for this role" },
        ],
        outputSchema: [
          { name: "nextQuestion", type: "string", description: "Next targeted question" },
          { name: "done", type: "boolean", description: "Whether enough detail gathered for this role" },
        ],
        dependsOn: ["role-selection"],
      },
      {
        id: "user-interview-answers",
        name: "User Interview Responses",
        type: "user-input",
        description: "User provides free-text or voice answers to targeted role questions.",
        inputSchema: [
          { name: "question", type: "string", description: "The current interview question" },
          { name: "roleContext", type: "object", description: "Which role is being discussed" },
        ],
        outputSchema: [
          { name: "answer", type: "string", description: "User's response" },
        ],
        dependsOn: ["role-interview"],
      },
      {
        id: "generate-descriptions",
        name: "Generate Updated Descriptions",
        type: "llm",
        description: "For each selected role, combines original LinkedIn data with interview insights to craft an updated description. Produces professional prose (not bullets) with metrics and impact statements, plus key highlights.",
        prompt: "Using LinkedIn profile data and interview insights, generate an impactful updated role description.",
        userMessage: "Role details + interview transcript + LinkedIn URL",
        model: "gemini-2.5-flash",
        inputSchema: [
          { name: "role", type: "object", description: "The role to rewrite" },
          { name: "interviews", type: "array", description: "All Q&A for this role" },
          { name: "linkedinUrl", type: "string", description: "Profile URL for reference" },
        ],
        outputSchema: [
          { name: "updatedDescription", type: "string", description: "Rewritten LinkedIn description" },
          { name: "keyHighlights", type: "array", description: "3-5 key achievement one-liners" },
        ],
        dependsOn: ["role-interview", "user-interview-answers"],
      },
      {
        id: "display-results",
        name: "Display Updated Descriptions",
        type: "display",
        description: "Renders each updated role description in a separate styled pane with a one-click copy button. Includes role header (title, company, duration), the rewritten description, key highlights, and a copy-all option.",
        inputSchema: [
          { name: "updatedRoles", type: "array", description: "Array of updated role descriptions with highlights" },
        ],
        outputSchema: [],
        dependsOn: ["generate-descriptions"],
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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

export function getFlowById(id: string): FlowDefinition | undefined {
  return flowRegistry.find((f) => f.id === id);
}
