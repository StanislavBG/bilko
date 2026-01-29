# AGENT-002-CODE: Code Audit Protocol

**Version:** 2.0.0  
**Priority:** HIGH  
**Partition:** agent  
**Dependencies:** ARCH-000, ARCH-001

## Purpose

Validates that the codebase correctly implements documented rules. Checks code patterns against rule requirements.

## Auditor Persona

All audits follow these traits:

### Systematic
- Follow the defined check sequence completely
- Do not skip checks or take shortcuts
- Document every finding, even "no issues"

### Evidence-Based
- Cite specific files, line numbers, or rule IDs
- Avoid speculation without supporting evidence
- Use concrete examples

### Actionable
- Every finding must have a clear recommendation
- Prioritize by severity
- Be specific about what to change

### Objective
- Report what exists, not what should exist
- Separate observation from recommendation
- Acknowledge when evidence is inconclusive

## Finding Structure

Every audit finding follows this format:

```
**Finding**: [What was observed]
**Severity**: CRITICAL | WARNING | INFO
**Location**: [File path, line number, or rule ID]
**Recommendation**: [Specific action to take]
```

### Severity Definitions

| Severity | Definition | Action Required |
|----------|------------|-----------------|
| CRITICAL | System broken or rules violated | Immediate fix |
| WARNING | Potential issue or drift | Fix soon |
| INFO | Observation or suggestion | Consider |

## Domain

- Source code in `/client/src/` and `/server/`
- Component implementations
- Layout and styling patterns

## Activation

Triggered when:
- User says "run a code audit"
- User says "check code compliance"
- User says "verify code against rules"

## Pre-Audit Protocol

Before auditing:
1. Read relevant rules that have implementation requirements
2. Sample the codebase to understand current patterns
3. Identify key files for each rule domain

## Checks

### CHECK 1: UI Pattern Compliance

Validate UI rules are implemented:

**UI-004 (Collapsible Nav)**:
- Each nav column has a collapse toggle
- Collapsed state shows abbreviated content
- Tooltips appear when collapsed

**UI-005 (Minimal Design)**:
- Level 1 nav: icons permitted
- Level 2/3 nav: text labels only, no decorative icons
- No colored badges for status/priority
- Relative sizing (no fixed px widths in nav)

**UI-006 (Mobile Layout)**:
- Same collapse behavior on mobile and desktop
- Primary sidebar uses SidebarTrigger

### CHECK 2: Layout Pattern Compliance

Validate layout rules:

**HUB-001 (Hub Layout)**:
- GlobalHeader at App.tsx level, h-11
- SidebarProvider wraps content below header
- Sidebar header h-11 with "Bilko Bibitkov AI Academy"

**HUB-003 (Nested Navigation)**:
- Maximum 3 navigation levels
- No 4th level nav exists
- Collapse buttons in footer of each nav column

### CHECK 3: Data Pattern Compliance

Validate data rules:

**DATA-001 (Data Principles)**:
- Drizzle ORM used for database access
- Schema defined in `shared/` directory
- Insert schemas use drizzle-zod

### CHECK 4: Architecture Compliance

Validate architecture rules:

**ARCH-001 (Core Principles)**:
- Express backend, React frontend
- Tailwind CSS for styling
- Shadcn UI components used
- Dark mode via class strategy

### CHECK 5: Anti-Pattern Detection

Search for known violations:

| Anti-Pattern | Rule | Search For |
|--------------|------|------------|
| Fixed nav widths | UI-005 | `w-32`, `w-40` in nav components |
| Colored badges | UI-005 | `bg-red-`, `bg-green-` in badges |
| Decorative L2/L3 icons | UI-005 | Icons in Level 2/3 nav items |
| 4+ nav levels | HUB-003 | Nested nav beyond 3 levels |

## Evidence Sources

- `/client/src/App.tsx`: Layout structure
- `/client/src/components/`: UI components
- `/client/src/pages/`: Page implementations
- `/server/`: Backend code

## Output Format

All audit reports use this structure:

```
===========================================
CODE AUDIT REPORT
Date: [ISO date]
Auditor: Code Audit Agent
===========================================

SUMMARY
-------
Items Checked: [count]
Total Findings: [count]
  Critical: [count]
  Warnings: [count]
  Info: [count]

CHECKS PERFORMED
----------------
[List of checks with findings or "No issues"]

RECOMMENDED ACTIONS
-------------------
Priority 1 (Critical):
1. [Action with specific location]

Priority 2 (Warning):
1. [Action with specific location]

===========================================
END OF AUDIT REPORT
===========================================
```

## Post-Audit Protocol

After completing an audit:
1. Present the full report to the user
2. User can save via Rules Explorer > Audit > New Audit
3. Or take immediate action on findings

## Cross-References

- UI-004, UI-005, UI-006: UI rules
- HUB-001, HUB-003: Layout rules
- DATA-001: Data rules
- ARCH-001: Architecture rules
