# ARCH-007: Application Isolation

**Version**: 1.0.0
**Priority**: CRITICAL
**Partition**: architecture
**Dependencies**: ARCH-000, ARCH-003, HUB-001

## Purpose

Defines the non-negotiable isolation invariants between applications within the web platform. Each application operates as an independent, sandboxed unit — like an iPhone app. The hub (OS) runs independently of any application. Killing, removing, or crashing any single application MUST NOT affect the hub shell or any other application. This rule exists to prevent spaghetti code as the system grows.

---

## Mental Model: The iPhone Sandbox

| Concept | iPhone | Bilko Platform |
|---------|--------|---------------|
| **OS** | iOS | Hub shell (sidebar, header, router, auth, theme) |
| **App** | Mail, Safari, etc. | Landing, Academy, Workflows, Memory, Rules, Flows |
| **App Store** | Curated registry | Route table in App.tsx + manifest routing |
| **Shared Services** | Location, Notifications, Keychain | Auth, theme, sidebar state, query client |
| **App Sandbox** | Process isolation | Import boundaries + context scoping |
| **Kill App** | Swipe up in app switcher | Remove app directory, no errors elsewhere |
| **Inter-App Comms** | URL schemes, shared keychain | URL params, API calls, global settings |

The hub is the operating system. Applications are sandboxed processes. The OS survives any app failure. Apps never reach into each other's memory.

---

## Structural Invariants

These are non-negotiable. Every application MUST satisfy all seven invariants at all times.

### I1: Kill-Switch Invariant

**Deleting any single application's code MUST NOT cause TypeScript errors, runtime errors, or broken behavior in the hub shell, shared libraries, or any other application.**

This is the fundamental test. If you can't delete an app's directory and have everything else still compile and run, the isolation is broken.

**Verification**: For any app `X`, removing its page component and route entry should leave the rest of the system fully functional.

**DO**: Structure apps so they are leaves in the dependency tree
**DON'T**: Have app A import from app B, or have shared code import from any app

### I2: Import Boundary

**Applications MUST NOT import from other applications' code.** The only permitted import sources for an application are:

| Source | Example | Allowed? |
|--------|---------|----------|
| Own modules | `./components/MyWidget` | Yes |
| Shared UI primitives | `@/components/ui/button` | Yes |
| Shared libraries | `@/lib/flow-engine`, `@/lib/utils` | Yes |
| Hub infrastructure | `@/components/error-boundary` | Yes |
| Shared types | `@shared/models/*` | Yes |
| Another app's code | `@/pages/landing/components/X` | **NEVER** |
| Another app's contexts | `@/contexts/landing-voice` | **NEVER** |
| Another app's hooks | `@/hooks/use-landing-flow` | **NEVER** |

**Rationale**: If App A imports from App B, you cannot kill App B without breaking App A. This violates I1.

**DO**: Extract shared logic to `lib/` or `components/ui/` if multiple apps need it
**DON'T**: Import across app boundaries, even "just this one component"

### I3: Context Scoping

**App-specific React contexts MUST be mounted inside the app's own component tree, not at the App.tsx root.**

Only truly global services belong at the root provider level:

