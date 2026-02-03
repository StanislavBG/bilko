# ARCH-010: Exit Directive

**Version**: 2.0.0  
**Priority**: CRITICAL  
**Partition**: architecture  
**Dependencies**: ARCH-000, ARCH-002

## Purpose

Defines the exit protocol for completing any development task. Just as ARCH-000 (Primary Directive) governs entry into development, this rule governs exit.

## The Exit Directive

**Before marking any task complete, validate that rules were followed, document the Rules Context, and propose rule updates if needed.**

## Rules Context Gate (Required)

Every completed task MUST include a Rules Context block. This is not optional. Tasks cannot be marked complete without documenting which rules were consulted.

**Format (from ARCH-000):**
```
## Rules Context
Primary: ARCH-000 (entry), ARCH-010 (exit)
Applied:
- [RULE-ID] [Directive]: "[Key guidance applied]"
- [RULE-ID] [Directive]: "[Key guidance applied]"
```

**Why This Matters:**
- Creates audit trail for debugging and learning
- Makes rule application explicit, not implicit
- Enables scaling by showing exactly what context was used
- Prevents "it wasn't being enforced" drift

## Human Approval Required

Rule modifications require explicit human approval. The agent:
- **Identifies** gaps, inconsistencies, and outdated content
- **Proposes** specific changes with rationale
- **Waits** for human confirmation before modifying rule content

Version bumps when touching rules are encouraged to track currency.

## Exit Checklist

### 1. Rules Context Documentation

Ask: "What rules did I apply?"

- Document the Rules Context block (see format above)
- Include specific directives that guided implementation
- This step is REQUIRED, not optional

### 2. Rule Compliance Check

Ask: "Did the work follow the applicable rules?"

- If YES: Proceed to step 3
- If NO: Fix the deviation before completing

### 3. Pattern Recognition

Ask: "Did new patterns emerge that should become rules?"

Look for:
- Repeated code patterns that could be standardized
- Decisions that future work should follow
- Constraints learned from implementation

Actions:
- Propose new rule to human if pattern is reusable
- Flag for next audit if uncertain

### 4. Rule Currency Check

Ask: "Are any existing rules now outdated?"

Look for:
- Rules that reference removed features
- Diagrams/examples that no longer match reality
- Constraints that were relaxed or tightened

Actions:
- Propose rule updates to human with specific changes
- Update manifest.json version after human approval

### 5. Cross-Reference Integrity

Ask: "Do dependencies and cross-references still make sense?"

Verify:
- New rules reference appropriate dependencies
- Modified code doesn't break rule assumptions
- Removed features don't leave orphaned rules

## Quick Exit vs Full Exit

### Quick Exit (Default)
For routine tasks:
- Rules Context block (REQUIRED)
- Mental checklist of steps 2-5
- Note any rule issues for human review

### Full Exit
For major features or refactors:
- Full Rules Context block with all directives
- Document changes in commit message
- Consider running full audit (AGT-001 Code Audit, AGT-002 Rule Audit in /agents/)
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
│   "Document Rules Context + validate + update"  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Cross-References

- ARCH-000: Primary Directive (entry counterpart, defines Rules Context format)
- ARCH-002: Rule Maintenance (how to update rules)
- AGT-001, AGT-002: Auditor protocols (Code Audit, Rule Audit in /agents/)
