# CLAUDE.md — AI Agent Guide for bilko-flow

## Overview

**bilko-flow** is a TypeScript library providing the **typed DSL, determinism model, planner protocol, and RBAC system** for deterministic workflow creation — designed for AI agent consumption.

It has two layers:

| Layer | Directory | Package Export | Purpose |
|-------|-----------|----------------|---------|
| **Core** | `src/` | `bilko-flow` | Backend — DSL compiler, executor, planner protocol, storage, audit, RBAC |
| **React** | `src/react/` | `bilko-flow/react` | Frontend — Portable UI components for flow progress and flow visualization |

The Core layer exists today. **The React layer must be built.** This document describes both.

---

## Quick Start

```bash
npm install
npm test              # 87 tests across 10 suites
npm run build         # Compile TypeScript → dist/
npm run dev           # Start reference server on port 5000
npm run lint          # Type-check without emit
```

## Project Structure

```
bilko-flow/
├── src/
│   ├── domain/           # Core types — THE primary export
│   │   ├── workflow.ts   # DSL document model, steps, policies
│   │   ├── run.ts        # Execution model, state transitions
│   │   ├── determinism.ts# Determinism grades, time sources, evidence capture
│   │   ├── provenance.ts # SHA-256 hashed execution transcripts
│   │   ├── attestation.ts# HMAC-signed integrity proofs
│   │   ├── rbac.ts       # Role-based access control (6 roles, 26+ permissions)
│   │   ├── errors.ts     # Machine-actionable TypedErrors with suggestedFixes
│   │   ├── account.ts    # Multi-tenant model (Account > Project > Environment)
│   │   ├── artifact.ts   # Run output references (by pointer, not embedded)
│   │   ├── audit.ts      # Immutable audit records (23 action types)
│   │   └── events.ts     # Data plane events (14 lifecycle event types)
│   │
│   ├── dsl/              # DSL compiler & validator
│   │   ├── compiler.ts   # 5-phase: validate → sort → compile → analyze → hash
│   │   ├── validator.ts  # Schema validation + determinism constraint checking
│   │   ├── schema.ts     # VALID_STEP_TYPES, REQUIRED_FIELDS, SCHEMA_CONSTRAINTS
│   │   └── version.ts    # DSL spec versioning (currently "1.0.0")
│   │
│   ├── planner/          # AI agent integration point
│   │   ├── interface.ts  # Planner contract (propose, patch, repair, explain)
│   │   ├── certification.ts # Conformance test suite + patch validation/application
│   │   └── default-planner.ts # Reference implementation (not AI-powered)
│   │
│   ├── engine/           # Reference executor
│   │   ├── executor.ts   # Workflow orchestration with provenance + attestation
│   │   ├── step-runner.ts# Pluggable handlers, retry/timeout policies
│   │   └── state-machine.ts # Legal run/step state transition enforcement
│   │
│   ├── storage/          # Pluggable backend contracts
│   │   ├── store.ts      # 12 store interfaces with pagination
│   │   └── memory-store.ts # In-memory reference implementation
│   │
│   ├── llm/              # LLM integration
│   │   ├── index.ts      # chatJSON<T>(), repairJSON(), provider adapters
│   │   └── llm-planner.ts# LLM-powered Planner implementation
│   │
│   ├── api/              # Reference REST API (Express)
│   │   ├── accounts.ts, auth.ts, workflows.ts, runs.ts
│   │   ├── artifacts.ts, attestations.ts, events.ts, llm.ts
│   │   └── middleware.ts # Auth, RBAC, audit middleware
│   │
│   ├── data-plane/       # Event publication (DataPlanePublisher)
│   ├── audit/            # Audit trail service (AuditService)
│   ├── notifications/    # Webhook delivery with HMAC signing
│   │
│   ├── react/            # ⬅ NEW — Portable React components (to be built)
│   │   ├── flow-progress.tsx    # Dual-mode progress component
│   │   ├── flow-canvas.tsx      # DAG visualization
│   │   ├── step-node.tsx        # Step rendering for timelines
│   │   ├── step-detail.tsx      # Step inspection panel
│   │   ├── flow-timeline.tsx    # Vertical step list
│   │   ├── flow-card.tsx        # Summary card for flow lists
│   │   ├── layout.ts           # Sugiyama-style DAG layout engine
│   │   ├── step-type-config.ts # Visual configuration per step type
│   │   ├── types.ts            # UI-specific type definitions
│   │   └── index.ts            # Barrel export
│   │
│   ├── index.ts          # Main library barrel export
│   └── server.ts         # Reference Express server + seed data
│
├── tests/                # Jest test suites
├── index.html            # Reference UI (vanilla JS library explorer)
├── package.json
├── tsconfig.json
└── CLAUDE.md             # This file
```

## Tech Stack

