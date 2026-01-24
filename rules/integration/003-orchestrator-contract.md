# Orchestrator Communication Contract

Rule ID: INT-003
Priority: HIGH
Version: 2.1.0
Partition: integration
Migrated From: SHARED-003 (v2.0.0)

## Context
This rule defines the technical contract for communication through the Orchestration Layer. All requests between the web application and n8n must flow through this layer.

## Architecture Overview

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────┐
│   Web App   │────▶│  Orchestration Layer │────▶│    n8n      │
│  (Frontend) │     │                     │     │  (Workflows)│
└─────────────┘     │  - Log Request      │     └─────────────┘
                    │  - Forward to n8n   │            │
                    │  - Receive Response │◀───────────┘
                    │  - Handle Errors    │
                    │  - Retry if needed  │
                    │  - Log Response     │
                    │  - Return to caller │
                    └─────────────────────┘
```

## Web App → Orchestrator (Internal)

### Endpoint Pattern
```
POST /api/orchestrate/:workflowId
```

### Request Body
```json
{
  "action": "string",
  "payload": {},
  "options": {
    "maxRetries": 3,
    "timeoutMs": 30000,
    "priority": "normal"
  }
}
```

## Orchestrator → n8n (Outbound)

### Request Headers
```
Content-Type: application/json
X-Bilko-User-Id: <authenticated user id>
X-Bilko-Request-Id: <unique request identifier>
X-Bilko-Trace-Id: <trace record id for correlation>
X-Bilko-Timestamp: <ISO 8601 timestamp>
X-Bilko-Attempt: <attempt number, starting at 1>
```

### Request Body (forwarded to n8n)
```json
{
  "action": "string",
  "payload": {},
  "context": {
    "userId": "string",
    "traceId": "string",
    "requestedAt": "ISO 8601 timestamp",
    "attempt": 1
  }
}
```

## n8n → Orchestrator (Response)

### Success Response
```json
{
  "success": true,
  "data": {},
  "metadata": {
    "workflowId": "string",
    "executionId": "string",
    "executedAt": "ISO 8601 timestamp"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "retryable": true,
    "details": {}
  },
  "metadata": {
    "workflowId": "string",
    "executionId": "string",
    "executedAt": "ISO 8601 timestamp"
  }
}
```

## Orchestrator Response (to Web App)

### Final Response
```json
{
  "success": true,
  "data": {},
  "trace": {
    "traceId": "string",
    "attempts": 1,
    "totalDurationMs": 1234,
    "workflowId": "string"
  }
}
```

### Final Error (after retries exhausted)
```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "finalAttempt": 3
  },
  "trace": {
    "traceId": "string",
    "attempts": 3,
    "totalDurationMs": 5678,
    "workflowId": "string"
  }
}
```

## Retry Logic

### Retryable Errors
- Network timeouts
- n8n returns `retryable: true`
- HTTP 5xx responses
- Connection refused

### Non-Retryable Errors
- HTTP 4xx responses (client error)
- n8n returns `retryable: false`
- Validation failures

### Retry Behavior
1. Wait with exponential backoff: 1s, 2s, 4s...
2. Log each attempt to trace
3. Optionally modify request based on error (future: agent-assisted troubleshooting)
4. After max retries, return final error with full trace

## n8n Configuration (Cloud or Self-Hosted)

### n8n Cloud
- Use n8n cloud webhook URLs directly
- Store `N8N_API_KEY` as secret for management operations
- Webhook URLs stored as `N8N_WEBHOOK_<WORKFLOW_NAME>`

### Self-Hosted (Future)
- See INT-004 for setup guide
- Same contract applies

## Security

### Authentication Flow
1. User authenticates with Web App (Replit Auth)
2. Web App validates session
3. Orchestrator adds context headers
4. n8n trusts requests with valid headers

### API Key for n8n Cloud
- Store as `N8N_API_KEY` secret
- Used for workflow management, not webhook triggers
- Webhooks use unique URLs (no auth needed for trigger)

## Rationale
The orchestrator pattern ensures all communication is logged, errors can be handled intelligently, and future agents can learn from the trace history.
