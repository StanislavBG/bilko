# UI-004: Left-Nav Collapsible Behavior

**Version**: 1.4.0  
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
| Tertiary | Partitions list, rules list | Recommended | Contextual panels benefit from consistent behavior |

### 2. Collapsed State Appearance

When collapsed:
- Width reduces to minimal width (flex-based or min-content)
- Navigation items show abbreviated text (single letter or short code)
- Tooltips appear on hover showing full label

### 3. Expanded State Appearance

When expanded:
- Flex to fill available space within layout constraints
- Navigation items show full text labels
- No tooltips needed (labels visible)

### 4. Collapse Trigger

- Trigger uses PanelLeft icon
- Click toggles between expanded/collapsed
- Position: footer zone of each nav column (per HUB-003 D6)
- Centered within footer with border-t styling

### 5. State Persistence

- Collapse state persists within session
- Primary sidebar uses SidebarProvider context
- Secondary/tertiary navs manage local state (useState)

## When to Skip Collapsibility

Tertiary navs may skip collapsibility when:
- They only appear contextually (after a selection)
- Collapsing would provide minimal space savings
- The panel content is already minimal (< 5 items)

## Nav Column Structure

Navigation columns follow this recommended structure:

```
+------------------+
|                  |
|   Nav Items      |  <- Content area with nav buttons
|   (full height)  |
|                  |
|------------------|  <- border-t
|     [ < ]        |  <- Centered collapse toggle
+------------------+
```

## Implementation Pattern

```tsx
const [isCollapsed, setIsCollapsed] = useState(false);

<div className={`shrink-0 border-r bg-sidebar flex flex-col h-full transition-all ${
  isCollapsed ? "min-w-12 max-w-12" : "min-w-[10rem] max-w-[12rem] flex-1"
}`}>
  {/* Content area - no header */}
  <div className="flex-1 p-2 space-y-1 overflow-y-auto">
    {isCollapsed ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" className="w-full justify-center">
            <span>C</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Catalog</TooltipContent>
      </Tooltip>
    ) : (
      <Button variant="ghost" className="w-full justify-start">
        Catalog
      </Button>
    )}
  </div>
  
  {/* Footer with collapse toggle */}
  <div className="border-t p-2 flex justify-center">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {isCollapsed ? "Expand" : "Collapse"}
      </TooltipContent>
    </Tooltip>
  </div>
</div>
```

Note: Action icons (like PanelLeft for collapse toggle) are permitted per UI-005 scope.

## Mobile Behavior

On mobile viewports, the same user-controlled collapse behavior applies. See UI-006: Mobile Layout for details.

## Cross-References

- HUB-001: Hub Layout (primary sidebar)
- UI-003: Secondary Navigation Pattern
- HUB-003: Nested Navigation Pattern (D6 specifies footer placement)
- UI-006: Mobile Layout (user-controlled collapse on mobile)
