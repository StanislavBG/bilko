import { communicationTraces, type CommunicationTrace, type InsertCommunicationTrace } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

export interface IOrchestratorStorage {
  createTrace(trace: InsertCommunicationTrace): Promise<CommunicationTrace>;
  updateTrace(id: string, updates: Partial<InsertCommunicationTrace>): Promise<CommunicationTrace | undefined>;
  getTrace(id: string): Promise<CommunicationTrace | undefined>;
  getTracesByTraceId(traceId: string): Promise<CommunicationTrace[]>;
  getRecentTraces(limit: number): Promise<CommunicationTrace[]>;
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
}

export const orchestratorStorage = new OrchestratorStorage();
