# European Football Daily Workflow

**n8n ID**: `oV6WGX5uBeTZ9tRa`  
**Webhook Path**: `european-football-daily`  
**Version**: 2.6.1  
**Last Updated**: 2026-02-02

## Objectives

Automated daily European football news aggregation producing two main outputs for Facebook distribution.

### Output 1: AI-Generated Infographic Image

A cinematic, wallpaper-style, epic scenery image that functions as a sports infographic:

- **Visual Style**: Cinematic/wallpaper/epic scenery composition
- **Team Identity**: Features logos of teams or leagues participating in the event
- **Data Overlays**: 1-3 key statistics about the match/event displayed as succinct, readable overlays (max 3 for visual clarity)
- **Infographic Treatment**: Statistics presented clearly within the visual composition
- **Branding**: Black footer bar with "Bilko Bibitkov AI Academy" text (applied via Brand Image node)

### Output 2: Facebook Post

A descriptive post accompanying the infographic:

- **Content**: Describes what the infographic shows, explaining the event and key facts
- **Source Citations**: Numbered references to original sources (objective journalism style)
- **Hashtags**: Relevant to the topic; prefer hashtags mentioned in source material

### Success Criteria

| Criterion | Description |
|-----------|-------------|
| **Deduplication** | Recent topics are filtered using headline normalization and word overlap detection (>50% similarity = duplicate) |
| **Image Quality** | Cinematic composition with team/league identity and clear data overlays |
| **Content Quality** | Objective journalism - no bias, factual reporting with numbered source citations |
| **Hashtag Relevance** | Hashtags directly relate to topic; sourced from original articles when possible |
| **Single Post** | All content in one post (no separate disclaimer post) |

### Key Outputs

| Output | Description |
|--------|-------------|
| `postContent` | Facebook post describing the infographic with numbered source citations |
| `imagePrompt` | AI image generation prompt for cinematic infographic with team logos and stat overlays |
| `eventSummary` | Complete, easy-to-read sentence describing the event facts (displayed on image) |
| `hashtags` | Topic-relevant hashtags, preferably sourced from original articles |

## Key Nodes

### Generate Event Summary

Creates the text overlay for AI-generated infographic images.

**Prompt Guidelines** (v2.6.1):
- **8-13 words** - punchy headline that gives context
- Names teams/players and includes key context
- Leaves detailed numbers for separate stat overlays
- NO generic phrases: "Game On", "Breaking News", "Big Win", "What A Match"

**Good Examples** (8-13 words):
- "Barcelona crush Real Madrid 3-0 in dominant El Clásico victory"
- "Manchester City clinch Premier League title with two games remaining"
- "Mbappé seals record-breaking move to Real Madrid"
- "Liverpool surge to top after thrilling Chelsea win at Anfield"

**Bad Examples** (prohibited):
- "Barcelona defeated Real Madrid 3-0 in El Clásico with Lewandowski scoring twice and the team dominating possession" (too long - 18 words)
- "Game On!" (generic, no facts)
- "Big Match Results" (vague)

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

### Change 3: Update "Build Image Request" for Team Logos and 1-3 Stats

**Node**: `Build Image Request` (id: `gi_body_builder`)  
**Action**: Update stat selection logic and add team logo instruction

