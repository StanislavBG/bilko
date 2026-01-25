# Bilko Bibitkov

## Founding Principles

Three immutable principles (ABSOLUTE priority):

1. **ARCH-000: Rules-First** - NO CODE WITHOUT CONSULTING RULES
2. **ARCH-000-A: Orchestrator Pattern** - ALL EXTERNAL COMMUNICATION THROUGH ORCHESTRATION LAYER
3. **ARCH-000-B: Headless Operation** - ALL EXTERNAL CONFIG AUTOMATED AND PROGRAMMATIC

## Rules Location

All rules in `/rules/`. Read `ARCH-006` (Agent Bootstrap) before any task.

- **Manifest**: `rules/manifest.json`
- **Service**: `/server/rules/`

## Stack

React + Tailwind + Shadcn | Express + Node | PostgreSQL + Drizzle | Replit Auth

## Admin

Bilko (user ID 45353844)

## Design

Minimal text-only (UI-005). Black/white monochrome. No decorative icons.

## Key Patterns

- **ActionPanel**: Right-nav for actions (UI-007)
- **ActionBar**: Section headers (`variant="page"` | `variant="section"`)
- **Workflows**: Registry at `server/workflows/registry.json`, dispatched via router

## n8n Integration

- Auto-sync on startup
- Webhook URLs auto-cached (ARCH-000-B compliant)
- Known issues in INT-002 (ISSUE-001: manual save required for webhook registration)

## User Preferences

- Move slowly and incrementally
- Rules are first-class citizens
- No over-building
