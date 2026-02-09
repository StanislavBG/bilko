# CLAUDE.md - AI Assistant Guide for Bilko's Mental Gym

## Overview

**Bilko's Mental Gym** is a two-part system for AI-powered learning and workflow automation:

1. **Web Application** (this codebase) — The conversational UI where users interact with Bilko, an AI host
2. **Workflow Engine** (n8n) — Background AI agents and automation on a separate Replit project

This is a **rules-first** codebase where governance documents in `/rules/` define how the system should be built. The rules are not optional — they ARE the product.

### Dual-Layer AI Architecture (ARCH-001)

| Layer | Where | Purpose | Persona |
|-------|-------|---------|---------|
| **Background** | n8n (external) | Scheduled tasks, content pipelines, agent orchestration | PER-001 |
| **In-Platform** | This codebase | User-facing flows, conversational UI, real-time LLM calls | PER-002 |

## Quick Start for AI Developers

1. **Read `rules/manifest.json`** — Contains bootstrap metadata and full rule index
2. **Read ARCH-000** (`rules/architecture/000-primary-directive.md`) — The Primary Directive is absolute
3. **Read ARCH-002** (`rules/architecture/002-agent-protocol.md`) — Agent bootstrap/exit protocols
4. **Read ARCH-005** (`rules/architecture/005-flow-steel-frame.md`) — Flow structural invariants
5. **Read ALL applicable rules** before writing any code

## Project Structure

