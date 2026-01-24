# Orchestration Layer

Rule ID: ARCH-003
Priority: CRITICAL
Version: 1.0.0

## Context
The Orchestration Layer is the intelligent proxy that sits between the web application and external services (primarily n8n). This rule defines its responsibilities and behavior.

## Purpose

The Orchestration Layer serves three critical functions:

1. **Communication Recording** - Log every request and response for agent learning
2. **Error Handling** - Retry failed requests with optional modification
3. **Future Agent Integration** - Enable AI agents to assist with troubleshooting

## Responsibilities

### R1: Request Logging
Every outbound request MUST be logged before sending:
- Timestamp
- Target service (workflow ID)
- Request payload
- User context
- Trace ID for correlation

### R2: Response Logging
Every response (success or error) MUST be logged:
- Timestamp
- Response payload or error details
- Duration
- Attempt number
- Final status

### R3: Retry Logic
The orchestrator MUST implement retry logic:
- Default: 3 attempts with exponential backoff
- Respect `retryable` flag from responses
- Log each attempt separately
- Track total duration across attempts

### R4: Error Transformation
Transform external errors into user-friendly messages:
- Never expose internal URLs
- Never expose raw error stacks
- Provide actionable guidance when possible

### R5: Trace Correlation
Every request chain MUST have a unique trace ID:
- Generated at orchestrator entry
- Passed to external services in headers
- Stored with all log entries
- Returned to caller for debugging

## Directives

### D1: Single Entry Point
All external service calls MUST go through the orchestrator:
```
POST /api/orchestrate/:serviceId
```

**DO**: Route all n8n calls through orchestrator
**DON'T**: Call n8n directly from routes or frontend

### D2: Async-First
Long-running operations should be handled asynchronously:
- Return trace ID immediately for long operations
- Provide status polling endpoint
- Consider WebSocket for real-time updates (future)

### D3: Idempotency
Design for safe retries:
- Include request ID in all calls
- External services should handle duplicate requests
- Log whether retry was needed

### D4: Graceful Degradation
When external services fail:
- Return cached data if available and appropriate
- Provide clear error message
- Log failure for analysis

## Database Schema Reference

The orchestrator uses the communication_traces table defined in DATA-002.

## Rationale
The orchestration layer is the "brain" of the system. By logging all communication and handling errors intelligently, it enables future agents to learn from past interactions and provides complete visibility into system behavior.
