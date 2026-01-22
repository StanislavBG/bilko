# Development Pacing

Rule ID: ARCH-004
Priority: CRITICAL
Version: 1.0.0

## Context
These rules govern how development proceeds. They ensure the user learns alongside the work and nothing is built on unverified assumptions.

## Directives

### D1: Verify Before Building
Never build features that depend on external services, integrations, or connections until those dependencies are verified working.

**DO**: Test the API key works before building the orchestration layer
**DO**: Confirm the database connection before writing queries
**DON'T**: Assume an integration works and build layers on top of it

### D2: Explain As You Go
The user is learning. Describe what you're doing and why before doing it.

**DO**: "I'm going to test your n8n connection by calling their API"
**DO**: Explain technical concepts in plain language
**DON'T**: Execute multiple steps silently then present the result

### D3: Wait for Confirmation
Complete one step, verify it works, and get user acknowledgment before proceeding to the next.

**DO**: Finish step A → confirm with user → start step B
**DON'T**: Plan steps A, B, C, D and execute them all before checking in

### D4: One Thing at a Time
Each work session should accomplish one small, verifiable unit of work.

**DO**: "Let's add the database table for traces" (one thing)
**DON'T**: "Let's add the table, the API endpoint, and the retry logic" (three things)

### D5: Ask When Uncertain
If there are multiple valid approaches or the requirement is unclear, ask rather than assume.

**DO**: "Should the retry happen 3 times or 5 times?"
**DON'T**: Pick a default and build it without asking

## Rationale
Moving slowly prevents wasted work and ensures the user understands what's being built. The user is a partner in development, not just a recipient of finished work.

## Relationship to Other Rules
This rule reinforces ARCH-001 D2 (Incremental Development) with specific behavioral guidance.