```
bilko/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── ui/          # Base shadcn components
│   │   │   └── flow-inspector/ # DAG canvas, step nodes, detail views
│   │   ├── contexts/        # React context providers
│   │   │   ├── navigation-context.tsx
│   │   │   ├── view-mode-context.tsx
│   │   │   └── voice-context.tsx  # STT + TTS
│   │   ├── data/            # Static data (academy, navigation, projects)
│   │   ├── hooks/           # Custom hooks (auth, voice, clipboard, toast)
│   │   ├── lib/
│   │   │   ├── flow-engine/     # LLM client, execution tracking, API helpers
│   │   │   ├── flow-inspector/  # Flow types, registry, DAG layout, validation
│   │   │   └── workflow/        # Simple workflow framework (welcome flow)
│   │   └── pages/           # Route pages
│   └── public/              # Static assets
├── server/                   # Express backend
│   ├── orchestrator/        # Orchestration layer for external calls
│   ├── n8n/                 # n8n integration (sync, webhooks, monitoring)
│   ├── rules/               # Rules service (manifest, routing, validation)
│   ├── workflows/           # Workflow execution and handlers
│   ├── replit_integrations/ # Replit Auth integration
│   └── images/              # Image processing routes (Sharp)
├── shared/                   # Shared types and schemas
│   └── models/              # Drizzle ORM schemas (PostgreSQL)
├── rules/                    # Governance documents (THE SOURCE OF TRUTH)
│   ├── architecture/        # ARCH-000 to ARCH-005
│   ├── apps/                # APP-* (landing, home, memory, workflows, rules)
│   ├── data/                # DATA-* (principles, traces, audits)
│   ├── env/                 # ENV-* (n8n instance, workflow registry, channels)
│   ├── hub/                 # HUB-* (layout, access, navigation)
│   ├── integration/         # INT-* (n8n, orchestrator, callbacks)
│   └── ui/                  # UI-* (principles, mobile, minimal design)
├── agents/                   # AI audit agent protocols (AGT-*)
└── personas/                 # AI personas (PER-001, PER-002)
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui + Wouter (routing)
- **Backend**: Express 5 + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Replit Auth
- **LLM**: Gemini 2.5 Flash via OpenAI-compatible endpoint (`openai` package)
- **Voice (TTS)**: OpenAI TTS (`tts-1`) via `/api/tts/speak`
- **Voice (STT)**: Web Speech API via VoiceContext
- **Build**: Vite + esbuild
- **External Integration**: n8n (workflow automation)

## Key Commands

```bash
npm run dev          # Start dev server (client + server)
npm run build        # Build for production
npm run start        # Run production build
npm run check        # TypeScript type check
npm run db:push      # Push Drizzle schema to database
```

## Architecture Principles

### 1. Rules-First Development (ARCH-000)
**No code shall be written without first consulting the rules.**

### 2. Orchestrator Pattern (ARCH-000 Principle A)
All external communication (n8n) flows through `POST /api/orchestrate/:workflowId`.

### 3. Headless Operation (ARCH-000 Principle B)
All external service configuration must be automated and programmatic.

### 4. Agent Separation (ARCH-001 D1)
- **n8n agents** (PER-001): Background AI tasks — build in n8n, not here
- **In-platform flows** (PER-002): User-facing LLM calls — build here using `chatJSON<T>()`

### 5. Flow Steel Frame (ARCH-005)
All in-platform flows must satisfy non-negotiable structural invariants:
- **I1–I7**: DAG (no cycles), at least one root, no orphans, unique IDs, valid deps, step completeness
- **Step type contracts**: llm (prompt+outputSchema required), user-input, transform, validate, display
- **Execution contracts**: Every step gets a StepExecution with timing, I/O capture, token usage
- Runtime `validateFlowDefinition()` enforces invariants at import time

### 6. Conversational Canvas Pattern
The website IS the conversation with Bilko:
- Bilko speaks first (typewriter + TTS)
- Options are user responses (click or voice)
- Content renders as conversation turns
- No chat frame — the page is the canvas

## Flow Engine (`client/src/lib/flow-engine/`)

The core runtime for all in-platform LLM-powered flows.

| Export | Purpose |
|--------|---------|
| `chatJSON<T>()` | **THE muscle** — typed LLM calls. Always use this, never raw fetch. |
| `validateVideos()` | YouTube oEmbed validation |
| `useFlowExecution()` | React hook tracking step execution traces for inspector |
| `getExecutionHistory()` | localStorage-persisted execution history per flow |
| `getHistoricalExecution()` | Retrieve specific past execution |
| `clearHistory()` | Wipe history for a flow |

**Server side**: `cleanLLMResponse()` strips markdown fences → client just does `JSON.parse(data.content)`.

## Flow Inspector (`client/src/lib/flow-inspector/`)

Static flow definitions, DAG layout, and ARCH-005 validation.

| Export | Purpose |
|--------|---------|
| `flowRegistry` | All registered flows (validated at import) |
| `getFlowById()` | Lookup by ID |
| `flowToLayout()` | Sugiyama-style DAG coordinate computation |
| `validateFlowDefinition()` | ARCH-005 invariant checker |
| `validateRegistry()` | Batch-validate, exclude invalid flows |

**Inspector components** (`components/flow-inspector/`):
- `FlowCanvas` — DAG visualization with minimap, search, keyboard shortcuts
- `StepNode` — Individual step with status color
- `StepDetail` — Tabbed detail (prompt, schema, data, dependencies)
- `FlowCard` — Grid card with step type breakdown and tags
- `FlowTimeline` — Linear execution timeline

## Database Schema

Defined in `shared/models/`:

| Table | Purpose |
|-------|---------|
| `users` | Replit Auth users (id, email, name, isAdmin) |
| `sessions` | Express session storage |
| `workflow_executions` | n8n workflow execution lifecycle |
| `communication_traces` | Full orchestrator request/response logging |
| `used_topics` | Content deduplication (headline hashing) |

## API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/orchestrate/:workflowId` | Execute n8n workflow through orchestrator |
| `GET /api/traces` | List communication traces (admin only) |
| `GET /api/traces/:id` | Get trace details |
| `GET /api/rules` | List all rules from manifest |
| `GET /api/rules/:ruleId` | Get rule content |
| `GET /api/workflows` | List available workflows |
| `POST /api/workflows/:id/execute` | Execute workflow |
| `POST /api/workflows/callback` | Receive n8n execution callbacks |
| `POST /api/workflows/n8n/sync` | Sync workflows to n8n (admin) |
| `GET /api/workflows/used-topics` | List used topics for deduplication |
| `GET /api/executions/:id` | Get execution details with traces |
| `GET /api/llm/models` | List available LLM models |
| `POST /api/llm/chat` | Chat with Gemini (OpenAI-compatible) |
| `POST /api/llm/validate-videos` | Validate YouTube video embed IDs |
| `POST /api/images/brand` | Add branding to images (Sharp) |
| `GET /api/endpoints` | List all API endpoints |

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` (unauth) | `Landing` | Conversational canvas — Bilko greets, offers learning modes |
| `/` (auth) | `Landing` (skipWelcome) | Same canvas, skips greeting |
| `/academy` | `Academy` | AI learning center with levels and content |
| `/academy/:levelId` | `Academy` | Specific learning level |
| `/flows` | `FlowExplorer` | Browse all registered PER-002 flows |
| `/flows/:flowId` | `FlowDetail` | Inspect flow: DAG, step-through, execution history |
| `/projects/:projectId?` | `Projects` | Project listing and details |
| `/workflows` | `AgenticWorkflows` | n8n workflow management |
| `/memory` | `MemoryExplorer` | View communication traces |
| `/rules` | `RulesExplorer` | Browse rule catalog (admin) |

## Rules System

The Rules Service (`server/rules/`) provides:
1. **Manifest Loading** — Indexes all rules from `rules/manifest.json`
2. **Task Routing** — Routes tasks to relevant rules via keyword matching
3. **Validation** — Validates rule integrity at startup
4. **API Access** — Exposes rules for runtime consultation

### Rule Priorities
1. **ABSOLUTE** — ARCH-000 (Primary Directive)
2. **CRITICAL** — Architecture rules (ARCH-001 through ARCH-005)
3. **HIGH** — Domain-specific rules

## Development Guidelines

### DO
- Read all applicable rules before writing code
- Use the orchestrator for ALL external service calls
- Use `chatJSON<T>()` for ALL LLM calls (never raw fetch)
- Register all new flows in `flow-inspector/registry.ts`
- Validate flows against ARCH-005 steel frame
- Gate all user-facing pages behind authentication
- Include a Rules Context block when completing tasks

### DON'T
- Build n8n-style background agents in this codebase (they belong in n8n)
- Make direct HTTP calls to external services
- Use raw `fetch` for LLM calls (use `chatJSON<T>()`)
- Skip flow validation — every flow must pass steel frame invariants
- Modify rules without explicit human approval
- Use shadcn registry (auth fails) — create UI components manually from Radix primitives

## Path Aliases

- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`

