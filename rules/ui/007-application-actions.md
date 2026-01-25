# UI-007: Application Actions

## Purpose

Define a consistent pattern for application-level actions that are distinct from navigation.

## Principle

**Actions are not navigation.** Navigation controls which content is displayed. Actions trigger operations or open forms. These must be visually and structurally separated.

**Actions are transparent.** Each action displays the HTTP method and API endpoint it will call, making the system behavior predictable.

## Requirements

### 1. Action Panel (Level 4 Right Navigation)

Actions appear in a dedicated **Action Panel** - a collapsible right-hand column:

```
┌─────────────────────────────────────────────────────────────────┐
│                           GlobalHeader                          │
├─────────┬──────────────────┬────────────────────────┬───────────┤
│  Level  │     Level 2      │                        │  Action   │
│    1    │                  │     Content Area       │   Panel   │
│         │                  │                        │           │
│  (nav)  │    (sub-nav)     │                        │ [POST]    │
│         │                  │                        │ New Audit │
│         │                  │                        │ /api/audits│
└─────────┴──────────────────┴────────────────────────┴───────────┘
```

### 2. Separation from Navigation

- Actions MUST NOT appear in navigation columns (Levels 1-3)
- Actions MUST NOT appear in GlobalHeader
- Action Panel operates as Level 4 but for actions, not navigation
- Action Panel is collapsible like other navigation levels

### 3. API Transparency

Each action button displays:
- **Label**: Clear action name (e.g., "New Audit", "Save")
- **HTTP Method**: Color-coded badge (POST=blue, GET=green, DELETE=red)
- **Endpoint**: The API path that will be called (e.g., `/api/audits`)

This transparency helps users and developers understand what each action does.

### 4. Context Sensitivity

Actions change based on current view state:
- **View mode**: Shows actions for the current context (e.g., "New Audit")
- **Form mode**: Shows form actions (e.g., "Save", "Cancel")
- **Selection mode**: Shows actions for selected item (e.g., "Delete", "Edit")

### 5. Styling

Following UI-005 (Minimal Design):
- Use standard Button component
- Primary action: `variant="default"`
- Secondary actions: `variant="outline"`
- Size: `size="sm"` for consistency
- Icons permitted for action buttons (action affordance, not decoration)
- HTTP method and endpoint shown in monochrome (muted-foreground)

### 6. ActionPanel Component

Use the `ActionPanel` component from `@/components/action-panel`:

```tsx
<ActionPanel
  title="Actions"
  isCollapsed={isCollapsed}
  onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
  actions={[
    {
      id: "new-audit",
      label: "New Audit",
      icon: <Plus className="h-4 w-4" />,
      endpoint: "/api/audits",
      method: "POST",
      description: "Create a new audit report",
      onClick: handleNewAudit,
      variant: "default"
    }
  ]}
/>
```

## Action Bar Component (Section Headers)

For section headers without actions, use `ActionBar` from `@/components/action-bar`:

```tsx
<ActionBar
  variant="section"
  icon={<History className="h-5 w-5" />}
  title="Audit History"
  description="View past audit reports"
/>
```

The ActionBar is now a lightweight header component. Actions have moved to the ActionPanel.

## Anti-Patterns

- ❌ Putting actions in navigation columns (Levels 1-3)
- ❌ Adding actions to GlobalHeader
- ❌ Inconsistent action placement between applications
- ❌ Hidden API endpoints (actions should show what they do)
- ❌ Inline action buttons in section headers

## Cross-References

- UI-001: UI Principles
- UI-005: Minimal Design Principles
- HUB-003: Nested Navigation Pattern
