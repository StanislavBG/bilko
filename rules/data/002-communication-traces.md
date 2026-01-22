# Communication Trace Storage

Rule ID: DATA-002
Priority: HIGH
Version: 1.0.0

## Context
This rule defines the schema and practices for storing communication traces. The orchestration layer logs all requests and responses to enable agent learning and debugging.

## Purpose

Communication traces serve multiple purposes:
1. **Debugging** - Trace issues through request/response chains
2. **Agent Learning** - AI agents can query history to improve
3. **Audit Trail** - Complete record of all external interactions
4. **Performance Analysis** - Track response times and failure rates

## Schema Definition

### communication_traces Table
```typescript
// shared/models/traces.ts
import { pgTable, text, timestamp, jsonb, integer, boolean, uuid } from "drizzle-orm/pg-core";

export const communicationTraces = pgTable("communication_traces", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // Correlation
  traceId: text("trace_id").notNull(), // Groups related attempts
  attemptNumber: integer("attempt_number").notNull().default(1),
  
  // Request info
  service: text("service").notNull(), // e.g., "n8n"
  workflowId: text("workflow_id").notNull(),
  action: text("action"), // The action being performed
  
  // User context
  userId: text("user_id").notNull(),
  
  // Timing
  requestedAt: timestamp("requested_at").notNull(),
  respondedAt: timestamp("responded_at"),
  durationMs: integer("duration_ms"),
  
  // Payloads (stored as JSONB for querying)
  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  
  // Status
  success: boolean("success"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  
  // Metadata
  n8nExecutionId: text("n8n_execution_id"),
});

export type CommunicationTrace = typeof communicationTraces.$inferSelect;
export type InsertCommunicationTrace = typeof communicationTraces.$inferInsert;
```

## Indexes

Create indexes for common query patterns:
```sql
CREATE INDEX idx_traces_trace_id ON communication_traces(trace_id);
CREATE INDEX idx_traces_user_id ON communication_traces(user_id);
CREATE INDEX idx_traces_workflow_id ON communication_traces(workflow_id);
CREATE INDEX idx_traces_requested_at ON communication_traces(requested_at);
CREATE INDEX idx_traces_success ON communication_traces(success);
```

## Directives

### D1: Log Before Send
Create the trace record BEFORE sending the request:
```typescript
const trace = await storage.createTrace({
  traceId: generateTraceId(),
  service: "n8n",
  workflowId,
  userId,
  requestedAt: new Date(),
  requestPayload: payload,
  attemptNumber: 1,
});
```

### D2: Update After Response
Update the trace record AFTER receiving response:
```typescript
await storage.updateTrace(trace.id, {
  respondedAt: new Date(),
  durationMs: Date.now() - startTime,
  responsePayload: response,
  success: response.success,
  errorCode: response.error?.code,
  errorMessage: response.error?.message,
  n8nExecutionId: response.metadata?.executionId,
});
```

### D3: New Record Per Attempt
Create a NEW trace record for each retry attempt:
- Same `traceId` for correlation
- Increment `attemptNumber`
- Allows analysis of what changed between attempts

### D4: Payload Sanitization
Before storing payloads:
- Remove sensitive data (passwords, tokens)
- Truncate extremely large payloads
- Log truncation indicator if applied

### D5: Retention Policy
Implement retention to manage database size:
- Keep detailed traces for 30 days
- Archive summary data beyond 30 days
- Configurable per environment

## Query Patterns

### Get Trace Chain
```typescript
async getTraceChain(traceId: string): Promise<CommunicationTrace[]> {
  return db.select()
    .from(communicationTraces)
    .where(eq(communicationTraces.traceId, traceId))
    .orderBy(communicationTraces.attemptNumber);
}
```

### Get Recent Failures
```typescript
async getRecentFailures(workflowId: string, limit: number): Promise<CommunicationTrace[]> {
  return db.select()
    .from(communicationTraces)
    .where(and(
      eq(communicationTraces.workflowId, workflowId),
      eq(communicationTraces.success, false)
    ))
    .orderBy(desc(communicationTraces.requestedAt))
    .limit(limit);
}
```

### Get User History
```typescript
async getUserHistory(userId: string, limit: number): Promise<CommunicationTrace[]> {
  return db.select()
    .from(communicationTraces)
    .where(eq(communicationTraces.userId, userId))
    .orderBy(desc(communicationTraces.requestedAt))
    .limit(limit);
}
```

## Agent Access

Future AI agents will query traces to:
- Understand past failures and fixes
- Learn optimal request patterns
- Suggest troubleshooting steps
- Identify recurring issues

Design queries with agent consumption in mind.

## Rationale
Complete communication traces enable debugging, performance analysis, and future agent learning. The schema balances detail with query performance.
