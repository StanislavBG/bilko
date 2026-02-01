# European Football Daily Workflow

**n8n ID**: `oV6WGX5uBeTZ9tRa`  
**Webhook Path**: `european-football-daily`  
**Version**: 2.3.0  
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

---

## n8n Implementation Changes (v2.3.0)

The following changes must be applied to the live n8n workflow to align with v2.2.0 objectives.

### Implementation Protocol (PER-001 Single-Change Discipline)

Apply changes ONE AT A TIME in this order, with webhook test after each:

| Step | Change | Verification |
|------|--------|--------------|
| 1 | Rename node + update prompt (Change 1) | Webhook returns `eventSummary` as complete sentence |
| 2 | Rename field in all downstream nodes (Change 2) | No `tagline` references remain |
| 3 | Update stat overlay logic (Change 3) | Overlay count varies with dataRichness |
| 4 | Add team logo instruction (Change 3 continued) | Image prompt includes logo instruction |
| 5 | Update Call Imagen API body (Change 4) | Image text overlay uses eventSummary |

After each step: Save workflow → Test via webhook → Verify output → Proceed to next.

### Change 1: Rename "Generate Tagline" → "Generate Event Summary"

**Node**: `Generate Tagline` (id: `tagline-gen-1769390960853`)  
**Action**: Rename node and update prompt

**Current Prompt** (INCORRECT):
```
Create a SHORT, DATA-FOCUSED tagline for a sports infographic.
...
1. Is 3-6 words maximum
2. MUST include the most important number/stat
3. Is punchy and impactful
4. Works as a headline overlay
```

**New Prompt** (CORRECT):
```
Create a complete, informative EVENT SUMMARY sentence for a sports infographic overlay.

TOPIC: {{ $json.selectedTopic?.headline }}
SCORE: {{ $json.extractedStats?.score || 'N/A' }}
TEAMS: {{ $json.selectedTopic?.teams?.join(' vs ') || 'N/A' }}
COMPETITION: {{ $json.selectedTopic?.competition || 'European Football' }}
TRANSFER FEE: {{ $json.extractedStats?.transferFee || 'N/A' }}
LEAGUE POSITION: {{ $json.extractedStats?.leaguePosition || 'N/A' }}
POINTS: {{ $json.extractedStats?.points || 'N/A' }}

Create an event summary that:
1. Is a COMPLETE SENTENCE (15-25 words)
2. Includes ALL key facts: teams, scores, competition, context
3. Is informative and readable as a standalone statement
4. NO generic phrases: "Game On", "What A Match", "Breaking News"

GOOD EXAMPLES:
- "Barcelona defeated Real Madrid 3-0 in El Clásico with Lewandowski scoring twice"
- "Manchester City secured the Premier League title with 2 games remaining"
- "Kylian Mbappé completes €180M transfer to Real Madrid on a 5-year contract"

BAD EXAMPLES (PROHIBITED):
- "2-1 Victory!" (too short, no context)
- "Game On!" (generic, no facts)
- "Top of the Table" (vague, no teams)

Return ONLY JSON: { "eventSummary": "your complete sentence here" }
```

### Change 2: Rename Field `tagline` → `eventSummary`

**Affected Nodes**:
- `Parse Tagline` → rename to `Parse Event Summary`
- `Call Imagen API` → change `{{ $json.tagline }}` to `{{ $json.eventSummary }}`
- `Parse Imagen Response` → change `tagline:` to `eventSummary:`
- `Parse Brand Response` → change `tagline:` to `eventSummary:`
- `Build Final Output` → change all `tagline` references to `eventSummary`

### Change 3: Update "Build Image Request" for Team Logos and 1-5 Stats

**Node**: `Build Image Request` (id: `gi_body_builder`)  
**Action**: Update stat selection logic and add team logo instruction

**Current Logic** (INCORRECT):
```javascript
// Limit to MAX 2 overlay elements for clean aesthetic
const selectedStats = statPriority.slice(0, 2);
```

**New Logic** (CORRECT):
```javascript
// Allow 1-5 stat overlays based on data richness
// dataRichness is from Topic Analyst (selectedTopic), not extractedStats
const dataRichness = selectedTopic.dataRichness || extractedStats.dataConfidence || 3;
const maxOverlays = Math.min(5, Math.max(1, Math.ceil(dataRichness / 2)));
const selectedStats = statPriority.slice(0, maxOverlays);
```

**Add to Image Prompt Generation**:
```javascript
// Build team logo instruction
const teamLogos = teams.length > 0
  ? `Include stylized logos or emblems representing: ${teams.join(', ')}.`
  : 'Include relevant league/competition branding.';

// Image prompt must include:
// 1. Cinematic/wallpaper style
// 2. Team/league logos
// 3. 1-5 stat overlays
const imagePromptInstructions = `
Create a cinematic, wallpaper-style sports infographic.
${teamLogos}
Display ${selectedStats.length} key statistics as clean, readable overlays.
Stats to display: ${selectedStats.map(s => s.display).join(', ')}.
Style: Epic scenery, dramatic lighting, professional sports broadcast quality.
`;
```

### Change 4: Update "Call Imagen API" Body

**Node**: `Call Imagen API` (id: `74affa50-0102-49a6-8190-3e24f1ec0a2e`)  
**Action**: Update JSON body to use `eventSummary` instead of `tagline`

**Current Body** (INCORRECT):
```json
"text": "{{ $json.imagePrompt }}. Include bold stylized text overlay on the image saying: {{ $json.tagline }}"
```

**New Body** (CORRECT):
```json
"text": "{{ $json.imagePrompt }}. Include bold stylized text overlay on the image saying: {{ $json.eventSummary }}"
```

---

## Changelog

### v2.3.0 (2026-02-01)
- **PER-001 ANALYSIS**: Added n8n Implementation Changes section with specific node updates
- **STATUS**: Documentation complete; changes pending application to live n8n workflow
- **PROTOCOL**: Added single-change discipline table (5 steps with verification)
- **Change 1**: Generate Tagline → Generate Event Summary (complete sentences, 15-25 words)
- **Change 2**: Renamed `tagline` field → `eventSummary` across all nodes
- **Change 3**: Updated Build Image Request for 1-5 stat overlays (was hardcoded to 2)
- **Change 4**: Added team/league logo instruction to image prompt
- **FIX**: Corrected dataRichness source (from selectedTopic, not extractedStats)
- **NOTE**: Branding happens on the image itself via Brand Image node, not in post text

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
