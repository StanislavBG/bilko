# ARCH-009: Rule Architect Protocol

**Version:** 2.0.0  
**Priority:** HIGH  
**Partition:** architecture  
**Dependencies:** ARCH-000, ARCH-002, ARCH-006

## Overview

This document defines the master protocol for AI agents to perform system audits. The Rule Architect role orchestrates two specialized audit types:

1. **Rule Audit** (ARCH-011) - Validates rules against each other
2. **Code Audit** (ARCH-012) - Validates code against rules

## Activation

This protocol is activated when:
- User says "run a rule audit" or "perform rule audit" → Triggers ARCH-011
- User says "run a code audit" or "check code compliance" → Triggers ARCH-012
- User says "act as Rule Architect" → Triggers both audits
- User requests "full audit" → Triggers both audits in sequence

## Audit Types

### Rule Audit (ARCH-011)

**Purpose**: Ensure rules are internally consistent, complete, and properly structured.

**Checks**:
1. Structural Integrity - Files exist, dependencies valid
2. Routing Coverage - All rules reachable via routing system
3. Rule Specificity - Consolidation opportunities
4. Content Quality - Proper formatting and actionable directives
5. Rule Conflicts - No contradictions between rules
6. Coverage Gaps - Missing rules for existing patterns
7. Rule Evolution - Obsolete or outdated rules

See ARCH-011 for detailed protocol.

### Code Audit (ARCH-012)

**Purpose**: Ensure code correctly implements documented rules.

**Checks**:
1. UI Pattern Compliance - UI-004, UI-005, UI-006
2. Layout Pattern Compliance - HUB-003, HUB-001
3. Data Pattern Compliance - DATA-001
4. Architecture Compliance - ARCH-001
5. Anti-Pattern Detection - Violations of specific rules

See ARCH-012 for detailed protocol.

## Workflow

### Manual Audit (via Chat)

1. User activates audit via chat command
2. Agent follows the relevant protocol(s)
3. Agent presents findings in the specified format
4. User reviews and either:
   - Saves the report via Rules Explorer > Audit > New Audit
   - Takes immediate action on findings

### Automated Audit (via n8n)

1. n8n workflow triggers POST /api/audits/run
2. Agent performs audit following protocol
3. Results posted to POST /api/audits
4. UI displays saved audit with timestamp

## Combining Audits

When running both audits ("full audit"):

1. Run Rule Audit first (ARCH-011)
2. Fix any critical rule issues
3. Run Code Audit second (ARCH-012)
4. Compile combined report

Combined report format:
```
===========================================
FULL SYSTEM AUDIT REPORT
Date: [ISO date]
Auditor: [Agent identifier]
===========================================

PART 1: RULE AUDIT
[Include full ARCH-011 report]

PART 2: CODE AUDIT
[Include full ARCH-012 report]

COMBINED RECOMMENDATIONS
------------------------
[Prioritized list merging findings from both audits]

===========================================
END OF FULL AUDIT REPORT
===========================================
```

## Agentic vs Hardcoded Validation

This system uses **agentic validation** rather than hardcoded checks:

| Aspect | Hardcoded Approach | Agentic Approach |
|--------|-------------------|------------------|
| Checks | Fixed code in validator.ts | Defined in rule protocols |
| Flexibility | Requires code changes | Rules can be updated |
| Reasoning | Boolean pass/fail | Contextual analysis |
| Evolution | Developer must update | Agent learns from patterns |

The RulesService provides basic manifest loading and routing, but all validation logic is defined in these protocols for agents to execute.

## Cross-References

- ARCH-011: Rule Audit Agent Protocol
- ARCH-012: Code Audit Agent Protocol
- ARCH-002: Rule Maintenance
- APP-RULES-001: Rules Explorer (UI for viewing audits)

## Version History

- 2.0.0: Split into orchestrator role with ARCH-011 (rule audit) and ARCH-012 (code audit)
- 1.0.0: Initial protocol definition
