# n8n Integration Rules

Rule ID: INT-001
Priority: HIGH
Version: 2.2.0
Location: `rules/integration/n8n/001-overview.md`

**CONSOLIDATED**: This directory (`rules/integration/n8n/`) contains all n8n-related rules. Start with `index.md` for dynamic loading protocol.

**For AI Agents**: Before any n8n work, load `rules/integration/n8n/index.md` first. See also PER-001 (n8n Architect Persona).

## Context
These rules apply when building integrations with n8n workflows. All n8n communication flows through the Orchestration Layer (see ARCH-003).

## Quick Reference

### Orchestrator Endpoint
All n8n requests flow through:
```
POST /api/orchestrate/:workflowId
```

### Request/Response Contract
See INT-003 for the full contract. Quick summary:

**Request:**
```typescript
interface OrchestrateRequest {
  action: string;
  payload: Record<string, unknown>;
  options?: { maxRetries?: number; timeoutMs?: number; };
}
```

**Response:**
```typescript
interface OrchestrateResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: { code: string; message: string; };
  trace: { traceId: string; attempts: number; totalDurationMs: number; };
}
```

### Key Principles
1. **Never hardcode webhook URLs** - Use registry.json (D9 in INT-002)
2. **All requests are logged** - Full trace storage for debugging
3. **Authentication required** - No unauthenticated n8n access
4. **Errors are transformed** - Never expose raw n8n errors to frontend

## Detailed Practices

For comprehensive coverage including:
- Recency protocol and version awareness
- Known issues registry (ISSUE-001 through ISSUE-013)
- API authentication patterns
- Webhook URL management (D1)
- Rate limiting compliance (D6, D11)
- Security practices (D10, D12)

See **INT-002: n8n API Best Practices**.

## Cross-References
- **index.md**: n8n rules index (load first for dynamic context)
- **002-api-practices.md** (INT-002): Comprehensive practices, Known Issues, Directives
- **004-setup.md** (INT-004): Self-hosting setup guide
- ARCH-003: Orchestration Layer
- INT-003: Orchestrator Communication Contract
- PER-001: n8n Architect Persona

## Changelog

### v2.2.0 (2026-02-01)
- Moved to `rules/integration/n8n/` subfolder
- Added reference to index.md for dynamic loading
- Added reference to PER-001 persona

### v2.1.0 (2026-02-01)
- Consolidated with INT-002; this rule now serves as brief overview
- Detailed directives moved to INT-002

### v2.0.0 (2026-01-25)
- Initial detailed version
