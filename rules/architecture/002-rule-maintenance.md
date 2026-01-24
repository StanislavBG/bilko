# Rule Maintenance

Rule ID: ARCH-002
Priority: CRITICAL
Version: 1.1.0

## Context
This rule applies when the agent needs to create, modify, or extend the rule framework itself.

## Directives

### D1: Re-Read Before Modify
Before making ANY changes to rules, the agent MUST re-read all existing rules in the affected partition(s) to understand the current state.

**DO**: Read all rules in the partition before editing
**DON'T**: Modify rules based on memory or assumptions about their current content

### D2: Extend Logically
New rules must extend the existing framework logically. They should:
- Follow the established rule format (ID, Priority, Context, Directives, Rationale)
- Use sequential numbering within their partition
- Reference related rules when appropriate
- Not contradict existing rules without explicit override notation

**DO**: Add `003-new-feature.md` after `002-existing.md`
**DON'T**: Create rules with arbitrary numbering or conflicting directives

### D3: Preserve Intent
When modifying existing rules, preserve the original intent unless explicitly instructed otherwise by Bilko.

**DO**: Add new directives that complement existing ones
**DON'T**: Remove or substantially alter existing directives without approval

### D4: Document Changes
When rules are added or modified, update `manifest.json` to reflect:
- New rule entries
- New partitions
- Updated cross-references or dependencies

### D5: Cross-Project Rule Propagation
Changes to rules that define cross-project contracts (ARCH-007, ARCH-008, INT-003) require noting that the n8n project needs the same update.

**DO**: Add a comment noting "Propagate to n8n project" when modifying cross-project contracts
**DON'T**: Assume cross-project rule changes will automatically sync

### D6: Human Approval Required
All rule content modifications require explicit human approval per ARCH-010 (Exit Directive).

**DO**: Identify issues and propose specific changes to the user
**DO**: Wait for human confirmation before modifying rule content
**DON'T**: Modify rules autonomously without user approval

Version bumps when touching rules are encouraged to track currency.

## Rationale
The rule framework is the source of truth for agent behavior. Careless modifications can introduce contradictions or break established patterns.
