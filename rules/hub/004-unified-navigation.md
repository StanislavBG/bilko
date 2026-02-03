# HUB-004: Unified Navigation Structure

**Version**: 1.0.0
**Priority**: HIGH
**Partition**: hub
**Dependencies**: HUB-001, HUB-003, UI-006
**Moved From**: ARCH-012 v1.0.0

## Purpose

Defines the unified, recursive data structure for application navigation. Enables N-level drill-down navigation with a consistent interface for both mobile and desktop.

---

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
- Items with `url` are leaf nodes that navigate
- Items with `children` are parent nodes that drill down
- Items can have both (desktop shows submenu)
- `id` generates `data-testid`: `nav-${item.id}`

### D2: Navigation Data Location

Navigation data lives in `client/src/data/navigation.ts`:

```typescript
import { navigationItems, filterNavItems, type NavItem } from "@/data/navigation";
```

### D3: Adding Navigation Levels

Modify data only - no component changes required:

```typescript
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
    }
  ]
}
```

### D4: Desktop vs Mobile Rendering

| Context | Parent Items | Leaf Items |
|---------|--------------|------------|
| Desktop Expanded | Collapsible submenu | Link |
| Desktop Collapsed | Tooltip link to first child | Tooltip link |
| Mobile | Drill-down (push to navStack) | Navigate + close |

### D5: Consistent Data-TestIds

- `nav-{id}` - Main nav items
- `button-nav-back` - Back button in drill-down
- `sidebar-title` - Current level title (mobile)

---

## Implementation Reference

Primary implementation: `client/src/components/app-sidebar.tsx`

---

## Cross-References

- HUB-001: Hub Layout (primary sidebar)
- HUB-003: Nested Navigation Pattern (collapsible behavior)
- UI-006: Mobile Layout (D6 for stack-based drill-down)