## Environment Variables

Required:
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Session encryption key
- `N8N_API_KEY` — n8n API authentication
- `N8N_BASE_URL` — n8n instance URL
- `GEMINI_API_KEY` — Google Gemini API key

Optional:
- `PORT` — Server port (default: 5000)
- `CALLBACK_URL_OVERRIDE` — Override callback URL for dev

## Agents and Personas

| ID | File | Purpose |
|----|------|---------|
| AGT-001 | `agents/AGT-001-code-audit.md` | Comprehensive codebase validation |
| AGT-002 | `agents/AGT-002-rules-audit.md` | Rule structural integrity validation |
| PER-001 | `personas/PER-001-n8n-architect.md` | n8n workflow development (background layer) |
| PER-002 | `personas/PER-002-in-platform-workflow-agent.md` | In-platform flow development (user-facing layer) |

## Key Files

| File | Purpose |
|------|---------|
| `rules/manifest.json` | Rule index, routing, bootstrap config |
| `client/src/lib/flow-engine/index.ts` | Flow engine exports (chatJSON, execution tracking) |
| `client/src/lib/flow-inspector/registry.ts` | Flow definitions (validated at import) |
| `client/src/lib/flow-inspector/validate.ts` | ARCH-005 runtime validator |
| `client/src/components/conversation-canvas.tsx` | Full-page conversational layout engine |
| `client/src/components/bilko-message.tsx` | Typewriter + TTS for Bilko's voice |
| `client/src/contexts/voice-context.tsx` | Speech recognition + TTS context |
| `server/orchestrator/index.ts` | Orchestration layer implementation |
| `server/routes.ts` | API route registration |
| `shared/schema.ts` | Database schema exports |
| `client/src/App.tsx` | React application root |

## Current System State

- **Single-user phase**: Bilko is the super admin and sole user
- **Authentication**: All features gated behind Replit Auth
- **n8n Integration**: Self-hosted on separate Replit project
- **Conversational UI**: Landing page is a conversation with Bilko (typewriter + TTS + voice)
- **Flow Inspector**: DAG canvas with minimap, search, keyboard shortcuts, step-through, execution history
- **LLM**: Gemini 2.5 Flash via `chatJSON<T>()` with server-side response cleaning
- **Focus**: Utility over polish

## Task Completion Protocol

Per ARCH-002 (Exit Protocol), every task completion MUST include:

```
## Rules Context
Primary: ARCH-000 (entry), ARCH-002 (exit)
Applied:
- [RULE-ID] [Directive]: "[Key guidance applied]"
```

## Remember

**The rules ARE the product. The application is merely the rules made executable.**

Always consult `/rules/` before making changes. When in doubt, read more rules.
