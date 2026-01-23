# Hub Layout

Rule ID: HUB-001
Priority: HIGH
Version: 1.0.0

## Context
These rules define the Application Hub shell layout. All applications render within this structure.

## Layout Structure

```
┌──────────┬──────────────────────────────────────┐
│          │  App Header                          │
│  Left    ├──────────────────────────────────────┤
│  Nav     │                                      │
│  (full   │   Application Content Area           │
│  height) │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

## Directives

### D1: Full-Height Navigation
The left navigation extends from the top of the viewport to the bottom. It does not share vertical space with any header.

**DO**: Make the nav 100vh height
**DON'T**: Place a global header above the nav

### D2: Header Over App Area Only
The header bar sits above the application content area only, not the full viewport width.

**DO**: Header starts where the nav ends horizontally
**DON'T**: Create a full-width header that spans over the nav

### D3: App Content Scrolling
The application content area scrolls independently. The nav and header remain fixed.

**DO**: overflow-y-auto on the content area
**DON'T**: Make the entire page scroll

### D4: Responsive Behavior
On mobile, the left nav collapses to a hamburger menu. The layout adapts gracefully.

## Implementation Notes
- Use Shadcn Sidebar component for the left nav
- Use CSS Grid or Flexbox for the layout shell
- Nav width: configurable via CSS variable

## Rationale
This layout provides a consistent frame for all applications while allowing each app to manage its own header content and access control.
