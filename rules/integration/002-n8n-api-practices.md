# n8n API Best Practices

Rule ID: INT-002
Priority: HIGH
Version: 1.3.0

## Context
These rules apply when integrating with n8n via API, whether using n8n cloud or self-hosted. The Replit coding agent should follow these practices for consistent, reliable integration.

## CRITICAL: Recency Protocol

### Why This Matters
AI training data becomes stale. n8n v2.0 (December 2024) introduced breaking changes that invalidate prior knowledge. The agent MUST verify current behavior before implementing.

### Mandatory Steps Before Any n8n Work
1. **Search live documentation** using web search tools for the specific feature
2. **Check the Known Issues Registry** (below) for documented bugs
3. **Verify API endpoints** actually exist - don't assume from training data
4. **Test in isolation** before integrating into application code

### Current n8n Version Context
- **Target Version**: n8n v2.0+ (December 2024 onwards)
- **Major Change**: "Activate/Deactivate" replaced with "Publish/Unpublish"
- **API Endpoint**: `/workflows/{id}/activate` still works but behavior changed
- **Last Verified**: January 2026

## Known Issues Registry

### ISSUE-001: Webhook Registration Bug (CRITICAL)
- **Status**: UNRESOLVED (as of January 2026)
- **GitHub Issues**: #21614, #14646
- **Description**: Workflows created or activated via API do not properly register webhooks. The webhook returns 404 "not registered" even when the workflow shows `active: true`.
- **Workaround**: One-time manual action required - open workflow in n8n UI and save/toggle it to trigger internal webhook registration.
- **Impact on D8**: This is an **exception** to the "API-only" rule. Document when manual intervention was required.

### ISSUE-002: Respond to Webhook Configuration
- **Status**: RESOLVED (configuration issue)
- **Description**: Error "Unused Respond to Webhook node found in workflow"
- **Root Cause**: Webhook node `responseMode` must be set to `"responseNode"` (not `"lastNode"`) when using a Respond to Webhook node.
- **Fix**: Set `parameters.responseMode: "responseNode"` in Webhook node configuration.

### ISSUE-003: PUT Workflow Requires Settings Property (CRITICAL)
- **Status**: DOCUMENTED (January 2026)
- **Description**: `PUT /workflows/{id}` returns 400 "request/body must have required property 'settings'" even when only updating nodes/connections.
- **Root Cause**: n8n API validation requires the `settings` property in the request body, even for updates that don't modify settings.
- **Fix**: Always include `settings: { executionOrder: "v1" }` (or copy existing settings) in update payloads.
- **Impact on headless**: This is undocumented behavior; sync code must include settings.

### ISSUE-004: API Response Omits Node Definitions
- **Status**: DOCUMENTED (January 2026)
- **Description**: `GET /workflows` and `GET /workflows/{id}` responses include workflow metadata but NOT the `nodes` array. This makes it impossible to extract webhook URLs from API responses.
- **Root Cause**: n8n API design decision - node definitions are only available when creating/updating workflows.
- **Workaround**: Derive webhook URLs from LOCAL workflow definitions (registry.json), not from n8n API responses. Cache these URLs during sync.
- **Impact on headless**: Webhook URL auto-caching must use source definitions, not API responses.

### ISSUE-005: Error Response Format Mismatch
- **Status**: RESOLVED (January 2026)
- **Description**: n8n error responses (e.g., 404 for unregistered webhooks) use a different format than our expected AGENT-003 contract. Errors were logged as generic "N8N_ERROR" / "Workflow execution failed" instead of actual n8n messages.
- **Root Cause**: n8n returns `{code: 404, message: "...", hint: "..."}` at top level, but router expected `{error: {code, message}}`.
- **Fix**: Updated `server/workflows/router.ts` to extract error details from both formats: `data.error?.code || data.code` and `data.error?.message || data.message`, plus capture `data.hint`.
- **Impact**: Traces now correctly show actual n8n error messages like "The workflow must be active for a production URL to run successfully."

## Documentation References

### Primary Sources (ALWAYS Consult Live)
1. **n8n API Documentation**: https://docs.n8n.io/api/
2. **n8n API Reference**: https://docs.n8n.io/api/api-reference/
3. **n8n v2.0 Breaking Changes**: https://docs.n8n.io/2-0-breaking-changes/
4. **n8n Webhook Documentation**: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
5. **Replit Documentation**: Use the documentation search tools for Replit best practices

### Version Awareness
- n8n API evolves; always check for the latest version
- Document which n8n version the integration was built against
- Test after n8n updates (cloud updates automatically)
- **ALWAYS use web search** to verify current API behavior before implementation

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

### D1: Webhook URL Management (Auto-Cached)
Webhook URLs are automatically cached on server startup during workflow sync:

1. **Auto-Cache (Preferred)**: The sync process extracts webhook paths from local node definitions in `registry.json` and caches them in memory. No manual configuration required.

2. **Fallback (Legacy)**: Environment variables are supported as fallback:
```
N8N_WEBHOOK_CHAT_AGENT=https://your-n8n.cloud/webhook/abc123
```
Pattern: `N8N_WEBHOOK_<WORKFLOW_NAME>` in SCREAMING_SNAKE_CASE

**Implementation**:
- `server/n8n/webhook-cache.ts` - In-memory URL cache
- `server/n8n/sync.ts` - Populates cache during startup sync
- `server/workflows/router.ts` - Uses cached URL, falls back to env var

**Why auto-cache**: Aligns with ARCH-000-B (Headless Operation) - no manual env var setup required.

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

### D8: Programmatic-First Workflow Management
All n8n workflow creation, modification, and deletion SHOULD be done via the n8n Management API. Manual operations in the n8n UI are avoided except where documented bugs require it.

Rationale:
- Ensures reproducibility across environments
- Enables version control of workflow definitions
- Creates auditability of all changes
- Aligns with orchestrator-first architecture (ARCH-003)

The N8N_API_KEY secret enables all management operations programmatically.

**Exception Protocol**: When a known bug (see Known Issues Registry) requires manual intervention:
1. Document the manual action taken
2. Note the date and reason
3. Track in communication_traces if applicable
4. Update the Known Issues Registry when bug is resolved

## n8n Workflow Design Guidelines

When designing n8n workflows to receive requests:

### Webhook Node Configuration
- Use POST method
- Accept JSON body
- Return structured responses (see INT-003)
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
