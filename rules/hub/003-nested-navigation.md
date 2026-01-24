# Nested Navigation Pattern

Rule ID: HUB-003
Priority: HIGH
Version: 1.7.0

## Context
Complex applications may require navigation beyond the main hub sidebar. This rule defines the optional nested navigation pattern supporting up to 3 levels.

## Navigation Levels

```
____________________________________________________________________________________
| BAR 1      | BAR 2          | BAR 3          | HEADER (Pinned to top of Main)    |
| (Global)   |________________|________________|___________________________________|
|            | App Name       | Section Name   |                                   |
|            |________________|________________|                                   |
| Icon A     | [ Folder ]     | - Page 1       |          MAIN CONTENT             |
| Icon B     | [ Folder ]     | - Page 2       |              AREA                 |
| Icon C     | [ Folder ]     | - Page 3       |                                   |
|            |                |                |                                   |
|            |                |                |                                   |
|            |                |                |                                   |
|____________|________________|________________|                                   |
| [ < ]      | [ < ]          | [ < ]          |                                   |
| (Collapse) | (Collapse)     | (Collapse)     |___________________________________|
```

**Key Layout Principles:**
- All three navigation columns extend full-height (viewport height)
- The Global Header sits above the Content Area ONLY - it does NOT span across the navigation columns
- Level 2 and Level 3 columns have their own headers showing the application/section name
- Each navigation column has a collapse button at its footer
- Only the Main Content Area scrolls; navigation columns remain fixed

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

### D5: Header Pinning
The Global Header is pinned to the top of the Main Content Area only. It does NOT span across the navigation columns.

**DO**: Place header inside the content area, above scrollable content
**DON'T**: Create a top-spanning header bar that sits above the nav columns

### D6: Collapse Button Placement
Each navigation column has a collapse toggle button in its footer zone. See UI-004 for collapse behavior details.

**DO**: Place collapse buttons at the bottom of each nav column
**DON'T**: Hide collapse controls or place them in headers only

### D7: Nav Column Headers
Level 2 (Application) and Level 3 (Section) navigation columns require a header zone at the top indicating their purpose.

**Expanded State:**
- Display the full text label (e.g., "Catalog", "Partitions", "Rules")
- Use muted text styling consistent with the design system

**Collapsed State:**
- Display a single-letter abbreviation with a tooltip showing the full text
- Examples: "C" for Catalog, "P" for Partitions, "R" for Rules

**DO**: Add header to Level 2 and Level 3 nav columns
**DON'T**: Leave navigation columns without context labels

## Implementation Notes
- Level 1: Use main Shadcn Sidebar (SidebarProvider in App.tsx)
- Level 2/3: Use additional vertical nav within the application content area
- Use relative sizing (flex, min-width) so panels expand to fill available space
- All levels remain fixed; only the content area scrolls
- Header component renders inside the main content flex container, not at the root level
- Each nav column footer contains its collapse toggle (see UI-004)

## Examples

### Rules Explorer
- Level 2: "Catalog" | "Audit"
- Level 3 (Catalog): Rule partitions (architecture, hub, ui, data, apps, integration)
- Level 3 (Audit): Individual audit checks

### Memory Explorer (if needed)
- Level 2: "Browse" | "Search" | "Stats"
- Level 3: Optional, based on complexity

## Mobile Behavior

On mobile viewports (< 768px), navigation columns use the same user-controlled collapse behavior as desktop:
- All nav columns remain accessible (collapsed to minimal width by default)
- Users expand/collapse columns via footer toggles
- Primary sidebar accessible via SidebarTrigger in mobile header

See UI-006: Mobile Layout for full mobile specifications.

## Rationale
This pattern balances navigation depth with usability. Three levels allow complex applications to organize content without overwhelming users with too many choices at once.
