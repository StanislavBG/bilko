# INT-N8N-003: n8n Troubleshoot Mode Protocol

**ID**: INT-N8N-003
**Partition**: integration/n8n
**Priority**: HIGH
**Status**: ACTIVE
**Dependencies**: ARCH-000, ARCH-001, INT-003, INT-N8N-002

## Purpose

Define a structured protocol for debugging n8n workflows from Claude.ai (or Claude Code) using communication traces as the observation layer. This enables continuous development where an AI agent can trigger, inspect, validate, and iterate on n8n workflows without manual n8n UI access.

## Architecture

```
┌─────────────┐     trigger      ┌──────────────┐     webhook      ┌─────────────┐
│  Claude.ai  │ ──────────────→  │   Bilko App  │ ──────────────→  │    n8n      │
│  (Claude    │                  │  Orchestrator │                  │  Workflow   │
│   Code)     │  ← read traces   │  Orchestrator │  ← callbacks     │  (TS mode) │
└─────────────┘                  └──────────────┘                  └─────────────┘
      │                                │
      │  1. POST /api/n8n/orchestrate  │
      │  2. GET /api/n8n/traces        │
      │  3. GET /api/n8n/workflows/    │
      │     :id/output                 │
      │  4. GET /api/n8n/executions/   │
      │     :id                        │
      └────────────────────────────────┘
```

## D1: Troubleshoot Workflow Design

Every troubleshoot workflow MUST:

1. **Mirror production steps** — Use identical prompts, Gemini config, and parsing logic from the target workflow
2. **Callback after every step** — Not just milestones. Each Code node and each HTTP Request node gets a sibling callback
3. **Include `_ts` diagnostic metadata** — Every Code node must output a `_ts` field with:
   - `step`: Step name (matches callback `step` field)
   - `timestamp`: ISO 8601
   - Step-specific diagnostics (prompt length, parse errors, data shapes, counts)
4. **Use `ts-` prefix** for callback step names — Distinguishes troubleshoot traces from production traces
5. **End with `final-output`** — Standard callback step name so the execution gets properly completed
6. **Webhook-only trigger** — No schedule trigger (troubleshoot runs are always on-demand)
7. **Respect rate limits** — Keep Wait nodes between Gemini calls per INT-N8N-002 D11

## D2: Callback Diagnostic Schema

Each troubleshoot callback MUST include:

```json
{
  "workflowId": "fvp-troubleshoot",
  "step": "ts-<step-name>",
  "stepIndex": <sequential-number>,
  "traceId": "<correlation-id>",
  "output": {
    // Step-specific diagnostic data
  },
  "executionId": "<n8n-execution-id>",
  "status": "in_progress|success|failed",
  "details": {
    "mode": "troubleshoot",
    "pipeline": "<parent-pipeline-id>",
    "stepName": "ts-<step-name>",
    "timestamp": "<iso-8601>"
  }
}
```

### Diagnostic output per step type:

| Step Type | Required Diagnostics |
|-----------|---------------------|
| Prepare (prompt construction) | `hasApiKey`, `promptLength`, `inputCount`, `requestBodyKeys` |
| Gemini HTTP Request (raw response) | `hasCandidates`, `candidateCount`, `finishReason`, `textPreview` (200 chars), `usageMetadata` |
| Parse (JSON extraction) | `rawTextLength`, `jsonExtracted` (bool), `parseError`, `resultCount`, extracted data |

## D3: Claude.ai Troubleshoot Protocol

### Step 1: Trigger

```bash
# From Claude Code or via curl
POST /api/n8n/orchestrate/fvp-troubleshoot
{
  "action": "execute",
  "payload": {}
}
```

The orchestrator enriches the payload with `geminiApiKey`, `callbackUrl`, and `recentTopics`.

### Step 2: Wait for Execution

The troubleshoot workflow runs asynchronously. Callbacks arrive as communication traces as each step completes. Expected timeline for FVP troubleshoot:

| Step | Callback | ~Time |
|------|----------|-------|
| Prepare News Hound | `ts-prepare-news-hound` | ~2s |
| News Hound (Gemini) | `ts-news-hound-raw` | ~5s |
| Parse Topics | `ts-parse-topics` | ~6s |
| Prepare Deep Diver | `ts-prepare-deep-diver` | ~7s |
| Deep Diver (Gemini) | `ts-deep-diver-raw` | ~25s (15s wait + API) |
| Final Output | `final-output` | ~26s |

### Step 3: Read Results

```bash
# Get the latest output with all troubleshoot steps
GET /api/n8n/workflows/fvp-troubleshoot/output

# Or get full execution traces
GET /api/n8n/executions/<executionId>

# Or list recent traces
GET /api/n8n/traces?limit=10
```

### Step 4: Validate

For each callback trace, check:

1. **ts-prepare-news-hound**: `hasApiKey` is true, `promptLength` > 200
2. **ts-news-hound-raw**: `hasCandidates` is true, `finishReason` is "STOP"
3. **ts-parse-topics**: `jsonExtracted` is true, `parseError` is null, `topicCount` is 3
4. **ts-prepare-deep-diver**: `inputTopicCount` matches `topicCount` from previous step
5. **ts-deep-diver-raw**: `hasCandidates` is true, `finishReason` is "STOP"
6. **final-output**: `stepsCompleted` is 6, `verifiedTopics` array has items

### Step 5: Diagnose Failures

| Symptom | Check | Common Fix |
|---------|-------|-----------|
| `hasApiKey: false` | Orchestrator not enriching payload | Check `GEMINI_API_KEY` env var |
| `hasCandidates: false` | Gemini API returned no candidates | Check API key validity, rate limits |
| `finishReason: "SAFETY"` | Content filtered | Adjust prompt to avoid flagged content |
| `jsonExtracted: false` | Gemini response not valid JSON | Check `textPreview` — may need markdown fence stripping fix |
| `parseError: "..."` | JSON parse failed | Check raw text structure in callback |
| `topicCount: 0` | No topics extracted | Check if Gemini returned empty results |

### Step 6: Iterate

After diagnosis, fix the issue in `client.ts` (node definitions), push to n8n via:

```bash
POST /api/n8n/push/fvp-troubleshoot
```

Then repeat from Step 1.

## D4: Registered Troubleshoot Workflows

| ID | Parent Pipeline | Steps Covered | Category |
|----|----------------|---------------|----------|
| `fvp-troubleshoot` | `football-video-pipeline` | Phase 1 (News Hound) + Phase 2 (Deep Diver) | troubleshoot |

## D5: Trace Integration

Troubleshoot traces are stored as communication traces with:
- **Routing**: `n8n → bilko` (callback direction)
- **Action**: `ts-*` prefix identifies troubleshoot steps
- **Details**: Contains `mode: "troubleshoot"` for filtering
- **Output endpoint**: Returns `troubleshootSteps` array in addition to standard output fields

The output endpoint (`GET /api/n8n/workflows/:id/output`) surfaces troubleshoot steps separately so Claude.ai can read them programmatically without parsing through all traces.

## D6: Creating New Troubleshoot Workflows

To create a troubleshoot workflow for a different pipeline segment:

1. Add entry to `server/workflows/registry.json` with `category: "troubleshoot"`
2. Create builder function `build<Name>TroubleshootNodes()` in `server/n8n/client.ts`
3. Wire into `buildWorkflowNodes()` switch
4. Follow D1 (mirror production steps) and D2 (diagnostic schema)
5. Push to n8n via `POST /api/n8n/push/<workflowId>`
6. Test using D3 protocol
