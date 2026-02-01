# replit.md Governance

Rule ID: ARCH-011
Priority: CRITICAL
Version: 2.0.0

## Core Principle

**replit.md is a bootstrap pointer, NOT a knowledge repository.**

Different agents may work on this project over time. replit.md must remain agent-agnostic and session-agnostic.

## What replit.md IS

- A pointer to the `/rules/` directory
- A minimal context primer for new agent sessions
- Immutable between sessions (content should not accumulate)

## What replit.md is NOT

- A changelog or history log
- A place for implementation details
- A scratchpad for learnings
- A workflow-specific documentation file
- A session memory file

## Permitted Content (Exhaustive List)

The following sections are allowed. **Nothing else.**

1. **Project Name** - One line
2. **Bootstrap Pointers** - Where to find rules, manifest, starting points
3. **Stack Summary** - One line (framework choices)
4. **Core Preferences** - One line (working style)
5. **Governance Warning** - Reference to this rule

## Maximum Length

**15 lines or fewer.** If replit.md exceeds 15 lines, content must be removed.

## Prohibited Content

The following MUST NOT appear in replit.md:

| Content Type | Where It Belongs |
|--------------|------------------|
| Workflow details | Workflow-specific rules or registry.json |
| n8n learnings | INT-002 (Known Issues Registry) |
| API patterns | Integration rules (INT-*) |
| UI implementation notes | UI rules (UI-*) |
| Recent changes / changelog | Git history or rule version notes |
| Session-specific notes | Nowhere (ephemeral) |
| Technical debugging notes | Relevant rule files |

## Agent Directive

**DO NOT ADD TO replit.md.** When you learn something worth preserving:

1. Identify the appropriate rule file
2. Add the knowledge there
3. Update the rule's version number
4. Leave replit.md unchanged

If no appropriate rule exists, create one following ARCH-002 (Rule Maintenance).

## Enforcement

Any agent that adds content to replit.md beyond the permitted sections is violating this rule. The content must be:

1. Identified for removal
2. Migrated to the appropriate rule file (if valuable)
3. Deleted from replit.md

## Template

The canonical replit.md template:

```markdown
# Bilko Bibitkov AI Academy

## STOP - READ THIS FIRST

This file is a **bootstrap pointer only**. All project knowledge lives in `/rules/`.

**DO NOT ADD CONTENT HERE.** See ARCH-011 for governance.

## Bootstrap

- **Rules**: `/rules/` (start with ARCH-000, ARCH-006)
- **Stack**: React + Tailwind + Shadcn | Express | PostgreSQL + Drizzle | Replit Auth
- **Manifest**: `rules/manifest.json` (contains bootstrap.readingOrder and full rule index)
- **Preferences**: Move slowly, rules-first, no over-building, automation-first
```

## Manifest Bootstrap Section

The `rules/manifest.json` file contains a `bootstrap` section that provides:
- `_instruction`: Directive to read all rules
- `readingOrder`: Priority files to read first
- `preferences`: User working preferences
- `stack`: Technology choices

This section is machine-readable AND human-readable. Agents should parse it for routing, but the actual rule content lives in the `.md` files.

## Anti-Patterns

### Verbose Documentation
Symptom: `replit.md` over 15 lines
Cause: Replicating rule content, explaining implementation
Fix: Delete content, link to rules

### End-of-Cycle Expansion
Symptom: Agent adds "helpful context" before completing task
Cause: Confusing documentation with knowledge preservation
Fix: Create or update a rule instead

### Stale Documentation
Symptom: `replit.md` contradicts actual rules
Cause: Updating rules without updating `replit.md`
Fix: Keep `replit.md` minimal so there's nothing to sync

## Rationale

The Primary Directive (ARCH-000) requires consulting rules. If documentation contains implementation details, agents may skip rule consultation. Brevity enforces the directive.

## Cross-References

- ARCH-000: Founding Principles (rules-first philosophy)
- ARCH-002: Rule Maintenance (where to add new knowledge)
- ARCH-006: Onboarding (agent session startup)
