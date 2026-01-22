# System Boundaries

Rule ID: ARCH-002
Priority: HIGH
Version: 1.0.0

## Context
Defines the boundaries between Replit application and external systems.

## Directives

### D1: Replit Application Responsibilities
The Replit application is responsible for:
- User authentication and session management
- Serving the web UI (React frontend)
- API proxy layer to n8n webhooks
- Database persistence for user data and application state
- Admin portal interfaces
- Customer portal interfaces

### D2: n8n Responsibilities
n8n is responsible for:
- All AI agent logic and orchestration
- External API integrations (OpenAI, etc.)
- Workflow automation
- Complex business logic that benefits from visual workflow design

### D3: Communication Pattern
All communication between Replit and n8n flows through:
- Replit backend → n8n webhook (POST request)
- n8n → Replit backend (webhook response)

Never allow direct frontend-to-n8n communication.

## Rationale
Clear boundaries prevent scope creep and ensure each system does what it does best.
