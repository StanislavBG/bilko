# Bilko-Flow — Architecture & Implementation Guide

> Instructions for AI agents working on the bilko-flow module.
> This file is the source of truth for how flows execute, compose, and communicate.

## Core Principle: The Host Never Leaves

`bilko-main` is the **persistent parent flow**. It is always alive. It owns the session.

When a user picks "Video Recommendation", bilko-main does NOT exit and hand off.
It **spawns a child execution**. The child runs inside the parent's context.
When the child completes, the parent is still there — it recycles and greets again.

This is not a metaphor. It is the execution model. Every flow execution in
this system is either:
- A **root execution** (bilko-main) — the host
- A **child execution** — spawned by a parent, reports back to it on completion

---

## 1. Two-Layer Architecture: Library vs App

The `bilko-flow` package (`github:StanislavBG/bilko-flow`) provides **generic
flow infrastructure**. The local `client/src/lib/bilko-flow/` wrapper provides
**app-specific** content and adapters. Some local modules are already thin
re-exports (mutations, layout, step-type-config). The execution layer should
follow the same pattern.

### What belongs in the `bilko-flow` library

These are reusable by any flow-based app. Not Bilko-specific.

| Module | What | Why library |
|--------|------|-------------|
| `FlowExecution` type | `parentId`, `childIds`, `steps`, status, timing | Core data model — every flow app needs this |
| `StepExecution` type | Step timing, I/O, status, token usage | Execution trace primitive |
| `FlowExecutionNode` type | `{ execution, children[] }` tree node | Generic tree traversal |
| Execution store | `setExecution`, `getExecution`, `linkChild`, `unlinkChild`, `getChildren`, `getParent`, `getExecutionTree`, history persistence | Stateful store — generic flow lifecycle |
| `useFlowExecution` hook | Tracks steps, `parentFlowId` option, auto link/unlink | React binding for the store |
| `useExecutionStore` hook | Read-only access to store from other components | React binding for inspector UIs |
| `FlowDefinition`, `FlowStep` types | Step schemas, DAG structure, phases | Flow structure primitives |
| `validateFlowDefinition` | DAG validator (I1–I7 invariants) | Steel frame enforcement — reusable |
| Mutations, layout, step visuals | Already in library | Already there |
| `FlowProgress` component | Compact/full progress stepper | Already in library |

### What stays local (app-specific)

| Module | What | Why local |
|--------|------|-----------|
| `FlowChatProvider` / `useFlowChat` | Owned message channel with speaker model | Bilko's conversational canvas — rendering concern |
| `flowRegistry` / `getFlowById` | The actual flow definitions (steps, prompts, schemas) | App content — the specific flows Bilko runs |
| `activeFlowIds` | Which flows are live vs standby | Deployment decision |
| Landing page (`landing.tsx`) | bilko-main lifecycle, mode selection, greeting prompts | App orchestration |
| FlowBus (`flow-bus-context.tsx`) | Inter-flow messaging, registration | App-level coordination |
| Voice matching, conversation design | Turn-taking, screen option matching | UI interaction model |
| Persona / speaker identity | Agent colors, display names, accents | Bilko-specific rendering |

### The re-export pattern

Local modules that wrap library exports follow this pattern:

```typescript
// client/src/lib/bilko-flow/runtime/execution-store.ts
// Re-exports from bilko-flow library. The store is maintained
// in the bilko-flow package and consumed here.
export {
  setExecution, getExecution, getAllExecutions,
  linkChild, unlinkChild, getChildren, getParent, getExecutionTree,
  getExecutionHistory, getHistoricalExecution,
  clearHistory, clearLiveExecution,
  subscribe,
} from "bilko-flow/react";
export type { FlowExecutionNode } from "bilko-flow/react";
```

This is the same pattern already used by `mutations.ts`, `layout.ts`, and
`step-type-config.ts`.

---

## 2. Parent-Child Execution Model

### Target Type

