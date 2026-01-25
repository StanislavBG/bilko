# Documentation Brevity

Rule ID: ARCH-011
Priority: CRITICAL
Version: 1.1.0

## Context

Project documentation (especially `replit.md`) serves as grounding for AI development agents. It must be concise and directive, not comprehensive or educational.

## Purpose

`replit.md` exists to:
1. Ground the agent in founding principles
2. Point to where rules live
3. Establish key patterns and preferences
4. Provide quick lookup for critical values

It does NOT exist to:
1. Replicate rule content
2. Explain implementation details
3. Document every feature
4. Serve as a user manual

## Directives

### D1: Grounding Not Replication
`replit.md` points to rules, it does not replicate them.

**DO**: "Minimal text-only (UI-005). No decorative icons."
**DON'T**: Copy the entire UI-005 rule content into replit.md

### D2: Maximum Brevity
Every line must earn its place. If content can be found in a rule, link to the rule.

**Target**: `replit.md` should be under 50 lines for most projects.

### D3: Hierarchical Lookup
Structure for quick scanning:
1. Founding principles (what MUST be followed)
2. Rules location (where to find details)
3. Stack/tech (what we're using)
4. Key patterns (important component names)
5. User preferences (project-specific guidance)

### D4: No Implementation Details
Implementation belongs in code and rules, not in `replit.md`.

**DO**: "Workflows: Registry at `server/workflows/registry.json`"
**DON'T**: Explain how the workflow router dispatches requests

### D5: Update Discipline
When adding to `replit.md`, ask: "Can this be a rule instead?" If yes, create or update the rule and link to it.

### D6: No End-of-Cycle Expansion (CRITICAL)
Agents MUST NOT expand `replit.md` at the end of a task cycle. This is a recurring anti-pattern.

**PROHIBITED**: Adding "helpful context", implementation notes, or summaries to `replit.md` before completing a task.

**REQUIRED**: If information needs preservation, create or update a rule instead.

## Anti-Patterns

### Verbose Documentation
Symptom: `replit.md` over 100 lines
Cause: Replicating rule content, explaining implementation
Fix: Delete replicated content, link to rules

### Stale Documentation
Symptom: `replit.md` contradicts actual rules
Cause: Updating rules without updating `replit.md`
Fix: Keep `replit.md` minimal so there's less to sync

### Agent Confusion
Symptom: Agent follows `replit.md` instead of rules
Cause: `replit.md` has too much detail
Fix: Remove detail, force agent to consult rules

## Rationale

The Primary Directive (ARCH-000) requires consulting rules. If documentation replicates rules, agents may skip rule consultation. Brevity enforces the directive.
