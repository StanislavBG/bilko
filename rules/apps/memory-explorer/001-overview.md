# Memory Explorer

Rule ID: APP-MEMORY-001
Priority: HIGH
Version: 1.0.0

## Context
Memory Explorer is an admin-only application that provides visibility into the orchestration layer's communication traces. It enables debugging, pattern analysis, and future agent learning.

## Purpose

The Memory Explorer serves as:
1. **Observability Tool** - View all orchestrator communications
2. **Debugging Aid** - Trace issues through request/response chains
3. **Learning Foundation** - Data for future AI agent improvement

## Access Control

- **Admin only** - Uses `effectiveIsAdmin` from ViewModeContext
- Non-admins should not see this app in navigation

## Views

### V1: Trace List (MVP)
Simple table showing recent traces:
- Timestamp
- Workflow ID
- Action
- Success/Failure status
- Duration

**Sorting**: Most recent first

### V2: Trace Detail (MVP)
Modal or drawer showing full trace:
- All trace metadata
- Request payload (formatted JSON)
- Response payload (formatted JSON)
- Error details if failed

### V3: Trace Chain (Future)
Show related attempts for the same traceId:
- Visual timeline of retry attempts
- Diff between attempts

### V4: Filters (Future)
- Filter by workflow
- Filter by success/failure
- Filter by date range
- Search payloads

## API Endpoints

Uses orchestrator-provided endpoints:
- `GET /api/traces` - List recent traces
- `GET /api/traces/:id` - Get single trace detail

## Directives

### D1: Read-Only
Memory Explorer is strictly read-only. It never modifies traces.

**DO**: Fetch and display trace data
**DON'T**: Provide edit or delete functionality

### D2: Performance
Paginate or limit results to prevent slow loads.

**DO**: Default limit of 50 traces
**DON'T**: Load all traces at once

### D3: Payload Display
Format JSON payloads for readability.

**DO**: Pretty-print with syntax highlighting
**DON'T**: Show raw minified JSON

## Rationale
Starting with a simple trace viewer enables immediate debugging capability and familiarization with the data schema before building more advanced features.