```typescript
interface FlowExecution {
  id: string;
  flowId: string;
  startedAt: number;
  completedAt?: number;
  status: "running" | "completed" | "failed";
  steps: Record<string, StepExecution>;

  /** Execution ID of the parent (undefined for root flows) */
  parentId?: string;

  /** Execution IDs of children spawned by this execution */
  childIds: string[];
}
```

### Rules

1. **Root flows** have `parentId: undefined` and may have `childIds`.
2. **Child flows** always have a `parentId`. They may also have `childIds` (nested).
3. A parent's `childIds` array is the ordered history of children it spawned.
4. A parent stays `status: "running"` while any child is running.
5. When a child completes, the parent receives the child's exit summary and can
   recycle (re-run its greeting, present mode selection again, etc.).

### Library API — Execution Store

These functions ship in the `bilko-flow` library:

```typescript
/** Link a child execution to its parent. Called when a sub-flow starts. */
function linkChild(parentFlowId: string, childFlowId: string): void;

/** Unlink a child execution. Called on teardown if child is abandoned. */
function unlinkChild(parentFlowId: string, childFlowId: string): void;

/** Get all live child executions of a parent flow. */
function getChildren(flowId: string): FlowExecution[];

/** Get the parent execution of a child flow. */
function getParent(flowId: string): FlowExecution | undefined;

/** Build the full execution tree from a root flow down. */
function getExecutionTree(flowId: string): FlowExecutionNode | undefined;

interface FlowExecutionNode {
  execution: FlowExecution;
  children: FlowExecutionNode[];
}
```

### Library API — useFlowExecution Hook

The hook gains an options parameter:

```typescript
interface UseFlowExecutionOptions {
  /** Flow ID of the parent (links this execution as a child) */
  parentFlowId?: string;
}

function useFlowExecution(
  flowId: string,
  options?: UseFlowExecutionOptions,
): UseFlowExecutionReturn;
```

Behavior when `parentFlowId` is provided:
- On mount: calls `linkChild(parentFlowId, flowId)` in the store
- On unmount: calls `unlinkChild(parentFlowId, flowId)` in the store
- The created `FlowExecution` has `parentId` set to the parent's execution ID

### App-Level Lifecycle (landing.tsx)

```
1. bilko-main mounts → useFlowExecution("bilko-main") → root execution created
2. User picks "Video Recommendation"
3. bilko-main calls handleChoice("video-discovery")
4. VideoDiscoveryFlow mounts → useFlowExecution("video-discovery", { parentFlowId: "bilko-main" })
5. Store links: bilko-main.childIds += [video-exec-id], video-exec.parentId = bilko-main-exec-id
6. Both executions are live and tracking steps concurrently
7. video-discovery calls onComplete(summary)
8. VideoDiscoveryFlow unmounts → unlinkChild, video-exec archived to history
9. bilko-main recycles → runGreeting(context) → back to mode selection
```

---

## 3. Chat Speaker Model

### How It Works

`FlowChat` (`runtime/flow-chat.tsx`) is a unified conversation log. It has:

- **Messages**: an ordered array of `FlowChatMessage` objects
- **Speakers**: `"bilko" | "agent" | "user" | "system"` — who said it
- **Ownership**: one flow at a time can push bilko/agent messages; user/system bypass

A flow does NOT own "a voice channel". A flow can emit **one or many voices**
through the chat. The chat renders the total conversation — every message from
every speaker, regardless of which flow pushed it.

### Ownership Transfer During Parent-Child

When bilko-main spawns a child flow:
1. `bilko-main` calls `claimChat(childFlowId)` — ownership transfers to child
2. Child pushes its own agent greeting and messages
3. When child completes, `bilko-main` calls `releaseChat()` — ownership returns
4. `bilko-main` pushes its return greeting

The chat does NOT need to know about parent-child. It just renders messages in order.

### This stays local

FlowChat is a Bilko rendering concept (conversational canvas + speaker identity).
It does not belong in the `bilko-flow` library. The library provides execution
primitives; the app provides the conversation UI.

