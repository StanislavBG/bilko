# Bilko Bibitkov

Founding Principles: ARCH-000, ARCH-000-A, ARCH-000-B (ABSOLUTE priority)
Rules: `/rules/` — read ARCH-006 before any task
Stack: React + Tailwind + Shadcn | Express | PostgreSQL + Drizzle | Replit Auth
Preferences: Move slowly, rules-first, no over-building

## Recent Changes (January 2026)

### European Football Daily Workflow - WORKING
- **Status**: Fully operational - end-to-end workflow completing successfully
- **Root Cause Fixed**: Google was blocking n8n's default user-agent (403 Forbidden)
- **Solution**: Added custom User-Agent header to all Gemini HTTP Request nodes
- **Additional Fixes**:
  - Fixed Aggregate Articles to use `$('Webhook').first().json.body.geminiApiKey`
  - Fixed Parse Sentiment/Post/ImagePrompt to pass geminiApiKey through data flow
  - Added JSON sanitization for Gemini responses with control characters
- **Rules Updated**: INT-002 v1.7.0 - Added D12 (User-Agent) and D13 (API Key Data Flow)

### Key n8n Learnings
1. **User-Agent Required**: Google APIs block n8n's default user-agent. Always add custom User-Agent header.
2. **Webhook Body Structure**: Data sent to webhook is at `.json.body.keyName`, not `.json.keyName`
3. **Data Flow**: API keys must be explicitly passed through all Code nodes in n8n workflows
