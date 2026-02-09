# Conversation Experience — Multi-Agent Chat Canvas

Rule ID: APP-CHAT-001
Priority: HIGH
Version: 1.0.0

## Purpose

Defines the structural and behavioral contract for the main conversation component — the chat canvas where users interact with Bilko and specialist agents. This rule exists to prevent hallucinated UI, enforce speaker clarity, and lock down the conversational experience as a clean, focused flow.

This is the most important user-facing surface. Every deviation from these directives creates confusion about who is speaking, what step the user is on, and what is happening.

---

## Scope

Applies to:
- The `ConversationCanvas` component and all turn renderers
- All agent turns (Bilko, sub-agents, user)
- Voice input/output (STT, TTS)
- The `VoiceStatusBar` and mic behavior
- Agent speaker identity (badges, labels, borders)

Does NOT apply to:
- Flow Inspector (DAG visualization — separate UI)
- Content block internals (governed by ARCH-006)
- n8n workflow pages (governed by APP-WORKFLOWS-001)

---

## Directives

### D1: The Conversation Is a Flow

The chat canvas renders an executing flow. It is not a freeform chat window. Every conversation follows a defined flow with steps.

- The active flow's steps are the backbone of the conversation
- Each step maps to one or more conversation turns
- The user can see which step they are on and what comes next
- Flow progression is visible — never hidden
- DO: Show flow step indicators so the user knows where they are
- DON'T: Present the conversation as an open-ended chat with no structure

### D2: Speaker Attribution Is Mandatory

Every message must clearly identify who is speaking. There are three speaker classes:

| Speaker | Identity Signal | Style |
|---------|-----------------|-------|
| **Bilko** (host) | Full-width, bold text, no frame | Primary voice — the host |
| **Sub-agent** (specialist) | Named badge + left border accent + surface tint | Specialist voice — labeled by name |
| **User** | Right-aligned bubble | User's own input |

- Every agent turn MUST display the agent's display name in a visible badge
- Consecutive messages from the same speaker collapse redundant headers
- System handoff messages MUST show who is handing off to whom
- DO: Always label sub-agent messages with `agentDisplayName`
- DON'T: Show agent messages without attribution — the user must never wonder "who said this?"

### D3: Small, Readable Text — No Oversized Typography

The conversation canvas is a reading surface, not a billboard.

- Message text uses standard body size — no giant headlines inside the chat
- Bilko's greeting on the landing page may use larger type (hero context), but once inside a flow conversation, text is compact and readable
- Agent messages, user messages, and system messages all use proportional, modest sizing
- DO: Keep message text at body/lead scale (base to lg)
- DON'T: Use 3xl/4xl/5xl headings inside active conversation turns
- DON'T: Let content blocks inflate message size — content renders at its own appropriate scale within the turn

### D4: No Widgets Inside the Conversation

The conversation canvas renders typed content blocks and text turns. It does not embed arbitrary widgets, dashboards, or interactive tools inline.

- Content blocks (ARCH-006) are the vocabulary — video, quiz, steps, code, etc.
- The `widget` block type exists as an escape hatch but should be used sparingly
- No floating panels, toolbars, settings forms, or navigation elements inside the chat flow
- DO: Use content blocks for structured content
- DON'T: Embed settings panels, dashboards, image editors, or complex interactive widgets inside conversation turns
- DON'T: Turn the conversation into a widget container — it is a reading and speaking surface

### D5: Multiple Agents, Multiple Voices

The conversation supports multiple specialist agents, each with a distinct identity and voice.

- Each agent defined in `FLOW_AGENTS` has: `name`, `chatName`, `personality`, `accentColor`, and a TTS voice assignment
- When an agent takes the floor, their identity badge, border color, and voice change
- Bilko is the host — always introduces and hands off to agents
- Agents do not speak over each other; floor control is sequential
- Handoff between agents is explicit (system turn with from/to)
- DO: Give each agent a visually and audibly distinct identity
- DON'T: Have multiple agents share the same voice
- DON'T: Switch agents silently — always show a handoff

### D6: Per-Agent Voice Assignment

Every agent MUST have a distinct TTS voice. Voice is part of an agent's identity, not a global setting.

Agent voice configuration:

```typescript
interface FlowAgent {
  name: string;
  chatName: string;
  personality: string;
  greeting: string;
  greetingSpeech?: string;
  accentColor: string;
  voice: string;            // TTS voice ID (e.g., "onyx", "nova", "alloy", "echo", "fable", "shimmer")
}
```

- Bilko's default voice: configurable (default `"onyx"`)
- Each sub-agent gets a different voice from the available TTS voice pool
- The system MUST NOT use the same voice for two different agents in the same conversation
- Voice mapping is stored in the agent definition, not hardcoded in the TTS call

