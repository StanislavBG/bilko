# Nested Navigation Pattern

Rule ID: HUB-003
Priority: HIGH
Version: 2.1.0

## Context
Complex applications may require navigation beyond the main hub sidebar. This rule defines the optional nested navigation pattern supporting up to 3 levels, including collapsible behavior.

## Navigation Levels

```
____________________________________________________________________________________
| GLOBAL HEADER (Full width, h-11, spans entire viewport width)                    |
| [Toggle]                                                       [Actions] [Theme] |
|__________________________________________________________________________________|
| Bilko      | BAR 2          | BAR 3          |                                   |
| Bibitkov   | App Name       | Section Name   |                                   |
| AI Academy |________________|________________|                                   |
| (h-11 hdr) | [ Folder ]     | - Page 1       |          MAIN CONTENT             |
| Icon A     | [ Folder ]     | - Page 2       |              AREA                 |
| Icon B     | [ Folder ]     | - Page 3       |                                   |
| Icon C     |                |                |                                   |
|____________|________________|________________|___________________________________|
```

**Key Layout Principles:**
- GlobalHeader is at App.tsx level, spanning full width above both sidebar and main content
- GlobalHeader contains: sidebar toggle and action buttons (theme, logout, etc.)
- Level 1 sidebar has h-11 header with "Bilko Bibitkov AI Academy" (or "B" when collapsed)
- Level 2 and Level 3 columns have their own headers showing the section name
- Only the Main Content Area scrolls; navigation columns remain fixed

### Level 1: Hub Navigation (Required)
- Managed by the hub shell (see HUB-001)
- Always present
- Routes between applications

### Level 2: Application Navigation (Optional)
- Managed by individual applications
- Sub-tabs or major sections within an app
- Examples: "Catalog" / "Audit" in Rules Explorer

### Level 3: Section Navigation (Optional)
- Managed by individual sections within an app
- Further breakdown within a Level 2 section
- Examples: Rule partitions in Rules Catalog, individual audit checks

## Directives

### D1: Maximum Three Levels
Navigation shall not exceed three levels. If deeper organization is needed, use content hierarchy (headings, collapsibles) rather than additional nav columns.

**DO**: Use 1-3 left nav columns as needed
**DON'T**: Create 4+ navigation levels

### D2: Progressive Disclosure
Each level reveals only when its parent is active. Level 3 appears only when a Level 2 item is selected.

**DO**: Show Level 3 nav contextually
**DON'T**: Show all navigation levels simultaneously when not needed

### D3: Consistent Styling
All navigation levels use the same visual language (Shadcn patterns, consistent spacing, hover states).

**DO**: Match styling across all nav levels
**DON'T**: Use different component patterns for different levels

### D4: Application Autonomy
Applications decide whether to use Level 2 and Level 3 navigation. The hub shell provides Level 1 only.

**DO**: Let each app manage its own nested nav
**DON'T**: Force nested nav on simple applications

### D5: GlobalHeader at App Level
The GlobalHeader is rendered at App.tsx level, spanning full viewport width above both the sidebar and main content. It contains the sidebar toggle, app title, and action buttons.

**DO**: Place GlobalHeader in App.tsx above the sidebar+main flex container
**DON'T**: Render GlobalHeader inside individual pages or inside the sidebar

### D6: Level 1 Sidebar Header
The Level 1 sidebar (AppSidebar) has a header displaying the application identity. Height matches GlobalHeader (h-11) for visual alignment.

**Expanded State:**
- Display "Bilko Bibitkov AI Academy" in small text (text-xs)
- Text must not wrap (whitespace-nowrap)

**Collapsed State:**
- Display single letter "B"

**DO**: Keep L1 sidebar header height matching GlobalHeader (h-11)
**DON'T**: Wrap text or use larger font sizes that cause overflow

### D7: Nav Column Headers
Level 2 (Application) and Level 3 (Section) navigation columns require a header zone at the top indicating their purpose.

**Expanded State:**
- Display the full text label (e.g., "Catalog", "Partitions", "Rules")
- Use muted text styling consistent with the design system

**Collapsed State:**
- Display a single-letter abbreviation with a tooltip showing the full text
- Examples: "C" for Catalog, "P" for Partitions, "R" for Rules

**DO**: Add header to Level 2 and Level 3 nav columns
**DON'T**: Leave navigation columns without context labels

### D8: Flex Layout Chain
Page root containers must use `flex-1` for height inheritance within the App.tsx flex context. The layout chain must be unbroken from App.tsx through to content.

**Flex Chain (required):**
```
App.tsx:
  div.flex.flex-col.h-screen.w-full
    └── GlobalHeader (h-11, shrink-0, full width)
    └── div.flex.flex-1.overflow-hidden
          └── AppSidebar (with h-11 header matching GlobalHeader)
          └── main.flex-1.flex.overflow-hidden
                └── Page root: flex flex-1 (NOT h-full)
                      └── Nav columns (L2, L3): flex flex-col shrink-0 (with own headers)
                      └── Content wrapper: flex-1 flex flex-col
                            └── PageContent: flex-1 flex flex-col overflow-hidden
                                  └── Content: flex-1 (or overflow-auto for scrollable)
```

