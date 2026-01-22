# Bilko Bibitkov - Development Rule Framework

This directory contains the hierarchical rule system that guides the Replit build agent during development.

## Rule Consumption Protocol

The Replit agent MUST read and apply rules in the following order:

0. **Shared Rules** (`/rules/shared/`) - Cross-project rules; read first to understand system context
1. **Architecture Rules** (`/rules/architecture/`) - Always applied first for project-specific work
2. **Hub Rules** (`/rules/hub/`) - Application Hub shell, layout, and access control
3. **App Rules** (`/rules/apps/`) - Per-application specific rules (subdirectory per app)
4. **Data Rules** (`/rules/data/`) - Applied when working with data models
5. **UI Rules** (`/rules/ui/`) - Applied when building user interfaces
6. **Integration Rules** (`/rules/integration/`) - Applied when connecting external services

## Shared Rules (Cross-Project)

The `/rules/shared/` partition contains rules that apply to BOTH Bilko Bibitkov projects:
- **Web Application** (this project)
- **n8n Workflow Engine** (separate Replit project)

**Important:** When setting up the n8n project, copy the entire `/rules/shared/` directory there. Both agents need identical copies of these rules.

Changes to shared rules must be propagated to both projects manually.

## Hub Rules

The `/rules/hub/` partition contains rules for the Application Hub shell:
- **HUB-001**: Layout structure (full-height nav, header over app area)
- **HUB-002**: Access control patterns (admin vs user roles)

These rules define the container that hosts all applications.

## App Rules

The `/rules/apps/` partition contains per-application rules. Each application has its own subdirectory:
- `/rules/apps/home-dashboard/` - Home Dashboard rules
- `/rules/apps/memory-explorer/` - Memory Explorer rules

Each app defines its own behavior while following Hub layout and UI design rules.

## Rule Format

Each rule file follows this structure:
- Rule ID and priority level
- Context: When this rule applies
- Directive: What the agent must do
- Rationale: Why this rule exists

## Core Principles

1. **Rules live in the codebase** - Not in external management systems
2. **Rules guide the agent** - Only the Replit agent consumes these rules
3. **Rules are hierarchical** - More specific rules can override general ones within their domain
4. **Human authors, agent executes** - Bilko (super admin) creates rules; agent applies them

## Usage

Before any development task, the agent should:
1. Identify which rule partitions apply to the current task
2. Read the relevant rules in priority order
3. Apply the rules during implementation
4. Document any rule violations or conflicts encountered
