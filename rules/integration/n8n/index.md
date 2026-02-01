# n8n Integration Rules Index

Rule ID: INT-N8N-INDEX
Version: 1.0.0
Type: Index

## Purpose

This index provides a consolidated entry point for all n8n-related rules. When working on any n8n integration, the AI agent MUST read this index first and dynamically load the relevant rules listed below.

## Rule Files in this Directory

| File | Rule ID | Title | Load When |
|------|---------|-------|-----------|
| `001-overview.md` | INT-001 | n8n Integration Overview | Always (quick reference) |
| `002-api-practices.md` | INT-002 | n8n API Best Practices | Any n8n API work |
| `004-setup.md` | INT-004 | n8n Self-Hosting Setup | Setting up n8n instance |

## Dynamic Loading Protocol

When the n8n Architect Persona (PER-001) is activated or any n8n work is initiated:

### Step 1: Load Index
```
READ: rules/integration/n8n/index.md
```

### Step 2: Identify Relevant Rules
Based on the task at hand:
- **Calling n8n webhooks**: Load INT-001, INT-002
- **Managing workflows via API**: Load INT-002 (especially Known Issues Registry)
- **Building/modifying workflows**: Load INT-002 (Directives D1-D14)
- **Setting up n8n instance**: Load INT-004

### Step 3: Load and Parse Key Sections
From `002-api-practices.md`, extract:
- **Known Issues Registry** (ISSUE-001 through ISSUE-013+) - Check for relevant issues
- **Directives** (D1-D14+) - Apply relevant directives
- **Current n8n Version Context** - Verify version compatibility

### Step 4: Apply to Current Task
- Cross-reference task requirements with loaded directives
- Check Known Issues for potential blockers
- Follow the Operating Protocol from PER-001

## Key Content Summary

### Known Issues (from INT-002)
| Issue | Status | Impact |
|-------|--------|--------|
| ISSUE-001 | UNRESOLVED | Webhook registration bug - requires manual toggle |
| ISSUE-003 | DOCUMENTED | PUT requires `settings` property |
| ISSUE-004 | DOCUMENTED | API omits node definitions |
| ISSUE-008 | DOCUMENTED | Expression escaping in programmatic updates |
| ISSUE-011 | RESOLVED | HTTP Request jsonBody with embedded expressions |
| ISSUE-013 | RESOLVED | Gemini rate limiting - add batching |

### Critical Directives (from INT-002)
| Directive | Purpose |
|-----------|---------|
| D1 | Webhook URL Management (Auto-Cached) |
| D9 | Single Source of Truth for Workflow Definitions |
| D10 | Header-Based API Key Authentication |
| D11 | External API Rate Limit Compliance |
| D12 | Custom User-Agent for External API Calls |
| D13 | API Key Data Flow in n8n Workflows |
| D14 | Gemini JSON Response Parsing |

## Cross-References

- PER-001: n8n 2.0+ Architect Persona (uses this index)
- ARCH-003: Orchestration Layer
- INT-003: Orchestrator Communication Contract
- INT-005: Callback Persistence Contract

## Changelog

### v1.0.0 (2026-02-01)
- Initial creation as consolidation of n8n rules into subfolder
- Added dynamic loading protocol
- Added key content summary for quick reference