- **Language**: TypeScript (ES2022, strict, CommonJS)
- **Runtime**: Node.js
- **Server**: Express 4.18 (reference implementation only)
- **Testing**: Jest 29
- **Dependencies**: express, uuid (that's it — intentionally minimal)
- **React layer**: React 18, lucide-react (icons), Tailwind CSS (utility classes)

---

## Architecture

### Core Library (existing)

```
┌──────────────────────────────────────────────────────────────────┐
│  domain/  — Types. This IS the product.                         │
│  Every other module depends on domain/ and nothing else.         │
├──────────────────────────────────────────────────────────────────┤
│  dsl/        — Compiles & validates workflow DSL documents       │
│  planner/    — AI agent protocol (propose, patch, repair)        │
│  engine/     — Reference executor with state machine             │
│  storage/    — 12 pluggable store interfaces                     │
│  llm/        — chatJSON<T>() for structured LLM extraction       │
│  data-plane/ — Event publication system                          │
│  audit/      — Immutable audit trail                             │
│  notifications/ — Webhook delivery with HMAC signing             │
│  api/        — Express routes (reference only)                   │
└──────────────────────────────────────────────────────────────────┘
```

### React Layer (FlowProgress: built; others: to be extracted)

```
┌──────────────────────────────────────────────────────────────────┐
│  react/  — Portable, self-contained UI components                │
│                                                                  │
│  FlowProgress  — THE unified progress component  ✅ BUILT        │
│    ├─ mode="full"    — Banner: numbered circles + progress track │
│    ├─ mode="compact" — Inline: status icons + text labels        │
│    ├─ Sliding window — [1]...[X±2]...[N] for high step counts   │
│    ├─ Adaptive labels — full/truncated/icon based on proximity   │
│    └─ Interactive ellipsis — dropdown to jump to hidden steps    │
│                                                                  │
│  FlowCanvas    — 2D DAG visualization (zoom, pan, minimap)       │
│  StepDetail    — Rich step inspection (tabs, schema, execution)  │
│  FlowTimeline  — Thin adapter → FlowProgress  ✅ MIGRATED       │
│  FlowCard      — Summary card for flow registry grids            │
│                                                                  │
│  layout.ts         — DAG coordinate computation                  │
│  step-type-config.ts — Visual config (icons, colors, labels)     │
│  types.ts          — UI-specific subset of domain types          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### 1. Determinism Model

Every workflow declares a target determinism grade:

| Grade | Meaning |
|-------|---------|
| **Pure** | Outputs are a pure function of inputs. No time dependence, no external APIs. |
| **Replayable** | External effects controlled via evidence capture for replay equivalence. |
| **Best-Effort** | Auditable but external dependencies may prevent strict replay. |

Steps declare `usesTime`, `usesExternalApis`, `pureFunction`. The compiler validates these against the workflow's target grade. **Nondeterministic constructs without explicit declaration are refused.**

### 2. Planner Protocol

The `Planner` interface defines how AI agents create and modify workflows:

```typescript
interface Planner {
  getVersionInfo(): PlannerVersionInfo;
  proposeWorkflow(goal: PlanGoal): Promise<WorkflowProposal>;
  proposePatch(workflow: Workflow, goal: PlanGoal): Promise<WorkflowPatch>;
  proposeRepair(context: RepairContext): Promise<WorkflowPatch>;
  explainPlan?(goal: PlanGoal): Promise<PlanExplanation>;
}
```

**All planner outputs are untrusted until validated** through the DSL compiler and `certifyPlanner()`.

### 3. Typed Error Model

Errors are data, never thrown exceptions:

```typescript
interface TypedError {
  code: string;              // e.g., "STEP.HTTP.TIMEOUT"
  message: string;
  retryable: boolean;
  suggestedFixes: SuggestedFix[];
}
```

This enables agent-driven error recovery: planner's `proposeRepair()` consumes typed errors, produces targeted patches.

### 4. Tenant Scoping

Every operation is scoped to `{ accountId, projectId, environmentId }`. Storage enforces boundaries. Multi-tenancy by construction.

### 5. Provenance & Attestation

Every run generates an immutable provenance record (SHA-256 hashes of workflow, inputs, step outputs, transcript). Optional HMAC-signed attestations for compliance.

---

## Step Types

The DSL recognizes 12 step types:

| Type | Purpose |
|------|---------|
| `http.search` | Web/API search |
| `http.request` | HTTP request |
| `transform.filter` | Filter data |
| `transform.map` | Transform data |
| `transform.reduce` | Aggregate data |
| `ai.summarize` | AI text summarization |
| `ai.generate-text` | AI text generation |
| `ai.generate-image` | AI image generation |
| `ai.generate-video` | AI video generation |
| `social.post` | Social media posting |
| `notification.send` | Send notification |
| `custom` | Custom step handler |

### Schema Constraints

- Max steps per workflow: **200**
- Step name max length: **256**
- Timeout range: **1,000ms – 600,000ms** (1s – 10min)
- Max retry attempts: **10**

---

## Storage Layer

12 pluggable store interfaces. All implementations must respect tenant scope boundaries.

| Store | Methods |
|-------|---------|
| AccountStore | create, getById, update |
| ProjectStore | create, getById, listByAccount |
| EnvironmentStore | create, getById, listByProject |
| WorkflowStore | create, getById, getByIdAndVersion, update, listByScope |
| RunStore | create, getById, update, listByWorkflow, listByScope |
| ArtifactStore | create, getById, listByRun |
| ProvenanceStore | create, getByRunId |
| AttestationStore | create, getByRunId |
| RoleBindingStore | create, listByIdentity, listByScope, delete |
| AuditStore | create, listByScope |
| EventStore | create, listByRun, listByScope |
| CredentialStore | set, get |

`createMemoryStore()` provides an in-memory reference implementation for development/testing.

---

## RBAC Model

6 built-in roles with least-privilege defaults:

| Role | Key Permissions |
|------|-----------------|
| Admin | All permissions |
| WorkflowEditor | workflow:create, workflow:update, workflow:read |
| Viewer | workflow:read, run:read |
| Executor | run:create, run:read, run:cancel |
| SecretManager | secret:create, secret:read, secret:update, secret:delete |
| DataConsumer | artifact:read, event:subscribe |

Roles are bound at three scope levels: **Organization > Project > Environment**.

---

## API Endpoints (Reference Server)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Authenticate |
| GET | `/api/session` | Bootstrap tenant context |
| POST | `/api/accounts` | Create account |
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows/:id` | Get workflow |
| PUT | `/api/workflows/:id` | Update workflow |
| POST | `/api/workflows/:id/test` | Test/validate workflow |
| POST | `/api/workflows/:id/runs` | Start run |
| GET | `/api/runs/:id` | Get run status |
| POST | `/api/runs/:id/cancel` | Cancel run |
| GET | `/api/runs/:id/artifacts` | List artifacts |
| GET | `/api/runs/:id/attestation` | Get attestation |
| GET | `/api/runs/:id/events` | List run events |
| GET | `/api/events` | List scope events |
| POST | `/api/llm/chat` | LLM chat (structured JSON) |
| POST | `/api/llm/propose` | LLM planner proposal |

Tenant context passed via headers: `x-identity-id`, `x-account-id`, `x-project-id`, `x-environment-id`.

---

## The React Layer — IMPLEMENTATION GUIDE

This is the primary work item. The React layer (`src/react/`) provides portable, framework-agnostic UI components that any application can import to visualize and interact with bilko-flow workflows.

### Why This Exists

The parent project **Bilko** (bilko-gym) built ~2,100 lines of flow-inspector and flow-progress components that are tightly coupled to Bilko's internals (FlowBusContext, shadcn/ui, specific contexts). These must be **extracted, generalized, and maintained here** so that:

1. Bilko consumes `bilko-flow/react` instead of maintaining its own copies
2. Any external site can add flow progress or flow visualization by importing from this package
3. The visual tooling lives alongside the domain model it visualizes

### Design Principles

1. **Props-driven, no required context** — Every component accepts data via props. No React context dependencies. No global state.
2. **Headless-compatible** — Components use Tailwind CSS utility classes. Consumers can override styles via `className` prop on the root element.
3. **Self-contained** — Each component imports only from `react`, `lucide-react`, and sibling files within `react/`. No external UI library dependency (no shadcn/ui).
4. **Two packages, one library** — `bilko-flow` (core) and `bilko-flow/react` (UI) are exported from the same npm package via package.json `exports` field.

### Package Configuration

```jsonc
// package.json additions
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./react": {
      "types": "./dist/react/index.d.ts",
      "default": "./dist/react/index.js"
    }
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "lucide-react": ">=0.300.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "lucide-react": { "optional": true }
  }
}
```

React and lucide-react are **peer dependencies** — optional for consumers who only use the core library.

---

## FlowProgress — THE First-Class Progress Component

This is the single most important UI component in the package. It shows users where a multi-step flow is in its execution.

**Implementation status**: Built and deployed in Bilko at `client/src/components/ui/flow-progress.tsx`. All previous stepper/timeline components (`StepTracker`, `MiniFlowProgress`, `BannerStepper`) have been unified into this single component.

### Two Modes, One Component

`<FlowProgress>` renders in two visual modes controlled by a `mode` prop:

| Mode | Visual | Use Case |
|------|--------|----------|
| **`"full"`** | Large numbered circles (36px), phase labels below, wide connector bars, header row with flow name + status + progress track + activity | Page footer, dedicated progress section, large screens |
| **`"compact"`** | Small status icons (14px) with inline text labels, thin connector lines, activity + last result below | Inline within content, sidebars, mobile, embedded widgets |

Both modes share the same data contract and the same sliding window logic. The `mode` prop switches the visual treatment.

### Sliding Window

When the step count exceeds `2 * radius + 3` (default radius = 2, so > 7 steps), the component applies a windowing algorithm:

```
Always visible: [1] ... [X-2] [X-1] [X] [X+1] [X+2] ... [N]
```

- **Always shown**: First step, last step, active step ± `radius` neighbors
- **Ellipsis markers**: Interactive — click to open a dropdown of hidden steps, allowing jump navigation
- **Adaptive labels**:
  - Active step: full text, bold
  - Immediate neighbors (±1): full text, normal weight
  - Distance ±2: truncated text
  - Beyond ±2 (endpoints only): number/icon only (full mode) or icon only (compact mode)

Example at step 10 of 20: `(1) Discover ... (8) (9) (10) Rank Stories (11) (12) ... (20) Final Review`

### Props Interface

```typescript
interface FlowProgressStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
}

interface FlowProgressProps {
  /** Visual mode — "full" for footer/banner, "compact" for inline */
  mode: "full" | "compact";

  /** Steps to display, in order */
  steps: FlowProgressStep[];

  /** Flow name/label (shown in "full" mode header) */
  label?: string;

  /** Overall flow status */
  status?: "idle" | "running" | "complete" | "error";

  /** Current activity description (e.g., "Designing the infographic layout...") */
  activity?: string;

  /** Last completed step result (compact mode, line 3) */
  lastResult?: string;

  /** Called when user clicks reset/restart */
  onReset?: () => void;

  /** Called when user clicks a step (from ellipsis dropdown or direct) */
  onStepClick?: (stepId: string) => void;

  /** Additional CSS classes on root element */
  className?: string;
}
```

### Full Mode Rendering

The full mode renders a **footer/banner** that takes significant vertical space and shows rich detail:

```
┌─────────────────────────────────────────────────────────────────┐
│ ● European Football Newsletter   Running · Rank Stories  5/12 ↻│
│                                                                 │
│   ①────────②────── ... ──④────────⑤────────⑥──── ... ──⑫      │
│  Discover  Write         Rank &   Produce  Assemble     Final   │
│                         Summarize                       Review  │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  Designing the infographic layout...                            │
└─────────────────────────────────────────────────────────────────┘
```

- **Header row**: Status dot (animated pulse when running), flow label (semibold), status text, active step name, `completed/total` counter, reset button
- **Stepper row**: Numbered circles (36px, `w-9 h-9`) connected by horizontal bars, with ellipsis markers for hidden ranges
  - **Completed**: Filled with primary color, checkmark icon replaces number
  - **Active**: Green fill, `ring-4` glow, `scale-110`, green label text
  - **Error**: Red fill with X icon
  - **Pending**: Muted background, muted number, muted label
  - **Ellipsis**: Dashed-border circle with `...` icon, click to open dropdown
- **Progress track**: Thin horizontal bar showing overall completion percentage
- **Connector bars**: Fill with primary color as phases complete, muted when pending
- **Activity text**: Below the stepper (if provided)

### Compact Mode Rendering

The compact mode renders an **inline strip** for tight spaces:

```
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Discover ── ✅ Write ── ... ── ⟳ Rank Stories ──             │
│ ○ Design ── ... ── ○ Final Review                               │
│ Designing the infographic layout...                             │
│ Newsletter Summary — 3 articles generated                       │
└─────────────────────────────────────────────────────────────────┘
```

- **Step chain**: Status icon + label, connected by thin lines (`h-px w-4`), wraps at container edge
  - **Complete**: Green checkmark icon (`CheckCircle2`, 14px)
  - **Active**: Spinning loader (`Loader2`, 14px, `animate-spin`), bold foreground label
  - **Pending**: Empty circle (`Circle`, 14px, muted)
  - **Error**: Red X circle (`XCircle`, 14px)
  - **Ellipsis**: `...` icon, click to open dropdown of hidden steps
- **Connector lines**: Primary color when linking completed steps, muted otherwise
- **Adaptive labels**: Full text for active ± 1, truncated for ± 2, hidden beyond
- **Activity text** (line 2): Truncated, `text-xs text-muted-foreground`
- **Last result** (line 3, optional): Green text, truncated

### Ellipsis Dropdown (Progressive Disclosure)

When steps are hidden behind an ellipsis, clicking the `...` marker opens a positioned dropdown:

- Shows all hidden steps with their status icons and step numbers
- Scrollable if many steps are hidden (max height 200px)
- Click a step to invoke `onStepClick` and close the dropdown
- Auto-closes on outside click

### Context Adapter Pattern

In the Bilko app, `FlowStatusIndicator` and `FlowProgressBanner` serve as thin adapters that bridge the `FlowBus` context to FlowProgress props:

```tsx
// flow-status-indicator.tsx — thin adapter
import { FlowProgress, type FlowProgressStep } from "@/components/ui/flow-progress";

export function FlowStatusIndicator({ onReset }) {
  const { flows } = useFlowBus();
  const activeFlows = Array.from(flows.values()).filter(f => f.status !== "idle");
  if (activeFlows.length === 0) return null;

  return activeFlows.map(flow => (
    <FlowProgress
      mode="compact"
      steps={toProgressSteps(flow)}  // maps FlowBus phases → FlowProgressStep[]
      label={flow.label}
      status={flow.status}
      activity={resolveActivity(flow)}
      onReset={onReset}
    />
  ));
}

export function FlowProgressBanner({ onReset }) {
  // Same pattern, mode="full"
}
```

### External Integration Pattern

For external sites (not using React contexts), the component accepts data directly:

```tsx
import { FlowProgress } from "bilko-flow/react";

function MyPage() {
  const [steps, setSteps] = useState<FlowProgressStep[]>([]);
  const [activity, setActivity] = useState("");

  useEffect(() => {
    const es = new EventSource("/api/runs/abc/events");
    es.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setSteps(mapEventToSteps(event));
      setActivity(event.payload?.activity ?? "");
    };
    return () => es.close();
  }, []);

  return (
    <FlowProgress
      mode="full"
      steps={steps}
      label="Content Pipeline"
      status="running"
      activity={activity}
    />
  );
}
```

No context providers. No global state. Just props.

---

## Flow Viewer Components — IMPLEMENTATION GUIDE

These components are extracted from the Bilko project's `client/src/components/flow-inspector/` and `client/src/lib/bilko-flow/inspector/`. They visualize flow **definitions** (static DAGs) and flow **executions** (runtime state).

### FlowCanvas

**Purpose**: 2D DAG visualization with zoom, pan, minimap, search, keyboard shortcuts.

**Props**:
```typescript
interface FlowCanvasProps {
  flow: FlowDefinition;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onDeselectStep?: () => void;
  executions?: Record<string, StepExecution>;
  highlightStepId?: string | null;
  selectedStepIds?: Set<string>;
  onToggleSelect?: (stepId: string) => void;
  className?: string;
}
```

**Features**:
- Zoom: 0.3x–1.5x (buttons, scroll wheel, keyboard +/-)
- Pan: drag to move canvas
- Search: "/" to open, filter nodes by name/type, show match count
- Minimap: bottom-right, shows viewport rect, clickable
- Keyboard: F=fit, arrows=navigate steps, Esc=deselect, ?=shortcuts help
- Edges: SVG bezier curves, color-coded by execution status
- Multi-select: shift+click toggles nodes into selection set

**Implementation notes**:
- Use `computeLayout()` from `layout.ts` for node/edge coordinates
- Memoize the layout computation — only recompute when `flow.steps` changes
- Canvas node is a memoized sub-component for performance
- All colors/icons come from `getStepVisuals()` in `step-type-config.ts`

### StepDetail

**Purpose**: Rich step inspection with hero section, stats, dependency graph, tabbed detail.

**Props**:
```typescript
interface StepDetailProps {
  step: FlowStep;
  flow: FlowDefinition;
  execution?: StepExecution;
  className?: string;
}
```

**Tabs**: Prompt (system prompt + user message), Schema (input/output fields), Execution Data (JSON I/O + raw LLM response + errors)

### StepNode

**Purpose**: Single step indicator for timelines (status icon + name + type badge).

**Props**:
```typescript
interface StepNodeProps {
  step: FlowStep;
  status: StepStatus;
  isSelected: boolean;
  onClick: () => void;
  index: number;
  isLast: boolean;
}
```

### FlowTimeline

**Purpose**: Thin adapter wrapping `FlowProgress mode="compact"` in a Card for the flow inspector sidebar. Translates `FlowDefinition` + `StepExecution` data into `FlowProgressStep[]`.

**Props**:
```typescript
interface FlowTimelineProps {
  flow: FlowDefinition;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  executions?: Record<string, StepExecution>;
}
```

**Note**: FlowTimeline no longer renders `StepNode` components directly. It delegates all step rendering to `FlowProgress`, gaining sliding window and adaptive labeling for free.

### FlowCard

**Purpose**: Summary card for flow registry lists/grids.

**Props**:
```typescript
interface FlowCardProps {
  flow: FlowDefinition;
  onClick: () => void;
  className?: string;
}
```

### Layout Engine (`layout.ts`)

Pure function. No React dependency. Computes DAG coordinates using Sugiyama-style algorithm (Kahn's topological sort for depth assignment, barycenter heuristic for row ordering).

```typescript
interface DAGLayout {
  nodes: Map<string, NodeLayout>;
  edges: EdgeLayout[];
  width: number;
  height: number;
  columns: number;
  maxLaneCount: number;
}

function computeLayout(steps: FlowStep[]): DAGLayout;

const NODE_W = 220;
const NODE_H = 72;
const COL_GAP = 100;
const ROW_GAP = 24;
const PADDING = 40;
```

### Step Type Config (`step-type-config.ts`)

Maps step types to visual properties (icon, colors, labels).

```typescript
interface StepTypeVisuals {
  icon: LucideIcon;
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  accent: string;
  border: string;
  categoryLabel: string;
}

const STEP_TYPE_CONFIG: Record<StepType, StepTypeVisuals>;
const LLM_SUBTYPE_CONFIG: Record<string, StepTypeVisuals>;

function getStepVisuals(step: FlowStep): StepTypeVisuals;
```

**Color scheme**:
- llm → purple (Brain icon)
- user-input → blue (MousePointerClick)
- transform → orange (ArrowRightLeft)
- validate → green (ShieldCheck)
- display → cyan (Monitor)
- chat → emerald (MessageSquare)
- external-input → amber (PlugZap)
- llm:image subtype → pink (ImageIcon)
- llm:video subtype → rose (Film)

### UI Types (`types.ts`)

Subset of domain types for the React layer. These should bridge between the core `domain/workflow.ts` types (which use `http.search`, `transform.filter`, etc.) and the simplified UI step types (`llm`, `user-input`, `transform`, `validate`, `display`, `chat`, `external-input`).

```typescript
// UI-layer step types (simplified from domain's 12 types)
type UIStepType = "llm" | "user-input" | "transform" | "validate" | "display" | "chat" | "external-input";
type StepStatus = "idle" | "running" | "success" | "error" | "skipped";

interface FlowStep {
  id: string;
  name: string;
  type: UIStepType;
  subtype?: string;
  description: string;
  prompt?: string;
  userMessage?: string;
  model?: string;
  inputSchema?: SchemaField[];
  outputSchema?: SchemaField[];
  dependsOn: string[];
  parallel?: boolean;
}

interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: FlowStep[];
  tags: string[];
  phases?: FlowPhase[];
  output?: FlowOutput;
  icon?: string;
}

interface StepExecution {
  stepId: string;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  rawResponse?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}
```

---

## Development Guidelines

### DO

- **Use `chatJSON<T>()`** for all LLM calls — never raw fetch
- **Return `TypedError`** as data — never throw errors for business logic
- **Scope everything** to `TenantScope` — accountId + projectId + environmentId
- **Validate all planner output** through DSL compiler before acceptance
- **Declare determinism** explicitly for every step
- **Write tests** for every new module (target: maintain 87+ test suite)
- **Keep React components props-only** — no context, no global state
- **Use `lucide-react`** for all icons in React components
- **Use Tailwind utility classes** for all styling in React components
- **Support both modes** for FlowProgress — always test full and compact
- **Memoize expensive computations** — especially `computeLayout()`

### DON'T

- **Don't throw exceptions** for business failures — use TypedError
- **Don't add shadcn/ui** as a dependency — components must be self-contained
- **Don't require React context providers** — all data via props
- **Don't store UI state in the core layer** — core is backend-only
- **Don't break the 12 step type contracts** — schema.ts is law
- **Don't skip determinism analysis** — the compiler must always check
- **Don't embed artifact data** — use ArtifactPointer (by reference)
- **Don't trust planner output** — always validate via DSL compiler
- **Don't add runtime dependencies** — core has only express + uuid; React layer adds react + lucide-react as peers

---

## Key Design Patterns

### 1. Typed Errors (Not Exceptions)

All failures return `TypedError` as data. Enables agents to parse, analyze, and remediate.

```typescript
const err = validationError("Step 'fetch' missing timeout", "fetch");
// { code: "VALIDATION.ERROR", message: "...", retryable: false, suggestedFixes: [...] }
```

### 2. Pluggable Backends

Store interface is the contract. Implementations plug in:
- `createMemoryStore()` — development/testing
- PostgreSQL, Redis, S3 — production (implement the same interfaces)

### 3. State Machines

Run and step status transitions are validated by `state-machine.ts`. Prevents illegal transitions. Enables crash recovery.

Valid run transitions: `created→queued→running→succeeded|failed|canceled`
Valid step transitions: `pending→running→succeeded|failed|canceled`

### 4. Step Handler Registry

Pluggable step implementations registered at runtime:

```typescript
registerStepHandler({
  type: "ai.generate-text",
  inputContract: { prompt: { type: "string", required: true } },
  validate: (step) => ({ valid: true, errors: [] }),
  execute: async (step, ctx) => ({ outputs: { text: "..." } }),
});
```

Throw `NonRetryableStepError` for permanent failures (404, 401, config errors).

### 5. LLM Response Resilience (3-layer defense)

1. **API-level**: `response_format: { type: "json_object" }` for providers that support it
2. **Parse-level**: `cleanLLMResponse()` strips markdown fences + `repairJSON()` fixes trailing commas, unescaped chars, single quotes, unquoted keys
3. **Retry-level**: Re-prompt on parse failure with exponential backoff (1s, 2s, 4s; max 3 attempts)

### 6. Event-Driven Data Plane

14 lifecycle events (run.created, run.started, step.started, step.completed, artifact.created, etc.) published via `DataPlanePublisher`. Subscribe for real-time updates:

```typescript
const unsub = publisher.subscribe({
  eventTypes: ["run.step.completed", "run.succeeded"],
  callback: (event) => { /* update UI */ },
});
```

---

## Testing

```bash
npm test                    # Run all 87 tests
npm test -- --watch         # Watch mode
npm test -- --testPathPattern=dsl  # Run specific suite
```

Test suites cover: DSL compilation, validation, state machine transitions, RBAC permissions, planner certification, typed error creation, API routes.

**When adding React components**, add tests using `@testing-library/react`:
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

---

## FlowProgress UX Overhaul — IMPLEMENTATION SPEC

**Status**: Approved for implementation
**Priority**: HIGH — User-facing quality-of-life improvement
**Scope**: `src/react/flow-progress.tsx`, `src/react/types.ts`, `src/react/step-type-config.ts`

### Problem Statement

The current `FlowProgress` component (both modes) is visually bland and fails to communicate progress effectively. Specific issues identified from production usage:

1. **No visual differentiation** — All completed steps look identical (green checkmark). No sense of what *kind* of work was done.
2. **Invisible connectors** — Compact mode connectors are 1px tall (`h-px w-4`) — imperceptible on dark backgrounds.
3. **Active step doesn't stand out** — 14px blue spinner is too small and subtle.
4. **No step-type color coding** — `step-type-config.ts` defines a rich palette (purple/AI, orange/transform, blue/input, green/validate, pink/image, rose/video) that FlowProgress completely ignores.
5. **No completion animation** — Steps silently switch from spinner to checkmark with no transition feedback.
6. **Activity text too subtle** — `text-xs text-gray-400` is easily missed.
7. **No progress counter** in compact mode.
8. **Full mode progress bar is flat** — Solid green with no visual energy.

### Design Philosophy: Theme-First Customization

The FlowProgress component must be **deeply customizable** at the props level while shipping with **Bilko-optimized defaults**. External consumers can override any visual aspect without forking the component.

#### Theme Object — `FlowProgressTheme`

Add to `src/react/types.ts`:

```typescript
export interface FlowProgressTheme {
  /** ── Step Circle (Full Mode) ────────────────────────── */
  /** Size of step circles. Default: "w-9 h-9" */
  circleSize?: string;
  /** Completed circle classes. Default: "bg-green-500 text-white" */
  circleComplete?: string;
  /** Active circle classes. Default: "bg-green-500 text-white ring-4 ring-green-500/30 scale-110" */
  circleActive?: string;
  /** Error circle classes. Default: "bg-red-500 text-white" */
  circleError?: string;
  /** Pending circle classes. Default: "bg-gray-700 text-gray-400" */
  circlePending?: string;

  /** ── Step Icons (Compact Mode) ─────────────────────── */
  /** Completed icon size. Default: 14 */
  iconSize?: number;
  /** Active icon size. Default: 14 */
  activeIconSize?: number;
  /** Completed icon color. Default: "text-green-500" */
  iconComplete?: string;
  /** Active icon color. Default: "text-blue-400" */
  iconActive?: string;
  /** Error icon color. Default: "text-red-500" */
  iconError?: string;
  /** Pending icon color. Default: "text-gray-600" */
  iconPending?: string;

  /** ── Connectors ────────────────────────────────────── */
  /** Connector height class (compact). Default: "h-0.5" */
  connectorHeight?: string;
  /** Connector width class (compact). Default: "w-6" */
  connectorWidth?: string;
  /** Completed connector classes. Default: "bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.4)]" */
  connectorComplete?: string;
  /** Pending connector classes. Default: "bg-gray-700" */
  connectorPending?: string;

  /** ── Labels ────────────────────────────────────────── */
  /** Active label classes. Default: "text-white font-bold" (compact), "text-green-400 font-bold" (full) */
  labelActive?: string;
  /** Completed label classes. Default: "text-gray-300" */
  labelComplete?: string;
  /** Pending label classes. Default: "text-gray-500" */
  labelPending?: string;
  /** Max label width for full mode. Default: "max-w-[80px]" */
  labelMaxWidth?: string;

  /** ── Progress Bar (Full Mode) ──────────────────────── */
  /** Track classes. Default: "h-1.5 bg-gray-800" */
  progressTrack?: string;
  /** Fill classes. Default: "bg-gradient-to-r from-purple-500 via-green-500 to-emerald-400" */
  progressFill?: string;

  /** ── Activity Text ─────────────────────────────────── */
  /** Activity text classes. Default: "text-xs text-gray-300" */
  activityText?: string;
  /** Show spinner prefix on activity when running. Default: true */
  activitySpinner?: boolean;

  /** ── Animations ────────────────────────────────────── */
  /** Enable ping animation on active step. Default: true */
  activePing?: boolean;
  /** Enable zoom-in animation on completion. Default: true */
  completionAnimation?: boolean;
  /** Enable ping animation on status dot (full mode). Default: true */
  statusDotPing?: boolean;
  /** Enable glow on completed connectors. Default: true */
  connectorGlow?: boolean;

  /** ── Progress Counter (Compact Mode) ───────────────── */
  /** Show "X/Y" counter at end of step chain. Default: true */
  showCounter?: boolean;
  /** Counter text classes. Default: "text-[10px] font-mono text-gray-500 tabular-nums" */
  counterClass?: string;

  /** ── Step Type Colors ──────────────────────────────── */
  /** Use step-type-aware colors for completed steps. Default: true.
   *  When true and stepType is provided, completed steps use type-specific colors
   *  from STEP_TYPE_CONFIG. When false, all completed steps use the green defaults. */
  useStepTypeColors?: boolean;
  /** Override color map: stepType → { text, bg, shadow } classes */
  stepTypeColorOverrides?: Record<string, { text: string; bg: string; shadow?: string }>;

  /** ── Container ─────────────────────────────────────── */
  /** Root container classes (full mode). Default: "rounded-lg border border-gray-700 bg-gray-900 p-4" */
  containerFull?: string;
  /** Root container classes (compact mode). Default: "w-full" */
  containerCompact?: string;
}
```

#### Props Addition

Add `theme` to `FlowProgressProps`:

```typescript
export interface FlowProgressProps {
  mode: "full" | "compact";
  steps: FlowProgressStep[];
  label?: string;
  status?: "idle" | "running" | "complete" | "error";
  activity?: string;
  lastResult?: string;
  onReset?: () => void;
  onStepClick?: (stepId: string) => void;
  className?: string;
  /** Visual customization. All fields optional — defaults are Bilko-optimized dark theme. */
  theme?: FlowProgressTheme;
}
```

#### Default Theme Object

```typescript
const DEFAULT_THEME: Required<FlowProgressTheme> = {
  circleSize: 'w-9 h-9',
  circleComplete: 'bg-green-500 text-white',
  circleActive: 'bg-green-500 text-white ring-4 ring-green-500/30 scale-110',
  circleError: 'bg-red-500 text-white',
  circlePending: 'bg-gray-700 text-gray-400',
  iconSize: 14,
  activeIconSize: 14,
  iconComplete: 'text-green-500',
  iconActive: 'text-blue-400',
  iconError: 'text-red-500',
  iconPending: 'text-gray-600',
  connectorHeight: 'h-0.5',
  connectorWidth: 'w-6',
  connectorComplete: 'bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.4)]',
  connectorPending: 'bg-gray-700',
  labelActive: 'text-white font-bold',
  labelComplete: 'text-gray-300',
  labelPending: 'text-gray-500',
  labelMaxWidth: 'max-w-[80px]',
  progressTrack: 'h-1.5 bg-gray-800',
  progressFill: 'bg-gradient-to-r from-purple-500 via-green-500 to-emerald-400',
  activityText: 'text-xs text-gray-300',
  activitySpinner: true,
  activePing: true,
  completionAnimation: true,
  statusDotPing: true,
  connectorGlow: true,
  showCounter: true,
  counterClass: 'text-[10px] font-mono text-gray-500 tabular-nums',
  useStepTypeColors: true,
  stepTypeColorOverrides: {},
  containerFull: 'rounded-lg border border-gray-700 bg-gray-900 p-4',
  containerCompact: 'w-full',
};
```

#### Usage with Theme Merge

Inside the component, merge the user's partial theme with defaults:

```typescript
function FlowProgress(props: FlowProgressProps) {
  const { mode, className, theme: userTheme } = props;
  const theme = useMemo(
    () => ({ ...DEFAULT_THEME, ...userTheme }),
    [userTheme],
  );
  // Pass `theme` to FullMode / CompactMode
}
```

#### Bilko-Specific Theme (pre-configured)

Bilko's adapter wrappers (`flow-status-indicator.tsx`, etc.) should import and pass a Bilko-tuned theme:

```typescript
// client/src/lib/bilko-theme.ts
import type { FlowProgressTheme } from "bilko-flow/react";

export const BILKO_FLOW_THEME: FlowProgressTheme = {
  // Uses all defaults (which ARE Bilko-optimized) plus any Bilko-specific overrides
  containerFull: 'rounded-xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm p-5',
  progressFill: 'bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-400',
  connectorComplete: 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]',
};
```

This lets external consumers use completely different themes (light mode, different brand colors) while Bilko's dark aesthetic is the out-of-the-box default.

### Type Changes (`src/react/types.ts`)

Add an optional `stepType` field to `FlowProgressStep`:

```typescript
export interface FlowProgressStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
  /** Optional step type for color-coding. Maps to STEP_TYPE_CONFIG / LLM_SUBTYPE_CONFIG.
   *  When provided, completed steps show type-specific colors instead of uniform green.
   *  Values: "llm" | "user-input" | "transform" | "validate" | "display" | "chat" | "external-input"
   *  LLM subtypes use format "llm:image" or "llm:video" for subtype-specific colors. */
  stepType?: string;
}
```

This is **backward-compatible** — existing consumers that don't pass `stepType` get the same green-only behavior (graceful fallback).

### Helper Function: `resolveStepColor()`

Add to `flow-progress.tsx`, just after the existing helper functions:

```typescript
import { STEP_TYPE_CONFIG, LLM_SUBTYPE_CONFIG } from './step-type-config';

/**
 * Resolve the accent color for a completed step based on its type.
 * Falls back to green-500 when stepType is not provided.
 *
 * @param stepType - Optional type string (e.g., "llm", "transform", "llm:video")
 * @param variant - "text" for icon color, "bg" for background fills, "shadow" for glow effects
 */
function resolveStepColor(
  stepType: string | undefined,
  variant: 'text' | 'bg' | 'shadow',
  overrides?: Record<string, { text: string; bg: string; shadow?: string }>,
): string {
  // Check overrides first
  if (stepType && overrides?.[stepType]) {
    const o = overrides[stepType];
    return variant === 'text' ? o.text : variant === 'bg' ? o.bg : (o.shadow ?? 'shadow-none');
  }
  if (!stepType) {
    return variant === 'text' ? 'text-green-500'
      : variant === 'bg' ? 'bg-green-500'
      : 'shadow-[0_0_6px_rgba(34,197,94,0.4)]';
  }

  // Handle "llm:image" or "llm:video" subtypes
  if (stepType.startsWith('llm:')) {
    const subtype = stepType.slice(4);
    const config = LLM_SUBTYPE_CONFIG[subtype];
    if (config) {
      return variant === 'text' ? config.color
        : variant === 'bg' ? config.accent
        : `shadow-[0_0_6px_${extractRgba(config.color, 0.4)}]`;
    }
  }

  const config = STEP_TYPE_CONFIG[stepType as keyof typeof STEP_TYPE_CONFIG];
  if (config) {
    return variant === 'text' ? config.color
      : variant === 'bg' ? config.accent
      : `shadow-[0_0_6px_${extractRgba(config.color, 0.4)}]`;
  }

  // Fallback: green
  return variant === 'text' ? 'text-green-500'
    : variant === 'bg' ? 'bg-green-500'
    : 'shadow-[0_0_6px_rgba(34,197,94,0.4)]';
}

/** Map Tailwind color class names to rgba for shadow effects */
const COLOR_RGBA_MAP: Record<string, string> = {
  'text-purple-400': 'rgba(192,132,252,VAR)',
  'text-blue-400': 'rgba(96,165,250,VAR)',
  'text-orange-400': 'rgba(251,146,60,VAR)',
  'text-green-400': 'rgba(74,222,128,VAR)',
  'text-cyan-400': 'rgba(34,211,238,VAR)',
  'text-emerald-400': 'rgba(52,211,153,VAR)',
  'text-amber-400': 'rgba(251,191,36,VAR)',
  'text-pink-400': 'rgba(244,114,182,VAR)',
  'text-rose-400': 'rgba(251,113,133,VAR)',
  'text-green-500': 'rgba(34,197,94,VAR)',
};

function extractRgba(colorClass: string, alpha: number): string {
  const template = COLOR_RGBA_MAP[colorClass];
  if (template) return template.replace('VAR', String(alpha));
  return `rgba(34,197,94,${alpha})`;
}
```

### Change 1: Compact Mode — Richer Connector Bars

**File**: `src/react/flow-progress.tsx`, CompactMode connector (currently lines 459-466)

**Current**:
```tsx
<div className={`h-px w-4 flex-shrink-0 ${step.status === 'complete' ? 'bg-green-500' : 'bg-gray-600'}`} />
```

**Replace with**:
```tsx
<div
  className={`
    h-0.5 w-6 flex-shrink-0 rounded-full transition-all duration-500
    ${step.status === 'complete'
      ? `bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.4)]`
      : 'bg-gray-700'}
  `}
/>
```

**Also update** the ellipsis connector (currently line 399) with the same treatment:
```tsx
<div className="h-0.5 w-6 flex-shrink-0 rounded-full bg-gray-700" />
```

**Why**: Doubled height (1px → 2px), widened (16px → 24px), rounded ends, glow on completed segments. Creates a visible "energy trail" showing progress.

### Change 2: Compact Mode — Type-Aware Step Icons

**File**: `src/react/flow-progress.tsx`, CompactMode status icon section (currently lines 429-437)

**Current**:
```tsx
{step.status === 'complete' ? (
  <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
) : step.status === 'active' ? (
  <Loader2 size={14} className="text-blue-400 animate-spin flex-shrink-0" />
) : step.status === 'error' ? (
  <XCircle size={14} className="text-red-500 flex-shrink-0" />
) : (
  <Circle size={14} className="text-gray-500 flex-shrink-0" />
)}
```

**Replace with**:
```tsx
{step.status === 'complete' ? (
  <CheckCircle2
    size={14}
    className={`${resolveStepColor(step.stepType, 'text')} flex-shrink-0 animate-in zoom-in-50 duration-300`}
  />
) : step.status === 'active' ? (
  <span className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
    <span className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
    <Loader2 size={14} className="text-blue-400 animate-spin relative" />
  </span>
) : step.status === 'error' ? (
  <XCircle size={14} className="text-red-500 flex-shrink-0" />
) : (
  <Circle size={14} className="text-gray-600 flex-shrink-0" />
)}
```

**What changes**:
- Completed steps use `resolveStepColor()` — AI steps turn purple, transforms turn orange, etc.
- Active step gets a ping ring behind the spinner (breathing glow effect)
- Completion triggers `animate-in zoom-in-50` (a micro scale-up)
- Pending circles are slightly darker (`gray-600` → less visual noise)

**Visual result**: The completed step trail becomes a colorful sequence — purple, purple, orange, green, pink — instead of all green. Users can see at a glance what *kind* of work was performed.

### Change 3: Compact Mode — Progress Counter

**File**: `src/react/flow-progress.tsx`, CompactMode, after the step chain `</div>` (after line 470)

**Add** a counter inline with the last step:

Inside the step chain `<div className="flex flex-wrap items-center gap-1">`, append after the `.map()`:

```tsx
{/* Progress counter */}
{steps.length > 0 && (
  <span className="ml-1.5 text-[10px] font-mono text-gray-500 tabular-nums select-none">
    {steps.filter(s => s.status === 'complete').length}/{steps.length}
  </span>
)}
```

**Why**: Gives an instant numeric sense of completion without requiring users to count icons.

### Change 4: Compact Mode — Enhanced Activity Text

**File**: `src/react/flow-progress.tsx`, CompactMode activity section (currently lines 473-476)

**Current**:
```tsx
{activity && (
  <p className="mt-1 text-xs text-gray-400 truncate">
    {activity}
  </p>
)}
```

**Replace with**:
```tsx
{activity && (
  <div className="mt-1.5 flex items-center gap-1.5">
    {status === 'running' && (
      <Loader2 size={10} className="text-blue-400 animate-spin flex-shrink-0" />
    )}
    <p className="text-xs text-gray-300 truncate">{activity}</p>
  </div>
)}
```

**Note**: This requires adding `status` to CompactMode's destructured props:
```typescript
const { steps, activity, lastResult, onStepClick, status } = props;
```

**Why**: Activity text goes from `text-gray-400` (barely visible) to `text-gray-300` (readable) and gets a spinning icon prefix that visually links it to the active step.

### Change 5: Full Mode — Type-Aware Step Circles (Theme-Integrated)

**File**: `src/react/flow-progress.tsx`, FullMode step circle (currently lines 299-309)

**Current**:
```tsx
className={`
  w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium
  transition-all duration-300
  ${step.status === 'complete'
    ? 'bg-green-500 text-white'
    : step.status === 'active'
      ? 'bg-green-500 text-white ring-4 ring-green-500/30 scale-110'
      : step.status === 'error'
        ? 'bg-red-500 text-white'
        : 'bg-gray-700 text-gray-400'
  }
`}
```

**Replace with** (using theme properties):
```tsx
className={`
  ${theme.circleSize} rounded-full flex items-center justify-center text-sm font-medium
  transition-all duration-300
  ${step.status === 'complete'
    ? (theme.useStepTypeColors && step.stepType
        ? `${resolveStepColor(step.stepType, 'bg', theme.stepTypeColorOverrides)} text-white`
        : theme.circleComplete)
    : step.status === 'active'
      ? theme.circleActive
      : step.status === 'error'
        ? theme.circleError
        : theme.circlePending
  }
`}
```

**Also update** the label color for completed steps (currently line 329):

**Current**: `'text-gray-300'` for completed labels

**Replace with** (using theme properties):
```tsx
: step.status === 'complete'
  ? (theme.useStepTypeColors && step.stepType
      ? resolveStepColor(step.stepType, 'text', theme.stepTypeColorOverrides)
      : theme.labelComplete)
  : theme.labelPending
```

**Visual result**: Full mode stepper shows a sequence like: purple circle (AI) → orange circle (Transform) → green ring (Active) → gray (Pending). The pipeline's *nature* is visible. Consumer can override via `theme.circleComplete` or `theme.stepTypeColorOverrides`.

### Change 6: Full Mode — Enhanced Progress Bar

**File**: `src/react/flow-progress.tsx`, FullMode progress track (currently lines 357-362)

**Current**:
```tsx
<div className="mt-3 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
  <div
    className="h-full bg-green-500 rounded-full transition-all duration-500"
    style={{ width: `${progressPct}%` }}
  />
</div>
```

**Replace with**:
```tsx
<div className="mt-3 h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
  <div
    className="h-full rounded-full transition-all duration-700 ease-out
      bg-gradient-to-r from-purple-500 via-green-500 to-emerald-400"
    style={{ width: `${progressPct}%` }}
  />
</div>
```

**Why**: Taller (4px → 6px), gradient fill suggesting pipeline diversity, smoother easing, darker track for contrast.

### Change 7: Full Mode — Connector Bars with Type Color

**File**: `src/react/flow-progress.tsx`, FullMode connector bars (currently lines 342-350)

**Current**:
```tsx
<div
  className={`
    h-1 flex-1 min-w-[16px] max-w-[40px] rounded-full mx-1 mt-[-20px]
    transition-colors duration-300
    ${step.status === 'complete' ? 'bg-green-500' : 'bg-gray-700'}
  `}
/>
```

**Replace with**:
```tsx
<div
  className={`
    h-1 flex-1 min-w-[16px] max-w-[40px] rounded-full mx-1 mt-[-20px]
    transition-all duration-500
    ${step.status === 'complete'
      ? `${resolveStepColor(step.stepType, 'bg')} shadow-sm`
      : 'bg-gray-700'}
  `}
/>
```

**Why**: Completed connector segments inherit the step's type color, creating a continuous colored trail (purple bar → orange bar → etc.) instead of uniform green.

### Change 8: Full Mode — Animated Status Dot

**File**: `src/react/flow-progress.tsx`, FullMode header status dot (currently line 230)

**Current**:
```tsx
<span className={`w-2.5 h-2.5 rounded-full ${statusDotClass(status)}`} />
```

**Replace with**:
```tsx
<span className="relative flex h-3 w-3">
  {status === 'running' && (
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
  )}
  <span className={`relative inline-flex rounded-full h-3 w-3 ${statusDotClass(status)}`} />
</span>
```

**Why**: Running state gets a sonar-style ping animation (like Tailwind's notification badge pattern). Dot is slightly larger (10px → 12px) for visibility.

### Consumer-Side Changes (Bilko Codebase)

For the step-type color coding to work, consumers must pass `stepType` when building `FlowProgressStep[]`. This is optional — the component gracefully falls back to green without it.

#### Newsletter Flow (`client/src/components/newsletter-flow.tsx`)

**Current** (lines 465-477):
```typescript
const trackerSteps = useMemo<FlowProgressStep[]>(() => {
  if (!flowDef) return [];
  return flowDef.steps.map((step) => {
    const exec = execution.steps[step.id];
    let status: FlowProgressStep["status"] = "pending";
    if (exec) {
      if (exec.status === "running") status = "active";
      else if (exec.status === "success") status = "complete";
      else if (exec.status === "error") status = "error";
    }
    return { id: step.id, label: step.name, status };
  });
}, [flowDef, execution.steps]);
```

**Change the return line to**:
```typescript
return {
  id: step.id,
  label: step.name,
  status,
  stepType: step.subtype ? `${step.type}:${step.subtype}` : step.type,
};
```

This maps `FlowStep.type` + `FlowStep.subtype` into the `stepType` string that `resolveStepColor()` expects.

#### Flow Status Indicator (`client/src/components/flow-status-indicator.tsx`)

**Current** `toProgressSteps()` (lines 44-52):
```typescript
return phases.map((phase, i): FlowProgressStep => ({
  id: phase.id,
  label: phase.label,
  status: i < currentIdx ? "complete" : i === currentIdx ? "active" : "pending",
}));
```

Phases don't have step type info, so no change needed here — it will fall back to green. When phase metadata is eventually enriched with `dominantStepType`, this can be updated.

#### Other Flow Components

Apply the same pattern as Newsletter Flow to:
- `client/src/components/work-with-me-flow.tsx`
- `client/src/components/video-discovery-flow.tsx`
- `client/src/components/fake-game-flow.tsx`

### Visual Summary — Before vs After

**Compact Mode — Before**:
```
✅ Discover ── ✅ Write ── ✅ Rank ── ⟳ Design ── ○ Assemble ── ○ Final
Designing the infographic layout...
```
All green checks, invisible connectors, plain gray activity text.

**Compact Mode — After**:
```
✅ Discover ━━ ✅ Write ━━ ✅ Rank ━━ ◉ Design ── ○ Assemble ── ○ Final  4/7
(purple)   ✨  (purple) ✨  (orange)✨  (pulsing)     (dim)        (dim)
⟳ Designing the infographic layout...
```
Color-coded checks (purple AI, orange transform), glowing connectors, ping ring on active, spinning prefix on activity, counter.

**Full Mode — Before**:
```
● Running · Design  4/7
  [✓]────[✓]────[✓]────[④]────[5]────[6]────[7]
  (green) (green) (green) (green+ring) (gray)  (gray)  (gray)
  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░
  Designing the infographic layout...
```

**Full Mode — After**:
```
◉ Running · Design  4/7     (sonar-ping status dot)
  [✓]────[✓]────[✓]────[④]────[5]────[6]────[7]
  (purple)(purple)(orange)(green+ring)(gray) (gray) (gray)
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░ (gradient bar)
  Designing the infographic layout...
```
Color-coded circles and connectors, gradient progress bar, pinging status dot.

### CSS Animation Dependencies

The implementation uses these Tailwind/CSS features:
- `animate-ping` — built into Tailwind (sonar ring)
- `animate-spin` — built into Tailwind (spinner rotation)
- `animate-pulse` — built into Tailwind (breathing glow)
- `animate-in zoom-in-50` — from `tailwindcss-animate` plugin (scale-up on mount). If not available, replace with `transition-transform duration-300` and handle via state.
- `shadow-[0_0_Xpx_rgba(...)]` — Tailwind arbitrary value syntax for colored glows
- `transition-all duration-500` — smooth state transitions

**If `tailwindcss-animate` is not installed**, replace `animate-in zoom-in-50 duration-300` with a simpler approach using Tailwind's built-in `scale` + `transition`:
```tsx
className="... transform scale-100 transition-transform duration-300"
```

### Testing Checklist

After implementation, verify:

- [ ] Compact mode: completed steps show type-specific colors when `stepType` is provided
- [ ] Compact mode: completed steps show green when `stepType` is NOT provided (backward compat)
- [ ] Compact mode: active step has visible ping ring animation
- [ ] Compact mode: connectors are visible (2px height) and glow when completed
- [ ] Compact mode: progress counter appears at end of step chain
- [ ] Compact mode: activity text has spinner prefix when running
- [ ] Full mode: completed circles use type-specific background colors
- [ ] Full mode: connector bars inherit type color from preceding step
- [ ] Full mode: progress bar shows gradient fill
- [ ] Full mode: status dot pings when running
- [ ] Full mode: active step retains green ring-4 glow + scale-110
- [ ] Ellipsis dropdown still works correctly in both modes
- [ ] Sliding window still activates at > 7 steps
- [ ] No visual regression when steps have no `stepType` (pure backward compat)
- [ ] Performance: no unnecessary re-renders from animation classes

---

## Migration Path — Bilko Integration

### Completed Migrations

The following migrations have been completed in the Bilko codebase:

1. **`StepTracker` → `FlowProgress mode="compact"`** — All 4 flow components (`newsletter-flow`, `video-discovery-flow`, `fake-game-flow`, `work-with-me-flow`) now use `FlowProgress` directly
2. **`FlowStatusIndicator` → thin adapter** — Now delegates to `<FlowProgress mode="compact" />` internally
3. **`FlowProgressBanner` → thin adapter** — Now delegates to `<FlowProgress mode="full" />` internally
4. **`FlowTimeline` → thin adapter** — Now delegates to `<FlowProgress mode="compact" />` with `onStepClick` for step selection

### Remaining Migrations (when bilko-flow/react is published)

1. **Replace** `client/src/components/ui/flow-progress.tsx` with import from `bilko-flow/react`
2. **Replace** `client/src/components/flow-inspector/*` with imports from `bilko-flow/react`
3. **Replace** `client/src/lib/bilko-flow/inspector/*` with imports from `bilko-flow/react`
4. **Keep** `client/src/lib/bilko-flow/runtime/*` (hooks are Bilko-specific)
5. **Keep** `client/src/lib/bilko-flow/definitions/registry.ts` (flow definitions are Bilko-specific)
6. **Keep** adapter wrappers (`flow-status-indicator.tsx`) that bridge FlowBus context → FlowProgress props

---

## Important Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main library barrel export |
| `src/domain/workflow.ts` | THE core type: Workflow, Step, StepType |
| `src/domain/errors.ts` | TypedError + helper constructors |
| `src/dsl/compiler.ts` | 5-phase compiler |
| `src/dsl/schema.ts` | Validation constraints and valid values |
| `src/planner/interface.ts` | Planner protocol contract |
| `src/planner/certification.ts` | Conformance testing + patch application |
| `src/engine/executor.ts` | Workflow orchestration engine |
| `src/engine/step-runner.ts` | Step handler registry + execution |
| `src/storage/store.ts` | 12 store interface definitions |
| `src/llm/index.ts` | chatJSON<T>() and response resilience |
| `src/react/flow-progress.tsx` | **THE** progress component (to build) |
| `src/react/flow-canvas.tsx` | DAG visualization (to build) |
| `src/react/index.ts` | React barrel export (to build) |

---

## Remember

**bilko-flow is a library, not an application.** The Express server is a reference implementation. The real value is the typed contracts in `domain/`, the compilation pipeline in `dsl/`, the planner protocol in `planner/`, and — once built — the portable React components in `react/`.

Consumers of this library include:
- **Bilko** (the parent web application) — uses both core and react
- **External sites** — can import `bilko-flow/react` for progress visualization
- **AI agents** — consume the core library's planner protocol and typed errors
- **Production orchestrators** (Temporal, Inngest) — integrate with the DSL and storage interfaces

---

## Troubleshooting: AI Generation Step Failures (404 / Model Not Found)

### Symptom

`ai.generate-video` or `ai.generate-image` steps fail with a **404** error and an empty response body:

```
Video generation failed (404):
```

The `NonRetryableStepError` is thrown in `server/bilko-flow/llm-step-handler.ts` when the upstream Gemini API returns 404.

### Root Cause: Deprecated Model Names

Google periodically deprecates preview model IDs and replaces them with GA (stable) versions. When a model is shut down, the API endpoint returns **404 with an empty body** because the model route no longer exists.

**Known deprecation (November 2025):**

| Deprecated Model | Replacement (GA) |
|---|---|
| `veo-3.0-generate-preview` | `veo-3.0-generate-001` |
| `veo-3.0-fast-generate-preview` | `veo-3.0-fast-generate-001` |

### Files That Reference Model IDs

Model names appear in **6 locations** across the codebase. All must be updated together:

| File | What it controls |
|---|---|
| `server/llm/index.ts` | `AVAILABLE_MODELS` registry (model ID, name, description) |
| `server/llm/video-generation.ts` | `DEFAULT_VIDEO_MODEL` constant + JSDoc |
| `server/bilko-flow/llm-step-handler.ts` | Default fallback in `validate()` |
| `server/bilko-flow/newsletter-workflow.ts` | Workflow step `inputs.model` |
| `client/src/lib/bilko-flow/definitions/registry.ts` | Flow definition `model` field |

### How to Fix

1. **Identify the current GA model** — check [Google AI model docs](https://ai.google.dev/gemini-api/docs/models) or [Gemini API changelog](https://ai.google.dev/gemini-api/docs/changelog)
2. **Search for the deprecated model string** — `grep -r "veo-3.0-generate-preview" server/ client/`
3. **Replace all occurrences** with the GA model ID
4. **Verify the request body format** — Google may change parameter names between preview and GA (e.g., `sampleCount` vs `numberOfVideos`, `durationSeconds` valid values)

### Prevention

When using preview models (`*-preview`), be aware they have a finite lifespan. Monitor the [Gemini API changelog](https://ai.google.dev/gemini-api/docs/changelog) for deprecation notices. Prefer `-001` (GA) model IDs when available.
