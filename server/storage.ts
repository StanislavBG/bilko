// Storage interface for application-specific data
// Auth storage is handled by server/replit_integrations/auth/storage.ts

import { db } from "./db";
import { ruleAudits, RuleAudit, InsertRuleAudit } from "@shared/schema";
import { desc } from "drizzle-orm";

export interface IStorage {
  createAudit(data: InsertRuleAudit): Promise<RuleAudit>;
  getAudits(): Promise<RuleAudit[]>;
}

export class DatabaseStorage implements IStorage {
  async createAudit(data: InsertRuleAudit): Promise<RuleAudit> {
    const [audit] = await db.insert(ruleAudits).values(data).returning();
    return audit;
  }

  async getAudits(): Promise<RuleAudit[]> {
    return await db.select().from(ruleAudits).orderBy(desc(ruleAudits.createdAt));
  }
}

export const storage = new DatabaseStorage();
