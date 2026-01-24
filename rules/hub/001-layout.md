# Hub Layout

Rule ID: HUB-001
Priority: HIGH
Version: 1.2.0

## Context
These rules define the Application Hub shell layout (Level 1 navigation). This is the primary sidebar that is always present. Applications may add Level 2 and Level 3 navigation columns - see HUB-003 for the full 3-column layout pattern.

## Layout Structure

```
┌──────────┬──────────────────────────────────────┐
│  Header  │                                      │
│  (app    │                                      │
│  name)   │   Application Content Area           │
│          │   (may contain Level 2/3 nav +       │
│          │    Global Header + Main Content)     │
├──────────┤                                      │
│  Nav     │                                      │
│  items   │                                      │
│          │                                      │
├──────────┤                                      │
│  Footer  │                                      │
│  (toggle │                                      │
│  collapse│                                      │
│  button) │                                      │
└──────────┴──────────────────────────────────────┘
```

This diagram shows Level 1 (Hub) navigation only. For applications requiring additional navigation levels, see HUB-003.

## Directives

### D1: Full-Height Navigation
The left navigation extends from the top of the viewport to the bottom. All controls live within the sidebar.

**DO**: Make the nav 100vh height with header, content, and footer zones
**DON'T**: Place any horizontal header bar above or spanning the nav

### D2: Sidebar Zones
The sidebar contains three zones:
- **Header**: App name/logo (shows single letter when collapsed)
- **Content**: Navigation items (scrollable if needed)
- **Footer**: Collapse toggle button

**DO**: Keep the collapse toggle in the sidebar footer
**DON'T**: Place navigation controls outside the sidebar

Note: User controls (theme toggle, view mode, logout) live in the Global Header within the content area - see HUB-003 D5.

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
This layout provides a consistent frame for all applications with all controls accessible from the sidebar, eliminating the need for a separate header bar.
