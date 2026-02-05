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

export interface JourneyPhase {
  id: string;
  name: string;
  levelRange: string;
  description: string;
  icon: "seedling" | "zap" | "sparkles";
}

export interface Track {
  id: string;
  name: string;
  tagline: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  color: string;
  journey: JourneyPhase[];
  levels: AcademyLevel[];
}

// ============================================
// RECRUIT TRACK - Entry Level (Beginner)
// ============================================
const recruitLevels: AcademyLevel[] = [
  {
    id: "recruit-level-0",
    levelRange: "0-10",
    rank: "The Tourist",
    coreSkill: "Prompting",
    skillSummary: "Learning to talk to AI to get instant creative results.",
    lesson: `Welcome to the world of AI. As a Tourist, your job is simple: learn to talk to AI and see magic happen instantly.

AI is like having a creative partner who never sleeps. You describe what you want in plain English, and it creates it for you. No coding. No technical knowledge. Just conversation.

The key insight is that AI understands intent. You don't need special commands or syntax. Just describe what you want as if you were explaining it to a helpful friend. "Create a logo for a coffee shop called Morning Brew" works perfectly.

Start with creative tasks. Names, logos, taglines, descriptions. These have no wrong answers, so you can experiment freely. Watch how AI interprets your words. Notice how adding details changes the output. This is your first taste of the power you're about to unlock.`,
    keyPrinciples: [
      "Describe what you want in plain English",
      "Add details to get more specific results",
      "Experiment freely - there are no wrong answers",
      "AI is a creative partner, not a replacement for your ideas",
      "The clearer your description, the better the output",
    ],
    quests: [
      {
        id: "recruit-q0-1",
        title: "The Brand Kit",
        platform: "ChatGPT + DALL-E 3",
        description:
          "Use ChatGPT to generate a business name for a fictional company. Then use DALL-E 3 to create a logo for it. No automation yet—just raw creation and conversation.",
      },
    ],
    order: 0,
  },
  {
    id: "recruit-level-1",
    levelRange: "11-20",
    rank: "The Dreamer",
    coreSkill: "Vibe Coding (UI)",
    skillSummary: "Generating a real website using natural language.",
    lesson: `As a Dreamer, you'll create real websites without writing a single line of code. This is called "Vibe Coding"—you describe the vibe, and AI builds it.

Modern AI tools can turn your descriptions into fully functional websites. You say "a personal page with my photo, bio, and links to my social media" and within minutes, you have a real website with working buttons that you can share with anyone.

The magic is in being specific about what you want, but not worrying about how it works. You're the architect describing the building; AI is the construction crew that makes it happen.

This is your first real "ship"—something you create that exists on the internet. Anyone can visit it. It's yours. And you made it just by describing what you wanted.`,
    keyPrinciples: [
      "Describe the purpose, not the code",
      "Start simple—one page with a clear goal",
      "Working buttons and links matter more than perfect design",
      "Deploy and share—a website nobody sees doesn't exist",
      "Iterate based on what you actually need",
    ],
    quests: [
      {
        id: "recruit-q1-1",
        title: "The Link-in-Bio",
        platform: "Lovable.dev or Bolt.new",
        description:
          "Describe and publish a personal 'Linktree' style page with your name, photo, short bio, and working buttons that link to your social profiles. No coding—just describing.",
      },
    ],
    order: 1,
  },
  {
    id: "recruit-level-2",
    levelRange: "21-30",
    rank: "The Scribe",
    coreSkill: "AI Writing",
    skillSummary: "Automating text generation for daily tasks.",
    lesson: `The Scribe automates words. You'll build your first real automation—a system that writes for you.

Think about how much time you spend writing emails, messages, and notes. What if you could just provide the topic and have a polished draft appear? That's exactly what you'll build.

This is your introduction to n8n, a visual automation tool. Instead of writing code, you connect blocks together like digital Lego. One block triggers the workflow, another talks to AI, another delivers the result.

The workflow is simple: Input (a topic) → AI Processing (write the email) → Output (your draft). But the principle is profound: you're teaching a computer to do work for you. This is the foundation of everything that follows.`,
    keyPrinciples: [
      "Automation is about inputs and outputs",
      "Start with one simple task you do repeatedly",
      "AI writing needs context—tell it who you are and your tone",
      "Review AI outputs before sending—you're the editor",
      "Small automations compound into big time savings",
    ],
    quests: [
      {
        id: "recruit-q2-1",
        title: "The Email Drafter",
        platform: "n8n",
        description:
          "Create a simple n8n workflow that takes a topic as input and uses ChatGPT to write a polite, professional email draft for you. Trigger it manually and see your draft appear.",
      },
    ],
    order: 2,
  },
  {
    id: "recruit-level-3",
    levelRange: "31-40",
    rank: "The Collector",
    coreSkill: "Data Entry",
    skillSummary: "Automatically saving information to a spreadsheet.",
    lesson: `The Collector captures information automatically. No more copying and pasting into spreadsheets—your automation does it for you.

Spreadsheets are the world's most underrated database. Google Sheets can store tasks, contacts, ideas, expenses—anything you track regularly. The problem is manual entry. It's tedious, and you forget to do it.

Your automation solves this. You type something into a chat, and it automatically appears as a new row in your spreadsheet. The data captures itself.

This teaches a crucial pattern: AI can understand what you say and structure it into data. "Buy groceries tomorrow" becomes a task with a due date. "Meeting with Sarah about the project" becomes a calendar entry. Natural language in, structured data out.`,
    keyPrinciples: [
      "Spreadsheets are simple databases anyone can use",
      "Automate capture—if you have to remember to enter it, you won't",
      "Structure matters—consistent columns make data useful",
      "Natural language can become structured data",
      "Start with one type of thing you track regularly",
    ],
    quests: [
      {
        id: "recruit-q3-1",
        title: "The Smart To-Do List",
        platform: "n8n + Google Sheets",
        description:
          "Build an n8n workflow where you type a task into a chat interface, and it automatically adds a row to a Google Sheet with the task name, date added, and status column.",
      },
    ],
    order: 3,
  },
  {
    id: "recruit-level-4",
    levelRange: "41-50",
    rank: "The Curator",
    coreSkill: "Web Research",
    skillSummary: "Using AI to read the internet for you.",
    lesson: `The Curator has AI read the internet and report back. Instead of checking multiple websites every day, your automation does it and delivers a summary.

This introduces scheduled triggers. Instead of running workflows manually, they run automatically at specific times. "Every morning at 8 AM" becomes your automation's alarm clock.

The power is in aggregation. Checking the weather takes 30 seconds. Checking news takes 5 minutes. Checking multiple sources takes longer. But your automation does it all simultaneously while you sleep, and you wake up to a single summary.

This is your first taste of leverage. You built something once, and it works for you every day, forever, without additional effort.`,
    keyPrinciples: [
      "Scheduled triggers run without you",
      "Aggregation creates value—multiple sources, one summary",
      "AI can summarize—you don't need full articles",
      "Build once, benefit daily",
      "Start with information you actually check regularly",
    ],
    quests: [
      {
        id: "recruit-q4-1",
        title: "The Daily Briefing",
        platform: "n8n",
        description:
          "Set up a scheduled n8n trigger that runs every morning at 8 AM. It should fetch the weather forecast and one news headline, summarize them, and send the briefing to your email.",
      },
    ],
    order: 4,
  },
  {
    id: "recruit-level-5",
    levelRange: "51-60",
    rank: "The Sorter",
    coreSkill: "Categorization",
    skillSummary: "Teaching AI to label things (Good vs. Bad).",
    lesson: `The Sorter teaches AI to make decisions. Not complex decisions—simple ones. Is this urgent or not? Is this spam or legitimate? Is this positive or negative?

This is classification, the foundation of intelligent automation. When AI can categorize things, it can route them differently. Urgent emails get flagged. Spam gets deleted. Positive feedback gets archived.

The key insight is that AI doesn't need perfect rules—it understands context. You don't have to define every possible spam phrase. You just show it examples and explain the concept, and it generalizes.

This transforms your automations from simple conveyor belts into smart systems that behave differently based on what they encounter.`,
    keyPrinciples: [
      "Classification enables routing—different categories, different actions",
      "AI understands context, not just keywords",
      "Start with two categories before adding more",
      "Confidence matters—uncertain classifications need human review",
      "Log decisions to improve accuracy over time",
    ],
    quests: [
      {
        id: "recruit-q5-1",
        title: "The Inbox Cleaner",
        platform: "n8n",
        description:
          "Build an automation that reads incoming messages, uses AI to decide if each is 'Urgent', 'Normal', or 'Spam', and adds an appropriate label. Start with your email or a test inbox.",
      },
    ],
    order: 5,
  },
  {
    id: "recruit-level-6",
    levelRange: "61-70",
    rank: "The Creator",
    coreSkill: "Content Generation",
    skillSummary: "Combining text and image generation.",
    lesson: `The Creator generates complete content packages. Not just text. Not just images. Both together, ready to publish.

Social media posts need captions and visuals. Blog posts need featured images. Marketing needs copy and graphics. Previously, this required multiple tools and manual coordination. Now, one workflow does it all.

The workflow chains AI calls: first generate the text, then use that text to inform the image generation, then package both together. Each step feeds the next.

This is composition—combining simple capabilities into powerful outputs. One AI writes. Another AI illustrates. Your automation coordinates them. The result is greater than the sum of its parts.`,
    keyPrinciples: [
      "Content packages beat individual pieces",
      "Chain AI calls—text informs image, image informs text",
      "Consistent style requires consistent prompts",
      "Store outputs organized for easy retrieval",
      "Quality control: review before publishing",
    ],
    quests: [
      {
        id: "recruit-q6-1",
        title: "The Insta-Post Generator",
        platform: "n8n + DALL-E",
        description:
          "Create a workflow that takes a topic, writes an Instagram caption using an LLM, generates a matching image with DALL-E, and saves both to a Google Drive folder or spreadsheet.",
      },
    ],
    order: 6,
  },
  {
    id: "recruit-level-7",
    levelRange: "71-80",
    rank: "The Listener",
    coreSkill: "Forms & Triggers",
    skillSummary: "Making AI react to outside user input.",
    lesson: `The Listener builds systems that respond to other people. Not just your input—anyone's input. This is where your automations become products.

Forms are the simplest interface. Someone fills out fields, clicks submit, and your automation springs into action. No app needed. No login required. Just a link they can visit.

The webhook pattern is powerful: external event → trigger → automation → response. When someone submits feedback, your system can thank them, categorize their input, and notify you—all instantly, all automatically.

This shifts your mindset from "tools for me" to "systems for others." You're building something that provides value to people who don't even know automation exists.`,
    keyPrinciples: [
      "Forms are the simplest user interface",
      "Webhooks let external events trigger automations",
      "Personalization matters—use their name, reference their input",
      "Response time creates magic—instant feels intelligent",
      "Build for others, not just yourself",
    ],
    quests: [
      {
        id: "recruit-q7-1",
        title: "The Feedback Form",
        platform: "Typeform/Tally + n8n",
        description:
          "Build a feedback form using Typeform or Tally. When someone submits feedback, your n8n workflow should use AI to write a personalized thank-you email using their name and send it automatically.",
      },
    ],
    order: 7,
  },
  {
    id: "recruit-level-8",
    levelRange: "81-90",
    rank: "The Builder",
    coreSkill: "Chatbots",
    skillSummary: "Creating a conversational interface.",
    lesson: `The Builder creates conversations. Instead of forms and buttons, users just talk. They ask questions in natural language, and your system answers.

Chatbots feel like magic to users. They type a question, and an intelligent response appears. Behind the scenes, it's your automation: receive message → find relevant information → generate response → send reply.

The key is grounding the chatbot in specific knowledge. A general chatbot knows everything and nothing useful. Your chatbot knows about one specific thing—a pizza shop's hours, a product's features, a company's FAQ. Narrow focus enables accurate answers.

This is your first AI-powered interface. Not buttons. Not forms. Conversation. The most natural human interface, powered by your automation.`,
    keyPrinciples: [
      "Narrow focus beats broad knowledge",
      "Ground responses in specific documents",
      "Handle 'I don't know' gracefully",
      "Conversation history provides context",
      "Test with real questions from real users",
    ],
    quests: [
      {
        id: "recruit-q8-1",
        title: "The FAQ Bot",
        platform: "n8n or Flowise",
        description:
          "Build a simple chatbot that answers questions about a specific topic (like a pizza shop's hours, menu, and location). Give it a text document with the information and test with 10 different questions.",
      },
    ],
    order: 8,
  },
  {
    id: "recruit-level-9",
    levelRange: "91-100",
    rank: "The Operator",
    coreSkill: "Integration",
    skillSummary: "Connecting a frontend to a backend.",
    lesson: `The Operator connects everything. You've built interfaces (websites) and you've built automations (workflows). Now you connect them. Frontend meets backend.

This is the architecture of real applications: a user interface sends data to a processing system, which does something intelligent, and sends results back. Website → n8n → AI → Response → Website.

When you build this, you've essentially built an app. Users interact with your interface. Your backend processes their requests. Results appear on screen. The fact that you described the UI and visually built the backend doesn't make it less real.

Congratulations. You started as someone who had never written code. Now you're building full-stack applications. The tools did the coding. You did the thinking. And thinking is the part that matters.`,
    keyPrinciples: [
      "Frontends display, backends process",
      "APIs are bridges between systems",
      "User experience matters—loading states, error messages, feedback",
      "End-to-end testing catches integration issues",
      "You're a builder now—keep building",
    ],
    quests: [
      {
        id: "recruit-q9-1",
        title: "The Full App",
        platform: "Lovable + n8n",
        description:
          "Use Lovable to build a simple interface (like an 'Idea Generator' with a text input and button). Connect it to an n8n workflow that processes the input with AI and displays the result back on the screen.",
      },
    ],
    order: 9,
  },
];