**Scope**: This directive applies to page root containers and primary content wrappers. Component-level containers (e.g., skeletons, inner panels) may use `h-full` when their parent has explicit height.

**DO**: Use `flex-1` for page root and content wrappers in flex contexts
**DON'T**: Use `h-full` on page root containers (breaks flex height chain)

### D9: PageContent Wrapper
All pages must use the PageContent wrapper for their main content area. This ensures consistent ViewModeIndicator rendering and proper flex context. Note: GlobalHeader is now at App.tsx level, not in PageContent.

**DO**: Wrap page content in `<PageContent>{children}</PageContent>`
**DON'T**: Render GlobalHeader manually or skip PageContent wrapper

### D10: Nav Column Heights
All navigation columns have headers with fixed heights for visual alignment.

**Level 1 Header**: `h-11` (matches GlobalHeader height)
**L2/L3 Headers**: `h-8 flex items-center shrink-0`
**L2/L3 Footers**: `h-11 flex items-center justify-center shrink-0`
**Content**: `flex-1 overflow-auto`

**DO**: Use h-11 for L1 header, h-8 for L2/L3 headers, flex-1 for scrollable content
**DON'T**: Use different heights that cause misalignment

## Collapsible Behavior

### Collapsibility by Nav Level

| Level | Example | Collapsible | Rationale |
|-------|---------|-------------|-----------|
| Primary | Main sidebar | Required | Always visible, user needs space control |
| Secondary | Rules Explorer nav (Catalog/Audit) | Required | Persistent nav that benefits from minimizing |
| Tertiary | Partitions list, rules list | Recommended | Contextual panels benefit from consistent behavior |

### Collapsed State Appearance

When collapsed:
- Width reduces to minimal width (flex-based or min-content)
- Navigation items show abbreviated text (single letter or short code)
- Tooltips appear on hover showing full label

### Expanded State Appearance

When expanded:
- Flex to fill available space within layout constraints
- Navigation items show full text labels
- No tooltips needed (labels visible)

### Collapse Trigger

- Trigger uses PanelLeft icon
- Click toggles between expanded/collapsed
- Position: footer zone of each nav column (per D10)
- Centered within footer with border-t styling

### State Persistence

- Collapse state persists within session
- Primary sidebar uses SidebarProvider context
- Secondary/tertiary navs manage local state (useState)

### When to Skip Collapsibility

Tertiary navs may skip collapsibility when:
- They only appear contextually (after a selection)
- Collapsing would provide minimal space savings
- The panel content is already minimal (< 5 items)

### Nav Column Structure

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

### Collapse Implementation Pattern

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

## Implementation Notes
- GlobalHeader: Rendered in App.tsx, contains sidebar toggle and action buttons (theme, logout)
- Level 1: Use main Shadcn Sidebar with h-11 header showing "Bilko Bibitkov AI Academy" (or "B" when collapsed)
- Level 2/3: Use additional vertical nav within the application content area (with their own headers)
- Use relative sizing (flex, min-width) so panels expand to fill available space
- All levels remain fixed; only the content area scrolls
- GlobalHeader renders at App.tsx level, above sidebar+main flex container
- Level 2/3 nav column footers contain collapse toggles

## Examples

### Rules Explorer
- Level 2: "Catalog" | "Audit"
- Level 3 (Catalog): Rule partitions (architecture, hub, ui, data, apps, integration)
- Level 3 (Audit): Individual audit checks

### Memory Explorer (if needed)
- Level 2: "Browse" | "Search" | "Stats"
- Level 3: Optional, based on complexity

## Mobile Behavior

On mobile viewports (< 768px), navigation columns use the same user-controlled collapse behavior as desktop:
- All nav columns remain accessible (collapsed to minimal width by default)
- Users expand/collapse columns via footer toggles
- Primary sidebar accessible via SidebarTrigger in mobile header

See UI-006: Mobile Layout for full mobile specifications.

## Rationale
This pattern balances navigation depth with usability. Three levels allow complex applications to organize content without overwhelming users with too many choices at once.

## Changelog

### v2.1.0 (2026-02-01)
- Merged UI-004 (Left-Nav Collapsible Behavior) into this rule
- Added Collapsible Behavior section with implementation patterns
- UI-004 deprecated

### v2.0.0 (2026-01-29)
- Added GlobalHeader at App.tsx level
- Added nav column height specifications

## Cross-References

- HUB-001: Hub Layout (primary sidebar)
- UI-003: Secondary Navigation Pattern
- UI-006: Mobile Layout (user-controlled collapse on mobile)
