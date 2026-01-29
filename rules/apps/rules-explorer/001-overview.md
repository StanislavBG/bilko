# Rules Explorer

Rule ID: APP-RULES-001
Priority: HIGH
Version: 1.0.0

## Context
Rules Explorer is an admin-only application for browsing, reading, and auditing the rule system. It provides visibility into the rule framework that governs all development.

## Purpose

The Rules Explorer serves as:
1. **Rule Catalog** - Browse all rules organized by partition
2. **Rule Viewer** - Read full rule content with markdown rendering
3. **Audit Interface** - View audit protocol and save audit reports

## Access Control

- **Admin only** - Uses `effectiveIsAdmin` from ViewModeContext
- Non-admins should not see this app in navigation

## Navigation Structure

Uses 3-level navigation per HUB-003:
- Level 1: Hub sidebar (Rules link)
- Level 2: Catalog | Audit
- Level 3: Partition list (Catalog) or Protocol/New/History (Audit)

## Views

### V1: Catalog View
Browse rules by partition:
- Partition selector (Level 3 nav)
- Rule list within selected partition
- Rule detail panel with rendered markdown

### V2: Audit View
Manage rule audits:
- **Protocol Guide** - Display AGT-002-RULES auditor protocol instructions
- **New Audit** - Textarea for pasting audit reports
- **History** - List of saved audits with detail view

## API Endpoints

- `GET /api/rules` - List all rules from manifest
- `GET /api/rules/:id` - Get single rule content
- `GET /api/audit/protocol` - Get auditor protocol content
- `GET /api/audits` - List saved audits
- `POST /api/audits` - Save new audit report

## Directives

### D1: Read-Only Rules
Rules Explorer never modifies rule files. Rule editing is done via the agent.

**DO**: Fetch and display rule content
**DON'T**: Provide edit functionality for rules

### D2: Markdown Rendering
Render rule content as formatted markdown.

**DO**: Use react-markdown with proper styling
**DON'T**: Show raw markdown text

### D3: Audit Persistence
Save audit reports to the database for historical tracking.

**DO**: Store audits with timestamps
**DON'T**: Lose audit history on page refresh

## Rationale
Rules are the heart of the project. The Rules Explorer makes them accessible and visible, reinforcing the rules-first development methodology.
