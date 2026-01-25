# UI-007: Application Actions

## Purpose

Define a consistent pattern for application-level actions that are distinct from navigation.

## Principle

**Actions are not navigation.** Navigation controls which content is displayed. Actions trigger operations or open forms. These must be visually and structurally separated.

## Requirements

### 1. Separation from Navigation

- Actions MUST NOT appear in navigation columns (Levels 1-4)
- Actions MUST NOT appear in GlobalHeader
- Actions belong within the application's content area

### 2. Action Bar Pattern

Each application may have an **Action Bar** - a consistent area for action buttons:

```
┌─────────────────────────────────────────────────┐
│ [Page Title]                    [Action] [Action] │  ← Action Bar (in content header)
├─────────────────────────────────────────────────┤
│                                                   │
│              Content Area                         │
│                                                   │
└─────────────────────────────────────────────────┘
```

### 3. Placement

- Action Bar appears at the **top of the content area**
- Positioned in the page header row, right-aligned
- Left side: Page title + description
- Right side: Action buttons

### 4. Styling

Following UI-005 (Minimal Design):
- Use standard Button component
- Primary action: `variant="default"`
- Secondary actions: `variant="outline"`
- Size: `size="sm"` for consistency
- Icons permitted for action buttons (action affordance, not decoration)

### 5. Examples

**Memory Explorer:**
- Primary: "Test Connection"
- Secondary: "Refresh"

**Rules Explorer > Audit:**
- Primary: "New Audit" (opens form in content area)

## Anti-Patterns

- ❌ Putting "New X" in navigation columns
- ❌ Adding actions to GlobalHeader
- ❌ Inconsistent action placement between applications

## Cross-References

- UI-001: UI Principles
- UI-005: Minimal Design Principles
- HUB-003: Nested Navigation Pattern
