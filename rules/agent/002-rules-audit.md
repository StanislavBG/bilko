# AGENT-002-RULES: Rule Audit Sub-Agent

**Version:** 1.0.0  
**Priority:** HIGH  
**Partition:** agent  
**Dependencies:** AGENT-002, ARCH-000, ARCH-002  
**Inherits:** AGENT-002 (Auditor Base Protocol)

## Purpose

Validates rule files for structural integrity, consistency, and coverage. Ensures the rule system itself is healthy.

## Domain

- Rule files in `/rules/` directory
- Manifest file `rules/manifest.json`
- Cross-references between rules

## Activation

Triggered when:
- User says "run a rule audit"
- User says "validate rules" or "check rules"
- Automated workflow requests rule validation

## Pre-Audit Context

Gather before auditing:
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

## Output

Use the standard Auditor Base format with audit type: "RULE"

```
===========================================
RULE AUDIT REPORT
Date: [ISO date]
Auditor: Rule Audit Sub-Agent
===========================================
...
```

## Cross-References

- AGENT-002: Auditor Base Protocol (parent)
- ARCH-002: Rule Maintenance
- APP-RULES-001: Rules Explorer (audit storage UI)
