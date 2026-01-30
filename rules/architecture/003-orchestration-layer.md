# Orchestration Layer

Rule ID: ARCH-003
Priority: CRITICAL
Version: 2.0.0

## Context

The Orchestration Layer is the intelligent proxy that sits between the web application and external services (primarily n8n). This rule defines its responsibilities, behavior, and how to call it correctly.

## Purpose

The Orchestration Layer serves three critical functions:

1. **Communication Recording** - Log every request and response for agent learning
2. **Error Handling** - Retry failed requests with optional modification
3. **Future Agent Integration** - Enable AI agents to assist with troubleshooting

---

## Part 1: Layer Responsibilities

### R1: Request Logging
Every outbound request MUST be logged before sending:
- Timestamp
- Target service (workflow ID)
- Request payload
- User context
- Trace ID for correlation

### R2: Response Logging
Every response (success or error) MUST be logged:
- Timestamp
- Response payload or error details
- Duration
- Attempt number
- Final status

### R3: Retry Logic
The orchestrator MUST implement retry logic:
- Default: 3 attempts with exponential backoff
- Respect `retryable` flag from responses
- Log each attempt separately
- Track total duration across attempts

### R4: Error Transformation
Transform external errors into user-friendly messages:
- Never expose internal URLs
- Never expose raw error stacks
- Provide actionable guidance when possible

### R5: Trace Correlation
Every request chain MUST have a unique trace ID:
- Generated at orchestrator entry
- Passed to external services in headers
- Stored with all log entries
- Returned to caller for debugging

---

## Part 2: Dispatch Protocol

This section defines how application code dispatches requests through the Orchestration Layer.

### D1: Single Entry Point
All external service calls MUST go through the orchestrator:
```
POST /api/orchestrate/:workflowId
```

**DO**: Route all n8n calls through orchestrator
**DON'T**: Call n8n directly from routes or frontend

### D2: Include Required Context
Every orchestrated request MUST include:
- User ID (from authenticated session)
- Trace ID (for correlation)
- Action name (what the workflow should do)
- Payload (data for the workflow)

### D3: Async-First
Long-running operations should be handled asynchronously:
- Return trace ID immediately for long operations
- Provide status polling endpoint
- Consider WebSocket for real-time updates (future)

### D4: Idempotency
Design for safe retries:
- Include request ID in all calls
- External services should handle duplicate requests
- Log whether retry was needed

### D5: Graceful Degradation
When external services fail:
- Return cached data if available and appropriate
- Provide clear error message
- Log failure for analysis

### D6: Respect Retry Semantics
The orchestrator handles retries automatically:
- Do not implement retry logic in calling code
- Trust the `retryable` flag from errors
- Log trace IDs for failed operations

---

## Part 3: Request/Response Format

### Request Format

```typescript
const response = await fetch(`/api/orchestrate/${workflowId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'workflow-action-name',
    payload: { /* data */ },
    options: {
      maxRetries: 3,
      timeoutMs: 30000
    }
  })
});
```

### Response Handling

```typescript
const result = await response.json();

if (result.success) {
  // Use result.data
  // Optionally log result.trace.traceId
} else {
  // Handle result.error.message
  // Log result.trace.traceId for debugging
}
```

---

## Database Schema Reference

The orchestrator uses the communication_traces table defined in DATA-002.

## Cross-References

- ARCH-000 Principle A: Founding requirement for orchestrator pattern
- INT-003: Orchestrator Communication Contract
- INT-001: n8n Integration overview
- DATA-002: Communication traces schema

## Rationale

The orchestration layer is the "brain" of the system. By logging all communication and handling errors intelligently, it enables future agents to learn from past interactions and provides complete visibility into system behavior.
