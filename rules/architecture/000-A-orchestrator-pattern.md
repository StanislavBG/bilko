# Founding Principle: Orchestrator Pattern

Rule ID: ARCH-000-A
Priority: ABSOLUTE
Version: 1.0.0
Parent: ARCH-000

## The Founding Principle

**ALL EXTERNAL COMMUNICATION MUST FLOW THROUGH THE ORCHESTRATION LAYER.**

This is one of three founding principles that together form the immutable foundation of Bilko Bibitkov development:
- ARCH-000: Rules-First Development
- ARCH-000-A: Orchestrator Pattern (this rule)
- ARCH-000-B: Headless Operation

## Context

The Orchestration Layer is the intelligent proxy that mediates all communication between the Bilko web application and external services. No direct calls to external APIs, webhooks, or services are permitted.

## Why This Matters

1. **Observability** - Every external call is logged with full request/response data
2. **Debuggability** - Trace IDs correlate requests across systems
3. **Recoverability** - Failed requests can be retried with modification
4. **Learning** - The Memory Explorer reveals all system behavior
5. **Future AI** - Agents can analyze past interactions to improve

## Directives

### D1: Single Entry Point
All external calls MUST route through the orchestrator:
```
POST /api/orchestrate/:serviceId
```

**DO**: Call n8n through orchestrator dispatch
**DON'T**: Make HTTP calls directly from routes or components

### D2: Trace Everything
Every external interaction MUST be recorded in `communication_traces`:
- Request payload
- Response payload
- Timing data
- User context
- Trace ID for correlation

### D3: Error Transformation
Raw external errors MUST be transformed:
- Never expose internal URLs
- Never expose raw stack traces
- Provide user-friendly messages
- Log full details for debugging

### D4: Orchestrator Owns External
The orchestrator is the ONLY code that directly touches external services:
- n8n webhook calls
- n8n API management
- Future: Any other external service

## Relationship to ARCH-003

ARCH-003 (Orchestration Layer) defines the implementation details. This founding principle (ARCH-000-A) establishes the immutable requirement that the orchestrator pattern MUST be used.

## Hierarchy

This founding principle has ABSOLUTE priority alongside ARCH-000 and ARCH-000-B. Together they form the immutable foundation that cannot be overridden by any other rule.

## Rationale

Without centralized orchestration:
- External calls scatter across the codebase
- Debugging requires code archaeology
- No visibility into system behavior
- Failures are silent or cryptic
- AI agents cannot learn from history

The orchestrator makes the invisible visible.
