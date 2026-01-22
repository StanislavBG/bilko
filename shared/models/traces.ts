import { pgTable, text, timestamp, jsonb, integer, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const communicationTraces = pgTable("communication_traces", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // Correlation
  traceId: text("trace_id").notNull(),
  attemptNumber: integer("attempt_number").notNull().default(1),
  
  // Request info
  service: text("service").notNull(),
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
  success: boolean("success"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  
  // Metadata
  n8nExecutionId: text("n8n_execution_id"),
});

export const insertCommunicationTraceSchema = createInsertSchema(communicationTraces).omit({
  id: true,
});

export type CommunicationTrace = typeof communicationTraces.$inferSelect;
export type InsertCommunicationTrace = z.infer<typeof insertCommunicationTraceSchema>;
