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
