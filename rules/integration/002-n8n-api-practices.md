# n8n API Best Practices

Rule ID: INT-002
Priority: HIGH
Version: 1.6.0

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
- **Status**: UNRESOLVED - n8n Cloud infrastructure bug (as of January 2026)
- **GitHub Issues**: #21614, #22782, #23498, #16858
- **Description**: Workflows activated via API do not register webhooks with n8n's routing layer. The webhook returns 404 "not registered" even when API shows `active: true`. This affects n8n Cloud especially - it's a tenant routing table sync issue.
- **Root Cause**: API activation doesn't call n8n's internal `/rest/webhooks/find` endpoint that properly registers webhooks with the routing layer.
- **Workaround Options**:
  1. **Toggle off/on**: In n8n UI, toggle workflow OFF, wait 5 seconds, toggle ON
  2. **Edit and save**: Make any minor change in workflow editor and press Ctrl+S
  3. **Contact n8n support**: For persistent issues, reference GitHub #22782 and request "webhook routing table resync"
- **Impact on headless**: This is an **exception** to ARCH-000-B (Headless Operation). Initial manual intervention required, but subsequent syncs should work once webhook is registered.

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

### ISSUE-006: Sync Overwrites User Changes
- **Status**: RESOLVED (January 2026)
- **Description**: The startup sync was overwriting existing n8n workflows with local registry.json definitions, deleting user changes (sticky notes, manual edits) and resetting webhook registration.
- **Root Cause**: `syncWorkflow()` called `updateWorkflow()` on existing workflows, pushing local node definitions.
- **Fix**: Changed sync to skip updates for existing workflows - only create new workflows and cache webhook URLs.
- **Impact**: Existing n8n workflows are now preserved. To push local changes to n8n, delete the workflow in n8n first, then restart the server to re-create it.

### ISSUE-007: Webhook Path Mismatch Between n8n and Bilko
- **Status**: RESOLVED (January 2026)
- **Description**: Webhook calls returned 404 despite n8n workflow being active. Investigation revealed Bilko was calling `/webhook/echo-test` while n8n workflow was configured with path `bilko-echo-test` (or other variants like `bilko-echo-1769334020`).
- **Root Cause**: Webhook paths were defined in multiple places with no single source of truth:
  1. `client.ts buildWorkflowNodes()` - hardcoded in function
  2. n8n workflow (editable in UI, potentially divergent)
  3. Registry endpoint env var (e.g., `N8N_WEBHOOK_ECHO_TEST`)
- **Symptoms**:
  - API reports `active: true` but webhook returns 404
  - After manual UI save, webhook works but path differs from Bilko's expectation
  - Debug logs show mismatched paths between cached URL and actual call
- **Fix**: Establish single source of truth via D9 directive (see below). Webhook paths defined in `registry.json`, read by `buildWorkflowNodes()`, cached during sync.
- **Prevention**: Always verify the exact webhook path in the production URL before testing. Compare:
  1. n8n UI → Webhook node → Path field
  2. Bilko logs → `[webhook-cache] Cached URL for...`
  3. Actual curl call URL

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

### D9: Single Source of Truth for Workflow Definitions
All n8n workflow configuration MUST be defined in a single authoritative location: `server/workflows/registry.json`.

**Mandatory Fields for n8n Workflows**:
```json
{
  "id": "workflow-id",
  "name": "Human Readable Name",
  "mode": "n8n",
  "webhookPath": "unique-webhook-path",
  "description": "...",
  "instructions": "...",
  "category": "..."
}
```

**Rules**:
1. **webhookPath is authoritative**: The `webhookPath` field in registry.json is the single source of truth for webhook URLs
2. **buildWorkflowNodes reads from registry**: `client.ts buildWorkflowNodes()` MUST read webhook paths from registry, never hardcode
3. **No duplicate definitions**: Webhook paths must not be defined in:
   - Hardcoded strings in `client.ts`
   - Environment variables (deprecated pattern)
   - Multiple registry entries
4. **Sync caches from registry**: `sync.ts` uses registry's `webhookPath` to build cached webhook URLs

**Verification Checklist** (before any webhook testing):
- [ ] `registry.json` has `webhookPath` field for the workflow
- [ ] `buildWorkflowNodes()` reads from registry (not hardcoded)
- [ ] n8n workflow's Webhook node has matching path
- [ ] Server logs show correct cached URL on startup

