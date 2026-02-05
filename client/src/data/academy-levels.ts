export interface Quest {
  id: string;
  title: string;
  platform: string;
  description: string;
}

export interface SubTopic {
  id: string;
  title: string;
  description: string;
  keyTechniques: string[];
  platforms: string[];
}

export interface AcademyLevel {
  id: string;
  levelRange: string;
  rank: string;
  coreSkill: string;
  skillSummary: string;
  lesson: string;
  keyPrinciples: string[];
  quests: Quest[];
  subTopics?: SubTopic[];
  order: number;
}

export const academyLevels: AcademyLevel[] = [
  {
    id: "level-0",
    levelRange: "0-10",
    rank: "The Drifter",
    coreSkill: "UI Manifestation",
    skillSummary: "Prompting full apps via natural language.",
    lesson: `UI Manifestation is the art of translating ideas into functional interfaces using only natural language. Modern AI-powered tools have democratized app development—you no longer need to write code to build working software.

The key insight is that these tools understand intent, not just instructions. Instead of describing every button and field, describe what you want to accomplish. "A landing page for a productivity app with a waitlist" yields better results than "a page with a header, three feature cards, and a form."

Start simple. Every complex app is just a collection of simple patterns: forms that collect data, lists that display it, and buttons that trigger actions. Master these building blocks and you can construct anything.

The platforms differ in their strengths: Bolt.new excels at full-stack apps with backends, v0.dev produces polished UI components, Lovable focuses on beautiful design, and Replit offers the most flexibility for customization. Choose based on your end goal.`,
    keyPrinciples: [
      "Describe outcomes, not implementations",
      "Start with a minimal viable interface",
      "Iterate in small increments",
      "Use reference examples when possible",
      "Test with real users early",
    ],
    quests: [
      {
        id: "q0-1",
        title: "5-Minute Landing Page",
        platform: "Bolt.new",
        description:
          "Create a SaaS landing page with hero section, three feature cards, and a working email waitlist form that stores submissions.",
      },
      {
        id: "q0-2",
        title: "Component Library Starter",
        platform: "v0.dev",
        description:
          "Generate a set of 5 reusable UI components: a pricing card, testimonial block, feature comparison table, CTA banner, and footer.",
      },
      {
        id: "q0-3",
        title: "Personal Portfolio",
        platform: "Lovable",
        description:
          "Build a personal portfolio site with an about section, project gallery with filtering, and contact form. Deploy to a live URL.",
      },
      {
        id: "q0-4",
        title: "Internal Tool Dashboard",
        platform: "Replit",
        description:
          "Create an internal dashboard that displays mock analytics data with charts, a data table with search/filter, and export to CSV functionality.",
      },
    ],
    order: 0,
  },
  {
    id: "level-1",
    levelRange: "11-20",
    rank: "The Scavenger",
    coreSkill: "Linear Automation",
    skillSummary: "Eliminating manual grunt work via triggers.",
    lesson: `Linear Automation is about identifying repetitive tasks and replacing them with trigger-based workflows. The philosophy is simple: if you do something more than twice, automate it.

A linear automation follows a predictable path: trigger → action → result. When X happens, do Y. The power comes from chaining these simple steps. When a form is submitted → send to Slack → add to spreadsheet → send confirmation email.

The hardest part isn't building the automation—it's recognizing what should be automated. Keep a "friction journal" for one week. Every time you do something manually that feels repetitive, write it down. That list is your automation roadmap.

Start with low-stakes automations. Notifications, data syncing, simple transformations. As you build confidence, move to automations that take actions on your behalf. The goal is to become the architect of systems, not the operator of tasks.

Tools like n8n, Make (Integromat), and Zapier each have tradeoffs. Zapier is simplest but most limited. Make offers visual complexity. n8n provides maximum control and self-hosting. Choose based on your technical comfort and control requirements.`,
    keyPrinciples: [
      "Automate observation before action",
      "Build idempotent workflows (safe to run twice)",
      "Log everything for debugging",
      "Start with notifications, graduate to actions",
      "Test with real data in staging first",
    ],
    quests: [
      {
        id: "q1-1",
        title: "YouTube to LinkedIn Pipeline",
        platform: "n8n",
        description:
          "Build a workflow that monitors a YouTube channel RSS feed, summarizes new videos using an LLM, and posts the summary as a LinkedIn post with the video link.",
      },
      {
        id: "q1-2",
        title: "Email to Task Converter",
        platform: "Make",
        description:
          "Create an automation that monitors a specific Gmail label, extracts action items using AI, and creates corresponding tasks in Notion or Todoist.",
      },
      {
        id: "q1-3",
        title: "Social Listening Alert",
        platform: "Zapier",
        description:
          "Set up a workflow that monitors Twitter/X mentions of your brand, analyzes sentiment, and sends a Slack alert for negative mentions requiring response.",
      },
      {
        id: "q1-4",
        title: "Content Repurposing Chain",
        platform: "n8n",
        description:
          "Build a pipeline that takes a blog post URL, generates 5 tweet variations, 1 LinkedIn post, and 3 email subject lines, storing all outputs in Airtable.",
      },
      {
        id: "q1-5",
        title: "Invoice Processing Bot",
        platform: "Make",
        description:
          "Create a workflow that watches a Gmail inbox for invoices, extracts vendor, amount, and due date using AI, and adds them to a Google Sheet with auto-categorization.",
      },
    ],
    order: 1,
  },
  {
    id: "level-2",
    levelRange: "21-30",
    rank: "The Prompt Smith",
    coreSkill: "Structured Output & Prompting Mastery",
    skillSummary: "Forcing AI to produce reliable, formatted outputs.",
    lesson: `The Prompt Smith understands that AI output quality is directly proportional to input quality. Prompting is not about finding magic words—it's about clear communication, context setting, and constraint definition.

Every prompt has anatomy: Role (who the AI should be), Context (what it needs to know), Task (what to do), Format (how to structure output), and Constraints (what to avoid). Master this structure and you control the output.

Structured output is the bridge between AI and automation. When you need an LLM to produce JSON, XML, or specific formats, you must be explicit. Show examples. Define schemas. Validate outputs. Never trust that the AI will "figure it out."

Different modalities require different approaches. Text prompting rewards specificity and examples. Image prompting is about visual vocabulary and style references. Video prompting requires understanding of motion, timing, and continuity. Audio prompting needs attention to tone, pacing, and emotional context.

The meta-skill is prompt debugging. When output is wrong, the prompt is wrong. Learn to read failures as feedback. Too generic? Add specificity. Wrong format? Show an example. Missing context? Provide background.`,
    keyPrinciples: [
      "Show, don't just tell (use examples)",
      "Define output format explicitly",
      "Provide relevant context, not everything",
      "Use system prompts for persistent behavior",
      "Iterate prompts like code—version and test",
    ],
    subTopics: [
      {
        id: "st2-text",
        title: "Text Prompting",
        description:
          "Techniques for generating high-quality written content, code, and structured data from language models.",
        keyTechniques: [
          "Few-shot prompting: Provide 2-3 examples of desired input/output pairs",
          "Chain-of-thought: Ask the model to show its reasoning step-by-step",
          "Role prompting: Assign a specific persona (You are a senior tax accountant...)",
          "Output templating: Define exact structure with placeholders",
          "Negative prompting: Explicitly state what NOT to include",
          "Temperature control: Lower for factual, higher for creative",
        ],
        platforms: ["ChatGPT", "Claude", "Gemini", "Llama", "Mistral"],
      },
      {
        id: "st2-image",
        title: "Image Prompting",
        description:
          "Creating visual content through text descriptions, style references, and compositional guidance.",
        keyTechniques: [
          "Subject + Style + Mood: 'A cyberpunk street market, oil painting style, moody lighting'",
          "Aspect ratio specification: --ar 16:9 or explicit dimensions",
          "Style references: 'in the style of Studio Ghibli' or 'like a 1980s movie poster'",
          "Negative prompts: --no text, blurry, distorted hands",
          "Seed consistency: Use same seed for variations on a theme",
          "Weight parameters: (subject:1.2) to emphasize elements",
        ],
        platforms: [
          "Midjourney",
          "DALL-E 3",
          "Stable Diffusion",
          "Ideogram",
          "Leonardo.ai",
        ],
      },
      {
        id: "st2-video",
        title: "Video Prompting",
        description:
          "Generating motion content with attention to continuity, camera movement, and temporal coherence.",
        keyTechniques: [
          "Camera motion: 'slow dolly forward', 'tracking shot left to right'",
          "Temporal description: 'begins with..., then transitions to..., ends with...'",
          "Motion intensity: 'subtle movement', 'dynamic action', 'static scene'",
          "Style consistency: Reference specific film styles or directors",
          "Loop-friendly endings: 'seamlessly loops back to starting position'",
          "Duration pacing: Break longer concepts into scene segments",
        ],
        platforms: ["Runway Gen-3", "Pika Labs", "Kling", "Sora", "Luma Dream Machine"],
      },
      {
        id: "st2-audio",
        title: "Audio Prompting",
        description:
          "Generating speech, music, and sound effects with control over tone, emotion, and acoustic properties.",
        keyTechniques: [
          "Voice characteristics: 'warm, friendly female voice with slight British accent'",
          "Emotional direction: 'speak with excitement building to a climax'",
          "Pacing control: 'slow and deliberate with pauses for emphasis'",
          "Music mood: 'upbeat electronic, 120 BPM, building energy'",
          "Sound design: 'cinematic whoosh transitioning to ambient forest'",
          "SSML markup: Use tags for precise pronunciation and timing control",
        ],
        platforms: [
          "ElevenLabs",
          "Suno",
          "Udio",
          "Play.ht",
          "Murf.ai",
        ],
      },
    ],
    quests: [
      {
        id: "q2-1",
        title: "Data Sanitizer",
        platform: "n8n + OpenAI",
        description:
          "Create a workflow that takes messy email receipts, extracts vendor, date, items, and total into clean JSON, and stores in Airtable. Must handle 5 different receipt formats reliably.",
      },
      {
        id: "q2-2",
        title: "Brand Image Generator",
        platform: "Midjourney",
        description:
          "Develop a prompt template system that generates consistent brand imagery. Create 10 images for a fictional brand that maintain style, color palette, and mood consistency.",
      },
      {
        id: "q2-3",
        title: "Product Demo Video",
        platform: "Runway",
        description:
          "Generate a 30-second product showcase video using AI. Must include: product reveal, feature highlights with motion, and call-to-action ending. No jarring transitions.",
      },
      {
        id: "q2-4",
        title: "Podcast Intro Generator",
        platform: "ElevenLabs",
        description:
          "Create a system that generates custom podcast intros. Input: show name, host name, episode topic. Output: 15-second voiced intro with consistent energy and pacing.",
      },
      {
        id: "q2-5",
        title: "Multi-Format Content Transformer",
        platform: "Claude API",
        description:
          "Build an API endpoint that takes any blog post and outputs: SEO meta description, 3 tweet threads, 1 LinkedIn post, and email newsletter intro—all in consistent brand voice with JSON structure.",
      },
    ],
    order: 2,
  },
  {
    id: "level-3",
    levelRange: "31-40",
    rank: "The Harvester",
    coreSkill: "Data Extraction",
    skillSummary: "Scraping the web for personal datasets.",
    lesson: `The Harvester sees the web as a vast, unstructured database waiting to be queried. Data extraction is the skill of turning public information into private advantage.

Traditional scraping is brittle—HTML changes break everything. AI-powered extraction is semantic. Instead of parsing DOM elements, you describe what you want: "Extract the product name, price, and review count from this page." The AI finds it regardless of structure.

The ethical framework matters. Scrape public data. Respect robots.txt. Don't hammer servers. Store only what you need. Never scrape personal data without consent. The goal is intelligence, not surveillance.

Build for resilience. Websites change. APIs get deprecated. Rate limits get stricter. Your extraction pipelines should handle failures gracefully, retry intelligently, and alert you when patterns break.

The real power is in combination. Extract competitor pricing + monitor changes over time + alert when thresholds cross + auto-adjust your own pricing. That's not just data—that's a system.`,
    keyPrinciples: [
      "Semantic extraction over DOM parsing",
      "Respect rate limits and robots.txt",
      "Build failure handling into every pipeline",
      "Store raw data alongside extracted data",
      "Monitor for extraction drift over time",
    ],
    quests: [
      {
        id: "q3-1",
        title: "Competitor Price Monitor",
        platform: "Firecrawl + n8n",
        description:
          "Build a system that monitors 5 competitor product pages daily, extracts pricing data, stores history in a database, and Slacks you when any price changes by more than 10%.",
      },
      {
        id: "q3-2",
        title: "Job Board Aggregator",
        platform: "Apify",
        description:
          "Create a scraper that aggregates job postings from 3 different job boards for a specific role, deduplicates listings, scores relevance, and delivers a daily digest email.",
      },
      {
        id: "q3-3",
        title: "Review Sentiment Tracker",
        platform: "Browse AI",
        description:
          "Build an extraction pipeline that monitors product reviews on Amazon, extracts review text and ratings, runs sentiment analysis, and tracks sentiment trends over time in a dashboard.",
      },
      {
        id: "q3-4",
        title: "News Intelligence Feed",
        platform: "Firecrawl + Claude",
        description:
          "Create a custom news aggregator that monitors 10 industry news sources, extracts articles relevant to specified topics, summarizes each, and produces a daily briefing document.",
      },
      {
        id: "q3-5",
        title: "Lead Enrichment Pipeline",
        platform: "Clay",
        description:
          "Build a workflow that takes a company name, finds their website, extracts company size/industry/tech stack, finds decision-maker LinkedIn profiles, and outputs enriched lead data.",
      },
    ],
    order: 3,
  },
  {
    id: "level-4",
    levelRange: "41-50",
    rank: "The Archivist",
    coreSkill: "RAG (Retrieval Augmented Generation)",
    skillSummary: "Giving AI long-term, searchable memory.",
    lesson: `The Archivist solves AI's memory problem. Language models have context limits and no persistent memory. RAG (Retrieval Augmented Generation) bridges this gap by connecting AI to external knowledge bases.

The core pattern: documents → chunks → embeddings → vector store → retrieval → augmented prompt → response. Each step has tradeoffs. Chunk too small and you lose context. Chunk too large and you dilute relevance. The art is in tuning.

Embeddings are the secret sauce. They convert text into numerical vectors where semantic similarity = geometric proximity. "How do I reset my password?" and "I forgot my login credentials" are far apart as strings but close as vectors.

Quality in, quality out. RAG is only as good as your knowledge base. Garbage documents produce garbage retrievals. Curate ruthlessly. Update regularly. Version your knowledge base like code.

The retrieval strategy matters as much as the documents. Hybrid search (keyword + semantic) often beats pure vector search. Reranking improves relevance. Metadata filtering narrows scope. Don't just retrieve—retrieve smart.`,
    keyPrinciples: [
      "Chunk size affects retrieval quality dramatically",
      "Hybrid search (keyword + semantic) beats either alone",
      "Always cite sources in generated responses",
      "Version and update your knowledge base regularly",
      "Test retrieval quality before trusting generation",
    ],
    subTopics: [
      {
        id: "st4-chunking",
        title: "Chunking Strategies",
        description:
          "Methods for splitting documents into retrievable segments that preserve context and meaning.",
        keyTechniques: [
          "Fixed-size chunks: Simple but may break mid-sentence",
          "Semantic chunking: Split on topic/section boundaries",
          "Sliding window: Overlapping chunks for context preservation",
          "Hierarchical: Parent-child chunks for multi-level retrieval",
          "Document-specific: Different strategies for PDFs vs code vs chat logs",
          "Metadata enrichment: Add source, date, section headers to chunks",
        ],
        platforms: ["LangChain", "LlamaIndex", "Unstructured.io"],
      },
      {
        id: "st4-retrieval",
        title: "Retrieval Optimization",
        description:
          "Techniques for finding the most relevant chunks for any given query.",
        keyTechniques: [
          "Query expansion: Generate multiple query variations",
          "Reranking: Use a second model to score relevance",
          "MMR (Maximal Marginal Relevance): Balance relevance with diversity",
          "Metadata filtering: Narrow search by date, source, category",
          "Hypothetical document embedding: Generate ideal answer, then search",
          "Multi-query retrieval: Decompose complex questions",
        ],
        platforms: ["Cohere Rerank", "Pinecone", "Weaviate", "Qdrant"],
      },
    ],
    quests: [
      {
        id: "q4-1",
        title: "Technical Manual Chatbot",
        platform: "Pinecone + OpenAI",
        description:
          "Build a chatbot trained on a 100+ page technical manual. Must cite page numbers for every answer. Test with 20 questions and achieve 90%+ accuracy.",
      },
      {
        id: "q4-2",
        title: "Codebase Q&A System",
        platform: "LlamaIndex",
        description:
          "Create a RAG system over a GitHub repository that can answer questions about code functionality, find relevant functions, and explain architectural decisions with file references.",
      },
      {
        id: "q4-3",
        title: "Legal Document Analyzer",
        platform: "Weaviate + Claude",
        description:
          "Build a system that ingests contracts, chunks by clause type, and answers questions like 'What are the termination conditions?' with exact clause citations.",
      },
      {
        id: "q4-4",
        title: "Meeting Memory System",
        platform: "Qdrant + Whisper",
        description:
          "Create a pipeline that transcribes meeting recordings, chunks by topic, and lets users query 'What did we decide about X?' across all past meetings.",
      },
      {
        id: "q4-5",
        title: "Multi-Source Research Assistant",
        platform: "LangChain",
        description:
          "Build a research assistant that queries across PDFs, web pages, and a notes database simultaneously, synthesizing answers with sources from each.",
      },
    ],
    order: 4,
  },
  {
    id: "level-5",
    levelRange: "51-60",
    rank: "The Traffic Cop",
    coreSkill: "Intent Routing",
    skillSummary: "Directing traffic to specialized sub-agents.",
    lesson: `The Traffic Cop understands that one AI cannot do everything well. The skill is building routing layers that detect intent and dispatch to specialists.

Intent classification is the foundation. Is this email a sales inquiry, support request, or spam? Is this message asking for information, requesting action, or expressing frustration? Get classification wrong and everything downstream fails.

The routing architecture matters. Simple if/else works for 3 categories. Classification models work for 10. Semantic routing works for complex, overlapping intents. The more intents, the more sophisticated your routing needs to be.

Build specialist handlers, not general handlers. A support response agent should speak differently than a sales response agent. A technical question handler should have different context than a general FAQ handler. Specialization enables quality.

Fallback gracefully. Not every input fits a category. Build explicit "unknown" handling. Escalate to humans when confidence is low. Log unclear cases for future training. A good router knows what it doesn't know.

The meta-pattern: Router → Classifier → Specialist → Response. The router is dumb but fast. The classifier is smart but narrow. The specialist is deep but focused. Together they handle breadth and depth.`,
    keyPrinciples: [
      "Classify intent before processing content",
      "Build specialist handlers, not generalists",
      "Always have an 'unknown/escalate' path",
      "Log routing decisions for analysis",
      "Confidence thresholds prevent bad routing",
    ],
    quests: [
      {
        id: "q5-1",
        title: "Inbox Zero Engine",
        platform: "n8n + OpenAI",
        description:
          "Build an email classifier that routes incoming mail into Sales, Support, Spam, and Personal. Draft unique reply templates for each category. Measure classification accuracy over 100 emails.",
      },
      {
        id: "q5-2",
        title: "Customer Service Router",
        platform: "Make + Claude",
        description:
          "Create a support ticket system that classifies tickets by urgency (critical/high/medium/low) and category (billing/technical/account), then routes to appropriate response templates.",
      },
      {
        id: "q5-3",
        title: "Multi-Lingual Intent Handler",
        platform: "LangChain",
        description:
          "Build a chatbot that detects language and intent simultaneously, routing to language-specific response handlers. Support English, Spanish, and French with 5 intent categories each.",
      },
      {
        id: "q5-4",
        title: "Slack Command Dispatcher",
        platform: "n8n",
        description:
          "Create a Slack bot that interprets natural language requests and routes to appropriate actions: schedule meetings, look up documents, summarize channels, or create tasks.",
      },
      {
        id: "q5-5",
        title: "Lead Qualification Router",
        platform: "Clay + OpenAI",
        description:
          "Build a system that scores inbound leads based on company size, intent signals, and fit criteria, then routes hot leads to sales, warm leads to nurture sequences, and cold leads to general marketing.",
      },
    ],
    order: 5,
  },
  {
    id: "level-6",
    levelRange: "61-70",
    rank: "The Tool Master",
    coreSkill: "Function Calling & Tool Use",
    skillSummary: "Giving AI hands to interact with the world.",
    lesson: `The Tool Master transforms AI from a brain into an operator. Function calling lets AI invoke real-world actions: query databases, call APIs, send messages, modify files.

The architecture is straightforward: define tools with clear schemas, let the AI decide when to use them, execute the calls, feed results back. The complexity is in the details—error handling, validation, permissions, rate limits.

Tool design is UX design. The AI is your user. Name functions clearly. Write descriptions that explain when to use each tool. Provide parameter descriptions. Include examples. The better the tool definition, the better the AI uses it.

Security is non-negotiable. AI should never have unbounded capabilities. Sandbox dangerous operations. Require confirmation for destructive actions. Log everything. The AI will occasionally do unexpected things—design for that reality.

The power multiplies with composition. A "book_meeting" tool is useful. A "book_meeting" + "send_email" + "create_task" set is a workflow. Build tool libraries that work together, and the AI becomes a genuine assistant.`,
    keyPrinciples: [
      "Clear tool descriptions = better tool selection",
      "Always validate tool inputs before execution",
      "Implement confirmation for destructive actions",
      "Log every tool call with inputs and outputs",
      "Build tools that compose into workflows",
    ],
    subTopics: [
      {
        id: "st6-design",
        title: "Tool Design Patterns",
        description:
          "Best practices for creating tools that AI can reliably understand and use.",
        keyTechniques: [
          "Single responsibility: One tool, one action",
          "Clear naming: Verb_noun format (send_email, create_task)",
          "Rich descriptions: When to use, what it does, what it returns",
          "Parameter validation: Types, ranges, required vs optional",
          "Error messages: Actionable guidance when things fail",
          "Idempotency: Safe to call multiple times with same input",
        ],
        platforms: ["OpenAI Functions", "Claude Tools", "LangChain Tools"],
      },
      {
        id: "st6-orchestration",
        title: "Tool Orchestration",
        description:
          "Patterns for combining multiple tools into coherent workflows.",
        keyTechniques: [
          "Sequential chains: Output of tool A feeds input of tool B",
          "Parallel execution: Run independent tools simultaneously",
          "Conditional routing: Use tool A if X, tool B if Y",
          "Retry patterns: Exponential backoff, circuit breakers",
          "Human-in-the-loop: Pause for approval on sensitive actions",
          "Tool result caching: Don't repeat expensive calls",
        ],
        platforms: ["n8n", "LangGraph", "AutoGPT", "CrewAI"],
      },
    ],
    quests: [
      {
        id: "q6-1",
        title: "Calendar Assassin",
        platform: "OpenAI + Google Calendar API",
        description:
          "Build an agent that can check availability, find mutual free time with attendees, and book meetings autonomously. Must handle conflicts and send confirmation emails.",
      },
      {
        id: "q6-2",
        title: "Database Query Agent",
        platform: "Claude + PostgreSQL",
        description:
          "Create an agent that translates natural language questions into SQL queries, executes them, and explains results. Implement query validation to prevent destructive operations.",
      },
      {
        id: "q6-3",
        title: "File System Assistant",
        platform: "LangChain",
        description:
          "Build a tool-using agent that can search files, read contents, create new files, and organize directories. Implement a permission system that limits write access to specific folders.",
      },
      {
        id: "q6-4",
        title: "Multi-API Orchestrator",
        platform: "n8n + AI",
        description:
          "Create an agent with access to 5+ API tools (weather, news, calendar, email, tasks). The agent should decompose complex requests into multi-tool workflows automatically.",
      },
      {
        id: "q6-5",
        title: "Code Execution Agent",
        platform: "E2B + OpenAI",
        description:
          "Build an agent that can write and execute Python code in a sandbox to answer data analysis questions. Must handle errors gracefully and iterate on failed code.",
      },
    ],
    order: 6,
  },
  {
    id: "level-7",
    levelRange: "71-80",
    rank: "The Hive Lord",
    coreSkill: "Multi-Agent Orchestration",
    skillSummary: "Manager-worker hierarchies for complex tasks.",
    lesson: `The Hive Lord commands armies. Multi-agent orchestration is the art of decomposing complex tasks into subtasks handled by specialized agents, coordinated by manager agents.

The fundamental pattern is hierarchical delegation. A manager agent receives a complex goal, breaks it into subtasks, assigns each to a worker agent, collects results, and synthesizes a final output. The manager plans; workers execute.

Agent specialization is critical. A "Researcher" agent should have different prompts, tools, and context than a "Writer" agent. Specialization enables depth. The generalist manager coordinates; specialists deliver quality.

Communication protocols matter. How do agents share context? How does the manager know when a worker is stuck? How do you handle conflicting outputs? Design explicit handoff patterns—don't assume agents will figure it out.

The failure modes are subtle. Agents can loop infinitely. Workers can produce conflicting outputs. Managers can lose track of progress. Build observability: logging, state inspection, timeout controls. You need to see inside the hive.`,
    keyPrinciples: [
      "Decompose before delegating",
      "Specialize worker agents for their tasks",
      "Define explicit communication protocols",
      "Build observability into every agent",
      "Set timeouts and iteration limits",
    ],
    quests: [
      {
        id: "q7-1",
        title: "Content Factory",
        platform: "CrewAI",
        description:
          "Build a multi-agent system where a Manager assigns research topics to a Researcher agent, passes findings to a Writer agent, and has an Editor agent review the final output.",
      },
      {
        id: "q7-2",
        title: "Due Diligence Team",
        platform: "AutoGen",
        description:
          "Create an agent team that analyzes a company: Financial Analyst reviews metrics, Market Analyst assesses competition, Tech Analyst evaluates product. A Lead Analyst synthesizes findings.",
      },
      {
        id: "q7-3",
        title: "Customer Success Squad",
        platform: "LangGraph",
        description:
          "Build a support system with a Triage agent that routes to Technical Support, Billing Support, or Account Management agents. Each specialist has different tools and knowledge bases.",
      },
      {
        id: "q7-4",
        title: "Software Dev Team",
        platform: "n8n + Multiple LLMs",
        description:
          "Create a coding team: Architect designs solutions, Developer implements, Reviewer checks code quality, and PM coordinates. Produce working code from high-level requirements.",
      },
      {
        id: "q7-5",
        title: "Debate Chamber",
        platform: "CrewAI",
        description:
          "Build a system where two Advocate agents argue opposite sides of a topic, a Moderator keeps discussion on track, and a Judge agent synthesizes the strongest arguments from both sides.",
      },
    ],
    order: 7,
  },
  {
    id: "level-8",
    levelRange: "81-90",
    rank: "The Code Wraith",
    coreSkill: "Full-Stack AI Development",
    skillSummary: "Building complete applications with AI assistance.",
    lesson: `The Code Wraith builds real systems. Full-stack AI development combines all previous skills—UI generation, automation, prompting, RAG, function calling—into production applications.

The paradigm shift: AI is not replacing programming, it's accelerating it. You still need to understand architecture, databases, authentication, deployment. AI writes the code faster; you design the systems.

The workflow is iterative. Describe → Generate → Test → Refine → Repeat. Start with a scaffold. Add features incrementally. Test each addition. The AI helps most when scope is constrained—don't try to generate entire applications in one prompt.

Technology choices still matter. Supabase offers rapid backend development with built-in auth and realtime. Cursor provides the best AI coding experience. Vercel simplifies deployment. Choose tools that accelerate your specific workflow.

Production readiness is not optional. Authentication, error handling, data validation, logging, monitoring—these aren't features, they're requirements. AI can help implement them, but you must specify them. The difference between a demo and a product is the boring details.`,
    keyPrinciples: [
      "Understand architecture before generating code",
      "Implement incrementally, test continuously",
      "AI accelerates; humans architect",
      "Production readiness is non-negotiable",
      "Version control everything, even AI-generated code",
    ],
    subTopics: [
      {
        id: "st8-cursor",
        title: "AI-Assisted Coding",
        description:
          "Techniques for effectively using AI code editors to accelerate development.",
        keyTechniques: [
          "Context loading: Reference relevant files before requesting changes",
          "Incremental generation: Build features in small, testable chunks",
          "Test-driven prompting: Write tests first, then generate implementation",
          "Error-driven iteration: Paste errors back for AI to fix",
          "Documentation prompting: Generate docs alongside code",
          "Refactoring requests: 'Extract this into a reusable function'",
        ],
        platforms: ["Cursor", "GitHub Copilot", "Cody", "Continue.dev"],
      },
      {
        id: "st8-backend",
        title: "AI-Accelerated Backend",
        description:
          "Building backends rapidly with AI assistance and modern BaaS platforms.",
        keyTechniques: [
          "Schema-first design: Define data models before implementation",
          "Edge function generation: AI-generated API endpoints",
          "Auth integration: Let platforms handle auth, focus on business logic",
          "Type generation: Auto-generate types from database schema",
          "Migration generation: AI-written database migrations",
          "API documentation: Auto-generate OpenAPI specs",
        ],
        platforms: ["Supabase", "Firebase", "Convex", "PlanetScale"],
      },
    ],
    quests: [
      {
        id: "q8-1",
        title: "SaaS MVP",
        platform: "Cursor + Supabase",
        description:
          "Build a complete SaaS application with user authentication, Stripe subscription billing, a core feature, and an admin dashboard. Deploy to production with a custom domain.",
      },
      {
        id: "q8-2",
        title: "Mobile-First App",
        platform: "Cursor + Expo",
        description:
          "Create a React Native application with authentication, offline data persistence, push notifications, and deployment to TestFlight/Play Console.",
      },
      {
        id: "q8-3",
        title: "Realtime Collaboration Tool",
        platform: "v0 + Supabase Realtime",
        description:
          "Build a collaborative document editor with realtime sync, presence indicators, version history, and conflict resolution.",
      },
      {
        id: "q8-4",
        title: "API Platform",
        platform: "Cursor + Fastify",
        description:
          "Create a REST API with OpenAPI documentation, rate limiting, API key authentication, usage metering, and a developer portal with interactive docs.",
      },
      {
        id: "q8-5",
        title: "Chrome Extension",
        platform: "Cursor + Plasmo",
        description:
          "Build a browser extension that uses AI to analyze the current page, stores data to a backend, and syncs across devices. Publish to Chrome Web Store.",
      },
    ],
    order: 8,
  },
  {
    id: "level-9",
    levelRange: "91-100",
    rank: "The Sovereign",
    coreSkill: "Autonomous Business Systems",
    skillSummary: "Self-correcting systems that generate value.",
    lesson: `The Sovereign builds businesses, not features. Autonomous business systems combine all skills into self-sustaining value engines that operate with minimal human intervention.

The architecture is full-cycle: Lead generation → Qualification → Outreach → Conversion → Delivery → Support → Retention. Each stage can be automated. The art is connecting them into a coherent system.

Self-correction is the differentiator. Static automations break. Autonomous systems monitor their own performance, detect degradation, and adapt. If email open rates drop, test new subject lines. If conversion falls, adjust targeting. Build feedback loops, not just workflows.

The economics must work. Automation has costs—API calls, compute, human oversight. Model the unit economics before building. A system that costs $5 per lead to generate but only converts $3 in revenue is an automated money incinerator.

Start small, validate, expand. Don't build the complete system first. Build lead gen, validate it works. Add qualification, validate. Each stage should prove itself before the next is built. Premature optimization of autonomous systems is a special kind of expensive mistake.

The human role evolves. You become the architect and monitor, not the operator. Design the system, set the constraints, watch the metrics, intervene on exceptions. The goal is leverage: your time focused on high-value decisions while the system handles execution.`,
    keyPrinciples: [
      "Full-cycle thinking: end-to-end value delivery",
      "Build feedback loops, not just workflows",
      "Model economics before building",
      "Validate each stage before expanding",
      "Human as architect and monitor, not operator",
    ],
    quests: [
      {
        id: "q9-1",
        title: "Headless SaaS",
        platform: "n8n + Stripe + Multiple APIs",
        description:
          "Launch a complete headless SaaS: automated lead finding, personalized outreach, proposal generation, Stripe payment processing, and customer onboarding—with zero manual input required.",
      },
      {
        id: "q9-2",
        title: "Content Empire",
        platform: "Multi-platform Automation",
        description:
          "Build a content system that researches trending topics, generates articles/videos/social posts, publishes across platforms, tracks performance, and optimizes based on engagement data.",
      },
      {
        id: "q9-3",
        title: "Marketplace Arbitrage Bot",
        platform: "n8n + E-commerce APIs",
        description:
          "Create a system that monitors price differences across marketplaces, identifies arbitrage opportunities, executes purchases, lists for resale, and manages fulfillment—all automatically.",
      },
      {
        id: "q9-4",
        title: "Self-Optimizing Ad System",
        platform: "Facebook/Google Ads APIs + AI",
        description:
          "Build an advertising system that generates ad creative, launches campaigns, monitors performance, pauses underperformers, scales winners, and optimizes targeting based on conversion data.",
      },
      {
        id: "q9-5",
        title: "Autonomous Agency",
        platform: "Full Stack",
        description:
          "Create a service business that acquires leads, qualifies them, delivers services using AI, handles invoicing, and manages customer communication—operating profitably with less than 2 hours/week of oversight.",
      },
    ],
    order: 9,
  },
];

export function getLevelById(id: string): AcademyLevel | undefined {
  return academyLevels.find((level) => level.id === id);
}

export function getLevelByOrder(order: number): AcademyLevel | undefined {
  return academyLevels.find((level) => level.order === order);
}

export function getSubTopicById(
  levelId: string,
  subTopicId: string
): SubTopic | undefined {
  const level = getLevelById(levelId);
  return level?.subTopics?.find((st) => st.id === subTopicId);
}
