export interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  youtubeUrl: string;
  creator: string;
  tags?: string[];
}

export interface WriteUp {
  id: string;
  title: string;
  subtitle: string;
  category: "environment" | "agents" | "spectrum";
  order: number;
  content: string;
  keyTakeaways: string[];
}

export const thinkingVideos: Video[] = [
  {
    id: "video-3lPnN8omdPA",
    title: "The AI Revolution",
    description: "A deep exploration of how AI is transforming our world and what it means for humanity",
    youtubeId: "3lPnN8omdPA",
    youtubeUrl: "https://www.youtube.com/watch?v=3lPnN8omdPA",
    creator: "Unknown",
    tags: ["AI", "Future", "Society"],
  },
  {
    id: "video-ivVPJhYM8Ng",
    title: "Understanding Intelligence",
    description: "What does it really mean for machines to be intelligent?",
    youtubeId: "ivVPJhYM8Ng",
    youtubeUrl: "https://www.youtube.com/watch?v=ivVPJhYM8Ng",
    creator: "Unknown",
    tags: ["Intelligence", "Philosophy", "AI"],
  },
  {
    id: "video-wv779vmyPVY",
    title: "The Future of AI",
    description: "Exploring the possibilities and challenges ahead",
    youtubeId: "wv779vmyPVY",
    youtubeUrl: "https://www.youtube.com/watch?v=wv779vmyPVY",
    creator: "Unknown",
    tags: ["Future", "Trends", "AI"],
  },
  {
    id: "video-ttdWPDmBN_4",
    title: "Agentic Engineering",
    description: "Exploring the principles and practices of building agentic AI systems",
    youtubeId: "ttdWPDmBN_4",
    youtubeUrl: "https://www.youtube.com/watch?v=ttdWPDmBN_4",
    creator: "Unknown",
    tags: ["Thinking"],
  },
  {
    id: "video-A8_nNYLTXEQ",
    title: "Think with AI",
    description: "How to think alongside AI and leverage it as a cognitive partner",
    youtubeId: "A8_nNYLTXEQ",
    youtubeUrl: "https://www.youtube.com/watch?v=A8_nNYLTXEQ",
    creator: "Unknown",
    tags: ["Thinking"],
  },
];

