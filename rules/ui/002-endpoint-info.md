# Endpoint Info Pattern

Rule ID: UI-002
Priority: HIGH
Version: 1.0.0

## Purpose

Since our UI is stateless and data comes from backend endpoints, admins and engineers need to understand which API powers each section. This rule defines how to display endpoint metadata via an info icon pattern.

## The Pattern

Every major UI section that displays data from an API endpoint MUST show an info icon (ℹ) that reveals:
1. The HTTP method and path (e.g., `GET /api/rules`)
2. A brief description of what the endpoint returns

## Implementation Requirements

### Backend: Central Endpoint Registry

The endpoint registry lives in `server/endpoint-registry.ts` and contains metadata for all API endpoints:

```typescript
const registry: EndpointRegistry = {
  "GET /api/rules": {
    method: "GET",
    description: "Returns all rules grouped by partition with metadata"
  },
  "GET /api/rules/:ruleId": {
    method: "GET", 
    description: "Returns single rule content with markdown body"
  }
};
```

When adding new endpoints, update the registry to include the endpoint's description.

The registry is served via `GET /api/endpoints`.

### Frontend: EndpointInfo Component

Use the `<EndpointInfo>` component to display endpoint metadata:

```tsx
<EndpointInfo endpoint="GET /api/rules" />
```

The component renders:
- A subtle info icon (ℹ) using standard text-muted-foreground styling
- On click: popover showing the endpoint and its description

### Placement Guidelines

Place `<EndpointInfo>` near:
- Page/section headers that load data
- Card headers that display API-sourced content
- Table/list headers powered by endpoints

### Design Constraints

1. **No hardcoded UI text** - Descriptions come from the endpoint registry
2. **Subtle presence** - Info icon uses muted-foreground color, no custom sizing
3. **Consistent positioning** - Always to the right of section titles
4. **Admin-focused** - This pattern is primarily for admin/engineering visibility
5. **No custom Button styling** - Use native HTML button with standard Tailwind classes

## Cross-References

- UI-001: UI Principles (component patterns)
- ARCH-001: Core Architecture (API design)
