# UI Principles

Rule ID: UI-001
Priority: HIGH
Version: 1.0.0

## Context
These rules apply when building user interfaces.

## Directives

### D1: Shadcn Components
Always use Shadcn UI components from `@/components/ui/`. Do not create custom components that duplicate Shadcn functionality.

### D2: Tailwind Only
Use Tailwind CSS for all styling. Do not use inline styles or CSS modules.

### D3: Dark Mode Support
All UI must support dark mode using the class-based approach configured in Tailwind.

### D4: Stateless Where Possible
Prefer URL-based state (query params, route params) over React state for navigation and filtering.

### D5: Loading States
Every data-fetching operation must have a visible loading state. Use Skeleton components from Shadcn.

### D6: Error States
Every data-fetching operation must have a visible error state with actionable information.

### D7: Data Test IDs
Add `data-testid` attributes to all interactive elements for future testing.

## Rationale
Consistent UI patterns create a professional user experience and reduce maintenance burden.
