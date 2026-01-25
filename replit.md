# Bilko Bibitkov

Founding Principles: ARCH-000, ARCH-000-A, ARCH-000-B (ABSOLUTE priority)
Rules: `/rules/` — read ARCH-006 before any task
Stack: React + Tailwind + Shadcn | Express | PostgreSQL + Drizzle | Replit Auth
Preferences: Move slowly, rules-first, no over-building

## Agentic Workflows

**For n8n development**: Follow AGT-001 (`rules/agent/001-n8n-development-workflow.md`)
- 6-phase cycle: FETCH → ANALYZE → MODIFY → PUSH → BACKUP → VERIFY
- Single change per cycle, checkpoint gates between phases
- Backups saved to `server/workflows/backups/`

## Recent Changes (January 2026)

### European Football Daily Workflow - FULLY COMPLIANT WITH IMAGE GENERATION
- **Status**: Fully operational with AI-generated images via Imagen API + compliance filtering
- **Compliance Features**:
  1. Generate Image prompt instructs Gemini to avoid real person names
  2. Compliance Sanitizer node rewrites prompts to remove celebrity references
  3. Two-post output: Main content + AI Transparency disclosure
  4. Graceful fallback when Imagen filters content
- **Image Generation Flow**: Generate Image → Parse Image Prompt → **Compliance Sanitizer** → Parse Compliance → Call Imagen API → Parse Response → Build Final Output
- **Key Technical Details**:
  1. Custom User-Agent header on all Google API calls (Google blocks n8n default)
  2. Imagen model: `imagen-4.0-fast-generate-001` (6s response, 1.5-1.7MB images)
  3. Express body-parser limit: 10mb for base64 image payloads
  4. Strip Gemini markdown fences before JSON parsing
- **Workflow Nodes**: 25 total

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
7. **Imagen Safety Filters**: Imagen silently returns empty predictions (not errors) when prompts mention specific celebrities or real people - workflow should handle gracefully
