# Landing Page — Agentic Discovery Experience

Rule ID: APP-LANDING-001
Priority: HIGH
Version: 2.0.0

## Context

The landing page is the public entry point and the primary user experience. It serves both unauthenticated visitors and returning users with an AI-powered, voice-enabled discovery flow.

## Directives

### D1: Agentic Experience
The landing page is an interactive, AI-driven experience — not a static auth gateway. It helps users discover how they want to learn through multiple modes:

- **Watch a Video** — AI-powered video discovery (VideoDiscoveryFlow)
- **Challenge Mode** — Interactive knowledge quiz
- **Try a Prompt** — Hands-on LLM prompting (PromptPlayground)
- **Explore the Academy** — Browse learning tracks
- **Chat with AI Tutor** — Conversational AI guidance
- **Quick Start Guide** — 3-step onboarding

### D2: Voice-First Navigation
Voice commands are central to the experience:

- Voice button in the GlobalHeader, next to brand name
- Supports spoken triggers for all learning modes ("video", "quiz", "chat", etc.)
- Auto-enables on revisit via `localStorage` (`bilko-voice-enabled`)
- Works alongside click/tap navigation

### D3: Auto-Start AI Flows
When a user selects a mode that involves AI (video discovery, chat), the flow begins immediately — no idle screens or "Start" buttons. Show progress from the first moment.

### D4: Progressive UX
During AI processing, always show:
- Rotating status messages explaining what the agent is doing
- Progress indicators (animated bars, spinners)
- Contextual icons matching the current phase

### D5: Authentication Optional
The landing page works for unauthenticated users. Sign-in is available but not required to explore. All AI features work without auth.

### D6: Theme Support
Dark mode toggle available in the header.

## Architecture

The landing page uses the **in-platform workflow pattern** (PER-002), not n8n:

- LLM calls go to `POST /api/llm/chat` (Gemini via OpenAI-compatible endpoint)
- React state manages multi-step flow progression
- Voice recognition via Web Speech API + `useVoiceRecognition` hook

See PER-002 (In-Platform Workflow Agent) for the full agentic flow pattern.

## Cross-References

- PER-002: In-Platform Workflow Agent (agentic flow pattern)
- UI-005: Minimal Design Principles (visual style)

## Changelog

### v2.0.0 (2026-02-06)
- Complete rewrite: landing page is now an agentic discovery experience
- Added 6 learning modes with voice navigation
- Replaced "minimal auth gateway" with interactive AI flows
- Added auto-start, progressive UX, and voice-first directives
- Documented in-platform architecture (PER-002, not n8n)

### v1.0.0
- Initial: minimal authentication gateway