**Rationale**: ISSUE-007 occurred because webhook paths existed in multiple places. A single source eliminates drift between Bilko's expectation and n8n's configuration.

### D10: Header-Based API Key Authentication (SECURITY)
When n8n workflows call external APIs that require authentication, API keys MUST be passed in HTTP headers, NOT in URL query parameters.

**Prohibited Pattern** (exposes secrets in logs/URLs):
```
URL: https://api.example.com/endpoint?api_key=SECRET_VALUE
```

**Required Pattern** (secrets in headers, not logged):
```
URL: https://api.example.com/endpoint
Headers:
  Content-Type: application/json
  x-api-key: SECRET_VALUE (or Authorization: Bearer SECRET_VALUE)
```

**Rationale**:
- URL query parameters appear in web server logs, proxy logs, and browser history
- Headers are not logged by default in most systems
- Industry security best practice (OWASP recommendation)

**Service-Specific Headers**:
| Service | Header Name |
|---------|-------------|
| Google Gemini | `x-goog-api-key` |
| OpenAI | `Authorization: Bearer {key}` |
| Anthropic | `x-api-key` |
| Generic | `Authorization: Bearer {key}` or `X-API-Key` |

**Implementation in n8n HTTP Request Node**:
1. Set `sendQuery: false` (disable query parameters for auth)
2. Add API key to `headerParameters` array
3. Never include secrets in URL or query parameter fields

**Verification**: Before deploying any workflow with external API calls, verify:
- [ ] No secrets appear in URL fields
- [ ] API key is in headers, not query parameters
- [ ] n8n execution logs don't show the secret in the URL

### D11: External API Rate Limit Compliance
When n8n workflows call external APIs with rate limits (especially AI/LLM APIs), implement protective measures to avoid quota exhaustion and `429` errors.

**Official Documentation**: https://ai.google.dev/gemini-api/docs/rate-limits (always consult for current limits)

**Required for AI/LLM API Calls**:

1. **Retry Configuration on HTTP Request Nodes**:
   ```
   retryOnFail: true
   maxTries: 5
   waitBetweenTries: 5000 (5 seconds, fixed delay)
   ```
   **CRITICAL**: For retry to work, "On Error" must be set to "Stop Workflow" (default), not "Continue". Verify each HTTP Request node has this setting.
   
   Note: n8n's built-in retry uses fixed delay, not exponential backoff. For exponential backoff, implement a custom retry subflow using error output + Wait nodes with incremental delays.

2. **Wait Nodes Between Sequential API Calls**:
   Add 3-5 second delays between consecutive calls to the same API to respect RPM limits.
   ```
   [API Call 1] -> [Wait 3s] -> [API Call 2] -> [Wait 3s] -> [API Call 3]
   ```

3. **Token Budget Awareness**:
   - Monitor input/output token counts
   - Consider batching multiple prompts into single requests where possible
   - Use lighter models (e.g., Flash-Lite vs Pro) for simple tasks

**Gemini API Limits (Illustrative Examples - Check Official Docs for Current Values)**:
| Model | RPM | TPM | RPD |
|-------|-----|-----|-----|
| Gemini 2.5 Pro | ~5 | ~250K | ~25 |
| Gemini 2.5 Flash | ~15 | ~250K | ~1,000 |
| Gemini 2.5 Flash-Lite | ~15 | ~250K | ~1,000 |

*Limits change frequently. Always verify at: https://ai.google.dev/gemini-api/docs/rate-limits*

**Implementation in n8n**:
- Set node-level retry settings (not in parameters.options)
- Verify each HTTP Request node has `On Error: Stop Workflow`
- Use Wait nodes (n8n-nodes-base.wait) with `unit: "seconds"` and `amount: 3-5`
- Position Wait nodes between consecutive API calls to same service

**Verification Checklist**:
- [ ] HTTP Request nodes have retryOnFail: true
- [ ] HTTP Request nodes have On Error: Stop Workflow
- [ ] Wait nodes exist between sequential LLM API calls
- [ ] Connection chain verified via API (all Wait nodes properly wired)
- [ ] Workflow tested with rate limit simulation

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