// ============================================
// SPECIALIST TRACK - Intermediate/Advanced
// ============================================
const specialistLevels: AcademyLevel[] = [
  {
    id: "specialist-level-0",
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
        id: "spec-q0-1",
        title: "5-Minute Landing Page",
        platform: "Bolt.new",
        description:
          "Create a SaaS landing page with hero section, three feature cards, and a working email waitlist form that stores submissions.",
      },
      {
        id: "spec-q0-2",
        title: "Component Library Starter",
        platform: "v0.dev",
        description:
          "Generate a set of 5 reusable UI components: a pricing card, testimonial block, feature comparison table, CTA banner, and footer.",
      },
      {
        id: "spec-q0-3",
        title: "Personal Portfolio",
        platform: "Lovable",
        description:
          "Build a personal portfolio site with an about section, project gallery with filtering, and contact form. Deploy to a live URL.",
      },
      {
        id: "spec-q0-4",
        title: "Internal Tool Dashboard",
        platform: "Replit",
        description:
          "Create an internal dashboard that displays mock analytics data with charts, a data table with search/filter, and export to CSV functionality.",
      },
    ],
    order: 0,
  },
  {
    id: "specialist-level-1",
    levelRange: "11-20",
    rank: "The Scavenger",
    coreSkill: "Linear Automation",
    skillSummary: "Eliminating manual grunt work via triggers.",
    lesson: `Linear Automation is about identifying repetitive tasks and replacing them with trigger-based workflows. The philosophy is simple: if you do something more than twice, automate it.

A linear automation follows a predictable path: trigger → action → result. When X happens, do Y. The power comes from chaining these simple steps. When a form is submitted → send to Slack → add to spreadsheet → send confirmation email.

The hardest part isn't building the automation—it's recognizing what should be automated. Keep a "friction journal" for one week. Every time you do something manually that feels repetitive, write it down. That list is your automation roadmap.

Start with low-stakes automations. Notifications, data syncing, simple transformations. As you build confidence, move to automations that take actions on your behalf. The goal is to become the architect of systems, not the operator of tasks.`,
    keyPrinciples: [
      "Automate observation before action",
      "Build idempotent workflows (safe to run twice)",
      "Log everything for debugging",
      "Start with notifications, graduate to actions",
      "Test with real data in staging first",
    ],
    quests: [
      {
        id: "spec-q1-1",
        title: "YouTube to LinkedIn Pipeline",
        platform: "n8n",
        description:
          "Build a workflow that monitors a YouTube channel RSS feed, summarizes new videos using an LLM, and posts the summary as a LinkedIn post with the video link.",
      },
      {
        id: "spec-q1-2",
        title: "Email to Task Converter",
        platform: "Make",
        description:
          "Create an automation that monitors a specific Gmail label, extracts action items using AI, and creates corresponding tasks in Notion or Todoist.",
      },
      {
        id: "spec-q1-3",
        title: "Content Repurposing Chain",
        platform: "n8n",
        description:
          "Build a pipeline that takes a blog post URL, generates 5 tweet variations, 1 LinkedIn post, and 3 email subject lines, storing all outputs in Airtable.",
      },
    ],
    order: 1,
  },
  {
    id: "specialist-level-2",
    levelRange: "21-30",
    rank: "The Prompt Smith",
    coreSkill: "Structured Output & Prompting",
    skillSummary: "Forcing AI to produce reliable, formatted outputs.",
    lesson: `The Prompt Smith understands that AI output quality is directly proportional to input quality. Prompting is not about finding magic words—it's about clear communication, context setting, and constraint definition.

Every prompt has anatomy: Role (who the AI should be), Context (what it needs to know), Task (what to do), Format (how to structure output), and Constraints (what to avoid). Master this structure and you control the output.

Structured output is the bridge between AI and automation. When you need an LLM to produce JSON, XML, or specific formats, you must be explicit. Show examples. Define schemas. Validate outputs. Never trust that the AI will "figure it out."

Different modalities require different approaches. Text prompting rewards specificity and examples. Image prompting is about visual vocabulary and style references. Video prompting requires understanding of motion, timing, and continuity.`,
    keyPrinciples: [
      "Show, don't just tell (use examples)",
      "Define output format explicitly",
      "Provide relevant context, not everything",
      "Use system prompts for persistent behavior",
      "Iterate prompts like code—version and test",
    ],
    subTopics: [
      {
        id: "spec-st2-text",
        title: "Text Prompting",
        description:
          "Techniques for generating high-quality written content, code, and structured data from language models.",
        keyTechniques: [
          "Few-shot prompting: Provide 2-3 examples of desired input/output pairs",
          "Chain-of-thought: Ask the model to show its reasoning step-by-step",
          "Role prompting: Assign a specific persona (You are a senior tax accountant...)",
          "Output templating: Define exact structure with placeholders",
        ],
        platforms: ["ChatGPT", "Claude", "Gemini", "Llama"],
      },
      {
        id: "spec-st2-image",
        title: "Image Prompting",
        description:
          "Creating visual content through text descriptions, style references, and compositional guidance.",
        keyTechniques: [
          "Subject + Style + Mood: 'A cyberpunk street market, oil painting style, moody lighting'",
          "Style references: 'in the style of Studio Ghibli'",
          "Negative prompts: --no text, blurry, distorted hands",
          "Weight parameters: (subject:1.2) to emphasize elements",
        ],
        platforms: ["Midjourney", "DALL-E 3", "Stable Diffusion", "Leonardo.ai"],
      },
    ],
    quests: [
      {
        id: "spec-q2-1",
        title: "Data Sanitizer",
        platform: "n8n + OpenAI",
        description:
          "Create a workflow that takes messy receipts, extracts vendor, date, items, and total into clean JSON, and stores in Airtable.",
      },
      {
        id: "spec-q2-2",
        title: "Brand Image Generator",
        platform: "Midjourney",
        description:
          "Develop a prompt template system that generates consistent brand imagery. Create 10 images that maintain style consistency.",
      },
    ],
    order: 2,
  },
  {
    id: "specialist-level-3",
    levelRange: "31-40",
    rank: "The Harvester",
    coreSkill: "Data Extraction",
    skillSummary: "Scraping the web for personal datasets.",
    lesson: `The Harvester sees the web as a vast, unstructured database waiting to be queried. Data extraction is the skill of turning public information into private advantage.

Traditional scraping is brittle—HTML changes break everything. AI-powered extraction is semantic. Instead of parsing DOM elements, you describe what you want: "Extract the product name, price, and review count from this page." The AI finds it regardless of structure.

The ethical framework matters. Scrape public data. Respect robots.txt. Don't hammer servers. Store only what you need. Never scrape personal data without consent.

Build for resilience. Websites change. APIs get deprecated. Your extraction pipelines should handle failures gracefully and alert you when patterns break.`,
    keyPrinciples: [
      "Semantic extraction over DOM parsing",
      "Respect rate limits and robots.txt",
      "Build failure handling into every pipeline",
      "Store raw data alongside extracted data",
      "Monitor for extraction drift over time",
    ],
    quests: [
      {
        id: "spec-q3-1",
        title: "Competitor Price Monitor",
        platform: "Firecrawl + n8n",
        description:
          "Build a system that monitors 5 competitor product pages daily, extracts pricing data, and Slacks you when any price changes by more than 10%.",
      },
      {
        id: "spec-q3-2",
        title: "Job Board Aggregator",
        platform: "Apify",
        description:
          "Create a scraper that aggregates job postings from 3 different job boards, deduplicates listings, and delivers a daily digest email.",
      },
    ],
    order: 3,
  },
  {
    id: "specialist-level-4",
    levelRange: "41-50",
    rank: "The Archivist",
    coreSkill: "RAG",
    skillSummary: "Giving AI long-term, searchable memory.",
    lesson: `The Archivist solves AI's memory problem. Language models have context limits and no persistent memory. RAG (Retrieval Augmented Generation) bridges this gap by connecting AI to external knowledge bases.

The core pattern: documents → chunks → embeddings → vector store → retrieval → augmented prompt → response. Each step has tradeoffs. Chunk too small and you lose context. Chunk too large and you dilute relevance.

Embeddings are the secret sauce. They convert text into numerical vectors where semantic similarity = geometric proximity. "How do I reset my password?" and "I forgot my login credentials" are far apart as strings but close as vectors.

Quality in, quality out. RAG is only as good as your knowledge base. Curate ruthlessly. Update regularly.`,
    keyPrinciples: [
      "Chunk size affects retrieval quality dramatically",
      "Hybrid search (keyword + semantic) beats either alone",
      "Always cite sources in generated responses",
      "Version and update your knowledge base regularly",
      "Test retrieval quality before trusting generation",
    ],
    subTopics: [
      {
        id: "spec-st4-chunking",
        title: "Chunking Strategies",
        description: "Methods for splitting documents into retrievable segments.",
        keyTechniques: [
          "Fixed-size chunks: Simple but may break mid-sentence",
          "Semantic chunking: Split on topic boundaries",
          "Sliding window: Overlapping chunks for context",
          "Hierarchical: Parent-child chunks for multi-level retrieval",
        ],
        platforms: ["LangChain", "LlamaIndex", "Unstructured.io"],
      },
    ],
    quests: [
      {
        id: "spec-q4-1",
        title: "Technical Manual Chatbot",
        platform: "Pinecone + OpenAI",
        description:
          "Build a chatbot trained on a 100+ page technical manual. Must cite page numbers for every answer.",
      },
      {
        id: "spec-q4-2",
        title: "Codebase Q&A System",
        platform: "LlamaIndex",
        description:
          "Create a RAG system over a GitHub repository that can answer questions about code functionality with file references.",
      },
    ],
    order: 4,
  },
  {
    id: "specialist-level-5",
    levelRange: "51-60",
    rank: "The Traffic Cop",
    coreSkill: "Intent Routing",
    skillSummary: "Directing traffic to specialized sub-agents.",
    lesson: `The Traffic Cop understands that one AI cannot do everything well. The skill is building routing layers that detect intent and dispatch to specialists.

Intent classification is the foundation. Is this email a sales inquiry, support request, or spam? Get classification wrong and everything downstream fails.

Build specialist handlers, not general handlers. A support response agent should speak differently than a sales response agent. Specialization enables quality.

Fallback gracefully. Not every input fits a category. Build explicit "unknown" handling. Escalate to humans when confidence is low.`,
    keyPrinciples: [
      "Classify intent before processing content",
      "Build specialist handlers, not generalists",
      "Always have an 'unknown/escalate' path",
      "Log routing decisions for analysis",
      "Confidence thresholds prevent bad routing",
    ],
    quests: [
      {
        id: "spec-q5-1",
        title: "Inbox Zero Engine",
        platform: "n8n + OpenAI",
        description:
          "Build an email classifier that routes incoming mail into Sales, Support, Spam, and Personal with unique reply templates for each category.",
      },
      {
        id: "spec-q5-2",
        title: "Multi-Lingual Intent Handler",
        platform: "LangChain",
        description:
          "Build a chatbot that detects language and intent simultaneously, routing to language-specific response handlers.",
      },
    ],
    order: 5,
  },
  {
    id: "specialist-level-6",
    levelRange: "61-70",
    rank: "The Tool Master",
    coreSkill: "Function Calling",
    skillSummary: "Giving AI hands to interact with the world.",
    lesson: `The Tool Master transforms AI from a brain into an operator. Function calling lets AI invoke real-world actions: query databases, call APIs, send messages, modify files.

The architecture is straightforward: define tools with clear schemas, let the AI decide when to use them, execute the calls, feed results back.

Tool design is UX design. The AI is your user. Name functions clearly. Write descriptions that explain when to use each tool. The better the tool definition, the better the AI uses it.

Security is non-negotiable. AI should never have unbounded capabilities. Sandbox dangerous operations. Require confirmation for destructive actions.`,
    keyPrinciples: [
      "Clear tool descriptions = better tool selection",
      "Always validate tool inputs before execution",
      "Implement confirmation for destructive actions",
      "Log every tool call with inputs and outputs",
      "Build tools that compose into workflows",
    ],
    quests: [
      {
        id: "spec-q6-1",
        title: "Calendar Agent",
        platform: "OpenAI + Google Calendar API",
        description:
          "Build an agent that can check availability, find mutual free time, and book meetings autonomously.",
      },
      {
        id: "spec-q6-2",
        title: "Database Query Agent",
        platform: "Claude + PostgreSQL",
        description:
          "Create an agent that translates natural language into SQL queries with validation to prevent destructive operations.",
      },
    ],
    order: 6,
  },
  {
    id: "specialist-level-7",
    levelRange: "71-80",
    rank: "The Hive Lord",
    coreSkill: "Multi-Agent Orchestration",
    skillSummary: "Manager-worker hierarchies for complex tasks.",
    lesson: `The Hive Lord commands armies. Multi-agent orchestration is the art of decomposing complex tasks into subtasks handled by specialized agents, coordinated by manager agents.

The fundamental pattern is hierarchical delegation. A manager agent receives a complex goal, breaks it into subtasks, assigns each to a worker agent, collects results, and synthesizes a final output.

Agent specialization is critical. A "Researcher" agent should have different prompts, tools, and context than a "Writer" agent.

The failure modes are subtle. Agents can loop infinitely. Workers can produce conflicting outputs. Build observability: logging, state inspection, timeout controls.`,
    keyPrinciples: [
      "Decompose before delegating",
      "Specialize worker agents for their tasks",
      "Define explicit communication protocols",
      "Build observability into every agent",
      "Set timeouts and iteration limits",
    ],
    quests: [
      {
        id: "spec-q7-1",
        title: "Content Factory",
        platform: "CrewAI",
        description:
          "Build a multi-agent system where a Manager assigns topics to a Researcher, passes findings to a Writer, and has an Editor review output.",
      },
      {
        id: "spec-q7-2",
        title: "Software Dev Team",
        platform: "n8n + Multiple LLMs",
        description:
          "Create a coding team: Architect designs, Developer implements, Reviewer checks quality, PM coordinates.",
      },
    ],
    order: 7,
  },
  {
    id: "specialist-level-8",
    levelRange: "81-90",
    rank: "The Code Wraith",
    coreSkill: "Full-Stack AI Development",
    skillSummary: "Building complete applications with AI assistance.",
    lesson: `The Code Wraith builds real systems. Full-stack AI development combines all previous skills—UI generation, automation, prompting, RAG, function calling—into production applications.

The paradigm shift: AI is not replacing programming, it's accelerating it. You still need to understand architecture, databases, authentication, deployment. AI writes the code faster; you design the systems.

The workflow is iterative. Describe → Generate → Test → Refine → Repeat. Start with a scaffold. Add features incrementally.

Production readiness is not optional. Authentication, error handling, data validation, logging, monitoring—these aren't features, they're requirements.`,
    keyPrinciples: [
      "Understand architecture before generating code",
      "Implement incrementally, test continuously",
      "AI accelerates; humans architect",
      "Production readiness is non-negotiable",
      "Version control everything, even AI-generated code",
    ],
    quests: [
      {
        id: "spec-q8-1",
        title: "SaaS MVP",
        platform: "Cursor + Supabase",
        description:
          "Build a complete SaaS with user auth, Stripe billing, a core feature, and admin dashboard. Deploy to production.",
      },
      {
        id: "spec-q8-2",
        title: "Realtime Collaboration Tool",
        platform: "v0 + Supabase Realtime",
        description:
          "Build a collaborative document editor with realtime sync, presence indicators, and version history.",
      },
    ],
    order: 8,
  },
  {
    id: "specialist-level-9",
    levelRange: "91-100",
    rank: "The Sovereign",
    coreSkill: "Autonomous Business Systems",
    skillSummary: "Self-correcting systems that generate value.",
    lesson: `The Sovereign builds businesses, not features. Autonomous business systems combine all skills into self-sustaining value engines that operate with minimal human intervention.

The architecture is full-cycle: Lead generation → Qualification → Outreach → Conversion → Delivery → Support → Retention. Each stage can be automated.

Self-correction is the differentiator. Static automations break. Autonomous systems monitor their own performance, detect degradation, and adapt.

The human role evolves. You become the architect and monitor, not the operator. Design the system, set the constraints, watch the metrics, intervene on exceptions.`,
    keyPrinciples: [
      "Full-cycle thinking: end-to-end value delivery",
      "Build feedback loops, not just workflows",
      "Model economics before building",
      "Validate each stage before expanding",
      "Human as architect and monitor, not operator",
    ],
    quests: [
      {
        id: "spec-q9-1",
        title: "Headless SaaS",
        platform: "n8n + Stripe + Multiple APIs",
        description:
          "Launch a complete headless SaaS: automated lead finding, outreach, payment processing, and onboarding with zero manual input.",
      },
      {
        id: "spec-q9-2",
        title: "Content Empire",
        platform: "Multi-platform Automation",
        description:
          "Build a content system that researches topics, generates content, publishes across platforms, and optimizes based on engagement.",
      },
    ],
    order: 9,
  },
];

