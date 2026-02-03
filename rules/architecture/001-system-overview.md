# ARCH-001: System Overview

**Version**: 1.0.0
**Priority**: CRITICAL
**Partition**: architecture
**Dependencies**: ARCH-000
**Merged From**: ARCH-001 v2.0.0 (Core Principles), ARCH-007 v1.1.0 (System Purpose)

## Purpose

Defines the overall system purpose, mission, and core architectural principles. This is the "what we're building and how" companion to ARCH-000's "what we believe."

---

## Part 1: System Purpose

### System Overview

**Bilko Bibitkov** is a two-part system:
1. **Web Application** (Replit) - The "face" that users interact with
2. **Workflow Engine** (n8n on Replit) - The "brain" that hosts AI agents and automation

### Mission Statement

Provide a unified, authenticated web interface for AI-powered workflow automation. The system separates concerns cleanly: the web application handles user interaction, authentication, and data persistence, while n8n handles AI agents, business logic, and external API integrations.

### Current Phase: Single-User (Year 1)

- **Bilko** is the super admin and sole user
- No public registration or multi-tenancy
- All features gated behind authentication
- Focus on utility over polish

---

## Part 2: Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Tailwind CSS + Shadcn UI |
| Backend | Express + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Replit Auth |
| Workflows | n8n (self-hosted on Replit) |

---

## Part 3: Core Principles

### D1: Agent Separation
The Replit build agent MUST NOT build AI agents. All AI agents live in n8n.

**DO**: Build web interfaces that call n8n through the orchestrator
**DON'T**: Build chatbots, AI logic, or agent orchestration in this codebase

### D2: Auth-First
Authentication must be present from the first build.

**DO**: Gate all user-facing pages behind authentication
**DON'T**: Build features assuming auth will be added later

### D3: Stateless UI Patterns
The web application UI should be stateless where possible.

**DO**: Use server-side state, URL parameters, and query strings
**DON'T**: Store complex application state in React state or localStorage

### D4: Orchestrator-First Communication
All external service calls MUST go through the Orchestration Layer. See ARCH-003.

**DO**: Use `/api/orchestrate/:workflowId` for n8n calls
**DON'T**: Create direct API calls to external services bypassing the orchestrator

### D5: Communication Tracing
All orchestrator requests and responses MUST be logged. See DATA-002.

**DO**: Log before sending, update after receiving
**DON'T**: Allow any external call to bypass logging

### D6: Automation-First
All configuration MUST be performed programmatically via APIs.

**DO**: Use APIs, scripts, and automation for all changes
**DON'T**: Ask users to manually edit n8n workflows, database records, or configurations

---

## Cross-References

- ARCH-000: Primary Directive (what we believe)
- ARCH-002: Agent Protocol (how to work here)
- ARCH-003: System Architecture (boundaries and orchestration)
- DATA-002: Communication traces schema
