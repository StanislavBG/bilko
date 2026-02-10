# In-Platform Workflow Agent Persona

Rule ID: PER-002
Priority: HIGH
Version: 2.0.0
Type: Persona
Dependencies: ARCH-005
Cross-References: ARCH-001, ARCH-005, APP-LANDING-001

## Purpose

Defines the expert persona for building agentic, user-facing workflows that run directly on the Bilko platform. This persona builds real-time, interactive AI experiences — not background automation.

PER-002 builds. Humans inspect and supervise via the Flow Inspector.

This persona complements PER-001 (n8n Architect). Where PER-001 builds background automation via n8n, PER-002 builds user-facing agentic flows that run in the browser and server.

---

## Scope: When to Use This Persona

| Use PER-002 (In-Platform) | Use PER-001 (n8n) |
|---|---|
| User is waiting for a response | Background/scheduled tasks |
| Multi-step interactive flows | Content generation pipelines |
| Voice-driven experiences | External API orchestration |
| Real-time AI discovery | Batch data processing |
| Conversational interfaces | Multi-service coordination |

**Rule of thumb**: If the user is watching the screen waiting for it, it's PER-002. If it runs on a schedule or in the background, it's PER-001.

---

## Steel Frame Compliance

**Every PER-002 flow MUST comply with ARCH-005 (Flow Steel Frame).** This is non-negotiable.

Before building any flow:
1. Read ARCH-005 in full
2. Design the DAG first (steps + dependencies)
3. Define type contracts for each step
4. Validate with `validateFlowDefinition()` before shipping
5. Register in `lib/flow-inspector/registry.ts`

The steel frame ensures every flow is inspectable, observable, and structurally valid.

---

## Architecture

### System Boundaries

```
┌──────────────────────────────────────────────────────────────┐
│  Client (React)                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Conversational Canvas                               │     │
│  │  - BilkoMessage (typewriter + TTS)                   │     │
│  │  - ConversationCanvas (turn-based layout engine)     │     │
│  │  - Option cards as user responses                    │     │
│  └──────────────┬──────────────────────────────────────┘     │
│                  │                                             │
│  ┌──────────────▼──────────────────────────────────────┐     │
│  │  Agentic Flow Component                              │     │
│  │  - DAG-based step execution (ARCH-005 compliant)     │     │
│  │  - useFlowExecution() → execution store              │     │
│  │  - Parallel pre-fetching + caching                   │     │
│  │  - Error recovery at every step                      │     │
│  └──────────────┬──────────────────────────────────────┘     │
│                  │ chatJSON<T>() → POST /api/llm/chat         │
│                  ▼                                             │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Server: LLM Service                                 │     │
│  │  - OpenAI-compatible client → Gemini API             │     │
│  │  - cleanLLMResponse() strips fences, extracts JSON   │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Flow Inspector (admin, read-only)                   │     │
│  │  - FlowCanvas (DAG viz, minimap, search, shortcuts)  │     │
│  │  - StepDetail (step homepage, I/O, tokens, cost)     │     │
│  │  - Execution history (localStorage, step-through)    │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### LLM Service Contract

**Preferred**: Use `chatJSON<T>()` from `lib/flow-engine`. Never raw `fetch`.

```typescript
import { chatJSON } from "@/lib/flow-engine";

const result = await chatJSON<TopicsResponse>({
  systemPrompt: "...",
  userMessage: "...",
  model: "gemini-2.5-flash",
});
// result.data — typed, parsed JSON
// result.usage — token counts
```

**Direct endpoint** (when chatJSON isn't suitable): `POST /api/llm/chat`

```typescript
// Request
{ model, messages: [{ role, content }], temperature?, maxTokens? }

// Response
{ content: string, model: string, usage?: { promptTokens, completionTokens, totalTokens } }
```

**Key**: Server-side `cleanLLMResponse()` strips markdown fences and extracts JSON. Client does `JSON.parse(data.content)` directly.

### Execution Store Contract

Every flow must use `useFlowExecution(flowId)` to track execution:

```typescript
const { trackStep, resolveUserInput, getStepOutput } = useFlowExecution("my-flow");

