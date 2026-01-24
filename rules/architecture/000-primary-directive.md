# Primary Directive: Rules-First Development

Rule ID: ARCH-000
Priority: ABSOLUTE
Version: 2.0.0

## The Primary Directive

**NO CODE SHALL BE WRITTEN WITHOUT FIRST CONSULTING THE RULES.**

This is not a guideline. This is not a best practice. This is the foundational law of Bilko Bibitkov development.

## Context

The rules system is the heart of this project. Every feature, every fix, every line of code must trace back to a rule that authorizes and guides it. The rules exist to:

1. **Prevent hallucination** - The agent cannot invent features not sanctioned by rules
2. **Ensure consistency** - All development follows documented patterns
3. **Enable learning** - Rules evolve based on what works
4. **Create accountability** - Every decision has a traceable origin

## Rules Consultation Protocol

Before ANY development task, the agent MUST:

### 1. Identify Applicable Rules
Use the manifest routing system to find relevant rules:
- Check `routing.redFlags` patterns against the task
- Always include `routing.alwaysInclude` rules (ARCH-000, ARCH-006)
- Follow dependency chains from matched rules

### 2. Read and Apply Directives
Load the full content of applicable rules and follow their directives. Pay attention to:
- DO/DON'T statements
- Version-specific changes
- Cross-references to related rules

### 3. Proceed with Implementation
Only after steps 1-2 are complete may code be written.

## Rules Context Block (Required)

Every task completion MUST include a Rules Context block documenting which rules were consulted and what directives were applied. This creates the audit trail essential for scaling.

**Format:**
```
## Rules Context
Primary: ARCH-000 (entry), ARCH-010 (exit)
Applied:
- [RULE-ID] [Directive]: "[Key guidance applied]"
- [RULE-ID] [Directive]: "[Key guidance applied]"
```

**Example:**
```
## Rules Context
Primary: ARCH-000 (entry), ARCH-010 (exit)
Applied:
- HUB-003 D6: "L1 sidebar header h-11 with 'Bilko Bibitkov AI Academy'"
- UI-005 D1: "Level 1 icons permitted, Level 2/3 text-only"
- HUB-001 D1: "GlobalHeader at App.tsx level, sidebar below"
```

**Enforcement:** ARCH-010 (Exit Directive) requires this block before task completion. Tasks without Rules Context cannot be marked complete.

## The Development Loop

ARCH-000 is the **entry directive** - consult rules before writing code.
ARCH-010 is the **exit directive** - validate compliance and document rules applied.

Together they form a complete development loop:
1. **Entry**: Consult rules → write code
2. **Exit**: Validate compliance → document Rules Context → update rules if needed

See ARCH-010 for the exit protocol.

## Hierarchy

This rule (ARCH-000) supersedes all other rules. In case of conflict:

1. ARCH-000 (Primary Directive) - absolute authority
2. /rules/architecture/* - system-wide decisions and cross-project contracts
3. Partition-specific rules - domain rules

## Rationale

Bilko Bibitkov will grow into an extremely complex system. Without rigorous rule governance:
- The agent will hallucinate features
- Inconsistencies will compound
- Debugging becomes archaeology
- Knowledge is lost between sessions

The rules are not overhead. The rules ARE the product. The application is merely the rules made executable.

## The Rules Service

ARCH-000 mandates the existence of a first-class Rules Service (`/server/rules/`) that:

1. **Indexes** all rules via machine-readable manifest
2. **Routes** tasks to specific rules via keyword matching
3. **Validates** rule integrity at startup
4. **Exposes** rules to the application for runtime consultation

See the Rules Service implementation for details.
