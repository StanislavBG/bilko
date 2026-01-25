# Orchestration Dispatch Protocol

Rule ID: ARCH-009
Priority: HIGH
Version: 1.0.0

## Context

This rule defines how application code dispatches requests through the Orchestration Layer. While ARCH-003 defines what the Orchestration Layer IS, this rule specifies how to CALL it correctly.

## Purpose

Ensure consistent, traceable communication with external services (primarily n8n) by standardizing the dispatch protocol across all application code paths.

## Activation

This protocol applies when:
- Making calls to external services (n8n workflows)
- Triggering app-to-app communication
- Dispatching workflow operations programmatically

## Core Responsibilities

### R1: Route Through Orchestrator

All external calls MUST go through the Orchestration Layer:
```
POST /api/orchestrate/:workflowId
```

**DO**: Use the orchestrator endpoint for all n8n calls  
**DON'T**: Call n8n webhooks directly from routes or frontend

### R2: Include Required Context

Every orchestrated request MUST include:
- User ID (from authenticated session)
- Trace ID (for correlation)
- Action name (what the workflow should do)
- Payload (data for the workflow)

### R3: Handle Responses

Process orchestrator responses correctly:
- Check `success` field for outcome
- Use `trace.traceId` for debugging
- Handle errors gracefully with user-friendly messages

### R4: Respect Retry Semantics

The orchestrator handles retries automatically:
- Do not implement retry logic in calling code
- Trust the `retryable` flag from errors
- Log trace IDs for failed operations

## Request Format

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

## Response Handling

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

## Workflow Registry

Known workflows and their IDs:
- Define in environment variables: `N8N_WEBHOOK_<WORKFLOW_NAME>`
- Reference by workflow ID in orchestrate calls

## Cross-References

- ARCH-003: Orchestration Layer (infrastructure definition)
- INT-003: Orchestrator Communication Contract
- INT-001: n8n Integration overview
