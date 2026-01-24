# UI-005: Minimal Design Principles

**Version**: 1.3.0  
**Priority**: HIGH  
**Partition**: ui

## Purpose

Defines the minimal, professional aesthetic for navigation and data display.

## Scope

This rule applies to:
- Navigation items (sidebar, secondary/tertiary nav panels)
- Data display (badges, status indicators, metadata)
- Layout sizing

This rule does NOT prohibit:
- Action icons (close, toggle, expand buttons) - these are functional, not decorative
- Semantic icons in content areas (e.g., showing dependencies with link icons)

## Directives

### D1: Navigation Icon Policy
- **Level 1 (Hub Sidebar)**: Icons permitted alongside text labels for quick visual identification
- **Level 2/3 (Application Nav)**: Text labels only, no decorative icons
- Collapsed state: Show single-letter abbreviation with tooltip

### D2: No Colored Badges or Accents
- Priority levels displayed as plain text, not colored badges
- No colored backgrounds on status indicators
- Black/white/gray color palette for metadata display

### D3: Relative Sizing
- Avoid fixed pixel widths (e.g., w-32, w-40, 160px classes)
- Use flex-based layouts with min-width/max-width constraints
- rem-based constraints are acceptable (they scale with font size)
- Panels expand to fill available space within constraints
- Note: Shadcn component defaults (e.g., max-w-lg on Dialog, max-w-sm on Sheet) are acceptable as they use rem-based sizing

### D4: Clean Borders
- Simple 1px borders for separation
- No shadows, glows, or decorative elements

## Cross-References

- UI-001: UI Principles
- UI-004: Left-Nav Collapsible Behavior
- HUB-003: Nested Navigation Pattern
- UI-006: Mobile Layout
