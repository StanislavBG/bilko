# Bilko Bibitkov - Development Rule Framework

## Primary Directive (ARCH-000)

**NO CODE SHALL BE WRITTEN WITHOUT FIRST CONSULTING THE RULES.**

This directory contains the hierarchical rule system that guides the Replit build agent during development. The Rules Service (`/server/rules/`) validates this framework at application startup.

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

## Rule Consumption Protocol

The Replit agent MUST read and apply rules in the following order:

0. **ARCH-000** (Primary Directive) - ALWAYS first, no exceptions
1. **Shared Rules** (`/rules/shared/`) - Cross-project rules; system context
2. **Architecture Rules** (`/rules/architecture/`) - System-wide decisions
3. **Hub Rules** (`/rules/hub/`) - Application Hub shell, layout, access
4. **App Rules** (`/rules/apps/`) - Per-application specific rules
5. **Data Rules** (`/rules/data/`) - Data models and persistence
6. **UI Rules** (`/rules/ui/`) - User interface rules
7. **Integration Rules** (`/rules/integration/`) - External service integration

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

## Rule Format

Each rule file follows this structure:
- **Rule ID and priority level**
- **Context**: When this rule applies
- **Directive**: What the agent must do
- **Rationale**: Why this rule exists

## Validation at Startup

The Rules Service validates:
1. All rules in manifest exist as files
2. All dependencies reference valid rules
3. All cross-references reference valid rules
4. All rules are reachable via triggers or red flags (no orphans)

If validation fails, the application will not start.

## Routing System

### Triggers
Each rule has keywords that activate it. The Rules Service matches task descriptions against these triggers.

### Red Flags
Certain keywords force entire partitions to be read:
- `n8n`, `stripe`, `external` → `/rules/integration/`
- `database`, `table`, `schema` → `/rules/data/`
- `user sees`, `layout`, `page` → `/rules/ui/`
- `hub`, `sidebar`, `navigation` → `/rules/hub/`
- `endpoint`, `api route`, `authentication` → `/rules/architecture/`
- `new app`, `new feature` → `/rules/apps/` + `/rules/architecture/`

### Always Include
ARCH-000 (Primary Directive) is always included in every routing result.

## Core Principles

1. **Rules live in the codebase** - Not in external management systems
2. **Rules guide the agent** - Only the Replit agent consumes these rules
3. **Rules are hierarchical** - More specific rules can override general ones
4. **Human authors, agent executes** - Bilko creates rules; agent applies them
5. **Rules are validated** - The Rules Service enforces integrity

## Accountability

Every response involving code changes must include:

```
---
Rules consulted: ARCH-000, ARCH-003, INT-002
Not applicable: DATA-* (no database changes)
Primary Directive: Verified
---
```

## Usage

Before any development task, the agent should:
1. Use the Rules Service to route the task
2. Read the rules in the order specified
3. Apply the rules during implementation
4. Document which rules were consulted in the response