// ============================================
// ARCHITECT TRACK - Expert (Coming Soon)
// ============================================
const architectLevels: AcademyLevel[] = [
  {
    id: "architect-level-0",
    levelRange: "0-100",
    rank: "Coming Soon",
    coreSkill: "Enterprise AI Architecture",
    skillSummary: "Building AI systems at scale for organizations.",
    lesson: `The Architect track is designed for experienced practitioners ready to tackle enterprise-scale challenges. This track covers advanced topics including: AI governance and compliance, multi-tenant system design, cost optimization at scale, security and privacy architecture, and organizational change management.

Coming soon.`,
    keyPrinciples: [
      "Scale introduces complexity",
      "Governance enables trust",
      "Cost optimization is continuous",
      "Security is foundational",
      "People are the hardest part",
    ],
    quests: [],
    order: 0,
  },
];

// ============================================
// TRACK DEFINITIONS
// ============================================
export const academyTracks: Track[] = [
  {
    id: "recruit",
    name: "Recruit to Operator",
    tagline: "From Zero to Builder",
    description:
      "The entry-level path for absolute beginners. No coding experience required—just curiosity and a web browser. Learn to harness AI through conversation, visual tools, and 'Digital Lego' blocks.",
    difficulty: "beginner",
    color: "emerald",
    journey: [
      {
        id: "recruit-foundation",
        name: "Discovery",
        levelRange: "0-30",
        description:
          "See magic happen. Create with AI using just your words—no code, no complexity. Build websites by describing them and automate your first tasks.",
        icon: "seedling",
      },
      {
        id: "recruit-integration",
        name: "Utility",
        levelRange: "31-60",
        description:
          "Solve real problems. Automate data capture, let AI research for you, and build systems that categorize and organize automatically.",
        icon: "zap",
      },
      {
        id: "recruit-mastery",
        name: "Creation",
        levelRange: "61-100",
        description:
          "Build products. Generate content, respond to users, create chatbots, and connect frontends to backends—you're a builder now.",
        icon: "sparkles",
      },
    ],
    levels: recruitLevels,
  },
  {
    id: "specialist",
    name: "Specialist Path",
    tagline: "Deep Technical Mastery",
    description:
      "The intermediate-to-advanced path for those with some technical foundation. Dive deep into prompting, RAG, function calling, multi-agent systems, and production AI development.",
    difficulty: "intermediate",
    color: "blue",
    journey: [
      {
        id: "specialist-foundation",
        name: "Foundation",
        levelRange: "0-30",
        description:
          "Learn AI's language. Generate interfaces, automate workflows, and master prompting across text, image, video, and audio.",
        icon: "seedling",
      },
      {
        id: "specialist-integration",
        name: "Integration",
        levelRange: "31-60",
        description:
          "Connect AI to the real world. Extract data, give AI long-term memory with RAG, and build intelligent routing systems.",
        icon: "zap",
      },
      {
        id: "specialist-mastery",
        name: "Mastery",
        levelRange: "61-100",
        description:
          "Build autonomous systems. Give AI hands with function calling, orchestrate agent teams, and create self-sustaining systems.",
        icon: "sparkles",
      },
    ],
    levels: specialistLevels,
  },
  {
    id: "architect",
    name: "Architect Path",
    tagline: "Enterprise Scale",
    description:
      "The expert path for seasoned practitioners. Design AI systems for organizations, manage governance and compliance, and lead AI transformation at scale.",
    difficulty: "advanced",
    color: "purple",
    journey: [
      {
        id: "architect-foundation",
        name: "Foundations",
        levelRange: "0-30",
        description:
          "Enterprise patterns, governance frameworks, and organizational design for AI adoption.",
        icon: "seedling",
      },
      {
        id: "architect-integration",
        name: "Systems",
        levelRange: "31-60",
        description:
          "Multi-tenant architectures, cost optimization, security patterns, and compliance frameworks.",
        icon: "zap",
      },
      {
        id: "architect-mastery",
        name: "Leadership",
        levelRange: "61-100",
        description:
          "AI strategy, change management, team building, and organizational transformation.",
        icon: "sparkles",
      },
    ],
    levels: architectLevels,
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================
export function getTrackById(trackId: string): Track | undefined {
  return academyTracks.find((track) => track.id === trackId);
}

export function getLevelById(levelId: string): AcademyLevel | undefined {
  for (const track of academyTracks) {
    const level = track.levels.find((l) => l.id === levelId);
    if (level) return level;
  }
  return undefined;
}

export function getLevelsByTrack(trackId: string): AcademyLevel[] {
  const track = getTrackById(trackId);
  return track?.levels || [];
}

export function getTrackForLevel(levelId: string): Track | undefined {
  return academyTracks.find((track) =>
    track.levels.some((l) => l.id === levelId)
  );
}

export function getSubTopicById(
  levelId: string,
  subTopicId: string
): SubTopic | undefined {
  const level = getLevelById(levelId);
  return level?.subTopics?.find((st) => st.id === subTopicId);
}

// Legacy export for backward compatibility
export const academyLevels = specialistLevels;
