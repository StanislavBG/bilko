# UI-006: Mobile Layout

**Version**: 2.0.0  
**Priority**: HIGH  
**Partition**: ui

## Purpose

Defines mobile-responsive layout behavior for the "on the go" view. Mobile provides clean content-focused screens with navigation via primary sidebar drill-down.

## Scope

This rule applies when viewport width is below the mobile breakpoint (768px / md breakpoint).

## Directives

### D1: Mobile Breakpoint

- Use Tailwind's `md` breakpoint (768px) as the mobile/desktop threshold
- Below 768px: Mobile layout applies
- Above 768px: Desktop layout with side-by-side columns

### D2: Clean Content Layout (Mobile)

On mobile, pages show **content only** - no secondary/tertiary nav columns:

```
MOBILE (<768px):                    DESKTOP (>=768px):
+------------------+                +----+----+----+-------+
|     Content      |                |Nav1|Nav2|Nav3|Content|
|                  |                |    |    |    |       |
| (full width,     |                | L1 | L2 | L3 |       |
|  scrollable)     |                |    |    |    |       |
+------------------+                +----+----+----+-------+
```

**Behavior:**
- L2/L3 nav columns: Hidden on mobile (`hidden md:flex`)
- Content fills available width
- All navigation happens through primary sidebar (L1) drill-down
- Simple, Projects-like experience on mobile

### D3: Touch-Friendly Sizing

- Minimum tap target: 44px (h-11 in Tailwind)
- Increased padding on interactive elements
- Generous spacing between nav items

### D4: Navigation Visibility

On mobile:
- Primary sidebar: Hidden by default, accessible via SidebarTrigger in GlobalHeader
- Secondary/tertiary navs: **Hidden** (use `hidden md:flex`)
- Navigation hierarchy moves to primary sidebar drill-down

### D5: No New APIs

No new backend APIs or data persistence required:
- Primary sidebar uses Shadcn SidebarProvider with Sheet overlay on mobile
- Desktop nav columns manage local state (useState) for collapse
- "Stateless" means no backend persistence of nav state

## Implementation Pattern

```tsx
// L2/L3 nav columns: hidden on mobile, visible on desktop
<div className="hidden md:flex shrink-0 border-r bg-muted/20 flex-col">
  {/* Desktop nav content */}
</div>

// Content area: full width on mobile
<div className="flex-1 overflow-auto p-6">
  {/* Page content */}
</div>
```

## Layout Patterns

| Element | Mobile (< 768px) | Desktop (>= 768px) |
|---------|------------------|-------------------|
| Primary sidebar | Sheet overlay via SidebarTrigger | Persistent side column |
| Secondary nav | **Hidden** | Visible column |
| Tertiary nav | **Hidden** | Visible column |
| Content area | Full width | Remaining space |
| GlobalHeader | Visible with SidebarTrigger | Visible |

### D6: Mobile Drill-Down Navigation

For pages with deep hierarchy, use stack-based drill-down within the Shadcn Sidebar Sheet. This supports N levels of depth with a consistent interface.

**Data Structure** (see HUB-004):
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

**Cross-Reference:** See HUB-004 for NavItem interface and navigation data location.

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

## Changelog

### v2.0.0 (2026-02-01)
- **Breaking**: L2/L3 navs now hidden on mobile (previously collapsed columns)
- Mobile uses clean content layout with navigation via primary sidebar drill-down
- Updated D2, D4 to reflect Projects-like mobile experience
- Removed collapsible column pattern for mobile

### v1.3.0
- Added D6 Mobile Drill-Down Navigation
- Added D7 Mobile Swipeable Carousel

## Cross-References

- HUB-003: Nested Navigation Pattern (desktop layout, collapsible behavior)
- UI-005: Minimal Design Principles (sizing, aesthetics)
- HUB-001: Hub Layout (primary sidebar)
- APP-WORKFLOWS-001: Agentic Workflows (uses D6, D7 patterns)
- HUB-004: Unified Navigation Structure (NavItem interface, navigation data)
