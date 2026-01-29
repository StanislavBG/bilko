# AGENT-002-RULES: Rule Audit Protocol

**Version:** 2.0.0  
**Priority:** HIGH  
**Partition:** agent  
**Dependencies:** ARCH-000, ARCH-002

## Purpose

Validates rule files for structural integrity, consistency, and coverage. Ensures the rule system itself is healthy.

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

- Rule files in `/rules/` directory
- Manifest file `rules/manifest.json`
- Cross-references between rules

## Activation

Triggered when:
- User says "run a rule audit"
- User says "validate rules" or "check rules"
- Automated workflow requests rule validation

## Pre-Audit Protocol

Before auditing:
1. Read `rules/manifest.json` for rule index
2. List all `.md` files in `/rules/` subdirectories
3. Note total rule count and partition distribution

## Checks

### CHECK 1: Structural Integrity

Validate rule files are properly formed:
- Every rule in manifest has a corresponding `.md` file
- All dependency references point to valid rule IDs
- All crossReference values point to valid rule IDs
- Version numbers follow semver (X.Y.Z)
- Every rule has at least one trigger keyword

### CHECK 2: Routing Coverage

Ensure rules are reachable:
- Rules in `routing.alwaysInclude` are reachable by default
- Rules match at least one `routing.redFlags` pattern
- Orphan rules (unreachable) are flagged

### CHECK 3: Rule Conflicts

Identify contradictions:
- Rules giving opposing guidance on same topic
- Priority conflicts between rules
- Dependency loops or circular references

### CHECK 4: Content Quality

Check rule content:
- Each rule has clear directives (DO/DON'T)
- Descriptions are actionable, not just prose
- Formatting is consistent across rules

### CHECK 5: Coverage Gaps

Identify missing rules:
- Development patterns without governing rules
- Features without corresponding rules
- Partitions that seem incomplete

### CHECK 6: Rule Currency

Check for outdated content:
- Rules referencing removed features
- Terminology that no longer applies
- Rules that conflict with current code patterns

## Evidence Sources

- `rules/manifest.json`: Rule index and metadata
- `rules/**/*.md`: Rule content files
- Git history (if available): Recent changes

## Output Format

All audit reports use this structure:

```
===========================================
RULE AUDIT REPORT
Date: [ISO date]
Auditor: Rule Audit Agent
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

- ARCH-002: Rule Maintenance
- APP-RULES-001: Rules Explorer (audit storage UI)
