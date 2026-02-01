# n8n Integration Rules

Rule ID: INT-001
Priority: HIGH
Version: 2.1.0

**CONSOLIDATED**: This rule now serves as a brief overview. See INT-002 for comprehensive n8n API practices, known issues, and detailed directives.

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
- ARCH-003: Orchestration Layer
- INT-002: n8n API Best Practices (detailed directives)
- INT-003: Orchestrator Communication Contract
- INT-004: n8n Self-Hosting Setup Guide

## Changelog

### v2.1.0 (2026-02-01)
- Consolidated with INT-002; this rule now serves as brief overview
- Detailed directives moved to INT-002

### v2.0.0 (2026-01-25)
- Initial detailed version
