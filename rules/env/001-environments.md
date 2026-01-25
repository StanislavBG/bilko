# ENV-001: Environments

**Priority**: CRITICAL  
**Version**: 1.0.0  
**Last Updated**: 2026-01-25

## Purpose

Defines all deployment environments and their configuration. This is the single source of truth for URLs, naming conventions, and environment-specific settings.

## Environments

| Environment | Replit URL | n8n Webhook Base | Workflow Tag |
|-------------|-----------|------------------|--------------|
| Development | `https://bilko-bibitkov.worf.replit.dev` | `https://bilkobibitkov.app.n8n.cloud/webhook` | `[DEV]` |
| Production | `https://bilkobibitkov.replit.app` | `https://bilkobibitkov.app.n8n.cloud/webhook` | `[PROD]` |

## Naming Conventions

### Workflow Names
All workflow names MUST be prefixed with environment tag:
- Development: `[DEV] Workflow Name`
- Production: `[PROD] Workflow Name`

### Callback URLs
Callbacks in workflow artifacts MUST point to the correct Replit URL for their environment:
- Development workflows → `bilko-bibitkov.worf.replit.dev`
- Production workflows → `bilkobibitkov.replit.app`

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