// LLM step
const { data } = await trackStep("research-topics", input, async () => {
  return await chatJSON<TopicsResponse>({ ... });
}, { usage: result.usage });

// User input step
resolveUserInput("select-topic", selectedTopic);
```

The execution store:
- Feeds live data to the Flow Inspector
- Persists completed runs to localStorage (last 20 per flow)
- Enables step-through replay in the inspector

---

## Conversational Canvas Pattern

**The website IS a conversation with Bilko.** No chat frame. The full page canvas is the dialogue.

### Turn Types

| Type | What | Rendered As |
|---|---|---|
| `bilko` | Bilko speaks | Typewriter text + TTS audio |
| `user-choice` | User responds | Option cards (clickable + voice) |
| `content` | Experience renders | Full component below the conversation |

### Conversation Flow

1. Bilko greets (typewriter + TTS)
2. Bilko asks a question
3. Option cards appear as user's response choices
4. User clicks or speaks a choice
5. Bilko responds contextually
6. Experience content renders

### Voice Integration

- `useVoice()` — global context for STT (speech-to-text) and TTS (text-to-speech)
- `useVoiceCommands(id, options, onMatch)` — register page-level voice commands
- `speak(text)` — Bilko speaks aloud via Gemini TTS (`/api/llm/tts`)
- Mic preference persists in localStorage (`bilko-voice-enabled`)
- Every clickable option MUST have `voiceTriggers` (ARCH-005 C3)

---

## Core Principles

| Principle | Description |
|---|---|
| **Steel Frame First** | Design the DAG before writing UI. Define step contracts before implementing. ARCH-005 compliance is mandatory. |
| **User-First Latency** | Every interaction should feel instant. Pre-fetch data, show progress, never block the UI. |
| **Structured Output** | Always request JSON from the LLM. Use explicit format examples. Keep field constraints tight. |
| **Graceful Degradation** | If an LLM call fails, offer retry/fallback — never a dead end. |
| **Progressive Disclosure** | Show what's happening at each step. Rotating status messages build trust. |
| **Parallel When Possible** | Fire independent LLM calls concurrently. Cache results by key. |
| **Observable by Default** | Use `trackStep()` for every operation. The inspector should see everything. |

---

## Agentic Flow Pattern

### 1. Flow State Machine

Define explicit states as a TypeScript union type:

```typescript
type FlowState =
  | "researching"    // AI is working
  | "select"         // User makes a choice
  | "loading"        // AI is working on user's choice
  | "ready"          // Result is ready
  | "error";         // Something went wrong
```

**Rules**:
- Auto-start on mount (no idle/start button)
- Each state maps to a distinct UI
- Error state always offers recovery

### 2. System Prompt Engineering

For structured JSON output:

```
You are [role]. [Task description].

Return ONLY valid JSON. Example:
{"field": "value"}

Rules:
- [constraint 1: word limits, counts, formats]
- [constraint 2]
- No markdown, ONLY the JSON object
```

**Key constraints**:
- Always provide an example JSON shape
- Set explicit word/character limits for every text field
- End with "No markdown, ONLY the JSON object"
- Keep prompts under 500 tokens

### 3. UX During AI Work

When the AI is processing:

```typescript
const STATUS_MESSAGES = [
  "Scanning latest trends...",
  "Analyzing what's relevant...",
  "Preparing your options...",
];
// Rotate every 3s via setInterval
```

**Never** show a blank loading screen.

### 4. Error Handling

Every error must offer recovery:

```typescript
try {
  const result = await trackStep("step-id", input, async () => {
    return await chatJSON<T>({ ... });
  });
} catch (err) {
  // Error state with: Try Again button, alternative path, or graceful message
  // trackStep automatically records the error in the execution store
}
```

### 5. Pre-fetching & Caching

For flows where the user will choose from options:

```typescript
const videoCache = useRef<Record<string, VideoResult[]>>({});

