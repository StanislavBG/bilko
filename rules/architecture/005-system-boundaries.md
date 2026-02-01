# System Boundaries

Rule ID: ARCH-005
Priority: HIGH
Version: 1.1.0

## Context
Defines the high-level boundaries between Replit application and external systems. For detailed ownership and coordination rules, see ARCH-008.

## Boundary Summary

| System | Responsibilities |
|--------|------------------|
| **Replit App** | User auth, Web UI, API proxy, database, portals |
| **n8n** | AI agents, workflow automation, external API integrations |

## Communication Pattern

All inter-system communication flows through the Orchestration Layer (see ARCH-003):

```
[Web App] → [Orchestration Layer] → [n8n]
```

Never allow direct frontend-to-n8n communication.

## Detailed Ownership

For complete ownership boundaries, coordination rules, and agent responsibilities, see:
- **ARCH-008**: Agent Coordination (detailed ownership, coordination rules C1-C5)
- **ARCH-003**: Orchestration Layer (implementation details)
- **INT-003**: Orchestrator Communication Contract

## Rationale
Clear boundaries prevent scope creep and ensure each system does what it does best. This rule provides a quick reference; ARCH-008 provides the complete specification.

## Changelog

### v1.1.0 (2026-02-01)
- Slimmed rule to remove duplication with ARCH-008
- Added boundary summary table
- Added references to detailed rules

### v1.0.0 (2026-01-25)
- Initial rule
