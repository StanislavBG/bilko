# Hub Layout

Rule ID: HUB-001
Priority: HIGH
Version: 1.3.0

## Context
These rules define the Application Hub shell layout (Level 1 navigation). This is the primary sidebar that is always present. Applications may add Level 2 and Level 3 navigation columns - see HUB-003 for the full 3-column layout pattern.

## Layout Structure

```
┌─────────────────────────────────────────────────┐
│  GLOBAL HEADER (h-11, full viewport width)      │
│  [Toggle]                        [Actions]      │
├──────────┬──────────────────────────────────────┤
│  Sidebar │                                      │
│  Header  │   Application Content Area           │
│  (h-11)  │   (may contain Level 2/3 nav +       │
│          │    Main Content)                     │
├──────────┤                                      │
│  Nav     │                                      │
│  items   │                                      │
│          │                                      │
├──────────┤                                      │
│  Footer  │                                      │
│  (toggle)│                                      │
└──────────┴──────────────────────────────────────┘
```

The GlobalHeader spans the full viewport width at App.tsx level. The Level 1 sidebar sits below it with its own h-11 header for visual alignment. See HUB-003 for the complete multi-level navigation pattern.

## Directives

### D1: Navigation Below GlobalHeader
The GlobalHeader spans the full viewport width at the top. The Level 1 sidebar extends from below the GlobalHeader to the bottom of the viewport.

**DO**: Place GlobalHeader at App.tsx level, sidebar below it in the flex container
**DON'T**: Place the sidebar above the GlobalHeader or outside the flex layout

### D2: Sidebar Zones
The sidebar contains three zones:
- **Header**: "Bilko Bibitkov AI Academy" (h-11, shows "B" when collapsed)
- **Content**: Navigation items (scrollable if needed)
- **Footer**: Collapse toggle button

**DO**: Keep the collapse toggle in the sidebar footer
**DON'T**: Place navigation controls outside the sidebar

Note: User controls (theme toggle, logout) live in the GlobalHeader at App.tsx level - see HUB-003 D5.

### D3: App Content Scrolling
The application content area scrolls independently. The nav remains fixed.

**DO**: overflow-y-auto on the content area
**DON'T**: Make the entire page scroll

### D4: Responsive Behavior
On mobile, the left nav collapses to a hamburger menu. The layout adapts gracefully.

## Implementation Notes
- Use Shadcn Sidebar component for the left nav
- Use CSS Grid or Flexbox for the layout shell
- Nav width: configurable via CSS variable
- Sidebar uses SidebarHeader, SidebarContent, SidebarFooter zones

## Rationale
This layout provides a consistent frame for all applications. The GlobalHeader at App.tsx level provides app-wide controls (theme, logout), while the sidebar provides navigation between applications.
