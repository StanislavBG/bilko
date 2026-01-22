# Bilko Bibitkov

## Overview
Bilko Bibitkov is a rule-driven web application that serves as the "face" for n8n-hosted AI agents. The application is built with a structured rule framework that guides the Replit build agent during development.

## Architecture

### System Boundaries
- **Replit Application**: Web UI, authentication, API proxy layer, database
- **n8n**: AI agents, workflow automation, external API integrations

### Core Principles (from `/rules/`)
1. **Agent Separation**: Replit does NOT build AI agents - they live in n8n
2. **Incremental Development**: Move slowly, build in small increments
3. **Auth-First**: All features gated behind authentication from day one
4. **Stateless UI**: Server-side state preferred over client-side
5. **Generic Webhook Proxy**: Single pattern for all n8n integrations

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
  /models/                 # Drizzle models (auth.ts)
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

## n8n Project Setup

A separate Replit project hosts n8n for workflow automation:
- Template: Node.js
- Database: PostgreSQL
- Deployment: Reserved VM (always-on)
- Copy `/rules/shared/` to the n8n project so both agents understand the system

## Current State
- Phase 1: Foundation with auth and rule framework
- Auth: Replit Auth configured
- Database: PostgreSQL provisioned
- UI: Minimal authenticated landing page

## User Preferences
- Move slowly and incrementally
- No over-building or hallucinations
- Rules guide development, not manage features
- Super admin: Bilko
