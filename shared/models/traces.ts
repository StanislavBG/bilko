import { pgTable, text, timestamp, jsonb, integer, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { workflowExecutions } from "./executions";

export const overallStatusEnum = ["pending", "in_progress", "success", "failed"] as const;
export type OverallStatus = typeof overallStatusEnum[number];

export const communicationTraces = pgTable("communication_traces", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // Execution link
  executionId: uuid("execution_id").references(() => workflowExecutions.id),
  
  // Correlation
  traceId: text("trace_id").notNull(),
  attemptNumber: integer("attempt_number").notNull().default(1),
  
  // Service routing
  sourceService: text("source_service").notNull(),
  destinationService: text("destination_service").notNull(),
  workflowId: text("workflow_id").notNull(),
  action: text("action"),
  
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
  overallStatus: text("overall_status").notNull().default("pending"),
  errorCode: text("error_code"),
  errorDetail: text("error_detail"),
  
  // Structured context (for debugging)
  details: jsonb("details"),
  
  // Metadata
  n8nExecutionId: text("n8n_execution_id"),
}, (table) => ({
  executionIdIdx: index("idx_traces_execution_id").on(table.executionId),
  traceIdIdx: index("idx_traces_trace_id").on(table.traceId),
  workflowIdIdx: index("idx_traces_workflow_id").on(table.workflowId),
  requestedAtIdx: index("idx_traces_requested_at").on(table.requestedAt),
  executionAttemptIdx: index("idx_traces_execution_attempt").on(table.executionId, table.attemptNumber),
}));

export const insertCommunicationTraceSchema = createInsertSchema(communicationTraces).omit({
  id: true,
});

export type CommunicationTrace = typeof communicationTraces.$inferSelect;
export type InsertCommunicationTrace = z.infer<typeof insertCommunicationTraceSchema>;
