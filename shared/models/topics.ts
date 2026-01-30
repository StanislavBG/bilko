import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const usedTopics = pgTable("used_topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  workflowId: text("workflow_id").notNull(),
  
  headline: text("headline").notNull(),
  
  headlineHash: text("headline_hash").notNull(),
  
  usedAt: timestamp("used_at").notNull().defaultNow(),
  
  metadata: text("metadata"),
}, (table) => ({
  workflowIdIdx: index("idx_used_topics_workflow_id").on(table.workflowId),
  usedAtIdx: index("idx_used_topics_used_at").on(table.usedAt),
  headlineHashIdx: index("idx_used_topics_headline_hash").on(table.headlineHash),
}));

export const insertUsedTopicSchema = createInsertSchema(usedTopics).omit({
  id: true,
  usedAt: true,
});

export type UsedTopic = typeof usedTopics.$inferSelect;
export type InsertUsedTopic = z.infer<typeof insertUsedTopicSchema>;
