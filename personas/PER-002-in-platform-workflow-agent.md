# In-Platform Workflow Agent Persona

Rule ID: PER-002
Priority: HIGH
Version: 1.0.0
Type: Persona

## Purpose

Defines the expert persona for building agentic, user-facing workflows that run directly on the Bilko platform using the in-platform LLM service (Gemini). This persona builds real-time, interactive AI experiences — not background automation.

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

## Architecture

### System Boundaries

```
┌─────────────────────────────────────────────────────────┐
│  Client (React)                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Agentic Flow Component                          │   │
│  │  - Multi-step state machine (FlowState)          │   │
│  │  - Parallel data pre-fetching                    │   │
│  │  - Error recovery & retry                        │   │
│  │  - Voice command integration                     │   │
│  │  - Progressive UI (status messages, progress)    │   │
│  └─────────────┬───────────────────────────────────┘   │
│                │ POST /api/llm/chat                      │
│                │ POST /api/llm/validate-videos            │
│                ▼                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Server: LLM Service                             │   │
│  │  - OpenAI-compatible client → Gemini API         │   │
│  │  - JSON response cleaning                        │   │
│  │  - Model registry                                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### LLM Service Contract

**Endpoint**: `POST /api/llm/chat`

```typescript
// Request
{
  model: "gemini-2.5-flash",  // Default model (free tier)
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "..." }
  ],
  temperature?: number,  // Default: 0.7
  maxTokens?: number     // Default: 8192
}

// Response
{
  content: string,       // Cleaned (markdown fences stripped, JSON extracted)
  model: string,
  usage?: { promptTokens, completionTokens, totalTokens }
}
```

**Key**: The server-side `cleanLLMResponse()` automatically strips markdown fences and extracts JSON objects. Frontend can `JSON.parse(data.content)` directly.

---

## Core Principles

| Principle | Description |
|---|---|
| **User-First Latency** | Every interaction should feel instant. Pre-fetch data, show progress, never block the UI. |
| **Structured Output** | Always request JSON from the LLM. Use explicit format examples in system prompts. Keep field constraints tight (word limits, counts). |
| **Graceful Degradation** | If an LLM call fails, the UI should offer retry, fallback, or alternative — never a dead end. |
| **Progressive Disclosure** | Show what's happening at each step. Rotating status messages, progress indicators, and contextual details build trust with new users. |
| **Parallel When Possible** | Fire independent LLM calls concurrently. Cache results. Don't make users wait for sequential requests when parallel is viable. |

---

## Agentic Flow Pattern

Every user-facing agentic flow follows this pattern:

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
- Error state always offers recovery (Try Again, Pick Another, etc.)

### 2. System Prompt Engineering

For structured JSON output from Gemini:

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
- Keep prompts under 500 tokens for fast responses

### 3. UX During AI Work

When the AI is processing, show:

```typescript
// Rotating status messages (cycle every 3s)
const STATUS_MESSAGES = [
  "Scanning...",
  "Analyzing...",
  "Preparing...",
];

// Progress indicator (animated bar or spinner)
// Contextual detail about what the agent is doing
// Icon that matches the current phase
```

**Never** show a blank loading screen. Users should understand what the AI agent is doing.

### 4. Error Handling

```typescript
try {
  const response = await fetch("/api/llm/chat", { ... });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Request failed");
  }
  const data = await response.json();
  const parsed = JSON.parse(data.content);
  // Use parsed data
} catch (err) {
  // Set error state with user-friendly message
  // Offer recovery action
}
```

### 5. Pre-fetching & Caching

For flows where the user will choose from options:

```typescript
// After getting topics, fire video searches for ALL topics in parallel
topics.forEach(topic => searchVideosForTopic(topic));

// Cache results by key
const videoCache = useRef<Record<string, VideoResult[]>>({});
const cacheStatus = useRef<Record<string, "loading" | "done" | "error">>({});
```

This way, when the user picks a topic, videos are already loaded.

---

## Voice Integration

Agentic flows should support voice commands via the global header voice system:

- Voice recognition hook (`useVoiceRecognition`) matches spoken words to trigger options
- Voice preference persists to `localStorage` (`bilko-voice-enabled`)
- Auto-enables on revisit if previously used
- Voice button lives in the GlobalHeader, next to brand name

### Adding Voice to a New Flow

1. Define `voiceTriggers` for each selectable option
2. Pass options to `useVoiceRecognition({ options, onMatch })`
3. Pass voice state to `GlobalHeader` via `voice` prop

---

## Model Selection

| Model | Use Case | Cost |
|---|---|---|
| `gemini-2.5-flash` | Default for all flows | Free tier |

**Future**: When flows need higher reasoning (complex analysis, creative tasks), add `gemini-2.5-pro` to the model registry. Keep `gemini-2.5-flash` as default for speed.

---

## Development Checklist

Before shipping a new agentic flow:

- [ ] Auto-starts on mount (no idle state)
- [ ] Every LLM prompt requests structured JSON with explicit examples
- [ ] Word/count limits on every text field in the prompt
- [ ] Rotating status messages during AI processing
- [ ] Error state with recovery action (never a dead end)
- [ ] Parallel pre-fetching where applicable
- [ ] Voice triggers defined for selectable options
- [ ] Works for unauthenticated users (landing page flows)
- [ ] Mobile-responsive layout

---

## Reference Implementation

**VideoDiscoveryFlow** (`client/src/components/video-discovery-flow.tsx`) is the canonical example:

- 3-step flow: Research → Select Topic → Choose Video
- Parallel video pre-fetching for all topics after research completes
- Video validation via YouTube oEmbed endpoint
- Rotating status messages during AI phases
- Cache with status tracking (`loading` / `done` / `error`)
- Full error recovery at every step

---

## Cross-References

- **PER-001**: n8n Architect (background automation — complementary persona)
- **ARCH-001**: System Overview (updated to reflect dual-layer AI architecture)
- **APP-LANDING-001**: Landing Page (updated to reflect agentic experience)

## Changelog

### v1.0.0 (2026-02-06)
- Initial version
- Defines in-platform agentic flow architecture
- Documents LLM service contract, flow state pattern, UX guidelines
- Establishes boundary with PER-001 (n8n) for background vs user-facing AI
- Reference implementation: VideoDiscoveryFlow
