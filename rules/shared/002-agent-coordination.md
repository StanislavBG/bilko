# Agent Coordination

Rule ID: SHARED-002
Priority: CRITICAL
Version: 1.0.0
Applies To: All Bilko Bibitkov projects (UI and n8n)

## Context
The Bilko Bibitkov system spans two Replit projects, each with its own build agent. This rule defines clear ownership boundaries.

## Project Ownership

### Web Application Project (This Project)
**Owns:**
- User authentication and session management
- Web UI and user experience
- PostgreSQL database for application data
- API proxy layer for n8n webhooks
- User preferences and settings storage

**Does NOT Own:**
- AI agent logic or LLM integrations
- Workflow orchestration
- External API integrations (Slack, email, etc.)
- Business process automation

### n8n Project (Separate Replit)
**Owns:**
- AI agents and LLM integrations
- Workflow automation and orchestration
- External API integrations
- Webhook endpoints for receiving requests
- Business logic and decision-making

**Does NOT Own:**
- User authentication
- Web UI components
- User-facing pages
- Session management

## Communication Pattern

```
[User] → [Web App] → [Webhook Proxy] → [n8n Workflow] → [AI Agent/External APIs]
                                              ↓
[User] ← [Web App] ← [Response] ← ← ← ← ← ← ←
```

## Coordination Rules

### C1: No Overlap
Each project must stay within its ownership boundaries. If a feature requires both, implement the pieces in their respective projects.

### C2: Webhook Contract
All communication between projects uses the webhook contract defined in SHARED-003.

### C3: Independent Deployment
Each project can be deployed independently. Changes to one should not require changes to the other unless the webhook contract changes.

### C4: Shared Rules
Both projects must have a copy of the `/rules/shared/` directory. Changes to shared rules must be propagated to both projects.

## Rationale
Clear ownership prevents agents from overstepping boundaries and ensures the system remains modular and maintainable.