export const writeUps: WriteUp[] = [
  {
    id: "the-development-environment",
    title: "The Development Environment",
    subtitle: "Replit, Git, and Claude Code — the infrastructure, the memory, and the architect",
    category: "environment",
    order: 0,
    content: `Imagine you're building a treehouse. You need three things: a place to build it, a way to remember what you did, and an architect who designs and constructs the whole thing while you describe what you want. That's exactly what Replit, Git, and Claude Code are for Bilko's Mental Gym.

## Replit — The Workshop

Replit is where the code lives and runs. Think of it as a development computer in the cloud — a fully equipped workshop that exists on the internet. You don't need to install Node.js, PostgreSQL, or any dependencies. When you open Bilko's project in Replit, you get a code editor, a terminal, a running web server, and a live preview of the app. Hit "Run" and the whole application starts.

Under the hood, Replit is a cloud-native IDE built on containerized Linux (Nix-based). Each Repl runs in an isolated container with its own filesystem, network, and process space. For Bilko's project specifically, Replit provides:

- A full Node.js runtime (Express backend + Vite dev server on port 5000)
- A managed PostgreSQL database
- Automatic HTTPS and deployment
- Persistent storage across sessions
- Zero-config authentication via Replit Auth headers

The \`replit.nix\` file pins system dependencies. Nix-based dependency management ensures exact, reproducible package versions across environments.

Replit is essential infrastructure, but it doesn't write a single line of code. It's the stage, not the performer.

## Git — The Memory

Git is how changes are tracked and managed. Every meaningful change gets "committed" — like saving a checkpoint in a video game. You can always go back to any previous checkpoint. Git also enables branching: creating a parallel version of the code where you can experiment without affecting the main version.

In Bilko's project, Git is the collaboration protocol between human and AI. The branching model follows a feature-branch workflow: \`main\` is production, feature branches like \`claude/fix-environment-article-Nw2XO\` represent AI development sessions. Every branch name tells you who did the work — and in this project, that's almost always \`claude/*\`. Commit messages document architectural decisions. Git diff provides the context Claude needs to understand what changed and why.

Git's DAG (directed acyclic graph) of commits mirrors the Flow Engine's own DAG architecture (ARCH-005) — both are about tracking directed, non-circular progressions of state. That's not a coincidence. Claude designed both.

## Claude Code — The Architect

Here's where the previous version of this article got it wrong. It called Claude Code "Your Expert Helper." That's like calling the person who designed, engineered, and built your entire house a "helper."

Claude Code is an AI-powered CLI that runs inside the Replit terminal. It's not a chatbot — it's an agentic coding tool that reads files, searches codebases, executes commands, writes code, and spawns sub-agents for complex work. But describing its tools is like describing a surgeon by listing their instruments. What matters is what it builds.

Claude Code **architected and built this entire project**. Not pieces of it. Not with heavy guidance. The human (Bilko) provides the vision — "I want an AI learning platform with conversational flows" — and Claude turns that into:

- A **rules-first governance system** with 20+ rules across 7 partitions, manifest routing, automated validation, and pre-commit hooks
- A **deterministic workflow engine** (bilko-flow) with 8 specialized workflows — from video discovery to a full European football media pipeline that generates newsletters, infographics, and video clips
- A **DAG validation framework** (ARCH-005 Steel Frame) enforcing structural invariants: no cycles, no orphans, unique IDs, valid dependencies, step completeness
- A **multi-modal content pipeline** integrating Gemini for text, Nano Banana for images, and Veo for video generation — all orchestrated through typed LLM calls via \`chatJSON<T>()\`
- A **persona system** where each workflow has its own specialist agent (YouTube Librarian, AI Leverage Advisor, Socratic Architect) with distinct personalities, greetings, and conversation styles
- A **conversational canvas** where the entire UI is a conversation — typewriter animations, voice input, turn-taking, agent handoffs between flows
- An **n8n integration layer** with orchestrator pattern, webhook callbacks, execution tracing, and communication logging
- A **Flow Inspector** with interactive DAG visualization, Sugiyama-style layout, minimap, search, keyboard shortcuts, step-through debugging, and execution history

Claude doesn't just follow instructions. It reads the rules directory before making changes. It validates flows against the steel frame. It designs data schemas, writes React components, builds Express routes, configures database migrations, and creates the governance documents that constrain its own future behavior. Each session, Claude bootstraps by reading \`CLAUDE.md\` and the manifest, identifies which rules apply, and works within the architecture it helped establish.

The technical depth is real: ownership-based chat systems that prevent message desync during agent handoffs. Template interpolation (\`{{step.output.field}}\`) for data flow through workflow DAGs. Execution traces with timing, token usage, and raw LLM responses persisted to localStorage. A pub/sub flow bus for loosely-coupled communication between subflows.

This isn't "AI-assisted development." This is AI development with human direction.

## The Feedback Loop

**Replit** provides the infrastructure → **Git** preserves the memory → **Claude Code** does the thinking, designing, and building.

The concrete loop: Claude reads the codebase and rules (via Replit's filesystem) → designs the architecture → implements it across frontend, backend, and shared layers → validates against governance rules → tests via Replit's runtime → commits and pushes (via Git) → deployment happens automatically (via Replit). Then the human reviews, provides feedback, and the cycle continues.

This article you're reading right now? Claude wrote the original version — and then rewrote it, because the first version undersold its own contribution. The rules system, the flow engine, the DAG inspector, the persona framework, the media pipeline, the conversational canvas — Claude built all of it. Three tools working together, but let's be honest about who's doing the heavy lifting.`,
    keyTakeaways: [
      "Replit is essential infrastructure (runtime, database, deployment) but writes no code",
      "Git is the memory layer — tracking AI architectural decisions across 100+ feature branches",
      "Claude Code is the architect — it designed and built the entire application, not just assisted",
      "The project includes 8 workflows, multi-modal generation, DAG validation, personas, and a governance system — all Claude-built",
      "This is AI development with human direction, not AI-assisted development",
    ],
  },
  {
    id: "understanding-ai-agents",
    title: "Understanding AI Agents",
    subtitle: "From party planners to executable DAGs — what agents really are",
    category: "agents",
    order: 1,
    content: `Have you ever asked someone to plan a birthday party for you? Not just "get a cake" — the whole thing. They need to figure out a theme, find a venue, make a guest list, send invitations, order food, set up decorations, and make sure everything happens in the right order. That person is acting like an agent.

## The Core Idea

An AI agent is an autonomous software entity that perceives its environment, makes decisions, and takes actions to achieve goals — without step-by-step human instruction for each action. Instead of you telling the AI every single thing to do one at a time, you give it a goal: "Find me interesting AI videos to watch." Then the agent figures out the steps on its own.

Think of it like a restaurant kitchen. When you order a meal, there isn't one person doing everything. There's someone who takes the order, someone who preps ingredients, someone who cooks, someone who plates, and someone who delivers. Each person has a specific job, and they pass their work to the next person. An AI agent works the same way.

## Agents in Bilko's Project

In Bilko's project, the Flow Engine is the kitchen. Take the Video Discovery feature on the landing page. When Bilko suggests "Let me find some AI videos for you," here's what happens behind the scenes:

1. **Research step** — AI generates 5 trending AI topics (like a chef deciding today's specials)
2. **Video search step** — For each topic, AI finds 3 real YouTube videos (like sourcing ingredients)
3. **Validation step** — The system checks that the YouTube videos actually exist and can be played (quality control)
4. **User choice step** — You pick which topic interests you (the waiter takes your order)
5. **Display step** — The selected video is presented with full details (plating and serving)

Each step has a clear type contract. Some use AI (\`llm\` type with prompt and output schema), some wait for your input (\`user-input\` type), some check data quality (\`validate\` type), and some show results (\`display\` type). The steps are connected — each one knows which previous steps it needs data from, passing results forward like a relay race.

## The DAG Architecture

Every in-platform flow is structurally a DAG — a directed acyclic graph with no cycles (ARCH-005 Invariant I1). Dependencies must flow forward only. Step B can depend on step A's output, but never vice versa. At least one root step (with no dependencies) starts execution, and no orphan steps exist — every step must be reachable.

Data flows through the DAG like water through pipes. Each step transforms its inputs into outputs. The \`research-topics\` step outputs \`{topics: [...]}\`. The \`prefetch-videos\` step consumes that array and outputs \`{videos: [...]}\` for each topic — running in parallel when flagged. The \`validate-videos\` step filters invalid YouTube IDs. This is a dataflow architecture: computation defined by data transformations, not control flow.

At the most fundamental level, an agent is a sequence of input → process → output operations. In the Flow Engine, every step gets a \`StepExecution\` trace that captures: \`startedAt\`, \`input\`, \`output\`, \`completedAt\`, and \`tokenUsage\`. Every agent action is auditable.

## The Flow Inspector

You can actually see all of this in action. The Flow Inspector (accessible at \`/flows\`) visualizes agents as interactive DAG canvases with Sugiyama-style layout. You can inspect each step's prompt, schema, execution trace, and dependency chain. It's like looking at the blueprint of the kitchen — the inspector itself is a teaching tool that exposes agent internals as a browsable interface.

## Beyond Flows — Background Agents

The background layer (n8n) hosts PER-001 agents: scheduled workflows that run autonomously. Content pipelines that generate daily briefings. Monitoring agents that check system health. These are true proactive agents — they don't wait for user input; they operate on schedules and triggers. Bilko's architecture separates these two layers (ARCH-001): user-facing flows here, background agents in n8n.`,
    keyTakeaways: [
      "An agent breaks a complex task into manageable steps, each with a specific job",
      "Steps are connected in a DAG — data flows forward, no cycles allowed",
      "Step types handle different jobs: LLM calls, validation, user input, display",
      "Every step produces an auditable execution trace with timing and I/O",
      "The Flow Inspector at /flows exposes agent internals as an interactive visualization",
    ],
  },
  {
    id: "the-ai-capability-spectrum",
    title: "The AI Capability Spectrum",
    subtitle: "From answering questions to taking initiative — the four stages of AI",
    category: "spectrum",
    order: 2,
    content: `AI tools aren't all the same. They exist on a spectrum from simple to sophisticated. Understanding where you are on this spectrum — and where you're heading — is essential for choosing the right tool and designing better systems.

## Stage 1: Prompt — The Answer Machine

The simplest interaction with AI. You type a question or instruction, you get a response. Like texting a knowledgeable friend. Each conversation starts fresh — the AI doesn't remember previous conversations.

Technically, a prompt is a single input → output exchange with zero memory. This is \`chatJSON<T>()\` in its simplest form — one call to Gemini, one structured response. No state persists between calls. No tools are invoked. The LLM is a pure function: \`f(prompt) → response\`. In Bilko's project, the Prompt Playground operates at this level.

**Everyday examples:** ChatGPT conversations, asking Siri a question, a calculator.

## Stage 2: Agent — The Task Handler

Now the AI doesn't just answer questions — it handles entire tasks. You say "Plan a movie night," and it: looks up what's playing, checks review scores, finds showtimes that work, and presents options. Multiple steps, all handled for you. It remembers what it learned in step 1 when it gets to step 3.

An agent chains multiple prompts into a workflow, adds tool access, and maintains state across steps. The Flow Engine elevates from prompt to agent: multiple \`chatJSON<T>()\` calls connected in a DAG, with validation steps, user-input steps, and structured I/O between steps. The agent maintains execution state (\`StepExecution\` traces), has access to tools (YouTube validation, data transformation), and can make conditional decisions based on intermediate results.

Claude Code itself is an agent — it reads files, reasons about changes, writes code, and tests results across multiple interactions.

**Everyday examples:** Bilko's Video Discovery, trip-planning assistants, AI coding tools.

## Stage 3: Reactive AI — The Responsive Helper

This is AI that doesn't need you to push a button. Something happens in the world — someone submits a form, a new article is published, a scheduled time arrives — and the AI system responds automatically. Your flight gets delayed? It rebooks your connecting flight. A bill arrives? It schedules the payment.

In Bilko's architecture, this is the n8n integration layer: webhooks trigger workflows (\`POST /api/workflows/callback\`), scheduled triggers run workflows at set times, and the orchestrator (\`POST /api/orchestrate/:workflowId\`) bridges external events to internal processing. You set it up once, and it reacts to events on its own.

**Everyday examples:** Email auto-responders, smart thermostats, spam filters that learn.

## Stage 4: Proactive AI — The Initiative Taker

This is the frontier. AI that doesn't just respond to events, but actively pursues goals. It notices you have a busy week coming up, so it pre-orders groceries. It sees a pattern in your spending and suggests a budget adjustment. It finds an article about a topic you've been curious about and shares it before you ask.

In Bilko's vision, proactive AI would: monitor usage patterns and generate new content for popular topics before users ask, detect knowledge gaps and create targeted lessons, optimize content pipelines based on engagement metrics, and self-correct when content quality drops.

The architecture supports this — n8n's scheduled workflows plus the orchestrator pattern enable autonomous operation. But the governance structure (ARCH-000) requires human oversight at decision points. True proactive AI requires trust boundaries.

**Everyday examples (emerging):** AI that notices your fridge is low and orders groceries, predictive maintenance systems, a personal assistant that proactively blocks your calendar.

## The Layers Stack

The evolution is not replacement — it's layering. Proactive AI still uses prompts. Agents still make individual LLM calls. Reactive systems still contain agent workflows. Each stage builds on the previous one, adding autonomy, context, and initiative.

**Where are we today?** Most AI tools operate at Stage 1 (prompts) or Stage 2 (agents). Stage 3 (reactive) is growing fast — tools like n8n, Zapier, and Make are making it accessible. Stage 4 (proactive) is experimental and requires careful design. Bilko's project operates at Stage 1 (Prompt Playground) and Stage 2 (Flow Engine agents), with Stage 3 capabilities via n8n, and Stage 4 as the architectural horizon.

We're living through this evolution right now. You're watching it happen.`,
    keyTakeaways: [
      "Prompt = stateless single exchange; Agent = multi-step with tools and state",
      "Reactive AI = event-driven (responds to triggers); Proactive AI = goal-driven (initiates actions)",
      "Each stage layers on the previous — proactive systems contain reactive, agentic, and prompt layers",
      "Most tools today are at Stage 1-2; Stage 3 is growing; Stage 4 is the frontier",
      "Bilko's architecture spans all four stages across its dual-layer design (ARCH-001)",
    ],
  },
];

export function getWriteUpById(id: string): WriteUp | undefined {
  return writeUps.find((w) => w.id === id);
}

export const writeUpCategories = [
  {
    id: "environment" as const,
    name: "Development Environment",
    description: "The tools and workflows that power this project",
  },
  {
    id: "agents" as const,
    name: "Agentic Development",
    description: "Understanding AI agents and how they work",
  },
  {
    id: "spectrum" as const,
    name: "The AI Spectrum",
    description: "The progression from prompts to proactive AI",
  },
];
