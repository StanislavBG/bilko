# AGT-002-RULES: Rule Audit Protocol

**Version:** 2.1.0  
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

## Audit Modes

### Quick Audit (Default)
Checks: 1-3 (Structural, Routing, Conflicts)
Duration: ~2 minutes
Use when: Regular health check

### Full Audit
Checks: 1-6 (All checks)
Duration: ~5-10 minutes
Use when: Major rule changes, quarterly review

Specify mode: "run a quick rule audit" or "run a full rule audit"

## Pre-Audit Protocol

Before auditing, gather evidence:

```bash
# 1. Count rules in manifest
cat rules/manifest.json | jq '.rules | length'

# 2. List all rule files
find rules -name "*.md" -type f | wc -l

# 3. Check partition distribution
cat rules/manifest.json | jq '.rules | to_entries | group_by(.value.partition) | map({partition: .[0].value.partition, count: length})'
```

Record these baseline metrics in the report.

## Checks

### CHECK 1: Structural Integrity (REQUIRED)

Validate rule files are properly formed.

| Check | How to Verify | Severity if Failed |
|-------|--------------|-------------------|
| Every manifest rule has a `.md` file | Compare manifest IDs to file list | CRITICAL |
| Every `.md` file is in manifest | Compare file list to manifest IDs | WARNING |
| Dependencies reference valid IDs | Cross-check dependency arrays | CRITICAL |
| crossReferences are valid IDs | Cross-check crossRef arrays | WARNING |
| Version numbers follow semver | Regex: `^\d+\.\d+\.\d+$` | WARNING |
| Every rule has ≥1 trigger | Check triggers array not empty | WARNING |

**Evidence commands:**
```bash
# Find all rule IDs in manifest
cat rules/manifest.json | jq -r '.rules | keys[]'

# Find all .md files
find rules -name "*.md" -type f -exec basename {} .md \;

# Check for missing files
diff <(cat rules/manifest.json | jq -r '.rules[].path' | sort) <(find rules -name "*.md" -type f | sort)
```

### CHECK 2: Routing Coverage (REQUIRED)

Ensure rules are reachable through the routing system.

**Note:** If `routing` section doesn't exist in manifest, this check identifies that as a gap.

| Check | How to Verify | Severity if Failed |
|-------|--------------|-------------------|
| routing section exists | Check manifest has `.routing` | WARNING |
| alwaysInclude rules exist | Verify IDs in manifest | CRITICAL (if routing exists) |
| redFlags patterns match rules | Sample test matching | WARNING (if routing exists) |
| Orphan rules detected | Rules with no route | INFO |

**Evidence commands:**
```bash
# Check if routing section exists
cat rules/manifest.json | jq '.routing // "NOT CONFIGURED"'

# Get alwaysInclude rules (if routing exists)
cat rules/manifest.json | jq '.routing.alwaysInclude // empty'

# Get redFlags patterns (if routing exists)
cat rules/manifest.json | jq '.routing.redFlags // empty'
```

### CHECK 3: Rule Conflicts (REQUIRED)

Identify contradictions between rules.

**Check for:**
1. **Priority conflicts**: Two HIGH priority rules giving opposing guidance
2. **Dependency loops**: A → B → C → A circular chains
3. **Semantic conflicts**: Rules saying DO X and another saying DON'T X

**Example conflict patterns:**
- ARCH-001 says "use Express" but INT-001 says "use Fastify"
- UI-005 says "no icons in L2 nav" but HUB-002 shows icons in L2 nav

**Evidence commands:**
```bash
# Find all DO/DON'T directives
grep -rn "^- DO:" rules/ --include="*.md"
grep -rn "^- DON'T:" rules/ --include="*.md"

# Check for dependency loops (manual review)
cat rules/manifest.json | jq '.rules[].dependencies'
```

### CHECK 4: Content Quality (Full Audit Only)

Check rule content is actionable.

| Check | How to Verify | Severity if Failed |
|-------|--------------|-------------------|
| Clear directives (DO/DON'T) | Grep for directive patterns | INFO |
| Actionable descriptions | Manual review | INFO |
| Consistent formatting | Compare section headers | INFO |
| Examples included | Check for code blocks | INFO |

**Evidence commands:**
```bash
# Count rules with DO/DON'T directives
grep -l "^- DO\|^- DON'T" rules/**/*.md | wc -l

# Count rules with code examples
grep -l '```' rules/**/*.md | wc -l
```

### CHECK 5: Coverage Gaps (Full Audit Only)

Identify missing rules.

**Areas to check:**
1. **Codebase patterns**: Are there code patterns without governing rules?
2. **Features**: Are all major features documented?
3. **Partitions**: Is each partition well-populated?

**Evidence commands:**
```bash
# Check partition balance
cat rules/manifest.json | jq '.rules | to_entries | group_by(.value.partition) | map({partition: .[0].value.partition, count: length})'

# Find components without corresponding rules
ls client/src/components/ | head -10
```

### CHECK 6: Rule Currency (Full Audit Only)

Check for outdated content.

**Staleness indicators:**
1. References to removed features or files
2. Deprecated terminology
3. Version references that are outdated
4. Rules that don't match current code

**Evidence commands:**
```bash
# Find old version references
grep -rn "v[0-9]\.[0-9]\.[0-9]" rules/ --include="*.md"

# Check for references to non-existent files
grep -rn "\.tsx\|\.ts" rules/**/*.md | head -20
```

## Output Format

All audit reports use this structure:

```
===========================================
RULE AUDIT REPORT
Date: [ISO date]
Mode: Quick | Full
===========================================

BASELINE METRICS
----------------
Rules in manifest: [count]
Rule files found: [count]
Partitions: [list with counts]

CHECKS PERFORMED
----------------
CHECK 1: Structural Integrity
  Status: [PASS | FAIL | PARTIAL]
  Findings:
  - [Finding details or "No issues"]

CHECK 2: Routing Coverage
  Status: [PASS | FAIL | PARTIAL]
  Findings:
  - [Finding details or "No issues"]

[Continue for each check...]

SUMMARY
-------
Total Findings: [count]
  Critical: [count]
  Warnings: [count]
  Info: [count]

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
2. Ask: "Would you like me to fix any of these issues?"
3. If yes, create task list for remediation
4. User can save report via Rules Explorer > Audit > New Audit

## Common Issues Reference

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| Missing .md file | Rule added to manifest but file not created | Create the file |
| Invalid dependency | Typo in rule ID | Correct the ID |
| Orphan rule | Rule exists but not in routing | Add to redFlags or alwaysInclude |
| Circular dependency | A → B → A pattern | Break the cycle |
| Stale content | Rule not updated after code change | Update rule to match code |

## Cross-References

- ARCH-002: Rule Maintenance
- APP-RULES-001: Rules Explorer (audit storage UI)
