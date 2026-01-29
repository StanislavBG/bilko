# ENV-001: Environments

**Priority**: CRITICAL  
**Version**: 1.3.0  
**Last Updated**: 2026-01-26

## Purpose

Defines all deployment environments and their configuration. This is the single source of truth for URLs, naming conventions, and environment-specific settings.

## Environments

| Environment | Replit URL | n8n Webhook Path | Workflow n8n ID |
|-------------|-----------|------------------|-----------------|
| Development | Dynamic (from `REPLIT_DOMAINS`) | `dev-european-football-daily` | `vHafUnYAAtDX3TRO` |
| Production | `https://bilkobibitkov.replit.app` | `european-football-daily` | `oV6WGX5uBeTZ9tRa` |

### Development Domain Behavior
Development domains are **dynamic** and change on container restart. The current dev domain is available via the `REPLIT_DOMAINS` environment variable. Example: `91ed71cb-7291-48f5-a070-a3f5b7f27ed4-00-1krg253x2da17.worf.replit.dev`

### Webhook Path Separation (v1.3.0)
DEV and PROD workflows now have **separate webhook paths**. Both can be active simultaneously in n8n.

- PROD: `/webhook/european-football-daily`
- DEV: `/webhook/dev-european-football-daily`

**Note**: After updating webhook paths via API, you must still save the workflow in n8n UI to register the new webhook (known n8n limitation per INT-002).

## Naming Conventions

### Workflow Names in n8n
- Development: `[DEV] European Football Daily` (ID: `vHafUnYAAtDX3TRO`)
- Production: `[PROD] European Football Daily` (ID: `oV6WGX5uBeTZ9tRa`)

### Workflow Registry IDs (Replit App)
- Development: `dev-european-football-daily`
- Production: `european-football-daily`

### Webhook Path Convention
- Production workflows: Use workflow slug (e.g., `european-football-daily`)
- Development workflows: Prefix with `dev-` (e.g., `dev-european-football-daily`)

### Callback URLs

**In Replit App Code** (`server/workflows/router.ts`):
- The app dynamically constructs callbackUrl based on environment
- Dev: Uses `REPLIT_DOMAINS` env var (dynamic, changes on restart)
- Prod: Uses stable `https://bilkobibitkov.replit.app/api/workflows/callback`
- The callbackUrl is passed to n8n via webhook payload

**In n8n Workflow Nodes**:
- Development workflows: Use dynamic expression `={{ $('Webhook').first().json.body.callbackUrl }}`
- Production workflows: Use hardcoded `https://bilkobibitkov.replit.app/api/workflows/callback`

### TraceId Path in n8n Nodes
Both DEV and PROD workflows should use: `$('Webhook').first().json.body.traceId`

## Development Testing Procedure

With separate webhook paths, testing is simpler:
1. Both DEV and PROD workflows can be **active simultaneously**
2. Trigger DEV workflow from Replit app using `dev-european-football-daily` registry ID
3. Callbacks will reach the dev Replit domain automatically
4. No need to deactivate PROD for testing

## Usage

When building or modifying n8n workflows:
1. Check ENV-002 (Workflow Registry) for existing artifacts
2. Use the correct environment URLs from this table
3. Apply the appropriate workflow tag prefix (`[DEV]` or `[PROD]`)
4. Use the correct webhook path prefix (`dev-` for development)
5. Store artifacts in the correct `/rules/env/artifacts/{env}/workflows/` directory

## Cross-References
- ENV-002: Workflow Registry
- INT-003: Orchestrator Communication Contract
- AGT-001: n8n Development Workflow (in /agents/)
