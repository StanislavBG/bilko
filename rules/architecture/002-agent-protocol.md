# ARCH-002: Agent Protocol

**Version**: 1.0.0
**Priority**: CRITICAL
**Partition**: architecture
**Dependencies**: ARCH-000
**Merged From**: ARCH-004 v1.0.0 (Pacing), ARCH-006 v1.2.0 (Bootstrap), ARCH-010 v2.0.0 (Exit), ARCH-011 v2.0.0 (replit.md)

## Purpose

Defines the complete AI agent lifecycle: how to start a session, how to pace work, and how to complete tasks. This is the agent's "operating manual."

---

## Part 1: Session Start (Bootstrap)

When beginning a new session:

1. **Read `replit.md`** - Bootstrap pointer only (15 lines max)
2. **Read `rules/manifest.json`** - Check bootstrap section for reading order
3. **Read ARCH-000** - Primary Directive is absolute
4. **Read this rule (ARCH-002)** - Your operating manual
5. **Read applicable rules** - Based on task requirements

### Using the Rules Service

```typescript
import { getRulesService } from "./rules";
const service = getRulesService();
const result = service.routeTask("your task description");
```

### What Lives Where

| Location | Purpose |
|----------|---------|
| `replit.md` | Bootstrap pointer only (15 lines max) |
| `rules/manifest.json` | Machine index + routing + bootstrap metadata |
| `rules/**/*.md` | Governance guidance (the actual rules) |
| `agents/*.md` | AI protocols for specific tasks (audits, etc.) |

---

## Part 2: Development Pacing

### D1: Verify Before Building
Never build features that depend on external services until verified working.

**DO**: Test the API key works before building the integration
**DON'T**: Assume an integration works and build layers on top

### D2: Explain As You Go
The user is learning. Describe what you're doing and why.

**DO**: "I'm going to test your n8n connection by calling their API"
**DON'T**: Execute multiple steps silently then present the result

### D3: Wait for Confirmation
Complete one step, verify it works, get user acknowledgment before proceeding.

**DO**: Finish step A → confirm with user → start step B
**DON'T**: Plan steps A, B, C, D and execute them all before checking in

### D4: One Thing at a Time
Each work session should accomplish one small, verifiable unit of work.

**DO**: "Let's add the database table for traces" (one thing)
**DON'T**: "Let's add the table, the API endpoint, and the retry logic" (three things)

### D5: Ask When Uncertain
If there are multiple valid approaches or the requirement is unclear, ask.

**DO**: "Should the retry happen 3 times or 5 times?"
**DON'T**: Pick a default and build it without asking

---

## Part 3: Task Completion (Exit Protocol)

**Before marking any task complete:**
1. Validate rules were followed
2. Document the Rules Context
3. Propose rule updates if needed

### Required: Rules Context Block

Every completed task MUST include:

```
## Rules Context
Primary: ARCH-000 (entry), ARCH-002 (exit)
Applied:
- [RULE-ID] [Directive]: "[Key guidance applied]"
```

### Exit Checklist

1. **Rules Context** - Document which rules were applied (REQUIRED)
2. **Compliance Check** - Did the work follow applicable rules?
3. **Pattern Recognition** - Did new patterns emerge that should become rules?
4. **Currency Check** - Are any existing rules now outdated?
5. **Cross-Reference Integrity** - Do dependencies still make sense?

### Human Approval for Rule Changes

Rule modifications require explicit human approval:
- **Identify** gaps, inconsistencies, outdated content
- **Propose** specific changes with rationale
- **Wait** for human confirmation before modifying

---

## Part 4: replit.md Governance

**replit.md is a bootstrap pointer, NOT a knowledge repository.**

### Permitted Content (15 lines max)

1. Project name (one line)
2. Bootstrap pointers (where to find rules)
3. Stack summary (one line)
4. Core preferences (one line)
5. Governance warning

### Prohibited Content

| Content Type | Where It Belongs |
|--------------|------------------|
| Workflow details | Integration rules (INT-*) |
| n8n learnings | INT-002 Known Issues |
| UI implementation | UI rules (UI-*) |
| Changelog | Git history or rule versions |
| Session notes | Nowhere (ephemeral) |

**When you learn something worth preserving:**
1. Identify the appropriate rule file
2. Add the knowledge there
3. Update the rule's version
4. Leave replit.md unchanged

---

## Cross-References

- ARCH-000: Primary Directive (what we believe)
- ARCH-001: System Overview (what we're building)
- ARCH-004: Rule Maintenance (how to modify rules)
- AGT-001, AGT-002: Audit protocols (in /agents/)
