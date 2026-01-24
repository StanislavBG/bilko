# ARCH-009: Rule Architect Protocol

**Version:** 1.0.0  
**Priority:** HIGH  
**Partition:** architecture  
**Dependencies:** ARCH-000, ARCH-002, ARCH-006

## Overview

This document defines the protocol for AI agents to perform comprehensive rule audits. When asked to "run a rule audit" or "act as Rule Architect", agents should follow this protocol to evaluate the rule system and provide actionable findings.

## Activation

This protocol is activated when:
- User says "run a rule audit" or "perform rule audit"
- User says "act as Rule Architect"
- User requests evaluation of the rules

## Pre-Audit Steps

Before performing the audit:

1. **Read all rules** - Fetch `/api/rules` to get the catalog, then read each rule file
2. **Read the manifest** - Examine `rules/manifest.json` for structure and metadata
3. **Sample the codebase** - Use search tools to understand current code patterns
4. **Note recent changes** - Check git diff or recent modifications if available

## Audit Checks

Perform the following checks in order. For each check, provide:
- **Finding**: What you observed
- **Severity**: CRITICAL / WARNING / INFO
- **Recommendation**: What action to take (if any)

---

### CHECK 1: Rule Specificity Analysis

**Question**: Are there rules that are too specific and should be generalized?

Look for:
- Rules that only apply to one very specific case
- Rules that duplicate logic that could be consolidated
- Overly detailed implementation instructions that limit flexibility

**Output Format**:
```
CHECK 1: Rule Specificity Analysis
----------------------------------
[List each finding or "No issues found"]
```

---

### CHECK 2: Content Quality

**Question**: Is there text that doesn't look like rules?

Look for:
- Prose or notes that should be converted to actionable rules
- Orphaned documentation without clear directives
- Inconsistent formatting that deviates from rule structure
- Content that belongs elsewhere (replit.md, README, code comments)

**Output Format**:
```
CHECK 2: Content Quality
------------------------
[List each finding or "No issues found"]
```

---

### CHECK 3: Rule Conflicts

**Question**: Are there any conflicts or contradictions within the rules?

Look for:
- Rules that give opposing guidance on the same topic
- Priority conflicts (e.g., two rules both claim ABSOLUTE for conflicting behaviors)
- Dependency loops or circular references
- Rules that override each other without acknowledgment

**Output Format**:
```
CHECK 3: Rule Conflicts
-----------------------
[List each finding or "No issues found"]
```

---

### CHECK 4: Coverage Gaps

**Question**: Are there new sections needed? What aspects aren't covered?

Analyze:
- Current codebase patterns that have no governing rules
- User behaviors or workflows that lack guidance
- New features that were added without corresponding rules
- Cross-cutting concerns that span multiple partitions

**Output Format**:
```
CHECK 4: Coverage Gaps
----------------------
[List each finding or "No issues found"]
Suggested new rules or sections: [list if any]
```

---

### CHECK 5: Code Compliance

**Question**: Does the current code follow the documented rules?

For each major rule, sample the codebase to verify:
- Implementation matches rule specifications
- Patterns prescribed by rules are actually used
- Anti-patterns forbidden by rules are absent
- Architecture boundaries are respected

**Output Format**:
```
CHECK 5: Code Compliance
------------------------
Rule ID | Compliant? | Evidence
--------|------------|----------
[rule]  | YES/NO/PARTIAL | [brief evidence]
```

---

### CHECK 6: Rule Evolution

**Question**: Should any rules be changed based on code or user patterns?

Consider:
- Rules that are consistently ignored or worked around
- Rules that no longer apply to current architecture
- Rules that could be simplified based on learned patterns
- Rules that need version updates based on changes

**Output Format**:
```
CHECK 6: Rule Evolution
-----------------------
[List each finding or "No issues found"]
```

---

## Output Format

Compile all findings into a single report:

```
===========================================
RULE AUDIT REPORT
Date: [ISO date]
Auditor: [Agent identifier]
===========================================

SUMMARY
-------
Total Findings: [count]
Critical: [count]
Warnings: [count]
Info: [count]

DETAILED FINDINGS
-----------------

CHECK 1: Rule Specificity Analysis
[findings]

CHECK 2: Content Quality
[findings]

CHECK 3: Rule Conflicts
[findings]

CHECK 4: Coverage Gaps
[findings]

CHECK 5: Code Compliance
[findings]

CHECK 6: Rule Evolution
[findings]

RECOMMENDED ACTIONS
-------------------
1. [Prioritized action items]
2. ...

===========================================
END OF AUDIT REPORT
===========================================
```

## Saving Results

After completing the audit:
1. Present the full report to the user
2. User will copy the report and save it via the Rules Explorer UI
3. Saved audits are stored with timestamps for historical tracking

## Future Automation

This protocol is designed to be automatable via n8n workflows:
- n8n can call an agent with this protocol
- Agent performs the audit
- Results are posted to `/api/audits` endpoint
- UI displays the saved audit

## Version History

- 1.0.0: Initial protocol definition
