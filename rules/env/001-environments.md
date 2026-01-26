# ENV-001: Environments

**Priority**: CRITICAL  
**Version**: 1.1.0  
**Last Updated**: 2026-01-26

## Purpose

Defines all deployment environments and their configuration. This is the single source of truth for URLs, naming conventions, and environment-specific settings.

## Environments

| Environment | Replit URL | n8n Webhook Path | Workflow n8n ID |
|-------------|-----------|------------------|-----------------|
| Development | Dynamic (from `REPLIT_DOMAINS`) | `european-football-daily-dev` | `vHafUnYAAtDX3TRO` |
| Production | `https://bilkobibitkov.replit.app` | `european-football-daily` | `oV6WGX5uBeTZ9tRa` |

### Development Domain Behavior
Development domains are **dynamic** and change on container restart. The current dev domain is available via the `REPLIT_DOMAINS` environment variable. Example: `91ed71cb-7291-48f5-a070-a3f5b7f27ed4-00-1krg253x2da17.worf.replit.dev`

### n8n Workflow Separation
**CRITICAL**: Dev and prod workflows MUST have different webhook paths to avoid n8n routing conflicts.
- Dev webhook path: `european-football-daily-dev`
- Prod webhook path: `european-football-daily`

The Replit app (`server/workflows/router.ts`) automatically selects the correct webhook path based on environment:
- When `REPLIT_DOMAINS` is set → uses `-dev` suffix
- When `REPLIT_DOMAINS` is absent (production) → uses standard path

## Naming Conventions

### Workflow Names
- Development: `European Football Daily` (ID: `vHafUnYAAtDX3TRO`)
- Production: `[PROD] European Football Daily` (ID: `oV6WGX5uBeTZ9tRa`)

### Callback URLs

**In Replit App Code** (`server/workflows/router.ts`):
- The app dynamically constructs callbackUrl based on environment
- Dev: Uses `REPLIT_DOMAINS` env var (dynamic, changes on restart)
- Prod: Uses stable `https://bilkobibitkov.replit.app/api/workflows/callback`
- The callbackUrl is passed to n8n via webhook payload

**In n8n Workflow Nodes**:
- Development workflows: Use dynamic expression `={{ $('Webhook').first().json.body.callbackUrl }}`
- Production workflows: Use hardcoded `https://bilkobibitkov.replit.app/api/workflows/callback`

## Usage

When building or modifying n8n workflows:
1. Check ENV-002 (Workflow Registry) for existing artifacts
2. Use the correct environment URLs from this table
3. Apply the appropriate workflow tag prefix
4. Store artifacts in the correct `/rules/env/artifacts/{env}/workflows/` directory

## Cross-References
- ENV-002: Workflow Registry
- INT-003: Orchestrator Communication Contract
- AGT-001: n8n Development Workflow
