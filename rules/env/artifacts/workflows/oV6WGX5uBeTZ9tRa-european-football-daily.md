# European Football Daily Workflow

**n8n ID**: `oV6WGX5uBeTZ9tRa`  
**Webhook Path**: `european-football-daily`  
**Version**: 2.2.0  
**Last Updated**: 2026-02-01

## Objectives

Automated daily European football news aggregation producing two main outputs for Facebook distribution.

### Output 1: AI-Generated Infographic Image

A cinematic, wallpaper-style, epic scenery image that functions as a sports infographic:

- **Visual Style**: Cinematic/wallpaper/epic scenery composition
- **Team Identity**: Features logos of teams or leagues participating in the event
- **Data Overlays**: 1-5 key statistics about the match/event displayed as succinct, readable overlays
- **Infographic Treatment**: Statistics presented clearly within the visual composition

### Output 2: Facebook Post

A descriptive post accompanying the infographic:

- **Content**: Describes what the infographic shows, explaining the event and key facts
- **Source Citations**: Numbered references to original sources (objective journalism style)
- **Branding**: Includes "Bilko Bibitkov AI Academy" branding line (replaces separate disclaimer post)
- **Hashtags**: Relevant to the topic; prefer hashtags mentioned in source material

### Success Criteria

| Criterion | Description |
|-----------|-------------|
| **Deduplication** | Recent topics are filtered using headline normalization and word overlap detection (>50% similarity = duplicate) |
| **Image Quality** | Cinematic composition with team/league identity and clear data overlays |
| **Content Quality** | Objective journalism - no bias, factual reporting with numbered source citations |
| **Hashtag Relevance** | Hashtags directly relate to topic; sourced from original articles when possible |
| **Single Post** | All content in one post with branding line (no separate disclaimer post) |

### Key Outputs

| Output | Description |
|--------|-------------|
| `postContent` | Facebook post describing the infographic with numbered source citations and branding |
| `imagePrompt` | AI image generation prompt for cinematic infographic with team logos and stat overlays |
| `eventSummary` | Complete, easy-to-read sentence describing the event facts (displayed on image) |
| `hashtags` | Topic-relevant hashtags, preferably sourced from original articles |

## Key Nodes

### Generate Event Summary

Creates the text overlay for AI-generated infographic images.

**Prompt Guidelines** (v2.1.0):
- Complete, easy-to-read sentence describing the event facts
- Include all key data: scores, teams, competition, key statistics
- Must be readable as a standalone statement
- NO generic phrases: "Game On", "Breaking News", "Big Win", "What A Match"
- Should inform the viewer of exactly WHAT happened

**Good Examples**:
- "Barcelona defeated Real Madrid 3-0 in El Clásico with Lewandowski scoring twice"
- "Manchester City secured the Premier League title with 2 games remaining after Arsenal dropped points"
- "Kylian Mbappé completes €180M transfer to Real Madrid on a 5-year contract"
- "Liverpool moved top of the table after a 2-1 victory over Chelsea at Anfield"
- "Bayern Munich eliminated Arsenal from Champions League with 3-2 aggregate win"

**Bad Examples** (prohibited):
- "Game On!" (generic, no facts)
- "What A Match!" (generic, no facts)
- "Football Fever" (generic, no facts)
- "Big News Today" (generic, no facts)
- "Barcelona 3-0 Real Madrid" (too short, missing context)

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

### v2.2.0 (2026-02-01)
- **SEPARATED**: Moved workflow JSON to backup file (`backups/oV6WGX5uBeTZ9tRa.json`)
- **CLARIFIED**: n8n instance is source of truth for workflow definition
- Artifact now focuses on objectives, prompts, and success criteria only

### v2.1.0 (2026-02-01)
- **MAJOR**: Rewrote Objectives with two explicit outputs (Infographic Image + Facebook Post)
- **Output 1**: Detailed infographic image requirements (cinematic style, team logos, stat overlays)
- **Output 2**: Facebook post requirements (describes infographic, numbered citations, branding line)
- **Renamed**: "Generate Tagline" → "Generate Event Summary" (complete sentences, not 3-6 words)
- **Expanded**: Good examples now full sentences with context
- **Added**: Success Criteria table with deduplication, image quality, content quality, hashtag relevance
- **Removed**: Separate disclaimer post (now handled by "Bilko Bibitkov AI Academy" branding line)
- **Changed**: `tagline` output → `eventSummary` output

### v2.0.0 (2026-02-01)
- Merged objectives and JSON definition into single artifact file
- Moved from `rules/env/004-efd-workflow.md` to artifacts folder
- Added detailed success criteria and key outputs table

### v1.1.0 (2026-01-31)
- Updated Generate Tagline prompt to produce informative titles with scores/teams instead of generic catchphrases
- Added `hasScore`, `teams`, `event` fields to tagline prompt; prohibited generic phrases

### v1.0.0 (2026-01-25)
- Initial workflow creation

## Workflow Definition

**Source of Truth**: n8n instance at `bilkobibitkov.app.n8n.cloud`

The live workflow definition is always fetched from the n8n instance. Do not maintain workflow JSON in this document.

**Local Backup**: `rules/env/artifacts/workflows/backups/oV6WGX5uBeTZ9tRa.json`  
**Backup Date**: 2026-01-31
