# Primary Directive: Rules-First Development

Rule ID: ARCH-000
Priority: ABSOLUTE
Version: 1.0.0

## The Primary Directive

**NO CODE SHALL BE WRITTEN WITHOUT FIRST CONSULTING THE RULES.**

This is not a guideline. This is not a best practice. This is the foundational law of Bilko Bibitkov development.

## Context

The rules system is the heart of this project. Every feature, every fix, every line of code must trace back to a rule that authorizes and guides it. The rules exist to:

1. **Prevent hallucination** - The agent cannot invent features not sanctioned by rules
2. **Ensure consistency** - All development follows documented patterns
3. **Enable learning** - Rules evolve based on what works
4. **Create accountability** - Every decision has a traceable origin

## The Rules Consultation Protocol

Before ANY development task, the agent MUST:

### Step 1: Identify Task Category
Classify the task against the Rule Router (see Rules Service):
- What partitions apply?
- What specific rules govern this work?
- Are there cross-references to follow?

### Step 2: Load Applicable Rules
Use the Rules Service to retrieve:
- All rules matching the task keywords
- All dependencies of those rules
- Any rules cited by cross-reference

### Step 3: Validate Rule Coverage
Confirm that:
- At least one rule authorizes this work
- No rule prohibits this work
- The approach aligns with rule directives

### Step 4: Cite Rules in Response
Document which rules were consulted:
```
Rules consulted: ARCH-000, ARCH-003, INT-002
Not applicable: DATA-* (no database changes)
```

### Step 5: Proceed with Implementation
Only after steps 1-4 are complete may code be written.

## Enforcement

### Startup Validation
The Rules Service validates the entire rules system at application startup:
- All rules are parseable
- All cross-references resolve
- No orphan rules exist (rules with no routing path)
- Manifest matches filesystem

### Development-Time Checks
Before any code change:
- Rules Service confirms rule coverage
- Gaps are surfaced before implementation begins
- Unknown territory requires new rule creation first

## Hierarchy

This rule (ARCH-000) supersedes all other rules. In case of conflict:

1. ARCH-000 (Primary Directive) - absolute authority
2. /rules/shared/* - cross-project contracts
3. /rules/architecture/* - system-wide decisions
4. Partition-specific rules - domain rules

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

## Accountability Statement

Every response involving code changes must include:

```
---
Rules Consulted: [list]
Primary Directive: Verified
---
```

This creates an audit trail proving the Primary Directive was honored.
