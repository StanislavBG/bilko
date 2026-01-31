# ENV-004: European Football Daily Workflow

**Priority**: HIGH  
**Version**: 1.1.0  
**Last Updated**: 2026-01-31

## Purpose

Documents the European Football Daily (EFD) n8n workflow structure, node purposes, and prompt guidelines.

## Workflow ID

- **n8n ID**: `oV6WGX5uBeTZ9tRa`
- **Webhook Path**: `european-football-daily`
- **Registry Entry**: ENV-002

## Key Nodes

### Generate Tagline

Creates the text overlay for AI-generated images.

**Prompt Guidelines** (v1.1.0):
- 3-6 words maximum
- If headline contains a score, INCLUDE the score (e.g., "Barcelona 3-0 Madrid")
- If headline contains numbers (transfer fees, points, goals), include them
- Prioritize team names and factual information
- NO generic phrases: "Game On", "Breaking News", "Big Win", "What A Match"
- Should inform the viewer of WHAT happened, not just generate excitement

**Good Examples**:
- "Barcelona 3-0 Real Madrid"
- "Man City Clinches Title"
- "£80M Transfer Complete"
- "Liverpool Top After Win"

**Bad Examples** (prohibited):
- "Game On!"
- "What A Match!"
- "Football Fever"
- "Big News Today"

### Topic Analyst

Extracts structured data from news headlines:
- `hasScore`: Boolean - true if headline contains match score
- `hasNumbers`: Boolean - true if contains transfer fees, goals, points
- `teams`: Array of team names mentioned
- `event`: Brief event description
- `dataRichness`: Score 1-10 prioritizing headlines with actual data

### Aggregate Compliant Topics

Selects the best topic based on:
1. Compliance (safe for image generation)
2. Data richness (scores > generic news)
3. Brand value (major clubs/leagues)

## Changelog

### v1.1.0 (2026-01-31)
- **Updated**: Generate Tagline prompt to produce informative titles with scores/teams instead of generic catchphrases
- **Rationale**: User preference for descriptive titles that inform viewers of actual news substance vs. open-ended bait
- **Implementation**: Added `hasScore`, `teams`, `event` fields to tagline prompt; prohibited generic phrases

### v1.0.0 (2026-01-25)
- Initial workflow creation

## Cross-References

- ENV-001: Environments
- ENV-002: Workflow Registry
- AGT-001: n8n Development Workflow