| Global (App.tsx root) | App-scoped (inside app's tree) |
|----------------------|-------------------------------|
| Auth / session | Conversation design (Landing) |
| Theme | Flow bus / flow chat (Landing) |
| Sidebar state | Navigation collapse (Academy) |
| React Query client | Global controls / Cost PI (Flows) |
| Tooltip provider | |

**Test**: If a context is consumed by only one app (or one app and its children), it belongs inside that app's tree.

**DO**: Mount app-specific providers inside the app's page component
**DON'T**: Add providers to App.tsx because "it's easier" — that makes every app implicitly dependent on every other app's infrastructure

### I4: Error Containment

**Each application MUST be wrapped in an error boundary at the route level. A crash in one app MUST NOT propagate to the hub shell or affect other apps.**

```
Router
├── ErrorBoundary → <Landing />
├── ErrorBoundary → <Academy />
├── ErrorBoundary → <Workflows />
├── ErrorBoundary → <Memory />
├── ErrorBoundary → <Rules />
└── ErrorBoundary → <FlowExplorer />
```

When an app crashes:
- The error boundary catches and displays a recovery UI
- The hub sidebar and header remain fully functional
- The user can navigate to any other app
- No global state is corrupted

**DO**: Wrap each route's page component in an error boundary
**DON'T**: Use a single error boundary around the entire router (one crash kills everything)

### I5: State Firewall

**Applications share state through exactly three channels. No other cross-app state sharing is permitted.**

| Channel | Direction | Example |
|---------|-----------|---------|
| **URL parameters** | Any app → any app | `/academy?level=3`, navigation via links |
| **Global settings** | Hub → apps (read-only) | Theme, auth state, sidebar collapsed |
| **API calls** | App → server → app | Shared database via REST endpoints |

**Forbidden channels:**
- Shared React context between apps (violates I3)
- Global event bus accessible to multiple apps
- localStorage keys shared across apps without namespace
- Direct function calls between app modules (violates I2)

**localStorage convention**: Apps that use localStorage MUST namespace their keys with the app name: `bilko:{app-name}:{key}` (e.g., `bilko:landing:greeting-seen`, `bilko:flows:execution-history`).

**DO**: Use URL-based navigation to pass information between apps
**DON'T**: Create a shared context or event bus that multiple apps subscribe to

### I6: Clean Lifecycle

**Applications mount and unmount without side effects. Navigating away from an app MUST leave no lingering timers, listeners, WebSocket connections, or audio playback.**

Every app MUST:
- Clean up `setInterval` / `setTimeout` in `useEffect` return
- Cancel in-flight API requests on unmount (via AbortController or React Query)
- Stop any audio playback on unmount
- Remove any document-level event listeners on unmount

**DO**: Use React cleanup functions in all effects
**DON'T**: Register global listeners without cleanup, or assume the user will stay on your page

### I7: Hub-Only Globals

**The hub provides a fixed set of global services. Applications consume these services but MUST NOT extend, mutate, or replace them.**

Global services provided by the hub:
- **Authentication**: Current user, isAdmin, session
- **Theme**: Dark/light mode, current theme
- **Sidebar**: Collapsed state, navigation items
- **Routing**: URL-based navigation via Wouter
- **Data fetching**: React Query client

**Contract**: Apps call these services read-only (except sidebar toggle, which the hub provides as an action). Apps MUST NOT:
- Add new items to the sidebar dynamically at runtime
- Override theme values
- Modify the auth state
- Replace the query client

**DO**: Consume hub globals through their provided hooks/contexts
**DON'T**: Monkey-patch, override, or extend hub services from within an app

---

## Anti-Patterns Registry

These are specific patterns that violate application isolation. AI agents MUST NOT introduce these patterns.

### AP1: The Mega-Page

**Violation**: A single page component that imports and hardcodes references to multiple other apps' components.

```tsx
// BAD: Landing knows about every flow by direct import
import { VideoDiscoveryFlow } from "@/components/video-discovery-flow";
import { AiConsultationFlow } from "@/components/ai-consultation-flow";
import { LinkedInStrategistFlow } from "@/components/linkedin-strategist-flow";
// ... 4 more direct imports

// Then a giant switch statement:
{mode === "video" && <VideoDiscoveryFlow />}
{mode === "chat" && <AiConsultationFlow />}
```

**Fix**: Use a registry-driven pattern. The flow registry already exists (ARCH-005) — render from it dynamically.

### AP2: The God Provider

**Violation**: Wrapping the entire app in providers that only one page needs.

```tsx
// BAD: App.tsx has providers for one page's features
<FlowBusProvider>        {/* Only Landing uses this */}
<NavigationProvider>     {/* Only Academy uses this */}
  <Router />
```

**Fix**: Move app-specific providers inside the app that uses them (I3).

### AP3: The Cross-App Import

**Violation**: One app imports a component, hook, or utility from another app's directory.

```tsx
// BAD: Workflows page imports a component from Landing
import { BilkoGreeting } from "@/pages/landing/components/greeting";
```

**Fix**: If shared, extract to `@/components/` or `@/lib/`. If not shared, duplicate the minimal logic needed.

### AP4: The Implicit Bus

**Violation**: A global event emitter or context that multiple apps subscribe to, creating invisible coupling.

**Fix**: Apps communicate through URLs and API calls only (I5).

---

## Compliance Checklist

When building or modifying an application, verify:

- [ ] **I1**: Can I delete this app's directory without breaking anything else?
- [ ] **I2**: Does this app import only from its own code, shared libs, or hub infra?
- [ ] **I3**: Are all app-specific contexts mounted inside this app's tree?
- [ ] **I4**: Is this app wrapped in its own error boundary?
- [ ] **I5**: Does cross-app communication use only URLs, global settings, or API calls?
- [ ] **I6**: Does this app clean up all side effects on unmount?
- [ ] **I7**: Does this app only consume (not extend) hub globals?

---

## Existing Debt

The current codebase has known violations of these invariants. This section documents them for future remediation — they are not blockers for enforcing the rule on new code.

| Violation | Location | Invariant | Status |
|-----------|----------|-----------|--------|
| ~~VoiceContext at root~~ | `App.tsx` | I3 | **RESOLVED** — moved inside MainFlow |
| ~~ConversationDesignProvider at root~~ | `App.tsx` | I3 | **RESOLVED** — moved inside MainFlow |
| ~~FlowBusProvider at root~~ | `App.tsx` | I3 | **RESOLVED** — already inside MainFlow |
| ~~FlowChatProvider at root~~ | `App.tsx` | I3 | **RESOLVED** — already inside MainFlow |
| ~~NavigationProvider at root~~ | `App.tsx` | I3 | **RESOLVED** — moved inside AcademyApp |
| ~~No error boundaries~~ | `App.tsx` | I4 | **RESOLVED** — AppErrorBoundary per route |
| Landing hardcodes 7 subflow imports | `landing.tsx` | AP1 | Pending — registry-driven rendering |
| Landing's FLOW_TO_MODE mapping | `landing.tsx` | AP1 | Pending — move to flow registry metadata |

**Rule for existing debt**: New code MUST comply. Existing violations are documented and will be remediated incrementally. Do not use existing violations as justification for new violations.

---

## Cross-References

- **ARCH-000**: Primary Directive (rules-first, no spaghetti)
- **ARCH-003**: System Architecture (macro boundaries; this rule adds micro boundaries)
- **ARCH-005**: Flow Steel Frame (per-flow isolation invariants; this rule adds per-app isolation)
- **HUB-001**: Hub Layout (hub shell independence)
- **HUB-002**: Access Control (per-app access gating)
- **UI-001**: UI Principles (stateless navigation, component isolation)
