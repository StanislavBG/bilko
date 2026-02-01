# ENV-002: Workflow Registry

**Priority**: HIGH  
**Version**: 1.1.0  
**Last Updated**: 2026-02-01

## Purpose

Central registry of all n8n workflows with their environment-specific artifacts and operational details. This is the authoritative source for locating workflow definitions, n8n IDs, and webhook URLs.

## Registry

| Workflow ID | Name | n8n ID | Webhook Path | Status |
|-------------|------|--------|--------------|--------|
| `european-football-daily` | European Football Daily | `oV6WGX5uBeTZ9tRa` | `european-football-daily` | Active |
| `echo-test` | Bilko Echo Test | (simple test) | `bilko-echo-test` | Active |

## Artifact Locations

| Workflow ID | DEV Artifact | PROD Artifact |
|-------------|--------------|---------------|
| `european-football-daily` | `artifacts/dev/workflows/european-football-daily.json` | `artifacts/prod/workflows/european-football-daily.json` |
| `echo-test` | N/A | N/A |

## Human Goals/Objectives

| Workflow ID | Purpose | Key Outputs |
|-------------|---------|-------------|
| `european-football-daily` | Multi-source European football news aggregation with AI-generated Facebook posts | `postContent`, `imagePrompt`, hashtags |
| `echo-test` | Simple connectivity test for n8n webhook integration | Echo response |

## Artifact File Naming

Workflow artifact files follow this pattern:
```
/rules/env/artifacts/{environment}/workflows/{workflow-id}.json
```

Where:
- `{environment}` is `dev` or `prod`
- `{workflow-id}` matches the ID in the registry table

## Artifact Contents

Each artifact JSON contains:
- `name`: Full workflow name with environment tag (e.g., `[PROD] European Football Daily`)
- `nodes`: All n8n nodes with environment-specific callback URLs
- `connections`: Node connection graph
- `settings`: Workflow settings

## Maintenance

When creating or updating workflows:
1. Update the registry table above
2. Store artifacts in the correct directory
3. Ensure callback URLs match ENV-001 environment configuration
4. Follow AGT-001 for development workflow (FETCH → ANALYZE → MODIFY → PUSH → BACKUP → VERIFY)

## Cross-References
- ENV-001: Environments
- AGT-001: n8n Development Workflow (in /agents/)
- AGT-003: Workflow Contract (in /agents/)
