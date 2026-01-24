import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const ruleAudits = pgTable("rule_audits", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
});

export const insertRuleAuditSchema = createInsertSchema(ruleAudits).omit({
  id: true,
  createdAt: true,
});

export type RuleAudit = typeof ruleAudits.$inferSelect;
export type InsertRuleAudit = z.infer<typeof insertRuleAuditSchema>;
