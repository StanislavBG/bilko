# ARCH-003: System Architecture

**Version**: 1.0.0
**Priority**: CRITICAL
**Partition**: architecture
**Dependencies**: ARCH-000, ARCH-001
**Merged From**: ARCH-003 v2.0.0 (Orchestration), ARCH-005 v1.1.0 (Boundaries), ARCH-008 v2.1.0 (Coordination)

## Purpose

Defines system boundaries, ownership, and the orchestration layer that connects all parts. This is the "who owns what and how they communicate" rule.

---

## Part 1: System Boundaries

### Ownership Summary

| System | Owns | Does NOT Own |
|--------|------|--------------|
| **Web App (Replit)** | Auth, Web UI, Database, Orchestrator, Traces | AI agents, Workflow logic, External APIs |
| **n8n** | AI agents, Workflows, External APIs, Business logic | Auth, Web UI, Sessions, Trace storage |

### Communication Pattern

All inter-system communication flows through the Orchestration Layer:

```
[User] → [Web App] → [Orchestration Layer] → [n8n Workflow]
                            ↓
                    [Logs Request]
                            ↓
                    [Receives Response]
                            ↓
                    [Logs Response]
                            ↓
[User] ← [Web App] ← [Final Response with Trace ID]
```

**Never bypass the orchestrator** - Direct frontend-to-n8n calls are forbidden.

---

## Part 2: Orchestration Layer

The intelligent proxy between web application and external services.

### Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **Request Logging** | Log every outbound request with trace ID |
| **Response Logging** | Log every response (success or error) |
| **Retry Logic** | 3 attempts with exponential backoff |
| **Error Transformation** | User-friendly messages, no raw stacks |
| **Trace Correlation** | Unique trace ID for every request chain |

### Single Entry Point

All external calls use:
```
POST /api/orchestrate/:workflowId
```

### Request/Response Format

```typescript
// Request
const response = await fetch(`/api/orchestrate/${workflowId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'workflow-action-name',
    payload: { /* data */ },
    options: { maxRetries: 3, timeoutMs: 30000 }
  })
});

// Response
const result = await response.json();
if (result.success) {
  // Use result.data, result.trace.traceId
} else {
  // Handle result.error.message
}
```

---

## Part 3: Coordination Rules

### C1: No Overlap
Each project stays within ownership boundaries. Features requiring both are split accordingly.

### C2: Orchestrator Contract
All communication uses the contract defined in INT-003.

### C3: Independent Deployment
Each project can be deployed independently. Contract changes require coordination.

### C4: Cross-Project Rules
Rules ARCH-001, ARCH-003, INT-003 are shared. Changes must be communicated to both projects.

### C5: Trace Ownership
Web application owns all communication traces. n8n uses native logs only.

---

## Dispatch Protocol

### D1: Single Entry Point
Route all n8n calls through the orchestrator.

### D2: Required Context
Every request must include: User ID, Trace ID, Action name, Payload.

### D3: Async-First
Long operations return trace ID immediately for polling.

### D4: Idempotency
Include request ID in all calls for safe retries.

### D5: Graceful Degradation
Return cached data or clear error when external services fail.

---

## Cross-References

- ARCH-000: Primary Directive (Principles A and B)
- ARCH-001: System Overview (tech stack)
- INT-003: Orchestrator Communication Contract
- DATA-002: Communication traces schema
