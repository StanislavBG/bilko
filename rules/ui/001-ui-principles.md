# UI Principles

Rule ID: UI-001
Priority: HIGH
Version: 1.0.0

## Context
These rules apply when building user interfaces.

## Directives

### D1: Shadcn Components
Always use Shadcn UI components from `@/components/ui/`. Do not create custom components that duplicate Shadcn functionality.

- DO: Import and use existing Shadcn components (Button, Card, Dialog, etc.)
- DON'T: Create custom button or card components when Shadcn equivalents exist

### D2: Tailwind Only
Use Tailwind CSS for all styling. Do not use inline styles or CSS modules.

- DO: Use Tailwind utility classes for all styling
- DON'T: Use inline `style={{}}` props or create `.css` files

### D3: Dark Mode Support
All UI must support dark mode using the class-based approach configured in Tailwind.

- DO: Use semantic color tokens (bg-background, text-foreground, bg-card)
- DON'T: Use hard-coded colors like bg-white or text-black

### D4: Stateless Where Possible
Prefer URL-based state (query params, route params) over React state for navigation and filtering.

- DO: Use URL query params for filters, pagination, and selections
- DON'T: Store navigation state in useState when URL params would work

### D5: Loading States
Every data-fetching operation must have a visible loading state. Use Skeleton components from Shadcn.

- DO: Show Skeleton components during data loading
- DON'T: Leave blank areas while data loads

### D6: Error States
Every data-fetching operation must have a visible error state with actionable information.

- DO: Display clear error messages with retry options
- DON'T: Silently fail or show generic "Something went wrong" messages

### D7: Data Test IDs
Add `data-testid` attributes to all interactive elements for future testing.

- DO: Add data-testid to buttons, inputs, links, and key display elements
- DON'T: Skip test IDs on interactive elements

## Rationale
Consistent UI patterns create a professional user experience and reduce maintenance burden.
