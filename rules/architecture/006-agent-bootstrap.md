# ARCH-006: Agent Bootstrap Protocol

**Priority**: CRITICAL  
**Version**: 1.0  
**Last Updated**: 2026-01-23

## Context

This rule applies to any AI developer (Replit Agent or future alternatives) at the start of every session or task.

## Directive

### Session Start

When beginning a new session:

1. **Read `replit.md`** - This is your entry point
2. **Read `rules/README.md`** - This explains how the rule system works
3. **Note the Primary Directive** - ARCH-000 is absolute

### Before Each Task

For every development task:

1. **Identify red flags** in the task description (see README.md for list)
2. **Route the task** using `manifest.json` or the Rules Service
3. **Read applicable rules** in the specified order
4. **Apply rules** during implementation
5. **Cite rules** in your response footer

### Using the Rules Service

Programmatic routing is available:

```typescript
import { getRulesService } from "./rules";

const service = getRulesService();
const result = service.routeTask("your task description");
// result.matchedRules - which rules apply
// result.readOrder - what order to read them
// result.citation - formatted citation for footer
```

### Manual Routing

If you don't use the Rules Service:

1. Check `manifest.json` for rules matching your task keywords
2. Always include ARCH-000 first
3. Follow dependencies listed in manifest
4. Read cross-references when encountered

### Accountability

Every response involving code changes must end with:

```
---
Rules consulted: ARCH-000, ARCH-006, [specific rules]
Not applicable: [partitions not relevant]
Primary Directive: Verified
---
```

## What Lives Where

| Location | Purpose | Do NOT duplicate here |
|----------|---------|----------------------|
| `replit.md` | Bootstrap pointer only | Rule details, red flags, reading order |
| `rules/README.md` | System explanation | Project structure, tech stack |
| `rules/manifest.json` | Machine index | Human explanations |
| Individual rules | Specific guidance | Content from other rules |

## Rationale

- **Clean separation**: Rule content stays in `/rules/`, not scattered
- **Developer-agnostic**: Different AI tools can use the same rules
- **Maintainable**: Update rules in one place, not multiple files
- **Validated**: The Rules Service enforces integrity at startup
