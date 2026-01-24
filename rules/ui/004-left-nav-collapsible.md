# UI-004: Left-Nav Collapsible Behavior

**Version**: 1.2.0  
**Priority**: HIGH  
**Partition**: ui

## Purpose

Defines consistent collapsible behavior for left navigation panels.

## Requirements

### 1. Collapsibility by Nav Level

| Level | Example | Collapsible | Rationale |
|-------|---------|-------------|-----------|
| Primary | Main sidebar | Required | Always visible, user needs space control |
| Secondary | Rules Explorer nav (Catalog/Audit) | Required | Persistent nav that benefits from minimizing |
| Tertiary | Partitions list, rules list | Optional | Contextual panels that appear/disappear based on selection |

### 2. Collapsed State Appearance

When collapsed:
- Width reduces to minimal width (flex-based or min-content)
- Header shows single letter initial (e.g., "B" for Bilko, "R" for Rules)
- Navigation items hidden or show abbreviated text
- Tooltips appear on hover showing full label

### 3. Expanded State Appearance

When expanded:
- Flex to fill available space within layout constraints
- Full header text visible
- Navigation items show text labels
- No tooltips needed (labels visible)

### 4. Collapse Trigger

- Trigger icon in header (chevron or panel-left icon)
- Click toggles between expanded/collapsed
- Position: right side of header area

### 5. State Persistence

- Collapse state persists within session
- Primary sidebar uses SidebarProvider context
- Secondary navs manage local state (useState)

## When to Skip Collapsibility

Tertiary navs may skip collapsibility when:
- They only appear contextually (after a selection)
- They have no header/title area
- Collapsing would provide minimal space savings
- The panel content is already minimal (< 5 items)

## Implementation Pattern

```tsx
const [isCollapsed, setIsCollapsed] = useState(false);

<div className={`shrink-0 border-r bg-sidebar flex flex-col h-full transition-all ${
  isCollapsed ? "min-w-12 max-w-12" : "min-w-[10rem] max-w-[12rem] flex-1"
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
      onClick={() => setIsCollapsed(!isCollapsed)}
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  </div>
  <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
    <span className="text-sm">{isCollapsed ? "" : "Label"}</span>
  </nav>
</div>
```

Note: Action icons (like PanelLeft for collapse toggle) are permitted per UI-005 scope.

## Cross-References

- HUB-001: Hub Layout (primary sidebar)
- UI-003: Secondary Navigation Pattern
- HUB-003: Nested Navigation Pattern
