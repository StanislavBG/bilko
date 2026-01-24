# ARCH-010: Exit Directive

**Version**: 1.0.0  
**Priority**: CRITICAL  
**Partition**: architecture  
**Dependencies**: ARCH-000, ARCH-002

## Purpose

Defines the exit protocol for completing any development task. Just as ARCH-000 (Primary Directive) governs entry into development, this rule governs exit.

## The Exit Directive

**Before marking any task complete, validate that rules were followed and update rules if needed.**

## Exit Checklist

### 1. Rule Compliance Check

Ask: "Did the work follow the applicable rules?"

- If YES: Proceed to step 2
- If NO: Fix the deviation before completing

### 2. Pattern Recognition

Ask: "Did new patterns emerge that should become rules?"

Look for:
- Repeated code patterns that could be standardized
- Decisions that future work should follow
- Constraints learned from implementation

Actions:
- Document as new rule if pattern is reusable
- Flag for next audit if uncertain

### 3. Rule Currency Check

Ask: "Are any existing rules now outdated?"

Look for:
- Rules that reference removed features
- Diagrams/examples that no longer match reality
- Constraints that were relaxed or tightened

Actions:
- Update rule version and content
- Update manifest.json if metadata changed

### 4. Cross-Reference Integrity

Ask: "Do dependencies and cross-references still make sense?"

Verify:
- New rules reference appropriate dependencies
- Modified code doesn't break rule assumptions
- Removed features don't leave orphaned rules

## Quick Exit vs Full Exit

### Quick Exit (Default)
For routine tasks:
- Mental checklist of the 4 questions
- Update rules inline if changes are minor
- No formal audit report needed

### Full Exit
For major features or refactors:
- Document changes in commit message
- Consider running full audit (ARCH-009)
- Update replit.md if architecture changed

## Integration with Development Flow

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   ARCH-000: Entry Directive                     │
│   "Consult rules before writing code"           │
│                                                 │
│              ↓                                  │
│                                                 │
│   [Development Work]                            │
│                                                 │
│              ↓                                  │
│                                                 │
│   ARCH-010: Exit Directive                      │
│   "Validate and update rules before completing" │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Automation Opportunities

This protocol can be partially automated:
- Pre-commit hooks to check manifest.json validity
- CI checks for rule file syntax
- Periodic scheduled audits via n8n

## Cross-References

- ARCH-000: Primary Directive (entry counterpart)
- ARCH-002: Rule Maintenance (how to update rules)
- ARCH-009: Rule Architect Protocol (full audit process)
