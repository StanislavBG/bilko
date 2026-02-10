# Content Block System

Rule ID: ARCH-006
Priority: CRITICAL
Version: 1.0.0
Type: Architecture
Dependencies: ARCH-000, ARCH-001, ARCH-005
Cross-References: PER-002, APP-LANDING-001

## Purpose

Defines the **content block vocabulary** — the typed, reusable rendering primitives that agents produce and the conversation canvas renders. This is the contract between AI agents and the UI.

Agents produce data. Blocks render it. Bilko narrates between them.

---

## Architecture

```
Agent (LLM / flow step)
  │
  ▼
AgentContentResult { blocks[], introduction?, followUp? }
  │
  ▼
agentResultToTurns() ── converts to ConversationTurn[]
  │
  ▼
ConversationCanvas ── renders turns sequentially
  │
  ├── BilkoTurn ── typewriter (from introduction)
  ├── ContentBlocksTurn ── BlockSequence renders blocks
  └── UserChoiceTurn ── follow-up options
```

---

## Block Types

Every block is a plain data structure with a `type` discriminant. No React, no functions, no callbacks in the data. Components render them.

| Type | Purpose | Key Fields |
|------|---------|------------|
| `heading` | Section heading | `text`, `level` (1-3) |
| `text` | Paragraph content | `content`, `variant` (body/lead/caption) |
| `callout` | Highlighted box | `variant` (tip/warning/note/insight/success/error), `title?`, `body` |
| `info-card` | Concept with key points | `title`, `summary`, `points[]` |
| `steps` | Numbered walkthrough | `steps[{title, body, complete?}]` |
| `code` | Syntax-highlighted code | `language`, `code`, `explanation?`, `filename?` |
| `comparison` | Side-by-side table | `columns[]`, `rows[{label, values[]}]` |
| `video` | YouTube embed | `embedId`, `title`, `creator?`, `recommendation?` |
| `resource-list` | Curated links | `items[{title, url, type?, description?}]` |
| `progress` | Progress bar | `current`, `total`, `label?`, `milestones?` |
| `quiz` | Multiple-choice question | `question`, `options[]`, `correctIndex`, `explanation?` |
| `fact-grid` | Key-value grid | `facts[{label, value}]`, `columns?` (2/3) |
| `image` | Image with caption | `src`, `alt`, `caption?`, `aspect?` |
| `divider` | Section separator | `label?` |
| `widget` | Custom component | `widget` (registered name), `props` |

---

## Contracts

### B1: Blocks Are Pure Data

Every `ContentBlock` is a JSON-serializable object. No React elements, no functions, no DOM references. This allows:
- Server-side generation
- LLM output → JSON.parse → blocks
- Persistence and replay
- Cross-platform rendering

### B2: Every Block Has an ID

The `id` field is mandatory and must be unique within a block sequence. Used for keying React elements and for quiz answer callbacks.

### B3: Discriminated Union

All blocks use `type` as the discriminant. The `BlockRenderer` switch statement must be exhaustive — every type has a renderer.

### B4: Widget Escape Hatch

The `widget` type allows embedding registered React components when no standard block fits. Widgets must be registered in the widget map passed to `BlockSequence`. Unknown widgets render a warning box, not a crash.

### B5: Quiz Interactivity Flows Up

Quiz blocks emit answer events via `onQuizAnswer(blockId, correct)`. The parent orchestrates scoring, Bilko's response, and progression. Quiz blocks never navigate or manage state beyond their own selection.

---

## Bilko Persona System

### P1: Context-Aware Voice

Bilko's speech is generated from `BilkoContext` — a structured description of the current moment (event, topic, progress, user name). The `bilkoSays()` function maps context to speech deterministically.

### P2: Tone Inference

Bilko's tone is inferred from the event type:
- `greeting` → welcoming
- `choice-made` → encouraging
- `task-complete` → celebrating
- `task-failed` → empathetic
- `quiz-correct` → celebrating
- `quiz-incorrect` → empathetic
- `new-content` → explaining

### P3: Transitions Connect Blocks

`bilkoTransition(from, to)` generates connecting phrases between content sections. Transitions are short (one sentence) and maintain conversational flow.

### P4: Deterministic Variation

Speech banks use hash-based picking from a seed string. Same context → same phrase. Different contexts → different phrases. This prevents jarring randomness while avoiding robotic repetition.

---

## Agent Content Result

The standard shape agents return when producing renderable content:

```typescript
interface AgentContentResult {
  blocks: ContentBlock[];        // Content to render
  introduction?: {               // Bilko's intro speech
    text: string;
    speech?: string;
  };
  followUp?: Array<{            // Next options for user
    id: string;
    label: string;
    description: string;
    icon?: string;
    voiceTriggers?: string[];
  }>;
}
```

`agentResultToTurns()` converts this into `ConversationTurn[]` that the canvas renders.

---

## Adding New Block Types

1. Add the interface to `content-blocks/types.ts`
2. Add it to the `ContentBlock` union
3. Create a renderer component in `content-blocks/`
4. Add the case to `BlockRenderer`
5. Export from `content-blocks/index.ts`
6. Update this rule document

---

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Do This Instead |
|---|---|---|
| React elements in block data | Not serializable, can't persist or replay | Use pure data, render in components |
| Blocks managing navigation | Blocks are presentational | Bubble events up, let orchestrator navigate |
| Hardcoding content in page components | Not reusable, not agent-targetable | Define as ContentBlock[] data |
| Skipping block IDs | React key warnings, quiz callbacks break | Always set a unique `id` |
| Giant widget props | Defeats the purpose of typed blocks | Create a proper block type instead |

---

## Changelog

### v1.0.0 (2026-02-07)
- 15 block types: heading, text, callout, info-card, steps, code, comparison, video, resource-list, progress, quiz, fact-grid, image, divider, widget
- Bilko persona system: context-aware voice, tone inference, transitions
- AgentContentResult → agentResultToTurns() pipeline
- BlockRenderer with exhaustive type matching
- Widget escape hatch for custom components
