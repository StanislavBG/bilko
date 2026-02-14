import { pgTable, text, timestamp, jsonb, uuid, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Persistence table for AI-Video flow runs.
 *
 * Stores structured metadata (research, script, timestamps) in PostgreSQL.
 * Video binary files live on disk at `data/video-runs/{runId}/`.
 */
export const videoFlowRuns = pgTable("video_flow_runs", {
  id: uuid("id").defaultRandom().primaryKey(),

  /** Which flow produced this run (e.g. "weekly-football-video", "ai-clip") */
  flowId: text("flow_id").notNull(),

  /** Unique execution ID (matches client-side execution ID) */
  runId: text("run_id").notNull().unique(),

  /** running | completed | failed */
  status: text("status").notNull().default("running"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),

  /** Deep research output (headline, league, summary, keyFacts) */
  research: jsonb("research"),

  /** Video script (title, segments, totalDurationSec, veoStyleTokens) */
  script: jsonb("script"),

  /** Number of individual clips saved */
  clipCount: integer("clip_count").notNull().default(0),

  /** Duration of the final combined video in seconds */
  finalDurationSeconds: real("final_duration_seconds"),

  /** Whether a combined video file exists on disk */
  hasFinalVideo: text("has_final_video").notNull().default("false"),

  /** Error message if the run failed */
  error: text("error"),
}, (table) => ({
  flowIdIdx: index("idx_video_runs_flow_id").on(table.flowId),
  createdAtIdx: index("idx_video_runs_created_at").on(table.createdAt),
  runIdIdx: index("idx_video_runs_run_id").on(table.runId),
}));

export const insertVideoFlowRunSchema = createInsertSchema(videoFlowRuns).omit({
  id: true,
  createdAt: true,
});

export type VideoFlowRun = typeof videoFlowRuns.$inferSelect;
export type InsertVideoFlowRun = z.infer<typeof insertVideoFlowRunSchema>;
