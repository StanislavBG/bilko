# n8n Integration Rules

Rule ID: INT-001
Priority: HIGH
Version: 1.0.0

## Context
These rules apply when building integrations with n8n workflows.

## Directives

### D1: Webhook URL Storage
Store n8n webhook URLs in environment variables, never hardcode them.

Pattern: `N8N_WEBHOOK_<WORKFLOW_NAME>` (e.g., `N8N_WEBHOOK_BILKO_AGENT`)

### D2: Generic Proxy Endpoint
Create a single generic proxy endpoint that routes to multiple n8n workflows:

```
POST /api/webhook/:workflowId
```

The backend maps `workflowId` to the appropriate environment variable.

### D3: Request/Response Schema
All n8n webhook requests should follow a consistent schema:

```typescript
interface WebhookRequest {
  workflowId: string;
  userId: string;
  payload: Record<string, unknown>;
  metadata?: {
    timestamp: string;
    source: string;
  };
}
```

### D4: Error Handling
If n8n is unavailable, return a user-friendly error. Never expose n8n URLs or internal errors to the frontend.

### D5: Authentication Required
All webhook proxy endpoints must require authentication. Never allow unauthenticated access to n8n workflows.

## Rationale
Generic patterns allow the system to scale to many n8n workflows without code changes for each new workflow.
