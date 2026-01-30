# Core Architecture Principles

Rule ID: ARCH-001
Priority: CRITICAL
Version: 2.0.0

## Context
These rules apply to ALL development work on Bilko Bibitkov.

## Directives

### D1: Agent Separation
The Replit build agent MUST NOT build AI agents. All AI agents live in n8n and are accessed via the Orchestration Layer.

**DO**: Build web interfaces that call n8n through the orchestrator
**DON'T**: Build chatbots, AI logic, or agent orchestration in the Replit codebase

### D2: Incremental Development
Move slowly and incrementally. Each build session should complete one small, well-defined unit of work.

**DO**: Build features in small, testable increments
**DON'T**: Build large features in a single session without checkpoints

### D3: Auth-First
Authentication must be present from the first build. No public-facing features without auth.

**DO**: Gate all user-facing pages behind authentication
**DON'T**: Build features assuming auth will be added later

### D4: Stateless UI Patterns
The web application UI should be stateless where possible. State lives in the backend or external systems.

**DO**: Use server-side state, URL parameters, and query strings
**DON'T**: Store complex application state in React state or localStorage for core features

### D5: Orchestrator-First Communication
All external service calls MUST go through the Orchestration Layer. See ARCH-003 for full details.

**DO**: Use `/api/orchestrate/:workflowId` for n8n calls
**DON'T**: Create direct API calls to external services bypassing the orchestrator
**DON'T**: Create per-workflow endpoints like `/api/chat` or `/api/support`

### D6: Communication Tracing
All orchestrator requests and responses MUST be logged to the communication traces table. See DATA-002 for schema.

**DO**: Log before sending, update after receiving
**DON'T**: Allow any external call to bypass logging

### D7: Automation-First
All configuration and system changes MUST be performed programmatically via APIs. Never instruct the user to manually modify settings, configurations, or external systems. Exhaust all API and automation options before considering manual intervention.

**DO**: Use APIs, scripts, and automation to push changes to n8n, databases, and external services
**DO**: Retry API calls multiple times with different approaches before giving up
**DO**: Build admin interfaces for any configuration the user might need to change
**DON'T**: Ask users to manually edit n8n workflows, database records, or service configurations
**DON'T**: Abandon API automation after a single failure—try alternative endpoints, authentication methods, or workarounds

## Rationale
These principles ensure the application remains maintainable as it scales to support multiple n8n workflows, admin portals, and customer-facing features. The orchestration layer provides intelligent error handling and creates a trace history for agent learning.