### D7: Microphone Default On

Voice is central to the experience. The microphone should default to **on** for returning users.

- First visit: Mic is off (browser requires user gesture for permission)
- After user grants permission and enables mic: persist `bilko-voice-enabled = true`
- On subsequent visits: Auto-start listening when the page loads (if permission was previously granted)
- The mic auto-mutes during TTS playback (echo cancellation) and resumes after
- The `VoiceStatusBar` is always visible when voice is active, showing conversation state
- DO: Default to mic-on for returning users who previously enabled it
- DO: Show clear visual feedback of mic state (listening, muted, speaking)
- DON'T: Require users to re-enable the mic on every visit
- DON'T: Start the mic without prior user consent (respect browser permission model)

### D8: Voice Configuration in User Settings

Users must be able to configure voice preferences. This is not hardcoded.

Required settings:
- **Bilko's voice**: Select from available TTS voices (default: `"onyx"`)
- **Agent voices**: Override default voice assignments per agent
- **TTS speed**: Playback speed adjustment (0.75x — 1.5x, default 1.0x)
- **Auto-listen**: Toggle mic auto-start on page load (default: on after first grant)
- **Silence timeout**: How long to wait after user stops speaking before processing (default: 1500ms)

Storage:
- Voice preferences stored in `localStorage` under `bilko-voice-settings`
- Settings UI accessible from the global header (gear icon or dedicated voice settings)
- Changes apply immediately — no page reload required

```typescript
interface VoiceSettings {
  bilkoVoice: string;                    // Default TTS voice for Bilko
  agentVoiceOverrides: Record<string, string>;  // chatName → voice ID
  ttsSpeed: number;                      // 0.75 to 1.5
  autoListen: boolean;                   // Auto-start mic on load
  silenceTimeout: number;                // ms before processing silence
}
```

### D9: Flow Step Visibility

The user must always know where they are in a flow.

- Show the current step name or phase label
- Show progress through the flow (e.g., step 2 of 5, or a progress bar)
- When an agent is working (LLM call in progress), show what step is executing
- When a step completes, visually mark it as done before advancing
- DO: Surface flow structure to the user — they are not in an open-ended chat
- DON'T: Hide the flow structure behind the conversation — the flow IS the conversation

---

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Do This Instead |
|---|---|---|
| Unlabeled agent messages | User can't tell who is speaking | Always show agent badge with display name |
| Giant text in chat turns | Conversation becomes unreadable, feels like a presentation | Use body-scale text; reserve large type for landing hero only |
| Widgets embedded in chat | Breaks the conversational flow, confuses the reading surface | Use content blocks (ARCH-006) for structured data |
| Same voice for all agents | Agents become indistinguishable by ear | Assign unique TTS voice per agent |
| Hardcoded voice settings | Users can't customize their experience | Store in localStorage, expose in settings UI |
| Hidden flow progression | User doesn't know where they are or what's next | Show step indicators and progress |
| Mic off by default for returning users | Voice-first experience requires mic to be ready | Auto-start mic if previously granted |
| Silent agent handoffs | User doesn't know a different specialist took over | Show explicit handoff system turn |

---

## Architecture

The conversation canvas uses the **in-platform workflow pattern** (PER-002):

```
Flow Definition (ARCH-005)
  │
  ▼
Flow Execution Engine
  │
  ├── Step → Agent assigned (from FLOW_AGENTS)
  │     │
  │     ├── LLM call via chatJSON<T>()
  │     ├── Agent produces AgentContentResult (ARCH-006)
  │     └── Result → ConversationTurn[] → Canvas renders
  │
  ├── Bilko narrates between steps (host role)
  │
  ├── User input (voice or click)
  │     ├── STT → transcript → voice handler matching
  │     └── Click → option selection → flow advancement
  │
  └── VoiceContext manages floor control
        ├── Mic muted during TTS
        ├── Agent voice selected from FlowAgent.voice
        └── Settings applied from VoiceSettings
```

---

## Cross-References

- ARCH-005: Flow Steel Frame (flow structure invariants)
- ARCH-006: Content Block System (block vocabulary, Bilko persona)
- APP-LANDING-001: Landing Page (initial greeting, mode selection)
- PER-002: In-Platform Workflow Agent (agentic flow pattern)
- UI-005: Minimal Design Principles (text sizing, clean aesthetic)

---

## Changelog

### v1.0.0 (2026-02-09)
- Initial rule defining conversation experience contract
- Speaker attribution requirements (D1-D2)
- Text sizing constraints (D3)
- No-widgets policy (D4)
- Multi-agent voice system (D5-D6)
- Microphone default behavior (D7)
- Voice settings configuration (D8)
- Flow step visibility (D9)
