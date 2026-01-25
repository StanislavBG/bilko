# Bilko Bibitkov

Founding Principles: ARCH-000, ARCH-000-A, ARCH-000-B (ABSOLUTE priority)
Rules: `/rules/` — read ARCH-006 before any task
Stack: React + Tailwind + Shadcn | Express | PostgreSQL + Drizzle | Replit Auth
Preferences: Move slowly, rules-first, no over-building

## Recent Changes (January 2026)

### European Football Daily Workflow - WORKING
- **Status**: Fully operational - end-to-end workflow completing successfully
- **Root Cause Fixed**: Gemini wraps JSON in markdown code fences (```json ... ```), causing parse failures
- **Solution**: Strip markdown fences before parsing, parse JSON directly without sanitization
- **Key Fixes Applied**:
  1. Custom User-Agent header on all Gemini HTTP Request nodes (Google blocks n8n default)
  2. Fixed webhook body access: `$('Webhook').first().json.body.geminiApiKey`
  3. Strip markdown fences: `/^```[a-zA-Z]*\n?/` and `/\n?```\s*$/`
  4. Parse JSON directly - JSON.parse() handles newlines fine, no sanitization needed
- **Rules Updated**: INT-002 v1.8.0 - Added D14 (Gemini Markdown Fences)

### Execution Tracking System (January 2026) - VERIFIED
- **workflow_executions table**: Tracks execution runs with status, timestamps, and finalOutput (JSONB)
- **Traces linked by executionId**: Communication traces reference parent execution for grouping
- **Callback logic**: First callback creates execution record; final-output callback marks completion and persists output
- **API endpoints**: GET /api/workflows/:id/executions, GET /api/executions/:id
- **UI components**: ExecutionsList, ExecutionDetail with Latest/History view toggle on workflow detail page
- **Rule added**: INT-005 Callback Persistence Contract - documents API payload schemas and data flow
- **E2E Verified**: History view displays execution results with post content and image prompts correctly

### Key n8n Learnings
1. **User-Agent Required**: Google APIs block n8n's default user-agent. Always add custom User-Agent header.
2. **Webhook Body Structure**: Data sent to webhook is at `.json.body.keyName`, not `.json.keyName`
3. **Data Flow**: API keys must be explicitly passed through all Code nodes in n8n workflows
4. **Execution Grouping**: Executions are grouped by triggerTraceId - the traceId from the initial webhook call
5. **Gemini JSON Parsing**: Gemini wraps JSON responses in markdown fences - strip with regex before parsing
6. **No JSON Sanitization Needed**: Don't sanitize structural newlines - JSON.parse() handles them correctly
