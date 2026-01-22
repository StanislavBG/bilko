# Agent Coordination

Rule ID: SHARED-002
Priority: CRITICAL
Version: 2.0.0
Applies To: All Bilko Bibitkov projects (UI and n8n)

## Context
The Bilko Bibitkov system spans two Replit projects, each with its own build agent. This rule defines clear ownership boundaries.

## Project Ownership

### Web Application Project (This Project)
**Owns:**
- User authentication and session management
- Web UI and user experience
- PostgreSQL database for application data
- **Orchestration Layer** - intelligent proxy between all services
- Communication trace storage (all request/response logs)
- Error handling, retry logic, and troubleshooting coordination
- User preferences and settings storage

**Does NOT Own:**
- AI agent logic or LLM integrations
- Workflow automation logic
- External API integrations (Slack, email, etc.)
- Business process automation

### n8n (Cloud or Self-Hosted)
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
- Communication logging/tracing

## Communication Pattern

All inter-service communication flows through the Orchestration Layer:

```
[User] → [Web App] → [Orchestration Layer] → [n8n Workflow]
                            ↓
                    [Logs Request]
                            ↓
                    [Receives Response or Error]
                            ↓
                    [If Error: Troubleshoot & Retry]
                            ↓
                    [Logs Response]
                            ↓
[User] ← [Web App] ← [Final Response with Trace]
```

### Key Principles
- **All communication is recorded** - Every request and response is logged to the trace database
- **Errors trigger retry logic** - The orchestrator can modify and retry failed requests
- **Agents can query traces** - Future AI agents can learn from the communication history
- **Never bypass the orchestrator** - Direct frontend-to-n8n calls are forbidden

## Coordination Rules

### C1: No Overlap
Each project must stay within its ownership boundaries. If a feature requires both, implement the pieces in their respective projects.

### C2: Orchestrator Contract
All communication between projects uses the orchestrator contract defined in SHARED-003.

### C3: Independent Deployment
Each project can be deployed independently. Changes to one should not require changes to the other unless the contract changes.

### C4: Shared Rules
Both projects must have a copy of the `/rules/shared/` directory. Changes to shared rules must be propagated to both projects.

### C5: Trace Ownership
The web application owns all communication traces. n8n workflows should not maintain their own execution logs beyond what n8n provides natively.

## Rationale
The orchestration layer creates an intelligent, self-healing proxy that records all communication. This enables future agents to learn from past interactions and provides a complete audit trail.
