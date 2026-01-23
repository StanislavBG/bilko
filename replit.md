# Bilko Bibitkov

## Primary Directive (ARCH-000)

**NO CODE SHALL BE WRITTEN WITHOUT FIRST CONSULTING THE RULES.**

This is the foundational law of Bilko Bibitkov development. The Rules Service validates at startup and the application will not start if rules are invalid.

## Overview

Bilko Bibitkov is a rule-driven web application that serves as the "face" for n8n-hosted AI agents. The application is built with a structured rule framework that guides the Replit build agent during development.

## Architecture

### System Boundaries
- **Replit Application**: Web UI, authentication, orchestration layer, database, Rules Service
- **n8n** (Cloud or Self-Hosted): AI agents, workflow automation, external API integrations

### Core Principles (from `/rules/`)
1. **Rules-First**: NO code without consulting rules (ARCH-000)
2. **Agent Separation**: Replit does NOT build AI agents - they live in n8n
3. **Incremental Development**: Move slowly, build in small increments
4. **Auth-First**: All features gated behind authentication from day one
5. **Stateless UI**: Server-side state preferred over client-side
6. **Orchestrator-First**: All external calls go through the orchestration layer
7. **Communication Tracing**: All requests/responses are logged for agent learning

### Rules Service (First-Class Citizen)

The Rules Service (`/server/rules/`) is a first-class service that:
- **Indexes** all 19 rules via machine-readable manifest (`rules/manifest.json`)
- **Routes** tasks to specific rules via keyword and red-flag matching
- **Validates** rule integrity at startup (missing files, broken references, orphan rules)
- **Enforces** the Primary Directive by failing to start if rules are invalid

The application WILL NOT START if rules validation fails.

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
- **Rules Engine**: Custom Rules Service with manifest-driven routing

## Project Structure

```
/rules/                    # Development rule framework (THE HEART)
  manifest.json            # Machine-readable rule index
  /shared/                 # Cross-project rules (copy to n8n project)
  /architecture/           # System-wide architectural rules
    000-primary-directive.md  # THE PRIMARY DIRECTIVE
  /hub/                    # Application Hub shell and access control
  /apps/                   # Per-application rules
    /home-dashboard/       # Home Dashboard rules
    /memory-explorer/      # Memory Explorer app rules
  /data/                   # Data model and persistence rules
  /ui/                     # User interface rules
  /integration/            # External service integration rules

/server/                   # Express backend
  /rules/                  # Rules Service (FIRST-CLASS)
    types.ts               # TypeScript interfaces
    manifest.ts            # Manifest loader
    validator.ts           # Integrity validation
    router.ts              # Task-to-rules routing
    index.ts               # Main service entry point
  /replit_integrations/    # Auth module
  db.ts                    # Database connection
  routes.ts                # API routes
  storage.ts               # Data access layer

/client/                   # React frontend
  /src/
    /components/ui/        # Shadcn components
    /hooks/                # React hooks (including use-auth)
    /lib/                  # Utilities
    /pages/                # Route pages

/shared/                   # Shared types and schemas
  /models/                 # Drizzle models
    auth.ts                # Users and sessions
    traces.ts              # Communication traces (DATA-002)
  schema.ts                # Main schema exports
```

## Rule Routing System

### The Rules Service

The Rules Service provides programmatic access to rules:

```typescript
import { getRulesService } from "./rules";

const service = getRulesService();
const result = service.routeTask("add n8n webhook integration");
// Returns matched rules, read order, citation format
```

### Machine-Readable Manifest

All rules are indexed in `rules/manifest.json` with:
- Unique ID, title, file path
- Partition (shared, architecture, hub, apps, data, ui, integration)
- Priority (ABSOLUTE, CRITICAL, HIGH, MEDIUM, LOW)
- Triggers (keywords that activate this rule)
- Dependencies (rules that must also be read)
- Cross-references (related rules)

### Reading Order
1. **Always first**: ARCH-000 (Primary Directive)
2. **Then**: `/rules/shared/` (system context, contracts)
3. **If structural decisions**: `/rules/architecture/`
4. **Then task-specific partitions** based on routing

### Red Flags (Mandatory Reading Triggers)

When these words/concepts appear, STOP and read the indicated partition:

- **External service names** (n8n, Stripe, etc.) -> `/rules/integration/`
- **"database", "table", "schema", "migrate"** -> `/rules/data/`
- **"user sees", "layout", "page", "component"** -> `/rules/ui/`
- **"hub", "sidebar", "navigation shell", "access control"** -> `/rules/hub/`
- **"endpoint", "API route", "authentication"** -> `/rules/architecture/`
- **"new app", "new feature"** -> `/rules/apps/` + `/rules/architecture/`

### Cross-Reference Protocol

When a rule cites another rule (e.g., "see ARCH-003"), read that referenced rule before proceeding.

### Modification Protocol (per ARCH-002)

Before changing ANY rule:
1. Re-read ALL rules in that partition
2. Check for conflicts with proposed change
3. Update version number
4. Update `rules/manifest.json` to reflect changes

### Accountability

Every response involving code changes MUST include:

```
---
Rules consulted: ARCH-000, ARCH-003, INT-001, INT-002
Not applicable: DATA-* (no database changes)
Primary Directive: Verified
---
```

This creates an explicit reasoning trail and surfaces gaps early.

## n8n Integration

Currently using n8n Cloud for workflow development. Self-hosting option documented in SHARED-004.

### n8n Cloud Setup
- Store `N8N_API_KEY` as secret for management operations
- Store webhook URLs as `N8N_WEBHOOK_<WORKFLOW_NAME>` secrets
- All calls go through orchestrator (`/api/orchestrate/:workflowId`)

### Recency Protocol (INT-002)
Before any n8n work:
1. Search live documentation for the specific feature
2. Check Known Issues Registry in INT-002
3. Verify API endpoints actually exist
4. Test in isolation before integration

### Self-Hosting (Future)
A separate Replit project can host n8n:
- Template: Node.js
- Database: PostgreSQL
- Deployment: Reserved VM (always-on)
- See SHARED-004 for complete setup guide
- Copy `/rules/shared/` to the n8n project

## Current State
- Phase 2: Application Hub with Memory Explorer
- Auth: Replit Auth configured with admin role
- Database: PostgreSQL with users and communication_traces tables
- UI: Application Hub layout (full-height nav, header over app area)
- Dashboard: Admin sees overview, non-admin sees "coming soon"
- Memory Explorer: Admin-only trace viewer for orchestrator communications
- Orchestrator: `/api/orchestrate/:workflowId` endpoint with trace logging
- Rules Service: Initialized at startup, validates 19 rules
- Admin: Bilko (user ID 45353844)

## User Preferences
- Move slowly and incrementally
- No over-building or hallucinations
- Rules guide development, not manage features
- Super admin: Bilko
- Rules are the heart of the project - first-class citizen
