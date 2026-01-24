# ARCH-012: Code Audit Agent Protocol

**Version:** 1.0.0  
**Priority:** HIGH  
**Partition:** architecture  
**Dependencies:** ARCH-000, ARCH-009, ARCH-011

## Overview

This protocol defines how an AI agent should validate that the codebase correctly implements the documented rules. It complements ARCH-011 (Rule Audit) by checking code-vs-rules alignment rather than rule-vs-rule consistency.

## Activation

This protocol is activated when:
- User says "run a code audit" or "check code compliance"
- User says "verify code against rules"
- An automated n8n workflow triggers the code audit endpoint

## Pre-Audit Context Gathering

Before performing the audit, gather:

1. **Read relevant rules** - Focus on rules that have implementation requirements
2. **Sample the codebase** - Use search tools to understand current code patterns
3. **Identify key files** - Map rules to their likely implementation locations

## Rules to Audit

Focus on rules that have verifiable implementation requirements:

| Rule ID | What to Check |
|---------|---------------|
| UI-004 | Nav collapse behavior, footer toggle placement |
| UI-005 | No decorative nav icons, relative sizing, no colored badges |
| UI-006 | Mobile layout, user-controlled collapse |
| HUB-003 | Max 3 nav levels, header pinned to content area |
| HUB-001 | Primary sidebar uses Shadcn SidebarProvider |
| DATA-001 | Drizzle ORM patterns, schema conventions |
| ARCH-001 | React/Express/Tailwind stack compliance |

## Audit Checks

For each rule, verify implementation. Provide:
- **Rule ID**: Which rule is being checked
- **Compliant**: YES / NO / PARTIAL
- **Evidence**: Specific code locations and patterns found
- **Issues**: What doesn't match (if any)

---

### CHECK 1: UI Pattern Compliance

**For each UI rule, verify:**

**UI-004 (Collapsible Nav)**:
- Each nav column has a collapse toggle in footer
- Collapsed state shows abbreviated content (single letter or icon)
- Tooltips appear on hover when collapsed
- Uses useState for local collapse state

**UI-005 (Minimal Design)**:
- Navigation items use text labels only (no decorative icons)
- No colored badges in status/priority displays
- Relative sizing used (no fixed px widths like w-32, w-40)
- rem-based min/max constraints are acceptable

**UI-006 (Mobile Layout)**:
- Same collapse behavior on mobile as desktop
- Primary sidebar uses SidebarTrigger on mobile
- No accordion hiding behavior

---

### CHECK 2: Layout Pattern Compliance

**HUB-003 (Nested Navigation)**:
- Maximum 3 navigation levels (no 4th level nav)
- Header pinned to content area only (not spanning nav columns)
- All nav columns extend full viewport height
- Collapse buttons in footer of each nav column

**HUB-001 (Hub Layout)**:
- Primary sidebar uses Shadcn SidebarProvider
- SidebarTrigger in mobile header
- Proper responsive breakpoints (md: 768px)

---

### CHECK 3: Data Pattern Compliance

**DATA-001 (Data Principles)**:
- Drizzle ORM used for database access
- Schema defined in shared/schema.ts
- Insert schemas use drizzle-zod
- No raw SQL except through execute_sql tool

---

### CHECK 4: Architecture Compliance

**ARCH-001 (Core Principles)**:
- Express backend, React frontend
- Tailwind CSS for styling
- Shadcn UI components used
- Dark mode support via class strategy

---

### CHECK 5: Anti-Pattern Detection

Search for patterns that violate rules:

| Anti-Pattern | Rule Violated | Search Pattern |
|--------------|---------------|----------------|
| Fixed pixel widths | UI-005 D3 | `w-32`, `w-40`, `w-48` (in nav) |
| Colored badges | UI-005 D2 | `bg-red-`, `bg-green-` in badges |
| Decorative nav icons | UI-005 D1 | Icons inside nav item text |
| Accordion on mobile | UI-006 D2 | "accordion" in mobile logic |
| 4+ nav levels | HUB-003 D1 | Nested nav beyond 3 levels |
| Header spanning nav | HUB-003 D5 | Header outside content area |

---

## Output Format

Compile all findings into a single report:

```
===========================================
CODE AUDIT REPORT
Date: [ISO date]
Auditor: [Agent identifier]
===========================================

SUMMARY
-------
Rules Checked: [count]
Fully Compliant: [count]
Partially Compliant: [count]
Non-Compliant: [count]

COMPLIANCE MATRIX
-----------------
Rule ID   | Status  | Evidence Summary
----------|---------|------------------
UI-004    | YES     | Footer toggles in rules-explorer.tsx
UI-005    | PARTIAL | Text-only nav, but w-32 found in skeleton
...

DETAILED FINDINGS
-----------------

CHECK 1: UI Pattern Compliance
------------------------------
[Detailed findings per rule]

CHECK 2: Layout Pattern Compliance
----------------------------------
[Detailed findings per rule]

CHECK 3: Data Pattern Compliance
--------------------------------
[Detailed findings per rule]

CHECK 4: Architecture Compliance
--------------------------------
[Detailed findings per rule]

CHECK 5: Anti-Pattern Detection
-------------------------------
[List of anti-patterns found with file:line locations]

REMEDIATION ACTIONS
-------------------
Priority 1 (Critical):
1. [Specific fix with file and line]

Priority 2 (Warning):
1. [Specific fix with file and line]

===========================================
END OF CODE AUDIT REPORT
===========================================
```

## Saving Results

After completing the audit:
1. Present the full report to the user
2. User can save as a code audit via Rules Explorer > Audit > New Audit
3. Or take immediate action to fix issues

## Relationship to Rule Audit

| Audit Type | Focus | Protocol |
|------------|-------|----------|
| Rule Audit | Rules vs Rules | ARCH-011 |
| Code Audit | Code vs Rules | ARCH-012 |

Run both audits periodically to maintain system integrity:
1. Rule Audit ensures rules are internally consistent
2. Code Audit ensures code implements rules correctly

## Cross-References

- ARCH-009: Rule Architect Protocol (parent protocol)
- ARCH-011: Rule Audit Agent Protocol (companion for rule validation)
- ARCH-002: Rule Maintenance (how to modify rules)

## Version History

- 1.0.0: Initial code audit protocol
