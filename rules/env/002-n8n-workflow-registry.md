# ENV-002: n8n Workflow Registry

**Priority**: HIGH  
**Version**: 2.0.0  
**Last Updated**: 2026-02-01

## Purpose

Central registry of all n8n workflows. This is the authoritative source for locating workflow definitions, n8n IDs, and webhook URLs.

## Registry

| Workflow ID | Name | n8n ID | Webhook Path | Status |
|-------------|------|--------|--------------|--------|
| `european-football-daily` | European Football Daily | `oV6WGX5uBeTZ9tRa` | `european-football-daily` | Active |
| `echo-test` | Bilko Echo Test | (simple test) | `bilko-echo-test` | Active |

## Artifact Locations

Workflow artifacts are stored in `rules/env/artifacts/workflows/` with the n8n ID prefix:

| Workflow ID | Artifact File |
|-------------|---------------|
| `european-football-daily` | `oV6WGX5uBeTZ9tRa-european-football-daily.md` |
| `echo-test` | N/A (simple test workflow) |

## Artifact Contents

Each workflow artifact file contains:
- **Objectives**: Human goals and success criteria
- **Key Nodes**: Purpose and prompt guidelines for important nodes
- **Workflow Definition**: Embedded JSON export from n8n

## Maintenance

When creating or updating workflows:
1. FETCH current workflow from n8n API
2. Update the registry table above
3. Store/update artifact in `artifacts/workflows/{n8n-id}-{workflow-id}.md`
4. Follow PER-001 for development cycle (FETCH → ANALYZE → MODIFY → PUSH → BACKUP → VERIFY)

## Changelog

### v2.0.0 (2026-02-01)
- **BREAKING**: Removed dev/prod artifact separation
- Renamed from `002-workflow-registry.md` to `002-n8n-workflow-registry.md`
- New artifact naming: `{n8n-id}-{workflow-id}.md`
- Artifacts now contain both objectives and JSON definition

### v1.1.0 (2026-02-01)
- Added n8n ID and webhook path columns
- Added Human Goals/Objectives table

## Cross-References

- ENV-001: n8n Instance Configuration
- PER-001: n8n Architect Persona
- INT-002: n8n API Practices
