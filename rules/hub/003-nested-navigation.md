# Nested Navigation Pattern

Rule ID: HUB-003
Priority: HIGH
Version: 1.2.0

## Context
Complex applications may require navigation beyond the main hub sidebar. This rule defines the optional nested navigation pattern supporting up to 3 levels.

## Navigation Levels

```
┌────────────┬────────────┬────────────┬──────────────────────┐
│            │            │            │  Global Header       │
│  Level 1   │  Level 2   │  Level 3   ├──────────────────────┤
│  (Hub)     │  (App)     │  (Section) │                      │
│            │            │            │   Content Area       │
│  - Home    │ - Catalog  │ - arch     │                      │
│  - Rules   │ - Audit    │ - hub      │                      │
│  - Memory  │            │ - ui       │                      │
│            │            │            │                      │
└────────────┴────────────┴────────────┴──────────────────────┘
```

The three left navigation columns extend full-height. The Global Header sits above the Content Area only, containing user info and global actions (theme toggle, view mode, logout).

### Level 1: Hub Navigation (Required)
- Managed by the hub shell (see HUB-001)
- Always present
- Routes between applications

### Level 2: Application Navigation (Optional)
- Managed by individual applications
- Sub-tabs or major sections within an app
- Examples: "Catalog" / "Audit" in Rules Explorer

### Level 3: Section Navigation (Optional)
- Managed by individual sections within an app
- Further breakdown within a Level 2 section
- Examples: Rule partitions in Rules Catalog, individual audit checks

## Directives

### D1: Maximum Three Levels
Navigation shall not exceed three levels. If deeper organization is needed, use content hierarchy (headings, collapsibles) rather than additional nav columns.

**DO**: Use 1-3 left nav columns as needed
**DON'T**: Create 4+ navigation levels

### D2: Progressive Disclosure
Each level reveals only when its parent is active. Level 3 appears only when a Level 2 item is selected.

**DO**: Show Level 3 nav contextually
**DON'T**: Show all navigation levels simultaneously when not needed

### D3: Consistent Styling
All navigation levels use the same visual language (Shadcn patterns, consistent spacing, hover states).

**DO**: Match styling across all nav levels
**DON'T**: Use different component patterns for different levels

### D4: Application Autonomy
Applications decide whether to use Level 2 and Level 3 navigation. The hub shell provides Level 1 only.

**DO**: Let each app manage its own nested nav
**DON'T**: Force nested nav on simple applications

## Implementation Notes
- Level 1: Use main Shadcn Sidebar (SidebarProvider in App.tsx)
- Level 2/3: Use additional vertical nav within the application content area
- Suggested widths: Level 2 ~160px, Level 3 ~180px (adjust per app needs)
- All levels remain fixed; only the content area scrolls

## Examples

### Rules Explorer
- Level 2: "Catalog" | "Audit"
- Level 3 (Catalog): Rule partitions (architecture, hub, ui, data, apps, integration)
- Level 3 (Audit): Individual audit checks

### Memory Explorer (if needed)
- Level 2: "Browse" | "Search" | "Stats"
- Level 3: Optional, based on complexity

## Rationale
This pattern balances navigation depth with usability. Three levels allow complex applications to organize content without overwhelming users with too many choices at once.
