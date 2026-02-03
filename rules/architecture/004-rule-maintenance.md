# ARCH-004: Rule Maintenance

**Version**: 2.0.0
**Priority**: CRITICAL
**Partition**: architecture
**Dependencies**: ARCH-000, ARCH-002
**Renamed From**: ARCH-002 v1.1.0

## Purpose

Defines how to create, modify, and extend the rule framework. This is the "how to evolve the rules" rule.

---

## Directives

### D1: Re-Read Before Modify
Before making ANY changes to rules, re-read all existing rules in the affected partition(s).

**DO**: Read all rules in the partition before editing
**DON'T**: Modify rules based on memory or assumptions

### D2: Extend Logically
New rules must extend the existing framework logically:
- Follow established format (ID, Priority, Context, Directives, Rationale)
- Use sequential numbering within partition
- Reference related rules
- Not contradict existing rules without explicit override

**DO**: Add `003-new-feature.md` after `002-existing.md`
**DON'T**: Create rules with arbitrary numbering or conflicts

### D3: Preserve Intent
When modifying existing rules, preserve the original intent unless explicitly instructed by Bilko.

**DO**: Add new directives that complement existing ones
**DON'T**: Remove or alter existing directives without approval

### D4: Document Changes
When rules are added or modified, update `manifest.json`:
- New rule entries
- New partitions
- Updated cross-references or dependencies

### D5: Cross-Project Propagation
Changes to shared rules (ARCH-001, ARCH-003, INT-003) require noting that the n8n project needs the same update.

**DO**: Add "Propagate to n8n project" when modifying shared contracts
**DON'T**: Assume cross-project changes will sync automatically

### D6: Human Approval Required
All rule content modifications require explicit human approval (per ARCH-002 Exit Protocol).

**DO**: Identify issues and propose specific changes
**DO**: Wait for human confirmation before modifying
**DON'T**: Modify rules autonomously

Version bumps when touching rules are encouraged.

---

## Rule Format Template

```markdown
# RULE-ID: Title

**Version**: X.Y.Z
**Priority**: CRITICAL | HIGH | MEDIUM
**Partition**: architecture | hub | ui | data | apps | integration | env
**Dependencies**: [list]

## Purpose

[One paragraph explaining the rule's purpose]

---

## Directives

### D1: [Directive Name]
[Description]

**DO**: [What to do]
**DON'T**: [What not to do]

---

## Cross-References

- [Related rules]
```

---

## Cross-References

- ARCH-000: Primary Directive (rules-first philosophy)
- ARCH-002: Agent Protocol (exit protocol requires rule validation)
- AGT-002: Rule Audit Protocol (validates rule structure)
