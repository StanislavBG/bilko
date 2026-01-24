# n8n Integration Rules

Rule ID: INT-001
Priority: HIGH
Version: 2.0.0

## Context
These rules apply when building integrations with n8n workflows. All n8n communication flows through the Orchestration Layer (see ARCH-003).

## Directives

### D1: Webhook URL Storage
Store n8n webhook URLs in environment variables, never hardcode them.

Pattern: `N8N_WEBHOOK_<WORKFLOW_NAME>` (e.g., `N8N_WEBHOOK_BILKO_AGENT`)

### D2: Orchestrator Endpoint
All n8n requests flow through the single orchestrator endpoint:

```
POST /api/orchestrate/:workflowId
```

The orchestrator:
1. Logs the request
2. Maps `workflowId` to the appropriate webhook URL
3. Forwards to n8n with context headers
4. Logs the response
5. Handles retries on failure
6. Returns result with trace ID

### D3: Request/Response Contract
All n8n communication follows the contract in INT-003:

**Request to orchestrator:**
```typescript
interface OrchestrateRequest {
  action: string;
  payload: Record<string, unknown>;
  options?: {
    maxRetries?: number;
    timeoutMs?: number;
  };
}
```

**Response from orchestrator:**
```typescript
interface OrchestrateResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
  trace: {
    traceId: string;
    attempts: number;
    totalDurationMs: number;
  };
}
```

### D4: Error Handling
The orchestrator transforms n8n errors into user-friendly messages:
- Never expose n8n URLs or internal errors to the frontend
- Return trace ID for debugging
- Log full error details in trace record

### D5: Authentication Required
All orchestrator endpoints require authentication. Never allow unauthenticated access to n8n workflows.

### D6: Trace Correlation
Every request generates a trace ID that correlates:
- All retry attempts
- The n8n execution ID
- Error details if any

Use trace ID for debugging and agent learning.

## Additional Practices
See INT-002 for n8n API best practices and documentation references.

## Rationale
The orchestrator pattern ensures all n8n communication is logged, errors are handled intelligently, and the system can scale to many workflows without per-workflow code changes.