---

## 4. Flow Trees — Complex Scenarios

### Scenario 1: Simple Parent-Child

```
bilko-main (root, running)
  └── video-discovery (child, running → completed)
```

### Scenario 2: Sequential Children (via recursion)

```
bilko-main (root, running)
  ├── video-discovery (child, completed)    [iteration 1]
  ├── test-newsletter (child, completed)    [iteration 2]
  └── ai-consultation (child, running)      [iteration 3]
```

### Scenario 3: Nested Children (Future)

```
bilko-main (root, running)
  └── ai-consultation (child, running)
       └── deep-research (grandchild, running)
```

Same parent-child protocol applies recursively. Chat ownership held by the deepest
active flow (the leaf).

### Scenario 4: Parallel Children (Future)

```
bilko-main (root, running)
  ├── video-discovery (child, running)
  └── test-newsletter (child, running)
```

The execution model supports it — the UI orchestration layer needs to decide
how to render it. **Future work.**

### Scenario 5: Flow Replacement (Future)

User is in video-discovery, says "actually, let's do the newsletter".
Just: unlinkChild → linkChild on a new flow. The model already handles it.

---

## 5. The Host's Recursion

bilko-main is a while-loop:

```
greeting → greeting-chat → mode-selection → run-subflow → summarize-and-recycle → greeting
```

Each iteration is NOT a new execution. It is the same `FlowExecution` accumulating
step entries. Step IDs are timestamped to avoid collisions across iterations.

### Exit Summary as Context Pipe

When a child completes, it passes an exit summary string. This is the data pipe
between child and parent:

```
child.onComplete(summary)
         ↓
bilko-main receives in handleSubflowExit()
         ↓
runGreeting({ modeLabel, summary })
         ↓
LLM generates context-aware return greeting
```

The summary is unstructured text today. Future: typed exit contracts per flow.

---

## 6. Execution History as a Tree

Archived executions retain their `parentId` and `childIds`. The history
can be reconstructed into a tree for session replay:

```typescript
interface ArchivedSession {
  root: FlowExecution;
  children: FlowExecution[];
  startedAt: number;
  completedAt: number;
}

/** Library provides this — reconstruct a session from history */
function getSessionHistory(rootExecutionId: string): ArchivedSession | undefined;
```

---

## 7. Module Structure

```
github:StanislavBG/bilko-flow          ← THE LIBRARY (npm package)
├── src/
│   ├── types.ts                       # FlowExecution (with parentId/childIds),
│   │                                  # StepExecution, FlowDefinition, FlowStep, etc.
│   ├── execution-store.ts             # Global store: set/get/link/unlink/tree/history
│   ├── use-flow-execution.ts          # React hook (parentFlowId option)
│   ├── use-execution-store.ts         # Read-only React binding
│   ├── validate.ts                    # ARCH-005 steel frame validator
│   ├── mutations.ts                   # Flow mutations (add/remove/move steps)
│   ├── layout.ts                      # Sugiyama DAG layout engine
│   ├── step-type-config.ts            # Step visual configuration
│   └── FlowProgress.tsx               # Compact/full progress stepper component
└── package.json

client/src/lib/bilko-flow/             ← LOCAL WRAPPER (app-specific)
├── index.ts                           # Public API — re-exports library + local modules
├── types.ts                           # Re-exports library types (thin passthrough)
├── Bilko-Flow-Claude.md               # This file
├── llm/
│   ├── client.ts                      # chatJSON<T>(), chat() — Gemini-specific LLM client
│   └── api.ts                         # apiPost, apiGet, validateVideos, YouTube, images, video
├── runtime/
│   ├── execution-store.ts             # Re-exports from bilko-flow library
│   ├── use-flow-execution.ts          # Re-exports from bilko-flow library
│   ├── use-flow-definition.ts         # Bridge: React hook → registry definitions
│   └── flow-chat.tsx                  # FlowChatProvider — LOCAL, Bilko's conversational canvas
├── definitions/
│   ├── registry.ts                    # LOCAL — all flow definitions (app content)
│   ├── validate.ts                    # Re-exports from bilko-flow library
│   └── mutations.ts                   # Re-exports from bilko-flow library
└── inspector/
    ├── layout.ts                      # Re-exports from bilko-flow library
    └── step-type-config.ts            # Re-exports from bilko-flow library
```