**Current Logic** (v2.4.0):
```javascript
// REDUCED from 5 to 3 max overlays for cleaner visual aesthetic
// High dataRichness still gets 2-3 overlays, but never more
const dataRichness = selectedTopic.dataRichness || extractedStats.dataConfidence || 3;
const maxOverlays = Math.min(3, Math.max(1, Math.ceil(dataRichness / 3)));
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
// 3. 1-3 stat overlays (max 3 for visual clarity)
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

### v2.6.1 (2026-02-02)
- **IMPROVEMENT**: Shortened eventSummary headline from 15-25 words to 8-13 words
  - **Problem**: Headlines were too long for infographic overlay, making them hard to read
  - **Solution**: Updated Generate Event Summary prompt to request punchy 8-13 word headlines
  - **Rationale**: Short headline + separate stat overlays = better visual hierarchy
  - **Verified**: Execution #192 produced "English Clubs' Tactical Shift: The Secret Behind Champions League Dominance" (10 words)
- **BACKUP**: Updated `backups/oV6WGX5uBeTZ9tRa.json`

### v2.6.0 (2026-02-02)
- **MAJOR**: Fixed source collection to properly gather 3-5 sources per topic
  - **Problem**: Workflow had a disconnected source collection chain - `Build Search Query`, `Search Related Sources`, `Parse Search Results`, `Collect Sources`, etc. were never connected to the main flow
  - **Root cause**: Main flow went directly from `Aggregate Compliant Topics` → `Fetch Article Content` (single article), bypassing the entire source collection chain
  - **Solution**: Rewired workflow connections:
    - `Aggregate Compliant Topics` → `Build Search Query` (starts source collection)
    - `Merge All Content` → `Prepare Stats Request` (after sources are collected)
  - **Additional fixes**:
    - Added User-Agent and Accept headers to `Search Related Sources` HTTP node (Google News was blocking requests)
    - Fixed `Parse Source Content` to use `$input.all()` for processing all items
    - Fixed `Parse Source Content` to reference `$("Split Sources")` for metadata (HTTP Request node was losing metadata)
    - Fixed `Parse Statistics` null safety for `.trim()` call
    - Removed `URL` constructor usage (not available in n8n Code nodes)
  - **Result**: Posts now include 5 numbered source citations in format `Sources: [1](url) [2](url) ...`
- **VERIFIED**: Execution #190 produced post with 5 source citations
- **BACKUP**: Updated `backups/oV6WGX5uBeTZ9tRa.json`

### v2.5.1 (2026-02-02)
- **IMPROVEMENT**: Smarter pre-filter for Extract Articles node
  - **Problem solved**: v2.5.0 filter was too aggressive and could skip valid headlines like "How did Barcelona beat Madrid 3-0?"
  - **Solution**: Added DATA_SIGNALS whitelist - headlines with these patterns are NEVER skipped:
    - Score patterns: `3-0`, `2:1`
    - Transfer fees: `€180M`, `$50k`
    - Match results: `beat`, `defeated`, `won`, `lost`, `drew`
    - Transfer news: `signs`, `transfer`, `deal`, `fee`
  - **Logic**: Only skip headline if (1) matches generic pattern AND (2) has NO data signals
- **STATUS**: APPLIED to live n8n workflow (2026-02-02T06:11:00.047Z)

### v2.5.0 (2026-02-02)
- **IMPROVEMENT**: Increased article pool and added pre-filtering for data-rich topic selection
  - **Extract Articles node** changes:
    - Increased initial RSS pool from 20 to 50 articles
    - Added pre-filter to skip generic explainer headlines before processing
    - Increased final output from 10 to 20 articles for Topic Analyst
  - **Pre-filter patterns** (skipped before analysis):
    - `How can/does/do/will...` - explainer questions
    - `What is/are/does...` - definitions
    - `Why is/are/does...` - analysis pieces
    - `Competition format` - static content
    - `Explained:`, `Guide:`, `Understanding` - tutorials
    - `Everything you need to know` - generic primers
- **ROOT CAUSE**: Previous executions showed 18/20 topics with dataRichness=1 because RSS feed was dominated by explainer articles, not match results
- **EXPECTED OUTCOME**: Higher probability of data-rich topics (scores, transfer fees) reaching Topic Analyst
- **BACKUP**: Updated `backups/oV6WGX5uBeTZ9tRa.json`

### v2.4.0 (2026-02-02)
- **BUGFIX**: Parse Brand Response was looking for Gemini API format instead of Replit endpoint format
  - Changed from `candidates[0].content.parts` to direct `brandedImageBase64` extraction
  - This was causing the black branding line to never appear on final images
- **IMPROVEMENT**: Reduced max stat overlays from 5 to 3 for cleaner visual aesthetic
  - Changed formula: `Math.min(3, Math.max(1, Math.ceil(dataRichness / 3)))`
  - Prevents visual clutter while still showing key stats
- **DOCUMENTED**: Updated Objectives to reflect 1-3 overlay limit and branding requirement
- **NOTE**: Stats/scores presence is content-dependent - Extract Statistics node extracts from source articles; if source lacks stats, extractedStats will be empty. PER-001 Production Checklist includes diagnostic for this.
- **STATUS**: APPLIED to live n8n workflow (2026-02-02T04:57:59.603Z)
- **BACKUP**: Updated `backups/oV6WGX5uBeTZ9tRa.json`

### v2.3.0 (2026-02-01)
- **PER-001 ANALYSIS**: Added n8n Implementation Changes section with specific node updates
- **STATUS**: APPLIED to live n8n workflow (2026-02-01T22:47:10.229Z)
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
**Backup Date**: 2026-02-02
