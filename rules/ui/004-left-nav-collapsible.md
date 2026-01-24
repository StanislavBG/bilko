# UI-004: Left-Nav Collapsible Behavior

**Version**: 1.0.0  
**Priority**: HIGH  
**Partition**: ui

## Purpose

Defines consistent collapsible behavior for all left navigation panels.

## Requirements

### 1. All Left-Navs Are Collapsible

Every left navigation panel (primary sidebar, secondary nav, tertiary nav) must support a collapsed state.

### 2. Collapsed State Appearance

When collapsed:
- Width reduces to icon-only width (~3rem / 48px)
- Header shows single letter initial (e.g., "B" for Bilko, "R" for Rules)
- Navigation items show icons only, no labels
- Tooltips appear on hover showing full label

### 3. Expanded State Appearance

When expanded:
- Standard width for content (varies by panel type)
- Full header text visible
- Navigation items show icon + label
- No tooltips needed (labels visible)

### 4. Collapse Trigger

- Trigger icon in header (chevron or panel-left icon)
- Click toggles between expanded/collapsed
- Position: right side of header area

### 5. State Persistence

- Collapse state persists within session
- Primary sidebar uses SidebarProvider context
- Secondary navs manage local state (useState)

## Implementation Pattern

```tsx
const [isCollapsed, setIsCollapsed] = useState(false);

<div className={`shrink-0 border-r bg-sidebar flex flex-col h-full transition-all ${
  isCollapsed ? "w-12" : "w-40"
}`}>
  <div className="p-3 border-b shrink-0 flex items-center justify-between gap-2">
    {isCollapsed ? (
      <span className="text-sm font-semibold w-full text-center">R</span>
    ) : (
      <h1 className="text-sm font-semibold">Rules Explorer</h1>
    )}
    <Button
      size="icon"
      variant="ghost"
      className="h-6 w-6 shrink-0"
      onClick={() => setIsCollapsed(!isCollapsed)}
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  </div>
  <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
    <NavItem icon={Icon} label={isCollapsed ? undefined : "Label"} />
  </nav>
</div>
```

## Cross-References

- HUB-001: Hub Layout (primary sidebar)
- UI-003: Secondary Navigation Pattern
- HUB-003: Nested Navigation Pattern
