import { 
  communicationTraces, 
  workflowExecutions,
  type CommunicationTrace, 
  type InsertCommunicationTrace,
  type WorkflowExecution,
  type InsertWorkflowExecution
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

export type ExecutionListItem = Omit<WorkflowExecution, 'finalOutput' | 'metadata'>;
export type TraceListItem = Omit<CommunicationTrace, 'requestPayload' | 'responsePayload'>;

export interface IOrchestratorStorage {
  createTrace(trace: InsertCommunicationTrace): Promise<CommunicationTrace>;
  updateTrace(id: string, updates: Partial<InsertCommunicationTrace>): Promise<CommunicationTrace | undefined>;
  getTrace(id: string): Promise<CommunicationTrace | undefined>;
  getTracesByTraceId(traceId: string): Promise<CommunicationTrace[]>;
  getRecentTraces(limit: number): Promise<CommunicationTrace[]>;
  
  createExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution>;
  updateExecution(id: string, updates: Partial<InsertWorkflowExecution>): Promise<WorkflowExecution | undefined>;
  getExecution(id: string): Promise<WorkflowExecution | undefined>;
  getExecutionByTriggerTrace(traceId: string): Promise<WorkflowExecution | undefined>;
  getWorkflowExecutions(workflowId: string, limit?: number): Promise<ExecutionListItem[]>;
  getExecutionTraces(executionId: string): Promise<TraceListItem[]>;
  getExecutionTracesWithPayloads(executionId: string): Promise<CommunicationTrace[]>;
}

class OrchestratorStorage implements IOrchestratorStorage {
  async createTrace(trace: InsertCommunicationTrace): Promise<CommunicationTrace> {
    const [created] = await db.insert(communicationTraces).values(trace).returning();
    return created;
  }

  async updateTrace(id: string, updates: Partial<InsertCommunicationTrace>): Promise<CommunicationTrace | undefined> {
    const [updated] = await db
      .update(communicationTraces)
      .set(updates)
      .where(eq(communicationTraces.id, id))
      .returning();
    return updated;
  }

  async getTrace(id: string): Promise<CommunicationTrace | undefined> {
    const [trace] = await db.select().from(communicationTraces).where(eq(communicationTraces.id, id));
    return trace;
  }

  async getTracesByTraceId(traceId: string): Promise<CommunicationTrace[]> {
    return db
      .select()
      .from(communicationTraces)
      .where(eq(communicationTraces.traceId, traceId))
      .orderBy(communicationTraces.attemptNumber);
  }

  async getRecentTraces(limit: number = 50): Promise<CommunicationTrace[]> {
    return db
      .select()
      .from(communicationTraces)
      .orderBy(desc(communicationTraces.requestedAt))
      .limit(limit);
  }

  async createExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution> {
    const [created] = await db.insert(workflowExecutions).values(execution).returning();
    return created;
  }

  async updateExecution(id: string, updates: Partial<InsertWorkflowExecution>): Promise<WorkflowExecution | undefined> {
    const [updated] = await db
      .update(workflowExecutions)
      .set(updates)
      .where(eq(workflowExecutions.id, id))
      .returning();
    return updated;
  }

  async getExecution(id: string): Promise<WorkflowExecution | undefined> {
    const [execution] = await db.select().from(workflowExecutions).where(eq(workflowExecutions.id, id));
    return execution;
  }

  async getExecutionByTriggerTrace(traceId: string): Promise<WorkflowExecution | undefined> {
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.triggerTraceId, traceId));
    return execution;
  }

  async getWorkflowExecutions(workflowId: string, limit: number = 20): Promise<ExecutionListItem[]> {
    return db
      .select({
        id: workflowExecutions.id,
        workflowId: workflowExecutions.workflowId,
        externalExecutionId: workflowExecutions.externalExecutionId,
        status: workflowExecutions.status,
        startedAt: workflowExecutions.startedAt,
        completedAt: workflowExecutions.completedAt,
        triggerTraceId: workflowExecutions.triggerTraceId,
        userId: workflowExecutions.userId,
      })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, workflowId))
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(limit);
  }

  async getExecutionTraces(executionId: string): Promise<TraceListItem[]> {
    return db
      .select({
        id: communicationTraces.id,
        executionId: communicationTraces.executionId,
        traceId: communicationTraces.traceId,
        attemptNumber: communicationTraces.attemptNumber,
        sourceService: communicationTraces.sourceService,
        destinationService: communicationTraces.destinationService,
        workflowId: communicationTraces.workflowId,
        action: communicationTraces.action,
        userId: communicationTraces.userId,
        requestedAt: communicationTraces.requestedAt,
        respondedAt: communicationTraces.respondedAt,
        durationMs: communicationTraces.durationMs,
        overallStatus: communicationTraces.overallStatus,
        errorCode: communicationTraces.errorCode,
        errorDetail: communicationTraces.errorDetail,
        details: communicationTraces.details,
        n8nExecutionId: communicationTraces.n8nExecutionId,
      })
      .from(communicationTraces)
      .where(eq(communicationTraces.executionId, executionId))
      .orderBy(communicationTraces.attemptNumber);
  }

  async getExecutionTracesWithPayloads(executionId: string): Promise<CommunicationTrace[]> {
    return db
      .select()
      .from(communicationTraces)
      .where(eq(communicationTraces.executionId, executionId))
      .orderBy(communicationTraces.attemptNumber);
  }
}

export const orchestratorStorage = new OrchestratorStorage();
