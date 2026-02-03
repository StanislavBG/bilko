# CLAUDE.md - AI Assistant Guide for Bilko Bibitkov

## Overview

**Bilko Bibitkov** is a two-part system for AI-powered workflow automation:

1. **Web Application** (this codebase) - The user interface built on Replit
2. **Workflow Engine** (n8n) - The "brain" that hosts AI agents and automation on a separate Replit project

This is a **rules-first** codebase where governance documents in `/rules/` define how the system should be built. The rules are not optional - they ARE the product.

## Quick Start for AI Developers

1. **Read `rules/manifest.json`** - Contains bootstrap metadata and full rule index
2. **Read ARCH-000** (`rules/architecture/000-primary-directive.md`) - The Primary Directive is absolute
3. **Read ARCH-006** (`rules/architecture/006-agent-bootstrap.md`) - Explains how to use the rule system
4. **Read ALL applicable rules** before writing any code

## Project Structure

```
bilko/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/       # UI components (shadcn/ui based)
│   │   │   └── ui/          # Base shadcn components
│   │   ├── contexts/        # React context providers
│   │   ├── data/            # Static data and navigation config
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities (auth, query client)
│   │   └── pages/           # Route pages
│   └── public/              # Static assets
├── server/                   # Express backend
│   ├── orchestrator/        # Orchestration layer for external calls
│   ├── n8n/                 # n8n integration (sync, webhooks, monitoring)
│   ├── rules/               # Rules service (manifest, routing, validation)
│   ├── workflows/           # Workflow execution and handlers
│   ├── replit_integrations/ # Replit Auth integration
│   └── images/              # Image processing routes
├── shared/                   # Shared types and schemas
│   └── models/              # Drizzle ORM schemas (PostgreSQL)
├── rules/                    # Governance documents (THE SOURCE OF TRUTH)
│   ├── architecture/        # System-wide rules (ARCH-*)
│   ├── apps/                # Per-application rules (APP-*)
│   ├── data/                # Data model rules (DATA-*)
│   ├── env/                 # Environment config rules (ENV-*)
│   ├── hub/                 # Application shell rules (HUB-*)
│   ├── integration/         # External service rules (INT-*)
│   └── ui/                  # UI pattern rules (UI-*)
├── agents/                   # AI audit agent protocols (AGT-*)
└── personas/                 # AI personas for specialized tasks (PER-*)
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui + Wouter (routing)
- **Backend**: Express 5 + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Replit Auth
- **Build**: Vite + esbuild
- **External Integration**: n8n (workflow automation)

## Key Commands

```bash
# Development
npm run dev          # Start dev server (client + server)

# Build
npm run build        # Build for production

# Production
npm run start        # Run production build

# Type checking
npm run check        # TypeScript type check

