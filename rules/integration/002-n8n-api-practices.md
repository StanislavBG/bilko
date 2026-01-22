# n8n API Best Practices

Rule ID: INT-002
Priority: HIGH
Version: 1.1.0

## Context
These rules apply when integrating with n8n via API, whether using n8n cloud or self-hosted. The Replit coding agent should follow these practices for consistent, reliable integration.

## Documentation References

### Primary Sources (Always Consult)
1. **n8n API Documentation**: https://docs.n8n.io/api/
2. **n8n Webhook Documentation**: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
3. **Replit Documentation**: Use the documentation search tools for Replit best practices

### Version Awareness
- n8n API evolves; always check for the latest version
- Document which n8n version the integration was built against
- Test after n8n updates (cloud updates automatically)

## API Authentication

### n8n Cloud API Key
Store the API key as a secret:
```
N8N_API_KEY=<your-api-key>
```

Usage contexts:
- Workflow management (list, enable, disable)
- Execution history queries
- NOT required for webhook triggers

### Webhook Authentication
n8n webhooks use unique URLs as authentication:
- Each webhook has a unique path
- Store webhook URLs as secrets: `N8N_WEBHOOK_<WORKFLOW_NAME>`
- Never expose webhook URLs to frontend

## Directives

### D1: Webhook URL Management
Store n8n webhook URLs in environment variables:
```
N8N_WEBHOOK_CHAT_AGENT=https://your-n8n.cloud/webhook/abc123
N8N_WEBHOOK_SUPPORT_AGENT=https://your-n8n.cloud/webhook/def456
```

Pattern: `N8N_WEBHOOK_<WORKFLOW_NAME>` in SCREAMING_SNAKE_CASE

### D2: API Base URL
For n8n cloud:
```
N8N_API_BASE_URL=https://your-instance.app.n8n.cloud/api/v1
```

For self-hosted (future):
```
N8N_API_BASE_URL=https://your-n8n-repl.replit.app/api/v1
```

### D3: Request Timeout
Set appropriate timeouts for n8n calls:
- Webhook triggers: 30 seconds default (workflows can be slow)
- API calls: 10 seconds default
- Make configurable per workflow if needed

### D4: Error Response Handling
n8n error responses should be parsed carefully:
```typescript
interface N8nError {
  success: false;
  error: {
    code: string;
    message: string;
    retryable?: boolean;
  };
}
```

Map n8n errors to user-friendly messages. Never expose raw n8n errors.

### D5: Execution Tracking
When calling n8n, always:
1. Generate a unique request ID
2. Pass it in `X-Bilko-Request-Id` header
3. Log the n8n execution ID from the response
4. Store correlation for debugging

### D6: Rate Limiting Awareness
n8n cloud has rate limits:
- Be aware of limits for your plan
- Implement client-side rate limiting if needed
- Queue requests during high load

### D7: Payload Size
n8n has payload size limits:
- Check current limits in n8n docs
- Validate payload size before sending
- For large data, consider chunking or external storage

### D8: Programmatic-Only Workflow Management
All n8n workflow creation, modification, and deletion MUST be done via the n8n Management API. Manual operations in the n8n UI are prohibited.

Rationale:
- Ensures reproducibility across environments
- Enables version control of workflow definitions
- Creates auditability of all changes
- Aligns with orchestrator-first architecture (ARCH-003)

The N8N_API_KEY secret enables all management operations programmatically.

## n8n Workflow Design Guidelines

When designing n8n workflows to receive requests:

### Webhook Node Configuration
- Use POST method
- Accept JSON body
- Return structured responses (see SHARED-003)
- Include `workflowId` and `executionId` in responses

### Error Handling in Workflows
- Use Error Trigger nodes for consistent error responses
- Set `retryable: true/false` based on error type
- Include error codes for programmatic handling

### Response Format
All workflows should return the standard response format:
```json
{
  "success": true,
  "data": {},
  "metadata": {
    "workflowId": "workflow_id",
    "executionId": "execution_id",
    "executedAt": "2024-01-01T00:00:00Z"
  }
}
```

## Testing Integration

### Development Testing
- Use n8n's test webhook feature
- Mock n8n responses for unit tests
- Log all requests/responses during development

### Production Monitoring
- Monitor n8n execution history
- Alert on repeated failures
- Track response times

## Rationale
Consistent API practices ensure reliable integration with n8n and make troubleshooting easier. Documentation references ensure the agent uses current best practices.
