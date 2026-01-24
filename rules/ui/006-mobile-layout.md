# UI-006: Mobile Layout

**Version**: 1.0.0  
**Priority**: HIGH  
**Partition**: ui

## Purpose

Defines mobile-responsive layout behavior for the "on the go" view, focusing on accordion-style navigation where only one nav column is expanded at a time.

## Scope

This rule applies when viewport width is below the mobile breakpoint (768px / md breakpoint).

## Directives

### D1: Mobile Breakpoint

- Use Tailwind's `md` breakpoint (768px) as the mobile/desktop threshold
- Below 768px: Mobile layout applies
- Above 768px: Desktop layout with side-by-side columns

### D2: Accordion Navigation

On mobile, only one navigation column is visible/expanded at a time:

```
DESKTOP (>= 768px):           MOBILE (< 768px):
+----+----+----+-------+      +------------------+
|Nav1|Nav2|Nav3|Content|      |  Active Nav      |
|    |    |    |       |  =>  |  (full width)    |
|    |    |    |       |      +------------------+
+----+----+----+-------+      |  Content         |
                              +------------------+
```

**Behavior:**
- Tapping a collapsed nav expands it and collapses others
- Nav columns overlay or replace the content area when expanded
- Back/close action returns to content view
- No new APIs required - use existing collapse state + CSS responsive classes

### D3: Touch-Friendly Sizing

- Minimum tap target: 44px (h-11 in Tailwind)
- Increased padding on interactive elements
- Generous spacing between nav items

### D4: Navigation Visibility

On mobile:
- Primary sidebar: Hidden by default, accessible via existing SidebarTrigger (per HUB-001)
- Secondary nav: Shows as overlay or full-screen when active
- Tertiary nav: Shows inline below secondary when secondary is active

No new navigation controls are introduced - reuse existing collapse toggles and SidebarTrigger.

### D5: No New APIs

No new backend APIs or data persistence required:
- Use CSS media queries and responsive Tailwind classes
- Leverage existing collapse state (local useState) per nav column
- Use `hidden md:flex` patterns for conditional visibility
- Ephemeral local UI state (useState) is permitted for accordion behavior
- "Stateless" means no backend persistence of mobile nav state, not prohibition of React state

### D6: Content Priority

On mobile:
- Content area is the default view
- Navigation is accessed on-demand via toggles
- Preserve scroll position when toggling between nav and content

## Implementation Pattern

```tsx
// Accordion nav - only one expanded at a time on mobile
const [activeNav, setActiveNav] = useState<'primary' | 'secondary' | 'content'>('content');

// Toggle that collapses others
const toggleNav = (nav: 'primary' | 'secondary') => {
  setActiveNav(current => current === nav ? 'content' : nav);
};

// Responsive visibility
<div className={`
  ${activeNav === 'secondary' ? 'flex' : 'hidden'} 
  md:flex 
  flex-col
`}>
  {/* Secondary nav content */}
</div>
```

## Responsive Class Patterns

| Element | Mobile | Desktop |
|---------|--------|---------|
| Primary sidebar | `hidden md:flex` + toggle | Always visible |
| Secondary nav | Overlay when active | Side column |
| Tertiary nav | Inline below secondary | Side column |
| Content area | Full width when no nav active | Remaining space |

## Cross-References

- HUB-003: Nested Navigation Pattern (desktop layout)
- UI-004: Left-Nav Collapsible Behavior (collapse mechanics)
- UI-005: Minimal Design Principles (sizing, aesthetics)
- HUB-001: Hub Layout (primary sidebar)

## Version History

- 1.0.0: Initial mobile layout rule
