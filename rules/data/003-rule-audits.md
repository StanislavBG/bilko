# Rule Audit Storage

Rule ID: DATA-003
Priority: HIGH
Version: 1.0.0

## Context
This rule defines the schema for storing rule audit reports. Audits are performed by agents following ARCH-009 and saved for historical tracking.

## Purpose

Rule audit storage serves:
1. **Historical Record** - Track audits over time
2. **Trend Analysis** - Identify recurring issues
3. **Accountability** - Document when audits were performed

## Schema Definition

### rule_audits Table
```typescript
// shared/models/audits.ts
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const ruleAudits = pgTable("rule_audits", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
});

export type RuleAudit = typeof ruleAudits.$inferSelect;
export type InsertRuleAudit = typeof ruleAudits.$inferInsert;
```

## Directives

### D1: Full Report Storage
Store the complete audit report text, not structured data.

**DO**: Save full markdown report as content
**DON'T**: Parse and store individual findings separately

### D2: Immutable Records
Audit records are append-only. Never modify past audits.

**DO**: Create new audit for each run
**DON'T**: Update or delete existing audits

### D3: Chronological Ordering
Return audits in reverse chronological order (newest first).

**DO**: Order by createdAt DESC
**DON'T**: Use arbitrary ordering

## Query Patterns

### Get Recent Audits
```typescript
async getAudits(): Promise<RuleAudit[]> {
  return db.select()
    .from(ruleAudits)
    .orderBy(desc(ruleAudits.createdAt));
}
```

### Create Audit
```typescript
async createAudit(content: string, createdBy?: string): Promise<RuleAudit> {
  const [audit] = await db.insert(ruleAudits)
    .values({ content, createdBy })
    .returning();
  return audit;
}
```

## Rationale
Simple text storage allows flexibility in audit format while maintaining a complete historical record.
