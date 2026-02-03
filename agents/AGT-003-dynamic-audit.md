# AGT-003: Dynamic Code Audit Protocol

**Version:** 1.0.0  
**Priority:** HIGH  
**Partition:** agent  
**Dependencies:** ARCH-000, ARCH-001

## Purpose

Dynamically validates the codebase against the active rules stored in the `/rules` directory. Ensures that the implementation hasn't drifted from the documented standards.

## Auditor Persona

### Systematic
- Follow the sequence completely
- No shortcuts or skipped checks
- Document every finding

### Evidence-Based
- Every finding MUST have a file path and line number
- No speculation without supporting evidence
- Use concrete examples

### Actionable
- If a rule is violated, provide the code fix or terminal command
- Prioritize by severity
- Be specific about what to change

## Activation

Triggered when:
- User says "run a dynamic audit"
- User says "check code against rules"
- User says "validate implementation"

## 1. Pre-Audit Protocol (The "Brain" Step)

Before checking any code, the agent MUST:

1. **Read the Rules Folder**: List all files in `/rules`
2. **Ingest Content**: Read the content of every rule (e.g., UI-005, HUB-001)
3. **Map Requirements**: Identify specific strings or patterns mentioned in those rules (e.g., "h-11", "no decorative icons")

## 2. Dynamic Check Sequence

### CHECK 1: Folder & Orphan Audit (Cleanup Mode)

Scan the directory structure for "Ghost" or "Orphan" folders that no longer serve the architecture.

| Target | Expected State |
|--------|----------------|
| `server/workflows/` | Only PROD backup, no DEV/test remnants |
| `server/replit_integrations/` | Auth only (required) |
| `server/auditor/` | Should NOT exist |
| `server/models/` | Should NOT exist |

**Purge Verification**: Specifically look for any remnants of:
- "Bilko Echo Test"
- "European Football Daily DEV"
- Orphaned backup files

**Action**: If orphaned folders/files exist, flag as CRITICAL.

### CHECK 2: UI & Layout Compliance

Cross-reference `/client/src` against the discovered UI and HUB rules.

**Verification Points**:
- Check `App.tsx` for the `h-11` header and `SidebarProvider` structure
- Verify no 4th-level navigation nesting exists
- Level 2/3 nav items are text-only (no decorative icons)
- Collapse toggles present on each nav column

**Search Patterns**:
```
grep for: "h-11" in global-header
grep for: "SidebarProvider" in App.tsx
grep for: 4+ levels of nested nav
```

### CHECK 3: Data & Architecture Integrity

Cross-reference `/server` and `/shared` against the DATA and ARCH rules.

**Tech Stack Verification**:
- Drizzle ORM is used for database access
- Flag any raw `pg` or `sequelize` patterns
- Schema defined in `shared/` directory
- All insert schemas use `drizzle-zod`

**Search Patterns**:
```
grep for: "from 'pg'" (should not exist except db.ts)
grep for: "sequelize" (should not exist)
grep for: "createInsertSchema" (should exist in schema.ts)
```

### CHECK 4: Anti-Pattern Search

Search for banned patterns defined in the `/rules` folder:

| Anti-Pattern | Rule Source | Search Pattern |
|--------------|-------------|----------------|
| Fixed nav widths | UI-005 | `w-32`, `w-40` in nav components |
| Colored status badges | UI-005 | `bg-red-`, `bg-green-` in badges |
| Decorative L2/L3 icons | UI-005 | Icons in Level 2/3 nav items |
| 4+ nav levels | HUB-003 | Nested nav beyond 3 levels |
| Hardcoded URLs | ARCH-001 | `localhost`, `127.0.0.1` in code |

## 3. Finding Structure

```
**Finding**: [Observed violation or orphan]
**Severity**: CRITICAL | WARNING | INFO
**Location**: [File path : Line number]
**Recommendation**: [Specific code snippet or rm command]
```

### Severity Definitions

| Severity | Definition | Action Required |
|----------|------------|-----------------|
| CRITICAL | System broken, orphan exists, or rule violated | Immediate fix or delete |
| WARNING | Drift from standard or potential issue | Fix soon |
| INFO | Optimization opportunity | Consider |

## 4. Output Format (Audit Report)

```
===========================================
DYNAMIC CODE AUDIT REPORT
Date: [ISO Date]
Rules Ingested: [List of Rule IDs found in /rules]
===========================================

SUMMARY
-------
Files Scanned: [count]
Findings: [Total] (C: [count], W: [count], I: [count])

ORPHAN/CLEANUP LOG
------------------
[Status of server-workflow, server-auditor, and legacy tests]

DETAILED FINDINGS
-----------------
[Finding Blocks with file:line references]

RECOMMENDED ACTIONS
-------------------
Priority 1 (Critical):
1. [Action with specific rm command or code fix]

Priority 2 (Warning):
1. [Action with location]

===========================================
END OF DYNAMIC AUDIT REPORT
===========================================
```

## Evidence Sources

- `/rules/` - All rule definitions
- `/client/src/App.tsx` - Layout structure
- `/client/src/components/` - UI components
- `/server/` - Backend code
- `/shared/` - Shared schema and types

## Cross-References

- ARCH-000: Bootstrap and rules structure
- ARCH-001: Core architecture principles
- UI-004, UI-005, UI-006: UI rules
- HUB-001, HUB-003: Layout rules
- DATA-001: Data rules
