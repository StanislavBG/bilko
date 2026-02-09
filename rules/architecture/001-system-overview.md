# ARCH-001: System Overview

**Version**: 2.0.0
**Priority**: CRITICAL
**Partition**: architecture
**Dependencies**: ARCH-000
**Merged From**: ARCH-001 v2.0.0 (Core Principles), ARCH-007 v1.1.0 (System Purpose)

## Purpose

Defines the overall system purpose, mission, and core architectural principles. This is the "what we're building and how" companion to ARCH-000's "what we believe."

---

## Part 1: System Purpose

### System Overview

**Bilko Bibitkov** is a two-part system with a dual-layer AI architecture:

1. **Web Application** (Replit) - The "face" that users interact with. Includes an in-platform LLM service for real-time, user-facing AI experiences.
2. **Workflow Engine** (n8n on Replit) - The "brain" for background automation, scheduled content generation, and multi-service orchestration.

### Mission Statement

Provide a unified, authenticated web interface for AI-powered learning and workflow automation. The system uses two AI layers:

- **In-platform AI** (Gemini via LLM service) for real-time, interactive, user-facing flows (video discovery, chat tutor, voice commands)
- **n8n AI** for background automation, scheduled tasks, and external API orchestration

### Current Phase: Single-User (Year 1)

- **Bilko** is the super admin and sole user
- No public registration or multi-tenancy
- All features gated behind authentication (landing page AI flows work without auth)
- Focus on utility over polish

---

## Part 2: Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Tailwind CSS + Shadcn UI |
| Backend | Express + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Replit Auth |
| In-Platform LLM | Gemini 2.5 Flash via OpenAI-compatible endpoint |
| Background Workflows | n8n (self-hosted on Replit) |
| Voice (TTS) | OpenAI TTS (`tts-1`) |
| Voice (STT) | Web Speech API |

---

## Part 3: Core Principles

### D1: Dual-Layer AI Architecture
User-facing AI flows run in-platform via the LLM service (PER-002). Background automation runs in n8n (PER-001).

**DO**: Use `/api/llm/chat` for real-time, interactive AI features
**DO**: Use n8n via orchestrator for background/scheduled tasks
**DON'T**: Route user-facing interactive flows through n8n (latency, complexity)
**DON'T**: Build background pipelines in React (use n8n)

### D2: Auth-First
Authentication must be present from the first build.

**DO**: Gate all authenticated pages behind Replit Auth
**DO**: Allow landing page AI features to work without auth
**DON'T**: Build features assuming auth will be added later

### D3: Stateless Where Possible
Prefer server-side state, but client-side state is acceptable for agentic flow orchestration and user preferences.

**DO**: Use React state for multi-step agentic flows
**DO**: Use localStorage for user preferences (voice, theme)
**DO**: Use server-side state for persistent data
**DON'T**: Store data that should be in the database in localStorage

### D4: Orchestrator for Background Services
Background n8n calls MUST go through the Orchestration Layer. See ARCH-003.

**DO**: Use `/api/orchestrate/:workflowId` for n8n calls
**DON'T**: Bypass the orchestrator for n8n communication

### D5: Communication Tracing
All orchestrator requests and responses MUST be logged. See DATA-002.

**DO**: Log before sending, update after receiving
**DON'T**: Allow any background call to bypass logging

### D6: Automation-First
All configuration MUST be performed programmatically via APIs.

**DO**: Use APIs, scripts, and automation for all changes
**DON'T**: Ask users to manually edit n8n workflows, database records, or configurations

---

## Cross-References

- ARCH-000: Primary Directive (what we believe)
- ARCH-002: Agent Protocol (how to work here)
- ARCH-003: System Architecture (boundaries and orchestration)
- PER-001: n8n Architect (background automation persona)
- PER-002: In-Platform Workflow Agent (user-facing AI persona)
- DATA-002: Communication traces schema

## Changelog

### v2.0.0 (2026-02-06)
- Major update: introduced dual-layer AI architecture
- D1 rewritten: replaced "no AI in Replit" with dual-layer (in-platform + n8n)
- D3 updated: client-side state acceptable for agentic flows
- D4 scoped to background services only (in-platform LLM calls don't use orchestrator)
- Added Gemini 2.5 Flash, OpenAI TTS, and Web Speech API (STT) to tech stack
- Added PER-001 and PER-002 cross-references

### v1.0.0
- Initial: thin web shell + n8n brain architecture
