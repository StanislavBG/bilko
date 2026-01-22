# Bilko Bibitkov

## Overview
Bilko Bibitkov is a rule-driven web application that serves as the "face" for n8n-hosted AI agents. The application is built with a structured rule framework that guides the Replit build agent during development.

## Architecture

### System Boundaries
- **Replit Application**: Web UI, authentication, orchestration layer, database
- **n8n** (Cloud or Self-Hosted): AI agents, workflow automation, external API integrations

### Core Principles (from `/rules/`)
1. **Agent Separation**: Replit does NOT build AI agents - they live in n8n
2. **Incremental Development**: Move slowly, build in small increments
3. **Auth-First**: All features gated behind authentication from day one
4. **Stateless UI**: Server-side state preferred over client-side
5. **Orchestrator-First**: All external calls go through the orchestration layer
6. **Communication Tracing**: All requests/responses are logged for agent learning

### Orchestration Layer
The orchestration layer is an intelligent proxy that:
- Routes all requests to n8n via `/api/orchestrate/:workflowId`
- Logs every request and response to the communication_traces table
- Handles retries with exponential backoff on failures
- Enables future agent-assisted troubleshooting
- Creates an audit trail for AI agents to learn from

See ARCH-003 for full details.

## Technology Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)

## Project Structure

```
/rules/                    # Development rule framework
  /shared/                 # Cross-project rules (copy to n8n project)
  /architecture/           # System-wide architectural rules
  /features/               # Feature-specific rules
  /data/                   # Data model and persistence rules
  /ui/                     # User interface rules
  /integration/            # External service integration rules

/client/                   # React frontend
  /src/
    /components/ui/        # Shadcn components
    /hooks/                # React hooks (including use-auth)
    /lib/                  # Utilities
    /pages/                # Route pages

/server/                   # Express backend
  /replit_integrations/    # Auth module
  db.ts                    # Database connection
  routes.ts                # API routes
  storage.ts               # Data access layer

/shared/                   # Shared types and schemas
  /models/                 # Drizzle models
    auth.ts                # Users and sessions
    traces.ts              # Communication traces (DATA-002)
  schema.ts                # Main schema exports
```

## Rule Consumption Workflow

Before each development task, the agent should:
1. Read `/rules/README.md` to understand the framework
2. Read `/rules/shared/` first for system context
3. Identify which rule partitions apply
4. Read rules in priority order (shared → architecture → features → data → ui → integration)
5. Apply rules during implementation
6. Before modifying rules, re-read all existing rules in the affected partition (per ARCH-002)

## n8n Integration

Currently using n8n Cloud for workflow development. Self-hosting option documented in SHARED-004.

### n8n Cloud Setup
- Store `N8N_API_KEY` as secret for management operations
- Store webhook URLs as `N8N_WEBHOOK_<WORKFLOW_NAME>` secrets
- All calls go through orchestrator (`/api/orchestrate/:workflowId`)

### Self-Hosting (Future)
A separate Replit project can host n8n:
- Template: Node.js
- Database: PostgreSQL
- Deployment: Reserved VM (always-on)
- See SHARED-004 for complete setup guide
- Copy `/rules/shared/` to the n8n project

## Current State
- Phase 2: Application Hub with layout shell
- Auth: Replit Auth configured with admin role
- Database: PostgreSQL with users.isAdmin field
- UI: Application Hub layout (full-height nav, header over app area)
- Dashboard: Admin sees overview, non-admin sees "coming soon"
- Admin: Bilko (user ID 45353844)

## User Preferences
- Move slowly and incrementally
- No over-building or hallucinations
- Rules guide development, not manage features
- Super admin: Bilko
