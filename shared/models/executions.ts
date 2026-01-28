import { pgTable, text, timestamp, jsonb, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const executionStatusEnum = ["pending", "running", "completed", "failed"] as const;
export type ExecutionStatus = typeof executionStatusEnum[number];

export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  workflowId: text("workflow_id").notNull(),
  externalExecutionId: text("external_execution_id"),
  
  status: text("status").notNull().default("pending"),
  
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  
  triggerTraceId: text("trigger_trace_id"),
  
  finalOutput: jsonb("final_output"),
  
  userId: text("user_id"),
  
  metadata: jsonb("metadata"),
}, (table) => ({
  workflowIdIdx: index("idx_executions_workflow_id").on(table.workflowId),
  startedAtIdx: index("idx_executions_started_at").on(table.startedAt),
  triggerTraceIdIdx: index("idx_executions_trigger_trace_id").on(table.triggerTraceId),
  workflowStartedIdx: index("idx_executions_workflow_started").on(table.workflowId, table.startedAt),
}));

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions).omit({
  id: true,
  startedAt: true,
});

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;
