# Bilko Bibitkov - Development Rule Framework

## Primary Directive (ARCH-000)

**NO CODE SHALL BE WRITTEN WITHOUT FIRST CONSULTING THE RULES.**

This directory contains the hierarchical rule system that guides AI developers during development. The Rules Service (`/server/rules/`) validates this framework at application startup.

## How to Use This System

### For AI Developers (Replit Agent, etc.)

1. You found this file via `replit.md` - good
2. Read this entire document to understand the system
3. Before each task, route through `manifest.json` or use the Rules Service
4. Cite rules in your response footer

### For Human Engineers

1. Read this document for system overview
2. Browse individual rule files for specific guidance
3. Use manifest.json to understand dependencies

## Rule Service Integration

The rules are not just documentation - they are a first-class service:

```typescript
import { getRulesService } from "./rules";

const service = getRulesService();
const result = service.routeTask("add n8n webhook integration");
// Returns: matchedRules, readOrder, citation
```

The application **WILL NOT START** if rules validation fails.

## Machine-Readable Manifest

All rules are indexed in `manifest.json` with:
- **id**: Unique identifier (e.g., "ARCH-000", "INT-001")
- **title**: Human-readable title
- **path**: File path relative to project root
- **partition**: Category (shared, architecture, hub, apps, data, ui, integration)
- **priority**: ABSOLUTE > CRITICAL > HIGH > MEDIUM > LOW
- **triggers**: Keywords that activate this rule
- **dependencies**: Rules that must also be read
- **crossReferences**: Related rules

## Reading Order

When consuming rules, follow this order:

1. **ARCH-000** (Primary Directive) - ALWAYS first, no exceptions
2. **ARCH-006** (Agent Bootstrap Protocol) - How to use this system
3. **Shared Rules** (`/rules/shared/`) - Cross-project rules; system context
4. **Architecture Rules** (`/rules/architecture/`) - System-wide decisions
5. **Task-specific partitions** based on routing

## Red Flags (Mandatory Reading Triggers)

When these words/concepts appear in a task, STOP and read the indicated partition:

| When you see... | Read this partition |
|-----------------|---------------------|
| `n8n`, `webhook`, `stripe`, `external service`, `API key` | `/rules/integration/` |
| `database`, `table`, `schema`, `migrate`, `query` | `/rules/data/` |
| `user sees`, `layout`, `page`, `component`, `styling` | `/rules/ui/` |
| `hub`, `sidebar`, `navigation`, `shell`, `access control` | `/rules/hub/` |
| `endpoint`, `API route`, `authentication`, `middleware` | `/rules/architecture/` |
| `new app`, `new feature`, `add capability` | `/rules/apps/` + `/rules/architecture/` |

## Rule Partitions

### `/rules/shared/` (Cross-Project)
Rules that apply to BOTH Bilko Bibitkov projects:
- **Web Application** (this project)
- **n8n Workflow Engine** (separate Replit project)

When setting up the n8n project, copy the entire `/rules/shared/` directory there.

### `/rules/architecture/`
System-wide architectural rules:
- **ARCH-000**: Primary Directive (NO CODE WITHOUT RULES)
- **ARCH-001**: Core Architecture Principles
- **ARCH-002**: Rule Maintenance
- **ARCH-003**: Orchestration Layer
- **ARCH-004**: Development Pacing
- **ARCH-005**: System Boundaries
- **ARCH-006**: Agent Bootstrap Protocol

### `/rules/hub/`
Application Hub shell rules:
- **HUB-001**: Layout structure (full-height nav, header over app area)
- **HUB-002**: Access control patterns (admin vs user roles)

### `/rules/apps/`
Per-application rules. Each app has its own subdirectory:
- `/rules/apps/home-dashboard/` - Home Dashboard rules
- `/rules/apps/memory-explorer/` - Memory Explorer rules

### `/rules/data/`
Data model and persistence rules:
- **DATA-001**: Data Principles
- **DATA-002**: Communication Trace Storage

### `/rules/ui/`
User interface rules:
- **UI-001**: UI Principles

### `/rules/integration/`
External service integration rules:
- **INT-001**: n8n Integration Rules
- **INT-002**: n8n API Best Practices (includes Recency Protocol)

## Cross-Reference Protocol

When a rule cites another rule (e.g., "see ARCH-003"), read that referenced rule before proceeding with implementation.

## Modification Protocol (per ARCH-002)

Before changing ANY rule:
1. Re-read ALL rules in that partition
2. Check for conflicts with proposed change
3. Update version number in the rule file
4. Update `rules/manifest.json` to reflect changes

## Accountability Footer

Every response involving code changes MUST include:

```
---
Rules consulted: ARCH-000, ARCH-006, [specific rules]
Not applicable: [partitions not relevant]
Primary Directive: Verified
---
```

This creates an explicit reasoning trail and surfaces gaps early.

## Validation at Startup

The Rules Service validates:
1. All rules in manifest exist as files
2. All dependencies reference valid rules
3. All cross-references reference valid rules
4. All rules are reachable via triggers or red flags (no orphans)

If validation fails, the application will not start.

## System Boundaries

- **Replit Application**: Web UI, authentication, orchestration layer, database, Rules Service
- **n8n** (Cloud or Self-Hosted): AI agents, workflow automation, external API integrations

Replit does NOT build AI agents - they live in n8n. See ARCH-005 for details.

## Project Structure

```
/rules/                    # Development rule framework (THE HEART)
  manifest.json            # Machine-readable rule index
  README.md                # This file - how to use the system
  /shared/                 # Cross-project rules (copy to n8n project)
  /architecture/           # System-wide architectural rules
    000-primary-directive.md  # THE PRIMARY DIRECTIVE
    001-core-principles.md    # Core Architecture Principles
    006-agent-bootstrap.md    # How agents use this system
  /hub/                    # Application Hub shell and access control
  /apps/                   # Per-application rules
  /data/                   # Data model and persistence rules
  /ui/                     # User interface rules
  /integration/            # External service integration rules

/server/rules/             # Rules Service (FIRST-CLASS)
  types.ts                 # TypeScript interfaces
  manifest.ts              # Manifest loader
  validator.ts             # Integrity validation
  router.ts                # Task-to-rules routing
  index.ts                 # Main service entry point
```

## Core Principles

1. **Rules live in the codebase** - Not in external management systems
2. **Rules guide the agent** - AI developers consume these rules
3. **Rules are hierarchical** - More specific rules can override general ones
4. **Human authors, agent executes** - Bilko creates rules; agent applies them
5. **Rules are validated** - The Rules Service enforces integrity
6. **No spillage** - Rule content lives here, not in replit.md
