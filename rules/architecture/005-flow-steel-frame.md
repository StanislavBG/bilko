# Flow Steel Frame

Rule ID: ARCH-005
Priority: CRITICAL
Version: 1.1.0
Type: Architecture
Dependencies: ARCH-000, ARCH-001
Cross-References: PER-002, APP-LANDING-001

## Purpose

Defines the **non-negotiable structural invariants** for all in-platform flows (PER-002). The steel frame is to flows what a building's steel frame is to architecture: the rigid skeleton that everything else hangs on. Violate it and the flow is unsound.

Agents build flows. Humans inspect and supervise them. This rule ensures every flow is inspectable, observable, and structurally valid — regardless of who or what created it.

---

## Invariants (MUST)

These are absolute. A flow that violates any invariant is **rejected**.

### I1: Directed Acyclic Graph

Every flow is a DAG. Steps declare their dependencies via `dependsOn`. There must be **no cycles**. A step cannot directly or transitively depend on itself.

### I2: At Least One Root

Every flow must have at least one step with an empty `dependsOn` array. These are root steps — entry points to the flow.

### I3: No Orphans

Every step must be either a root (empty `dependsOn`) or reachable from a root by following `dependsOn` edges forward. No step may exist disconnected from the graph.

### I4: Single Logical Output

A flow has at most one declared `output`. This output can be a complex type (object, array) but there is always one logical result. A flow without an `output` is a side-effect flow (e.g., display-only).

### I5: Unique Step IDs

Every `step.id` within a flow must be unique. No duplicates.

### I6: Valid Dependencies

Every ID referenced in any step's `dependsOn` array must correspond to an existing step in the same flow.

### I7: Step Completeness

Every step must have:
- `id` (non-empty string)
- `name` (non-empty string)
- `type` (one of the defined StepTypes)
- `description` (non-empty string)
- `dependsOn` (array, may be empty for roots)

---

## Step Type Contracts

Each step type carries specific structural requirements beyond the base invariants.

### `llm` — LLM Call

| Field | Required | Rationale |
|---|---|---|
| `prompt` | MUST | System prompt for the model |
| `outputSchema` | MUST (non-empty) | Defines what JSON shape is expected back |
| `model` | SHOULD | Defaults to `gemini-2.5-flash` if omitted |
| `userMessage` | SHOULD | Template for the user message |

**Prompt rules** (from PER-002):
- Must contain an explicit JSON example shape
- Must end with a constraint like "No markdown, ONLY the JSON object"
- Must set word/character limits for all text fields
- Should stay under 500 tokens

### `user-input` — User Interaction

| Field | Required | Rationale |
|---|---|---|
| `inputSchema` | MUST | Describes what data the step needs to present options |
| `outputSchema` | MUST | Describes the user's selection/input |

No `prompt` or `model` — this step waits for the human.

### `transform` — Data Transformation

| Field | Required | Rationale |
|---|---|---|
| `inputSchema` | MUST | What goes in |
| `outputSchema` | MUST | What comes out |

Pure data → data. No LLM, no user, no side effects.

### `validate` — Validation

| Field | Required | Rationale |
|---|---|---|
| `inputSchema` | MUST | Data to validate |
| `outputSchema` | MUST | Validated (filtered/cleaned) data |

Must be deterministic and side-effect-free.

### `display` — Render Output

| Field | Required | Rationale |
|---|---|---|
| `inputSchema` | SHOULD | Data needed to render |

Terminal step. May have no `outputSchema` (renders result to the user). Should not be depended on by other steps unless it acts as a pass-through.

---

## Execution Contract

These rules govern the runtime execution trace that the inspector reads.

### E1: Every Step Gets a StepExecution

When a flow runs, every step that is reached must produce a `StepExecution` entry with at minimum: `stepId` and `status`.

### E2: Timing is Mandatory on Completion

When a step completes (success or error), `startedAt`, `completedAt`, and `durationMs` must be set.

### E3: I/O Capture

