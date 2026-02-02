# ARCH-012: Unified Navigation Structure

**Version**: 1.0.0  
**Priority**: HIGH  
**Partition**: architecture  
**Dependencies**: ARCH-000, UI-006

## Purpose

Defines the unified, recursive data structure for application navigation. Enables N-level drill-down navigation with a consistent interface for both mobile and desktop.

## Scope

This rule applies to the primary sidebar navigation system and any nested navigation hierarchies.

## Directives

### D1: NavItem Interface

All navigation items use a single recursive interface:

```typescript
interface NavItem {
  id: string;           // Unique identifier (used for data-testid)
  title: string;        // Display label
  url?: string;         // Optional - leaf items navigate
  icon?: LucideIcon;    // Optional - from lucide-react
  children?: NavItem[]; // Optional - parent items have children
  adminOnly?: boolean;  // Optional - visibility control
}
```

**Key Properties:**
- Items with `url` are leaf nodes that navigate when clicked
- Items with `children` are parent nodes that drill down when clicked
- Items can have both `url` and `children` (desktop shows submenu, first child used for collapsed link)
- `id` is used for `data-testid` generation: `nav-${item.id}`

### D2: Navigation Data Location

Navigation data lives in `client/src/data/navigation.ts`:

```typescript
import { navigationItems, filterNavItems, type NavItem } from "@/data/navigation";
```

This file exports:
- `navigationItems: NavItem[]` - The complete navigation tree
- `filterNavItems(items, isAdmin)` - Filters by admin visibility
- `NavItem` type for use in components

### D3: Adding Navigation Levels

To add new navigation levels, modify the data only:

```typescript
// Example: 3-level navigation
{
  id: "settings",
  title: "Settings",
  icon: Settings,
  children: [
    {
      id: "settings-account",
      title: "Account",
      children: [
        { id: "settings-profile", title: "Profile", url: "/settings/profile" },
        { id: "settings-security", title: "Security", url: "/settings/security" }
      ]
    },
    { id: "settings-preferences", title: "Preferences", url: "/settings/preferences" }
  ]
}
```

No component changes required - the rendering logic handles any depth.

### D4: Desktop vs Mobile Rendering

| Context | Parent Items | Leaf Items |
|---------|--------------|------------|
| Desktop Expanded | Collapsible submenu | Link with `asChild` |
| Desktop Collapsed | Tooltip link to first child | Tooltip link |
| Mobile | Drill-down (push to navStack) | Navigate + close Sheet |

### D5: Consistent Data-TestIds

Navigation test IDs follow the pattern:
- `nav-{id}` - Main nav items
- `button-nav-back` - Back button in drill-down
- `sidebar-title` - Current level title (mobile)

## Implementation Reference

Primary implementation: `client/src/components/app-sidebar.tsx`

For mobile drill-down behavior, see UI-006 D6.

## Cross-References

- UI-006: Mobile Layout (D6 for stack-based drill-down)
- HUB-003: Nested Navigation Pattern (includes collapsible behavior, merged from UI-004)
- HUB-001: Hub Layout (primary sidebar)