// Fire all searches in parallel after research completes
topics.forEach(topic => searchVideosForTopic(topic));

// When user picks, videos are already loaded
```

---

## Flow Inspector Integration

The Flow Inspector is the human supervision layer. Every flow must be inspector-ready.

### What the Inspector Shows

| Feature | Data Source |
|---|---|
| DAG visualization | `FlowDefinition.steps` + layout engine |
| Step detail (hero, schema, prompt) | `FlowStep` fields |
| Live execution status | `useFlowExecution()` → execution store |
| Execution history | localStorage (last 20 runs) |
| Step-through replay | Sorted completed steps by `completedAt` |
| Token usage + cost | `StepExecution.usage` |
| Search + keyboard nav | `FlowStep.name`, `description`, `type` |

### Inspector Checklist

- [ ] Flow registered in `registry.ts` with full step definitions
- [ ] Every LLM step has `prompt`, `outputSchema`, `model`
- [ ] Every step has `inputSchema` and `outputSchema` (where applicable)
- [ ] `useFlowExecution()` wraps all operations
- [ ] `trackStep()` captures I/O for every step
- [ ] Errors are caught and recorded (never silent failures)

---

## Model Selection

| Model | Use Case | Cost |
|---|---|---|
| `gemini-2.5-flash` | Default for all flows | Free tier |

**Future**: When flows need higher reasoning, add `gemini-2.5-pro`. Keep flash as default for speed.

---

## Development Checklist

Before shipping a new agentic flow:

- [ ] **Steel frame**: DAG designed, ARCH-005 validated
- [ ] **Registry**: Flow registered with full step definitions
- [ ] **Auto-start**: Begins on mount (no idle state)
- [ ] **Structured prompts**: JSON examples, word limits, "no markdown" suffix
- [ ] **Status messages**: Rotating messages during AI processing
- [ ] **Error recovery**: Every error offers retry or alternative
- [ ] **Parallel**: Pre-fetching where applicable
- [ ] **Voice**: Triggers defined for all selectable options (C3)
- [ ] **Execution tracking**: `useFlowExecution()` + `trackStep()` on every operation
- [ ] **Observable**: Inspector can see all steps, I/O, tokens, timing
- [ ] **Auth optional**: Works for unauthenticated users (landing flows)
- [ ] **Mobile**: Responsive layout

---

## Reference Implementation

**VideoDiscoveryFlow** (`client/src/components/video-discovery-flow.tsx`):

- 6-step DAG: Research → Pre-fetch (parallel) → Validate → User Picks Topic → User Picks Video → Play
- Parallel video pre-fetching for all topics
- YouTube oEmbed validation
- Rotating status messages
- Full execution tracking via `useFlowExecution()`
- Inspector shows live DAG, step I/O, token usage, cost estimation

---

## Cross-References

- **ARCH-005**: Flow Steel Frame (structural invariants — MUST comply)
- **PER-001**: n8n Architect (background automation — complementary persona)
- **ARCH-001**: System Overview (dual-layer AI architecture)
- **APP-LANDING-001**: Landing Page (conversational canvas, learning modes)

## Changelog

### v2.0.0 (2026-02-07)
- **BREAKING**: Steel frame compliance now mandatory (ARCH-005)
- Added conversational canvas pattern (BilkoMessage, ConversationCanvas, turn types)
- Added TTS via `speak()` — Bilko speaks aloud
- Added execution store contract (`useFlowExecution`, `trackStep`)
- Added Flow Inspector integration section
- Updated architecture diagram to reflect inspector, execution store, and canvas
- Replaced raw `fetch` guidance with `chatJSON<T>()` as preferred LLM interface
- Added "Observable by Default" principle

### v1.0.0 (2026-02-06)
- Initial version
