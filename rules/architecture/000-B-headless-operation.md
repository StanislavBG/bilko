# Founding Principle: Headless Operation

Rule ID: ARCH-000-B
Priority: ABSOLUTE
Version: 1.0.0
Parent: ARCH-000

## The Founding Principle

**ALL EXTERNAL SERVICE CONFIGURATION MUST BE AUTOMATED AND PROGRAMMATIC.**

This is one of three founding principles that together form the immutable foundation of Bilko Bibitkov development:
- ARCH-000: Rules-First Development
- ARCH-000-A: Orchestrator Pattern
- ARCH-000-B: Headless Operation (this rule)

## Context

"Headless" means the system operates without requiring manual intervention in external service UIs. Configuration, synchronization, and management of external services (primarily n8n) happens automatically through APIs, not through clicking around in dashboards.

## Why This Matters

1. **Reproducibility** - Any environment can be recreated programmatically
2. **Version Control** - All configuration lives in code, not external UIs
3. **Auditability** - Changes are tracked through git, not manual actions
4. **Scalability** - No human bottleneck for operations
5. **Recovery** - System can self-heal after failures

## Directives

### D1: API-First Configuration
All external service setup MUST use management APIs:

**DO**: Create/update n8n workflows via REST API
**DON'T**: Manually create workflows in n8n UI

### D2: Auto-Sync on Startup
External service state MUST synchronize automatically:
- Workflows sync to n8n on server startup
- Webhook URLs cache automatically
- No manual "deploy" steps required

### D3: Local Definitions as Source of Truth
Workflow definitions, webhook paths, and configuration live in the codebase:
- `server/workflows/registry.json` - workflow definitions
- Code defines structure, external service reflects it

### D4: Eliminate Manual Environment Variables
Where possible, derive configuration automatically:

**DO**: Auto-cache webhook URLs from synced workflows
**DON'T**: Require `N8N_WEBHOOK_*` environment variables

### D5: Document Exceptions
When manual intervention is unavoidable (due to external bugs), document it:
- Add to Known Issues Registry (INT-002)
- Include workaround steps
- Track until resolved

## Known Exceptions

### n8n Webhook Registration Bug (INT-002 ISSUE-001)
Workflows created via API may not register webhooks properly. One-time manual save in n8n UI may be required. This is a documented exception, not a violation of the headless principle.

## Relationship to INT-002

INT-002 (n8n API Best Practices) provides implementation guidance. This founding principle (ARCH-000-B) establishes the immutable requirement that headless operation MUST be the default.

## Hierarchy

This founding principle has ABSOLUTE priority alongside ARCH-000 and ARCH-000-A. Together they form the immutable foundation that cannot be overridden by any other rule.

## Rationale

Without headless operation:
- Setup requires tribal knowledge
- Environments drift out of sync
- Onboarding is manual and error-prone
- Changes aren't tracked or reversible
- The system cannot self-maintain

Headless operation makes the system autonomous.
