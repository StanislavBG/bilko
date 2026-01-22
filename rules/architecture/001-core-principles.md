# Core Architecture Principles

Rule ID: ARCH-001
Priority: CRITICAL
Version: 1.0.0

## Context
These rules apply to ALL development work on Bilko Bibitkov.

## Directives

### D1: Agent Separation
The Replit build agent MUST NOT build AI agents. All AI agents live in n8n and are accessed via webhooks.

**DO**: Build web interfaces that call n8n webhooks
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

### D5: Generic Webhook Proxy
API endpoints for n8n integration must be generic and support multiple workflows.

**DO**: Use patterns like `/api/webhook/:workflowId` 
**DON'T**: Create endpoint per workflow like `/api/chat` or `/api/support`

## Rationale
These principles ensure the application remains maintainable as it scales to support multiple n8n workflows, admin portals, and customer-facing features.