# Database
npm run db:push      # Push Drizzle schema to database
```

## Architecture Principles

### 1. Rules-First Development (ARCH-000)
**No code shall be written without first consulting the rules.**

Before ANY development task:
1. Identify applicable rules using `rules/manifest.json` routing
2. Read the full content of applicable rules
3. Only then proceed with implementation
4. Include a Rules Context block in task completion

### 2. Orchestrator Pattern (ARCH-000 Principle A)
**All external communication must flow through the Orchestration Layer.**

- **DO**: Call n8n through `POST /api/orchestrate/:workflowId`
- **DON'T**: Make direct HTTP calls to external services from routes

The orchestrator provides:
- Full request/response logging
- Trace ID correlation
- Error handling and retry logic
- Future AI agent integration

### 3. Headless Operation (ARCH-000 Principle B)
**All external service configuration must be automated and programmatic.**

- **DO**: Create/update n8n workflows via REST API
- **DON'T**: Manually configure external services in their UIs
- **DON'T**: Ask users to manually modify external systems

### 4. Agent Separation (ARCH-001 D1)
The Replit build agent MUST NOT build AI agents. All AI agents live in n8n.

- **DO**: Build web interfaces that call n8n through the orchestrator
- **DON'T**: Build chatbots, AI logic, or agent orchestration in this codebase

## Database Schema

Defined in `shared/models/`:

- **users** - User authentication (Replit Auth)
- **workflow_executions** - Tracks n8n workflow execution lifecycle
- **communication_traces** - Logs all orchestrator requests/responses
- **used_topics** - Prevents duplicate content generation

## API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/orchestrate/:workflowId` | Execute n8n workflow through orchestrator |
| `GET /api/traces` | List communication traces (admin only) |
| `GET /api/traces/:id` | Get trace details (admin only) |
| `GET /api/rules` | List all rules from manifest |
| `GET /api/rules/:ruleId` | Get rule content |
| `GET /api/rules/:ruleId/preview` | Get rendered rule markdown |
| `GET /api/workflows` | List available workflows |
| `POST /api/workflows/:id/execute` | Execute workflow |
| `POST /api/workflows/callback` | Receive n8n execution callbacks |
| `GET /api/endpoints` | List all API endpoints (for UI info icons) |

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomeDashboard` | Default authenticated landing page |
| `/projects` | `Projects` | Project listing |
| `/projects/:id` | `ProjectDetail` | Project details |
| `/workflows` | `AgenticWorkflows` | n8n workflow management |
| `/memory` | `MemoryExplorer` | View communication traces |
| `/rules` | `RulesExplorer` | Browse rule catalog |
| (unauthenticated) | `Landing` | Public sign-in page |

## Rules System

The Rules Service (`server/rules/`) provides:

1. **Manifest Loading** - Indexes all rules from `rules/manifest.json`
2. **Task Routing** - Routes tasks to relevant rules via keyword matching
3. **Validation** - Validates rule integrity at startup
4. **API Access** - Exposes rules for runtime consultation

### Rule Priorities

1. **ABSOLUTE** - ARCH-000 (Primary Directive)
2. **CRITICAL** - Architecture rules, core principles
3. **HIGH** - Domain-specific rules

### Using the Rules Service

```typescript
import { getRulesService } from "./rules";

const service = getRulesService();
const result = service.routeTask("your task description");
// result.matchedRules - which rules apply
// result.readOrder - what order to read them
```

## Development Guidelines

### DO
- Read all applicable rules before writing code
- Use the orchestrator for ALL external service calls
- Build features in small, testable increments
- Gate all user-facing pages behind authentication
- Use server-side state; avoid complex React state
- Include a Rules Context block when completing tasks
- Use APIs and automation for all configuration changes

### DON'T
- Build AI agents in this codebase (they belong in n8n)
- Make direct HTTP calls to external services
- Build large features in a single session
- Store complex application state in React state/localStorage
- Create per-workflow endpoints (use orchestrator instead)
- Ask users to manually modify external systems
- Modify rules without explicit human approval

## Path Aliases

Configured in `tsconfig.json`:

- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `N8N_API_KEY` - n8n API authentication
- `N8N_BASE_URL` - n8n instance URL

Optional:
- `PORT` - Server port (default: 5000)
- `GEMINI_API_KEY` - Google Gemini API key
- `CALLBACK_URL_OVERRIDE` - Override callback URL for dev

## Current System State

- **Single-user phase**: Bilko is the super admin and sole user
- **Authentication**: All features gated behind Replit Auth
- **n8n Integration**: Self-hosted on separate Replit project
- **Focus**: Utility over polish

## Task Completion Protocol

Per ARCH-010 (Exit Directive), every task completion MUST include:

```
## Rules Context
Primary: ARCH-000 (entry), ARCH-010 (exit)
Applied:
- [RULE-ID] [Directive]: "[Key guidance applied]"
- [RULE-ID] [Directive]: "[Key guidance applied]"
```

## Agents and Personas

Located in `/agents/` and `/personas/`:

- **AGT-002**: Code Audit Protocol - Validates codebase against rules
- **AGT-003**: Rule Audit Protocol - Validates rule structural integrity
- **AGT-004**: Dynamic Code Audit - Detects orphan folders, implementation drift
- **PER-001**: n8n Architect - Expert persona for workflow development

## Key Files

| File | Purpose |
|------|---------|
| `rules/manifest.json` | Rule index, routing, bootstrap config |
| `server/orchestrator/index.ts` | Orchestration layer implementation |
| `server/rules/index.ts` | Rules Service entry point |
| `shared/schema.ts` | Database schema exports |
| `client/src/App.tsx` | React application root |
| `drizzle.config.ts` | Drizzle ORM configuration |

## Remember

**The rules ARE the product. The application is merely the rules made executable.**

Always consult `/rules/` before making changes. When in doubt, read more rules.
