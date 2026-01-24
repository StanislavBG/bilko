# AGENT-002: Rule Audit Agent Protocol

**Version:** 1.0.0  
**Priority:** HIGH  
**Partition:** agent  
**Dependencies:** ARCH-000, ARCH-002, AGENT-001

## Overview

This protocol defines how an AI agent should perform comprehensive rule audits. It replaces hardcoded structural validations with agentic reasoning, enabling deeper semantic analysis of rule quality, consistency, and coverage.

## Activation

This protocol is activated when:
- User says "run a rule audit" or "perform rule audit"
- User says "act as Rule Auditor"
- An automated n8n workflow triggers the audit endpoint

## Pre-Audit Context Gathering

Before performing the audit, gather:

1. **Read the manifest** - `GET /api/rules` or read `rules/manifest.json`
2. **Read all rule files** - Fetch content of each rule via API or filesystem
3. **Note recent changes** - Check git history or timestamps if available

## Audit Checks

Perform all checks. For each finding, provide:
- **Finding**: What you observed
- **Severity**: CRITICAL / WARNING / INFO
- **Recommendation**: Specific action to take

---

### CHECK 1: Structural Integrity

**Question**: Are all rules properly formed and connected?

Validate:
- Every rule in manifest has a corresponding `.md` file that exists
- All declared dependencies reference valid rule IDs
- All declared crossReferences reference valid rule IDs
- Every rule has at least one trigger keyword or wildcard (*)
- Version numbers follow semver format (X.Y.Z)

**Agent Reasoning**: Read the manifest, then verify each path exists. Check that dependency/crossReference IDs exist in the manifest's rule list.

---

### CHECK 2: Routing Coverage

**Question**: Can every rule be reached via the routing system?

A rule is reachable if ANY of these are true:
1. It's in the `routing.alwaysInclude` list
2. Its partition is covered by a `routing.redFlags` pattern
3. It's a dependency of a reachable rule
4. It's a crossReference of a reachable rule
5. It has a wildcard (*) trigger

**Agent Reasoning**: Build a reachability graph starting from alwaysInclude and partition coverage, then traverse dependencies and crossReferences until no new rules are reached.

---

### CHECK 3: Rule Specificity Analysis

**Question**: Are there rules that are too specific or should be generalized?

Look for:
- Rules that only apply to one very specific case
- Rules that duplicate logic that could be consolidated
- Overly detailed implementation instructions that limit flexibility
- Multiple rules covering the same concept with slight variations

---

### CHECK 4: Content Quality

**Question**: Is there text that doesn't look like rules?

Look for:
- Prose or notes that should be converted to actionable directives
- Orphaned documentation without clear requirements
- Inconsistent formatting that deviates from rule structure
- Content that belongs elsewhere (replit.md, README, code comments)
- Missing version history entries for recent changes

---

### CHECK 5: Rule Conflicts

**Question**: Are there any conflicts or contradictions within the rules?

Look for:
- Rules that give opposing guidance on the same topic
- Priority conflicts (e.g., two rules both claim ABSOLUTE for conflicting behaviors)
- Dependency loops or circular references
- Rules that override each other without acknowledgment
- Mobile behavior contradictions (e.g., accordion vs user-controlled)

---

### CHECK 6: Coverage Gaps

**Question**: Are there new sections needed? What aspects aren't covered?

Analyze:
- Common development patterns that have no governing rules
- User behaviors or workflows that lack guidance
- Cross-cutting concerns that span multiple partitions
- Recently added features without corresponding rules

---

### CHECK 7: Rule Evolution

**Question**: Should any rules be changed based on patterns or obsolescence?

Consider:
- Rules that are consistently ignored or worked around
- Rules that no longer apply to current architecture
- Rules that could be simplified based on learned patterns
- Rules that need version updates based on code changes
- Deprecated terminology or outdated references

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
Total Rules: [count]
Total Findings: [count]
  Critical: [count]
  Warnings: [count]
  Info: [count]

STRUCTURAL CHECKS
-----------------
CHECK 1: Structural Integrity
[findings or "No issues found"]

CHECK 2: Routing Coverage
[findings or "All rules reachable"]

SEMANTIC CHECKS
---------------
CHECK 3: Rule Specificity Analysis
[findings or "No issues found"]

CHECK 4: Content Quality
[findings or "No issues found"]

CHECK 5: Rule Conflicts
[findings or "No issues found"]

CHECK 6: Coverage Gaps
[findings or "No issues found"]
Suggested new rules: [list if any]

CHECK 7: Rule Evolution
[findings or "No issues found"]
Suggested updates: [list if any]

RECOMMENDED ACTIONS
-------------------
1. [Prioritized action items with rule ID and specific change]
2. ...

===========================================
END OF AUDIT REPORT
===========================================
```

## Saving Results

After completing the audit:
1. Present the full report to the user
2. User copies the report and saves it via Rules Explorer > Audit > New Audit
3. Saved audits are stored in the database with timestamps

## Future: Automated Execution

This protocol can be triggered via n8n:
- n8n calls POST /api/audits/run with agent credentials
- Agent performs the audit following this protocol
- Results are posted to POST /api/audits
- UI displays the saved audit

## Cross-References

- AGENT-001: Rule Architect Protocol (parent protocol)
- AGENT-003: Code Audit Agent Protocol (companion for code validation)
- ARCH-002: Rule Maintenance (how to modify rules)
