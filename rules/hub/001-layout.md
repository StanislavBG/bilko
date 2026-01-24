# Hub Layout

Rule ID: HUB-001
Priority: HIGH
Version: 1.1.0

## Context
These rules define the Application Hub shell layout. All applications render within this structure.

## Layout Structure

```
┌──────────┬──────────────────────────────────────┐
│  Header  │                                      │
│  (app    │                                      │
│  name)   │   Application Content Area           │
│          │                                      │
├──────────┤                                      │
│  Nav     │                                      │
│  items   │                                      │
│          │                                      │
├──────────┤                                      │
│  Footer  │                                      │
│  (user   │                                      │
│  controls│                                      │
│  theme)  │                                      │
└──────────┴──────────────────────────────────────┘
```

## Directives

### D1: Full-Height Navigation
The left navigation extends from the top of the viewport to the bottom. All controls live within the sidebar.

**DO**: Make the nav 100vh height with header, content, and footer zones
**DON'T**: Place any horizontal header bar above or spanning the nav

### D2: Sidebar Zones
The sidebar contains three zones:
- **Header**: App name/logo with optional collapse trigger
- **Content**: Navigation items (scrollable if needed)
- **Footer**: User avatar, theme toggle, view mode toggle, logout

**DO**: Keep all user controls in the sidebar footer
**DON'T**: Create a separate horizontal header bar for user controls

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
