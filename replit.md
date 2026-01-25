# Bilko Bibitkov

## Primary Directive

**NO CODE SHALL BE WRITTEN WITHOUT FIRST CONSULTING THE RULES.**

## Rules Location

All development rules are in `/rules/`. The Rules Service validates at startup - the application will not start if rules are invalid.

**Before any task**: Read `ARCH-006` (Agent Bootstrap Protocol) for how the rule system works.

## Quick Reference

- **Rules Index**: `rules/manifest.json`
- **Bootstrap Protocol**: `rules/architecture/006-agent-bootstrap.md`
- **Rules Service**: `/server/rules/`

## Project Overview

Bilko Bibitkov is a rule-driven web application serving as the "face" for n8n-hosted AI agents.

## Technology Stack

- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)

## Current State

- Phase 2: Application Hub with Memory Explorer
- Auth: Replit Auth configured with admin role
- Database: PostgreSQL with users, communication_traces, and rule_audits tables
- Admin: Bilko (user ID 45353844)

## Rule Audits

Rule audits are performed via agentic reasoning (AGENT-001). To run an audit:

1. Ask the agent: "Run a rule audit" or "Act as Rule Architect"
2. The agent will analyze all rules and code following the protocol in AGENT-001
3. Copy the audit report the agent provides
4. Go to Rules Explorer > Audit > New Audit and paste the report to save it

Saved audits are stored in the database with timestamps for historical tracking.

## Rule Partitions

- **architecture** - System-wide rules and principles
- **hub** - Application shell and access control
- **ui** - User interface patterns
- **data** - Data models and persistence
- **apps** - Per-application rules
- **integration** - External service contracts
- **agent** - Agentic workflow protocols (audits, reasoning)

## Design Philosophy

- Minimal, text-only aesthetic (UI-005)
- No decorative icons in navigation - text labels only
- Action icons (close, toggle) are permitted
- Plain text for priority/status (no colored badges)
- Relative sizing with rem-based min/max constraints
- Black/white/gray color palette
- Application actions separate from navigation (UI-007)

## ActionBar Component

Use `ActionBar` from `@/components/action-bar` for consistent section headers with actions:
- `variant="page"` - Large title (text-2xl) for page headers
- `variant="section"` - Smaller title (text-lg) for nested sections
- `icon` - Optional leading icon
- `actions` - Buttons on right side (use size="sm")

## User Preferences

- Move slowly and incrementally
- No over-building or hallucinations
- Rules are the heart of the project - first-class citizen
- Super admin: Bilko