LLM steps must capture `input` (the messages sent), `output` (the parsed JSON), and `rawResponse` (the raw string before parsing). Transform and validate steps must capture `input` and `output`. User-input steps must capture `output` (the user's choice).

### E4: Token Usage

LLM steps must capture `usage` (promptTokens, completionTokens, totalTokens) when available from the model response.

### E5: Error Capture

When a step fails, `error` must be a human-readable string. Stack traces go to `console.error`, not to `error`.

### E6: Execution Archival

Completed and failed executions are persisted to the execution store. The inspector must be able to replay any persisted execution on the canvas.

---

## Registration Contract

Every inspectable flow must be registered in the flow registry (`lib/flow-inspector/registry.ts`).

### R1: Registry Entry

A `FlowDefinition` must include:
- `id` — unique slug (kebab-case)
- `name` — human-readable
- `description` — what it does, in plain language
- `version` — semver string
- `location` — where it runs (`landing`, `academy`, `admin`)
- `componentPath` — path to the React component
- `steps` — the DAG
- `tags` — for filtering

### R2: Version Discipline

When a flow's step structure changes (steps added, removed, or dependencies modified), the version MUST increment. Minor for additive changes, major for breaking changes.

---

## Conversational Canvas Contract

Flows that run on the conversational canvas (the main website experience) follow additional rules.

### C1: Bilko Speaks First

Every conversation starts with Bilko. The first turn is always a `bilko` type turn with typewriter text and optional TTS.

### C2: Options Are Responses

User option cards are the user's way of responding to Bilko. They are not standalone UI — they exist within the conversation context.

### C3: Voice Parity

Every option that can be clicked must also have `voiceTriggers` defined so it can be selected by voice.

### C4: Contextual Follow-Up

When a user makes a choice, Bilko responds contextually before the experience renders. The response must acknowledge the specific choice (not generic "Loading...").

---

## Voice Builder Contract

Flows are built and modified exclusively through voice commands and node selection — never through traditional drag-and-drop builders.

### V1: Voice-First Mutation

All structural changes to a flow must go through a `FlowMutation` object. Users express intent via voice (or text), Bilko interprets via LLM, produces a mutation, and the user confirms before application.

### V2: Pure Mutations

Every mutation is a pure function: `applyMutation(flow, mutation) → MutationResult`. Mutations do not side-effect — they produce a new `FlowDefinition` and a validation result.

### V3: Pre-Apply Validation

Every mutation result is validated against the steel frame invariants (I1–I7) **before** application. Invalid mutations are shown to the user with specific errors. The user may still choose to apply (forcing the mutation), but Bilko warns explicitly.

### V4: Node Selection Context

The voice builder receives the set of currently selected node IDs as context. Multi-select (shift+click) is the targeting mechanism — the user selects what they want to change, then speaks the change.

### V5: Mutation Types

The following mutation types are supported:
- `add-step` — Add a new step (optionally after a selected step)
- `remove-step` — Remove a step (cleans up dangling dependencies)
- `update-step` — Modify step fields (name, description, prompt, etc.)
- `connect` — Add a dependency edge between two steps
- `disconnect` — Remove a dependency edge
- `change-type` — Change a step's type (llm, transform, etc.)
- `reorder-deps` — Reorder a step's dependency list
- `batch` — Apply multiple mutations atomically

### V6: Confirm Before Apply

No mutation is applied silently. Bilko always shows a preview (description + validation status) and waits for explicit confirmation — by voice ("yes", "do it") or by click.

### V7: No Traditional Builder UI

There are no toolboxes, property panels, drag handles, or drop zones. The only building interface is: select nodes → speak to Bilko → confirm. This is a deliberate design constraint, not a limitation.

---

## Validation

A runtime validator (`validateFlowDefinition()`) enforces all invariants at application startup. Flows that fail validation are logged with specific errors and excluded from the registry.

```typescript
// Validation errors are structured
interface FlowValidationError {
  flowId: string;
  invariant: string;   // e.g. "I1", "I3"
  stepId?: string;     // If step-specific
  message: string;
}
```

---

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Do This Instead |
|---|---|---|
| Step with `dependsOn: [itself]` | Violates I1 (cycle) | Check your dep graph |
| LLM step without `outputSchema` | Inspector can't show expected shape | Always define the contract |
| User-input step with `prompt` | Users don't process prompts | Use `description` for context |
| Display step depended on by others | Display is terminal | Use `transform` if data flows through |
| Orphan step disconnected from roots | Violates I3 | Every step must be reachable |
| Duplicate step IDs | Violates I5 | Use unique kebab-case IDs |
| Hardcoded model strings scattered | Drift risk | Use `model` field, default in config |
| Applying mutations without confirmation | Violates V6 | Always preview + confirm |
| Drag-and-drop step creation | Violates V7 | Use voice + selection only |
| Direct flow state mutation | Violates V2 | Use `applyMutation()` pure function |

---

## Checklist

Before registering a new flow:

- [ ] DAG has no cycles (I1)
- [ ] At least one root step (I2)
- [ ] No orphan steps (I3)
- [ ] Single logical output or explicit side-effect flow (I4)
- [ ] All step IDs unique (I5)
- [ ] All `dependsOn` refs resolve to existing steps (I6)
- [ ] Every step has id, name, type, description, dependsOn (I7)
- [ ] LLM steps have prompt + outputSchema (type contract)
- [ ] User-input steps have inputSchema + outputSchema (type contract)
- [ ] Flow registered in registry.ts (R1)
- [ ] Version bumped if structure changed (R2)
- [ ] `validateFlowDefinition()` passes
- [ ] Voice builder mutations go through `applyMutation()` (V2)
- [ ] Mutations are validated before application (V3)
- [ ] User confirms before mutation is applied (V6)

---

## Changelog

### v1.1.0 (2026-02-07)
- Voice Builder Contract (V1-V7): Voice-first flow building via mutations
- Pure mutation functions with pre-apply validation
- Node selection as targeting mechanism (shift+click multi-select)
- Explicit "no traditional builder" design constraint

### v1.0.0 (2026-02-07)
- Initial steel frame: 7 structural invariants, 5 step type contracts
- Execution contract (E1-E6) for inspector observability
- Registration contract (R1-R2) for flow registry
- Conversational canvas contract (C1-C4) for the website-as-conversation paradigm
- Anti-pattern registry
- Runtime validation spec
