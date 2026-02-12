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

## 1. Parent-Child Execution Model

### Current State

`FlowExecution` tracks a single flow's steps. `useFlowExecution(flowId)` creates
one execution per flow. The execution store (`execution-store.ts`) is a flat
`Map<flowId, FlowExecution>`. There is no parent-child relationship.

### Target State

`FlowExecution` gains two fields:

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

  /** Execution IDs of children spawned by this flow */
  childIds: string[];
}
```

### Rules

1. **Root flows** have `parentId: undefined` and may have `childIds`.
2. **Child flows** always have a `parentId`. They may also have `childIds` (nested children).
3. A parent's `childIds` array is the ordered history of children it spawned.
4. A parent stays `status: "running"` while any child is running.
5. When a child completes, the parent receives the child's exit summary and can
   recycle (re-run its greeting, present mode selection again, etc.).

### API Contracts — Execution Store

These functions must be added to `runtime/execution-store.ts`:

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

### API Contracts — useFlowExecution Hook

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

### Lifecycle Sequence

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

## 2. Flow-by-ID Lookup — Table Stakes API

`getFlowById(id)` already exists in `definitions/registry.ts`. This is the
canonical way to look up a flow definition by ID. It must remain a synchronous,
O(1)-amortized lookup.

### Current Implementation

```typescript
export function getFlowById(id: string): FlowDefinition | undefined {
  return flowRegistry.find((f) => f.id === id);
}
```

### Required Upgrade

If the registry grows beyond ~20 flows, convert to a `Map` for true O(1):

```typescript
const registryMap = new Map(flowRegistry.map((f) => [f.id, f]));

export function getFlowById(id: string): FlowDefinition | undefined {
  return registryMap.get(id);
}
```

This is a performance concern, not an architecture concern. The API signature
stays the same. Do this when the registry is next modified.

---

## 3. Chat Speaker Model

### How It Works Today

`FlowChat` (`runtime/flow-chat.tsx`) is a unified conversation log. It has:

- **Messages**: an ordered array of `FlowChatMessage` objects
- **Speakers**: `"bilko" | "agent" | "user" | "system"` — who said it
- **Ownership**: one flow at a time can push bilko/agent messages; user/system bypass

### Key Insight

A flow does NOT own "a voice channel". A flow can emit **one or many voices**
through the chat. The chat renders the total conversation — every message from
every speaker, regardless of which flow pushed it.

Examples:
- `bilko-main` pushes `speaker: "bilko"` messages (Bilko's greeting)
- `video-discovery` pushes `speaker: "agent"` messages (YouTube Librarian persona)
- `test-newsletter` pushes multiple `speaker: "agent"` messages (different agents per step)
- Any flow can push `speaker: "system"` messages (dividers, handoff notices)
- The user speaks or types — pushed as `speaker: "user"` (always accepted, no ownership check)

### Ownership Transfer During Parent-Child

When bilko-main spawns a child flow:
1. `bilko-main` calls `claimChat(childFlowId)` — ownership transfers to child
2. Child pushes its own agent greeting and messages
3. When child completes, `bilko-main` calls `releaseChat()` — ownership returns
4. `bilko-main` pushes its return greeting

This is already implemented. The parent-child execution model does not change
the chat ownership protocol — it formalizes what was already happening.

### Message Identity

Each `FlowChatMessage` carries:
- `speaker` — rendering style (bilko = typewriter, agent = colored, user = right-aligned, system = divider)
- `agentName`, `agentDisplayName`, `agentAccent` — agent persona when speaker is "agent"
- `ownerId` — which flow pushed this message (for debugging/filtering)

The chat does NOT need to know about parent-child. It just renders messages in order.

---

## 4. Flow Trees — Complex Scenarios

### Scenario 1: Simple Parent-Child (Today)

```
bilko-main (root, running)
  └── video-discovery (child, running → completed)
```

bilko-main spawns video-discovery, waits for completion, recycles.

### Scenario 2: Sequential Children (Today, via recursion)

```
bilko-main (root, running)
  ├── video-discovery (child, completed)    [iteration 1]
  ├── test-newsletter (child, completed)    [iteration 2]
  └── ai-consultation (child, running)      [iteration 3]
```

bilko-main's `childIds` grows with each loop iteration. Each child is spawned
after the previous one completes. The parent's execution tree is a flat list
of sequential children.

### Scenario 3: Nested Children (Future)

```
bilko-main (root, running)
  └── ai-consultation (child, running)
       └── deep-research (grandchild, running)
```

A sub-flow spawns its own child. The execution tree is now 3 levels deep.
The same parent-child protocol applies recursively. Chat ownership is always
held by the deepest active flow (the leaf).

### Scenario 4: Parallel Children (Future)

```
bilko-main (root, running)
  ├── video-discovery (child, running)     [left panel]
  └── test-newsletter (child, running)     [right panel]
