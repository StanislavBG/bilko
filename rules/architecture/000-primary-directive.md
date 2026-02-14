# Primary Directive: Rules-First Development

Rule ID: ARCH-000
Priority: ABSOLUTE
Version: 3.0.0

## The Primary Directive

**NO CODE SHALL BE WRITTEN WITHOUT FIRST CONSULTING THE RULES.**

This is not a guideline. This is not a best practice. This is the foundational law of Bilko Bibitkov development.

---

## Founding Principles

ARCH-000 encompasses three immutable founding principles:

### Principle A: Orchestrator Pattern

**ALL EXTERNAL COMMUNICATION MUST FLOW THROUGH THE ORCHESTRATION LAYER.**

Why this matters:
1. **Observability** - Every external call is logged with full request/response data
2. **Debuggability** - Trace IDs correlate requests across systems
3. **Recoverability** - Failed requests can be retried with modification
4. **Learning** - Communication traces reveal all system behavior
5. **Future AI** - Agents can analyze past interactions to improve

**DO**: Call n8n through orchestrator dispatch (`POST /api/orchestrate/:serviceId`)
**DON'T**: Make HTTP calls directly from routes or components

### Principle B: Headless Operation

**ALL EXTERNAL SERVICE CONFIGURATION MUST BE AUTOMATED AND PROGRAMMATIC.**

"Headless" means the system operates without requiring manual intervention in external service UIs. Configuration, synchronization, and management of external services (primarily n8n) happens automatically through APIs, not through clicking around in dashboards.

Why this matters:
1. **Reproducibility** - Any environment can be recreated programmatically
2. **Version Control** - All configuration lives in code, not external UIs
3. **Auditability** - Changes are tracked through git, not manual actions
4. **Scalability** - No human bottleneck for operations
5. **Recovery** - System can self-heal after failures

**DO**: Create/update n8n workflows via REST API
**DON'T**: Manually create workflows in n8n UI
**DON'T**: Ask users to manually modify external systems (see ARCH-001 D6)

---

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
- Always include `routing.alwaysInclude` rules (ARCH-000, ARCH-002)
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
Primary: ARCH-000 (entry), ARCH-002 (exit)
Applied:
- [RULE-ID] [Directive]: "[Key guidance applied]"
- [RULE-ID] [Directive]: "[Key guidance applied]"
```

**Enforcement:** ARCH-002 (Exit Protocol) requires this block before task completion. Tasks without Rules Context cannot be marked complete.

## The Development Loop

ARCH-000 is the **entry directive** - consult rules before writing code.
ARCH-002 is the **exit directive** - validate compliance and document rules applied.

Together they form a complete development loop:
1. **Entry**: Consult rules → write code
2. **Exit**: Validate compliance → document Rules Context → update rules if needed

See ARCH-002 for the exit protocol.

## Hierarchy

This rule (ARCH-000) supersedes all other rules. In case of conflict:

1. ARCH-000 (Primary Directive + Founding Principles) - absolute authority
2. /rules/architecture/* - system-wide decisions and cross-project contracts
3. Partition-specific rules - domain rules

## The Rules Service

ARCH-000 mandates the existence of a first-class Rules Service (`/server/rules/`) that:

1. **Indexes** all rules via machine-readable manifest
2. **Routes** tasks to specific rules via keyword matching
3. **Validates** rule integrity at startup
4. **Exposes** rules to the application for runtime consultation

## Rationale

Bilko Bibitkov will grow into an extremely complex system. Without rigorous rule governance:
- The agent will hallucinate features
- Inconsistencies will compound
- Debugging becomes archaeology
- Knowledge is lost between sessions

The rules are not overhead. The rules ARE the product. The application is merely the rules made executable.
