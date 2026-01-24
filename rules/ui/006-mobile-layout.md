# UI-006: Mobile Layout

**Version**: 1.1.0  
**Priority**: HIGH  
**Partition**: ui

## Purpose

Defines mobile-responsive layout behavior for the "on the go" view, focusing on collapsible navigation columns with user-controlled expand/collapse.

## Scope

This rule applies when viewport width is below the mobile breakpoint (768px / md breakpoint).

## Directives

### D1: Mobile Breakpoint

- Use Tailwind's `md` breakpoint (768px) as the mobile/desktop threshold
- Below 768px: Mobile layout applies
- Above 768px: Desktop layout with side-by-side columns

### D2: Collapsible Column Layout

Navigation columns use the same layout on mobile and desktop. Users control collapse state:

```
ALL VIEWPORTS:
+----+----+----+-------+      +--+--+--+--------+
|Nav1|Nav2|Nav3|Content|  or  |N1|N2|N3|Content |
|    |    |    |       |      |  |  |  |        |
| expanded columns     |      | collapsed cols  |
+----+----+----+-------+      +--+--+--+--------+
```

**Behavior:**
- Columns use min-width/max-width constraints (rem-based)
- Each column has a user-controlled collapse toggle in footer
- When collapsed: ~48px wide with abbreviated content
- When expanded: 8-12rem wide with full labels
- No automatic collapse on mobile - user-driven only
- All columns remain accessible at all viewport sizes

### D3: Touch-Friendly Sizing

- Minimum tap target: 44px (h-11 in Tailwind)
- Increased padding on interactive elements
- Generous spacing between nav items

### D4: Navigation Visibility

On mobile:
- Primary sidebar: Hidden by default, accessible via SidebarTrigger in mobile header (per HUB-001)
- Secondary/tertiary navs: Remain visible as narrow collapsed columns
- Each nav column uses its existing collapse toggle to expand/collapse

No new navigation controls are introduced - reuse existing collapse toggles and SidebarTrigger.

### D5: No New APIs

No new backend APIs or data persistence required:
- Leverage existing collapse state (local useState) per nav column
- Ephemeral local UI state (useState) is permitted
- "Stateless" means no backend persistence of nav state, not prohibition of React state
- Primary sidebar uses Shadcn SidebarProvider with `hidden md:flex` pattern

## Implementation Pattern

```tsx
// Each nav manages its own collapse state
const [isNavCollapsed, setIsNavCollapsed] = useState(false);

// Nav column with responsive sizing
<div className={`shrink-0 border-r flex flex-col transition-all ${
  isNavCollapsed ? "min-w-12 max-w-12" : "min-w-[8rem] max-w-[10rem] flex-1"
}`}>
  {/* Nav items with collapsed/expanded display */}
  <div className="flex-1 overflow-auto">
    {isNavCollapsed ? (
      <Tooltip><Button>A</Button></Tooltip>  // Abbreviated
    ) : (
      <Button>Full Label</Button>  // Full text
    )}
  </div>
  
  {/* Footer toggle */}
  <div className="border-t p-2 flex justify-center">
    <Button onClick={() => setIsNavCollapsed(!isNavCollapsed)}>
      <PanelLeft />
    </Button>
  </div>
</div>
```

## Layout Patterns

| Element | Mobile (< 768px) | Desktop (>= 768px) |
|---------|------------------|-------------------|
| Primary sidebar | Sheet overlay via SidebarTrigger | Persistent side column |
| Secondary nav | User-controlled collapse | User-controlled collapse |
| Tertiary nav | User-controlled collapse | User-controlled collapse |
| Content area | Remaining space | Remaining space |
| Mobile header | Visible with SidebarTrigger | Hidden |

## Cross-References

- HUB-003: Nested Navigation Pattern (desktop layout)
- UI-004: Left-Nav Collapsible Behavior (collapse mechanics)
- UI-005: Minimal Design Principles (sizing, aesthetics)
- HUB-001: Hub Layout (primary sidebar)

## Version History

- 1.1.0: Simplified to user-controlled collapse (removed accordion hiding requirement)
- 1.0.0: Initial mobile layout rule