```

Two children run simultaneously. This requires:
- Execution store tracks both as children of bilko-main
- Chat ownership needs a priority model (which child gets to push agent messages?)
- OR: separate chat channels per panel (left panel chat, right panel chat)

**This is future work.** The parent-child model supports it — the UI orchestration
layer needs to decide how to render it.

### Scenario 5: Flow Replacement (Future)

User is in video-discovery, says "actually, let's do the newsletter".
- bilko-main tears down video-discovery (child archived as "abandoned")
- bilko-main spawns test-newsletter as a new child
- Chat shows the transition naturally: system message "Switching to Newsletter"

This is just: unlinkChild → linkChild on a new flow. The model already handles it.

---

## 5. The Host's Recursion

bilko-main is a while-loop:

```
greeting → greeting-chat → mode-selection → run-subflow → summarize-and-recycle → greeting
```

Each iteration is NOT a new execution. It is the same `FlowExecution` accumulating
step entries. The step IDs are timestamped to avoid collisions across iterations:

```
greeting                     (iteration 1)
greeting-chat                (iteration 1)
mode-selection               (iteration 1)
run-subflow-1707123456789    (iteration 1)
summarize-and-recycle-1707123456800  (iteration 1)
greeting-return-1707123456900        (iteration 2)
greeting-chat-return-1707123456950   (iteration 2)
mode-selection               (iteration 2, reused)
run-subflow-1707123457000    (iteration 2)
...
```

The execution grows but the flow definition stays the same 6 steps.
The inspector can group steps by iteration using timestamp ranges.

### Exit Summary as Context Pipe

When a child completes, it passes an exit summary string. This is the data pipe
between child and parent:

```
child.onComplete("User watched 'How Neural Networks Learn' by 3Blue1Brown.
  Topic: AI. Mood: energized. Duration: 12 minutes.")
         ↓
bilko-main receives in handleSubflowExit()
         ↓
runGreeting({ modeLabel: "Video Recommendation", summary: "..." })
         ↓
LLM generates context-aware return greeting
```

The summary is unstructured text today. Future: typed exit contracts per flow
(schema for what the child must return on completion).

---

## 6. Execution History as a Tree

### Current State

Execution history is per-flow, flat:
```
localStorage["bilko-execution-history"] = {
  "bilko-main": [exec1, exec2, ...],
  "video-discovery": [exec1, exec2, ...],
}
```

### Target State

Archived executions retain their `parentId` and `childIds`. The history
can be reconstructed into a tree for session replay:

```typescript
interface ArchivedSession {
  root: FlowExecution;         // bilko-main execution
  children: FlowExecution[];   // all child executions from that session
  startedAt: number;
  completedAt: number;
}
```

The execution store should provide:

```typescript
/** Reconstruct a session from history — the root execution + all its children */
function getSessionHistory(rootExecutionId: string): ArchivedSession | undefined;
```

This enables the Flow Explorer to show full session replays: "In this session,
the user did Video Recommendation, then Newsletter, then AI Consultation."

---

## 7. Module Structure

```
client/src/lib/bilko-flow/
├── index.ts                        # Public API (all exports)
├── types.ts                        # Core types (FlowExecution, FlowStep, etc.)
├── Bilko-Flow-Claude.md            # This file
├── llm/
│   ├── client.ts                   # chatJSON<T>(), chat() — THE LLM primitives
│   └── api.ts                      # apiPost, apiGet, validateVideos, searchYouTube, generateImage, generateVideo
├── runtime/
│   ├── execution-store.ts          # Global execution store (live + history + parent-child tree)
│   ├── use-flow-execution.ts       # React hook for tracking step execution (parent-child aware)
│   ├── use-flow-definition.ts      # React hook bridging components to registry definitions
│   └── flow-chat.tsx               # FlowChatProvider — owned message channel with speaker model
├── definitions/
│   ├── registry.ts                 # All flow definitions (validated at import by ARCH-005)
│   ├── validate.ts                 # ARCH-005 steel frame validator
│   └── mutations.ts                # Flow mutations (re-exports from bilko-flow package)
└── inspector/
    ├── layout.ts                   # DAG layout engine (re-exports from bilko-flow package)
    └── step-type-config.ts         # Step visual config (re-exports from bilko-flow package)
```

### What Lives Here vs. What Lives Elsewhere

| Concern | Where | Why |
|---------|-------|-----|
| Flow definitions (steps, schemas, DAG) | `definitions/registry.ts` | Single source of truth for all flow structure |
| Execution tracking (step timing, I/O) | `runtime/execution-store.ts` + `use-flow-execution.ts` | Framework concern — every flow gets this for free |
| Chat messages & speaker identity | `runtime/flow-chat.tsx` | Framework concern — unified conversation log |
| Flow component logic (what a flow actually does) | `components/*-flow.tsx` | Application concern — each flow is its own component |
| LLM calls | `llm/client.ts` | Infrastructure — `chatJSON<T>()` is the only path to Gemini |
| Parent-child orchestration | `runtime/execution-store.ts` + landing.tsx | Split: store manages data, landing.tsx manages lifecycle |
| Persona/voice identity | `lib/bilko-persona/` | NOT in bilko-flow — persona is a rendering concern |
| Navigation/routing | `pages/landing.tsx` | NOT in bilko-flow — page orchestration is an app concern |

### Key Exports (index.ts)

All public API goes through `index.ts`. Every new function or type added to
sub-modules MUST be re-exported here. Consumers import from `@/lib/bilko-flow`,
never from sub-modules directly.

Current exports + what needs to be added:

```typescript
// ── Already exported ──────────────────────────────────────
export type { FlowExecution, StepExecution, FlowDefinition, FlowStep, ... } from "./types";
export { chat, chatJSON, jsonPrompt, LLMError, LLMParseError } from "./llm/client";
export { useFlowExecution, useExecutionStore } from "./runtime/use-flow-execution";
export { getExecutionHistory, getHistoricalExecution, clearHistory, clearLiveExecution } from "./runtime/execution-store";
export { FlowChatProvider, useFlowChat } from "./runtime/flow-chat";
export { useFlowDefinition } from "./runtime/use-flow-definition";
export { flowRegistry, activeFlowIds, getFlowById } from "./definitions/registry";
export { validateFlowDefinition, validateRegistry } from "./definitions/validate";

// ── New exports needed for parent-child model ─────────────
export { linkChild, unlinkChild, getChildren, getParent, getExecutionTree } from "./runtime/execution-store";
export type { FlowExecutionNode } from "./runtime/execution-store";
```

---

## 8. Implementation Order

When building the parent-child model, follow this sequence:

### Phase 1: Types (no runtime change)
1. Add `parentId?: string` and `childIds: string[]` to `FlowExecution` in `types.ts`
2. Initialize `childIds: []` in `createEmptyExecution()` in `use-flow-execution.ts`
3. Verify TypeScript compiles — no behavioral change yet

### Phase 2: Execution Store (data layer)
4. Add `linkChild()`, `unlinkChild()`, `getChildren()`, `getParent()`, `getExecutionTree()` to `execution-store.ts`
5. Update `setExecution()` to preserve `parentId`/`childIds` when archiving to history
6. Add `FlowExecutionNode` interface
7. Export everything through `index.ts`

### Phase 3: Hook (React layer)
8. Add `UseFlowExecutionOptions` parameter to `useFlowExecution()`
9. On mount with `parentFlowId`: call `linkChild()`, set `parentId` on the execution
10. On unmount: call `unlinkChild()` if parent still exists
11. Verify existing flows (video-discovery, etc.) still work unchanged (no options = root behavior)

### Phase 4: Landing Page Integration
12. Update `handleChoice()` in `landing.tsx` to pass `parentFlowId: "bilko-main"` context
    to sub-flow components (via prop or context)
13. Sub-flow components pass `{ parentFlowId }` to their `useFlowExecution()` call
14. Verify the while-loop still works: greeting → mode → subflow → summarize → recycle

### Phase 5: Execution History Tree
15. Update history archival to preserve parent-child links
16. Add `getSessionHistory()` for full session reconstruction
17. Update Flow Explorer to display execution trees

---

## 9. Invariants

These must always hold. Violating any of these is a bug.

1. **Single root per session**: Only `bilko-main` is a root execution in the Dynamic Learning page.
2. **No orphan children**: Every child execution has a valid `parentId` pointing to a live or archived parent.
3. **No duplicate children**: A parent's `childIds` array has no duplicates.
4. **Chat ownership matches deepest active child**: When a child is running, it (or its deepest descendant) owns the chat.
5. **Parent outlives children**: A parent execution cannot be archived (completed/failed) while it has running children.
6. **Exit summary is the contract**: Children communicate completion to parents exclusively through the `onComplete(summary)` callback. No side channels.
7. **getFlowById is always available**: Any code that has a flow ID can look up its definition synchronously.

---

## 10. What NOT to Build Here

- **Parallel children UI** — Don't build split-panel rendering for concurrent sub-flows yet. The execution model supports it, but the UI/chat model needs design first.
- **Typed exit contracts** — Don't add schema validation to exit summaries yet. The unstructured string is sufficient and flexible.
- **Cross-flow data sharing** — Children should not read siblings' execution data. All coordination goes through the parent.
- **Automatic flow chaining** — Don't build "when flow A completes, auto-start flow B". The parent decides what happens next.
- **Flow persistence across page reloads** — The live execution tree is ephemeral. Only completed executions persist to history. Don't try to resume a mid-execution tree after reload.
