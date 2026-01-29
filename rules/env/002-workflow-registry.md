# ENV-002: Workflow Registry

**Priority**: HIGH  
**Version**: 1.0.0  
**Last Updated**: 2026-01-25

## Purpose

Central registry of all n8n workflows with their environment-specific artifacts. This is the authoritative source for locating workflow definitions.

## Registry

| Workflow ID | Name | DEV Artifact | PROD Artifact | Status |
|-------------|------|--------------|---------------|--------|
| `european-football-daily` | European Football Daily | `artifacts/dev/workflows/european-football-daily.json` | `artifacts/prod/workflows/european-football-daily.json` | Active |
| `echo-test` | Bilko Echo Test | N/A (simple test) | N/A (simple test) | Active |

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