### Separation Principle

**Library = generic flow primitives.** Any app can use `bilko-flow` to build
parent-child flow trees, track step execution, validate DAGs, render progress.

**Local = Bilko's app.** The specific flows, the chat canvas, the LLM client
(Gemini), the personas, the landing page lifecycle. These are Bilko's product
decisions, not flow infrastructure.

---

## 8. Implementation Order

### Phase 1: Library — Types (no runtime change)
1. Add `parentId?: string` and `childIds: string[]` to `FlowExecution` in the library
2. Add `FlowExecutionNode` interface to the library
3. Publish library update

### Phase 2: Library — Execution Store
4. Add `linkChild()`, `unlinkChild()`, `getChildren()`, `getParent()`, `getExecutionTree()` to the library's execution store
5. Update `setExecution()` to preserve `parentId`/`childIds` when archiving
6. Initialize `childIds: []` in `createEmptyExecution()`
7. Publish library update

### Phase 3: Library — Hook
8. Add `UseFlowExecutionOptions` parameter to `useFlowExecution()`
9. On mount with `parentFlowId`: call `linkChild()`, set `parentId`
10. On unmount: call `unlinkChild()` if parent still exists
11. Publish library update

### Phase 4: Local — Migrate to re-exports
12. Update local `types.ts` to re-export from `bilko-flow/react`
13. Update local `execution-store.ts` to re-export from `bilko-flow/react`
14. Update local `use-flow-execution.ts` to re-export from `bilko-flow/react`
15. Update local `validate.ts` to re-export from `bilko-flow/react`
16. Verify all existing flows still work (no options = root behavior)

### Phase 5: Local — Landing Page Integration
17. Update `handleChoice()` in `landing.tsx` to pass `parentFlowId: "bilko-main"`
    to sub-flow components (via prop or context)
18. Sub-flow components pass `{ parentFlowId }` to their `useFlowExecution()` call
19. Verify the while-loop: greeting → mode → subflow → summarize → recycle

### Phase 6: Library — Execution History Tree
20. Update history archival to preserve parent-child links
21. Add `getSessionHistory()` for full session reconstruction
22. Publish library update

### Phase 7: Local — Flow Explorer
23. Update Flow Explorer to display execution trees
24. Show session replays with parent-child hierarchy

---

## 9. Invariants

These must always hold. Violating any of these is a bug.

1. **Single root per session**: Only `bilko-main` is a root execution in the Dynamic Learning page.
2. **No orphan children**: Every child execution has a valid `parentId` pointing to a live or archived parent.
3. **No duplicate children**: A parent's `childIds` array has no duplicates.
4. **Chat ownership matches deepest active child**: When a child is running, it (or its deepest descendant) owns the chat.
5. **Parent outlives children**: A parent cannot be archived while it has running children.
6. **Exit summary is the contract**: Children communicate completion to parents exclusively through `onComplete(summary)`.
7. **getFlowById is always available**: Any code that has a flow ID can look up its definition synchronously.

---

## 10. What NOT to Build

**In the library:**
- Chat / message channel — that's a rendering concern, stays local
- Persona / speaker identity — app-specific
- FlowBus (inter-flow messaging) — app-level coordination pattern, not a flow primitive
- LLM client — infrastructure, not flow infrastructure

**In the app:**
- Parallel children UI — execution model supports it, UI needs design first
- Typed exit contracts — unstructured string is sufficient for now
- Cross-flow data sharing — all coordination goes through the parent
- Automatic flow chaining — the parent decides what happens next
- Flow persistence across page reloads — live tree is ephemeral
