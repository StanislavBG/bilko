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
  // ── Work With Me — Guided web task assistant ─────────────
  {
    id: "work-with-me",
    name: "Work With Me",
    description:
      "Tell the agent your objective (e.g. 'register a business in WA') and it finds every step, then wireframes each website inside the app so the agent can see through your eyes and guide you with element-level overlays — every recommendation justified.",
    version: "1.0.0",
    location: "landing",
    componentPath: "client/src/components/work-with-me-flow.tsx",
    tags: ["landing", "guidance", "web", "assistant", "wireframe", "gemini"],
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
        inputSchema: [],
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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


  {
    id: "video-discovery",
    name: "Video Discovery",
    description:
      "Pick a topic, ask a question, and discover real YouTube videos — powered by YouTube Data API search, not AI-hallucinated links.",
    version: "3.0.0",
    location: "landing",
    componentPath: "client/src/components/video-discovery-flow.tsx",
    tags: ["landing", "learning", "video", "youtube", "gemini"],
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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
