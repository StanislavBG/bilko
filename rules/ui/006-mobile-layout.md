# UI-006: Mobile Layout

**Version**: 1.3.0  
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

### D6: Mobile Drill-Down Navigation

For pages with deep hierarchy, use stack-based drill-down within the Shadcn Sidebar Sheet. This supports N levels of depth with a consistent interface.

**Data Structure** (see ARCH-012):
```typescript
interface NavItem {
  id: string;
  title: string;
  url?: string;        // Leaf items navigate
  icon?: LucideIcon;
  children?: NavItem[]; // Parent items drill down
  adminOnly?: boolean;
}

interface NavLevel {
  title: string;
  items: NavItem[];
}
```

**Stack-Based State:**
```tsx
const rootLevel: NavLevel = { title: "App Name", items: visibleNavItems };
const [navStack, setNavStack] = useState<NavLevel[]>([rootLevel]);

const currentLevel = navStack[navStack.length - 1];
const canGoBack = navStack.length > 1;

const handleDrillInto = (item: NavItem) => {
  if (item.children) {
    setNavStack([...navStack, { title: item.title, items: item.children }]);
  }
};

const handleBack = () => {
  if (canGoBack) setNavStack(navStack.slice(0, -1));
};

const handleNavigate = (url: string) => {
  setLocation(url);
  setOpenMobile(false);
  setNavStack([rootLevel]); // Reset on navigation
};
```

**Rendering Pattern:**
```tsx
// Render current level uniformly - works for any depth
{currentLevel.items.map((item) => (
  <SidebarMenuItem key={item.id}>
    <SidebarMenuButton
      onClick={() => {
        if (item.children) handleDrillInto(item);
        else if (item.url) handleNavigate(item.url);
      }}
    >
      {item.icon && <item.icon className="h-4 w-4" />}
      <span>{item.title}</span>
      {item.children && <ChevronRight className="ml-auto h-4 w-4" />}
    </SidebarMenuButton>
  </SidebarMenuItem>
))}
```

**Key Behaviors:**
- Clicking item with `children` → pushes new level onto stack
- Back button → pops stack (visible when `canGoBack`)
- Clicking leaf item (has `url`) → navigates, closes Sheet, resets stack
- Adding new levels is data-only, no component changes needed

**Cross-Reference:** See ARCH-012 for NavItem interface and navigation data location.

### D7: Mobile Swipeable Carousel

For multi-part content on mobile (e.g., execution detail with image + posts), use CSS scroll-snap:

```tsx
// Container
<div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-4 pb-4">
  {slides.map((slide, i) => (
    <div key={i} className="snap-center shrink-0 w-full">
      {slide.content}
    </div>
  ))}
</div>

// Indicators
<div className="flex justify-center gap-2 mt-2">
  {slides.map((_, i) => (
    <div className={`w-2 h-2 rounded-full ${
      currentSlide === i ? "bg-foreground" : "bg-muted-foreground/30"
    }`} />
  ))}
</div>
```

**Scroll Detection:**
Use IntersectionObserver to detect current slide:
```tsx
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setCurrentSlide(Number(entry.target.dataset.index));
        }
      });
    },
    { threshold: 0.5 }
  );
  // Observe each slide
}, []);
```

## Cross-References

- HUB-003: Nested Navigation Pattern (desktop layout)
- UI-004: Left-Nav Collapsible Behavior (collapse mechanics)
- UI-005: Minimal Design Principles (sizing, aesthetics)
- HUB-001: Hub Layout (primary sidebar)
- APP-WORKFLOWS-001: Agentic Workflows (uses D6, D7 patterns)
- ARCH-012: Unified Navigation Structure (NavItem interface, navigation data)
