# n8n Development Workflow

Rule ID: AGT-001
Priority: CRITICAL
Version: 1.0.0
Type: Agentic Workflow

## Purpose

This is an executable protocol for agents developing n8n workflows. Any agent (Replit, local, future) follows this step-by-step when creating or modifying n8n workflows.

**Core Principle**: Move slowly, verify each step, single change per cycle.

## Prerequisites

Before starting this workflow:
- [ ] N8N_API_KEY secret is available
- [ ] N8N_API_BASE_URL is configured
- [ ] Workflow ID is known (for modifications) or will be created (for new)

## Workflow Phases

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  FETCH  │ -> │ ANALYZE │ -> │ MODIFY  │ -> │  PUSH   │ -> │ BACKUP  │ -> │ VERIFY  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼              ▼
 CHECKPOINT    CHECKPOINT    CHECKPOINT    CHECKPOINT    CHECKPOINT    CHECKPOINT
```

---

## PHASE 1: FETCH

**Objective**: Capture the current state of the workflow from n8n.

### Actions

1. **GET workflow from n8n API**
   ```bash
   curl -s -X GET \
     -H "X-N8N-API-KEY: $N8N_API_KEY" \
     "$N8N_API_BASE_URL/workflows/{id}"
   ```

2. **Save to temporary working file**
   ```
   /tmp/n8n-work/{workflow-id}-current.json
   ```

3. **Extract key information**
   - Node names and types
   - Connection map
   - Current settings

4. **Handle missing nodes** (API limitation)
   - n8n GET /workflows/{id} may omit node definitions in some cases (see INT-002 ISSUE-004)
   - If nodes array is empty/missing, fall back to `server/workflows/backups/{id}.json` or registry

### Output Artifacts

- `currentWorkflow`: Full workflow JSON object
- `nodeList`: Array of node names
- `connectionMap`: Node connection summary

### Checkpoint Gate

```
CHECKPOINT 1: FETCH complete
├── Current workflow saved to temp file: [path]
├── Nodes found: [count]
├── Connections found: [count]
└── Proceed to ANALYZE? [PAUSE if deliberate mode]
```

**Agent MUST produce written summary before proceeding.**

---

## PHASE 2: ANALYZE

**Objective**: Understand current state and identify exactly what needs to change.

### Actions

1. **Identify target nodes** for modification
2. **Document current behavior** of target nodes
3. **Define expected behavior** after change
4. **Identify dependencies** - what other nodes are affected?

### Output Artifacts

- `changeTarget`: Specific node(s) to modify
- `currentBehavior`: What the node does now
- `expectedBehavior`: What the node should do after
- `impactedNodes`: Other nodes that receive data from target

### Analysis Template

```markdown
## Change Analysis

**Target Node**: [name]
**Current Code/Config**: 
[paste relevant portion]

**Problem Identified**:
[specific issue]

**Proposed Fix**:
[specific change]

**Downstream Impact**:
[nodes that receive data from this node]
```

### Checkpoint Gate

```
CHECKPOINT 2: ANALYZE complete
├── Target node identified: [name]
├── Problem: [one-line summary]
├── Proposed fix: [one-line summary]
├── Impact assessment: [low/medium/high]
└── Proceed to MODIFY? [PAUSE if deliberate mode]
```

**Agent MUST produce written analysis before proceeding.**

---

## PHASE 3: MODIFY

**Objective**: Apply a single, targeted change to the workflow definition.

### Rules

1. **ONE change per cycle** - never batch multiple fixes
2. **Minimal diff** - change only what's necessary
3. **Preserve structure** - don't reorganize unrelated nodes

### Actions

1. **Load current workflow** from temp file
2. **Apply single change** to target node
3. **Save modified workflow** to new temp file
4. **Generate diff** showing exactly what changed

### Output Artifacts

- `updatedWorkflow`: Modified workflow JSON
- `diff`: Exact change made (before/after)

### Diff Template

```markdown
## Modification Diff

**Node**: [name]
**File**: /tmp/n8n-work/{id}-modified.json

**Before**:
```javascript
[old code]
```

**After**:
```javascript
[new code]
```
```

### Checkpoint Gate

```
CHECKPOINT 3: MODIFY complete
├── Change applied to: [node name]
├── Lines changed: [count]
├── Diff reviewed: [yes/no]
└── Proceed to PUSH? [PAUSE if deliberate mode]
```

**Agent MUST show diff before proceeding.**

---

## PHASE 4: PUSH

**Objective**: Update the workflow in n8n via API.

### Actions

1. **Prepare update payload**
   ```javascript
   {
     name: workflow.name,
     nodes: workflow.nodes,
     connections: workflow.connections,
     settings: workflow.settings,  // REQUIRED: Always include even if unchanged (INT-002 ISSUE-003)
     staticData: workflow.staticData
   }
   ```
   
   **CRITICAL**: The `settings` property is required by n8n API even for updates that don't modify settings. Omitting it causes 400 errors.

2. **PUT to n8n API**
   ```bash
   curl -s -X PUT \
     -H "X-N8N-API-KEY: $N8N_API_KEY" \
     -H "Content-Type: application/json" \
     -d @/tmp/n8n-work/{id}-modified.json \
     "$N8N_API_BASE_URL/workflows/{id}"
   ```

3. **Verify response**
   - Check `updatedAt` timestamp changed
   - Confirm no error in response

### Output Artifacts

- `pushResult`: API response summary
- `updatedAt`: New timestamp from n8n

### Checkpoint Gate

```
CHECKPOINT 4: PUSH complete
├── API response: [success/error]
├── Updated at: [timestamp]
├── Workflow active: [true/false]
└── Proceed to BACKUP? [PAUSE if deliberate mode]
```

---

## PHASE 5: BACKUP

**Objective**: Persist the workflow definition to codebase for version control.

### Actions

1. **Save to backup location**
   ```
   server/workflows/backups/{n8n-id}.json
   ```

2. **Add metadata header**
   ```json
   {
     "_backup_meta": {
       "backedUpAt": "2026-01-25T20:00:00Z",
       "changeDescription": "Fixed Gemini JSON parsing",
       "n8nId": "oV6WGX5uBeTZ9tRa"
     },
     "name": "...",
     "nodes": [...],
     ...
   }
   ```

### Output Artifacts

- `backupPath`: Location of saved file
- `backupMeta`: Metadata about this backup

### Checkpoint Gate

```
CHECKPOINT 5: BACKUP complete
├── Saved to: [path]
├── Change description: [summary]
└── Proceed to VERIFY? [PAUSE if deliberate mode]
```

---

## PHASE 6: VERIFY

**Objective**: Confirm the change works as expected.

### Actions

1. **Trigger workflow** with test payload
2. **Check execution result** (webhook response or callback)
3. **Query traces** for detailed inspection if needed
4. **Confirm expected behavior** matches actual

### Verification Methods

**Method A: Direct Response** (for sync workflows)
```bash
curl -X POST "https://...webhook/{path}" \
  -H "Content-Type: application/json" \
  -d '{"testKey": "testValue"}'
```

**Method B: Callback Inspection** (for async workflows)
```sql
SELECT * FROM communication_traces 
WHERE trace_id = '{traceId}' 
ORDER BY requested_at DESC;
```

**Method C: Debug Instrumentation** (for complex issues)
See Sub-Protocol: Debug Instrumentation below.

### Output Artifacts

- `verifyResult`: Pass/Fail
- `actualOutput`: What the workflow returned
- `matchesExpected`: Boolean comparison

### Checkpoint Gate

```
CHECKPOINT 6: VERIFY complete
├── Test triggered: [yes/no]
├── Result: [PASS/FAIL]
├── Actual output: [summary]
├── Expected output: [summary]
└── CYCLE COMPLETE or LOOP BACK to ANALYZE
```

---

## Sub-Protocol: Debug Instrumentation

When VERIFY fails or behavior is unclear, use this sub-protocol.

### When to Use

- VERIFY returned unexpected results
- Need to inspect intermediate data between nodes
- Root cause is not obvious from final output

### Actions

1. **Add temporary debug callback node** after target node
   ```javascript
   // Debug callback node configuration
   {
     name: "Debug {NodeName}",
     type: "n8n-nodes-base.httpRequest",
     parameters: {
       method: "POST",
       url: "{callbackUrl}/api/workflows/callback",
       sendBody: true,
       specifyBody: "json",
       jsonBody: `={
         "workflowId": "{workflowId}",
         "step": "debug-{nodeName}",
         "output": {{ JSON.stringify($input.first().json) }}
       }`
     }
   }
   ```

2. **Connect debug node** in parallel to existing flow (doesn't interrupt main flow)

3. **Trigger workflow**

4. **Query debug trace**
   ```sql
   SELECT action, response_payload 
   FROM communication_traces 
   WHERE action = 'debug-{nodeName}'
   ORDER BY requested_at DESC LIMIT 1;
   ```

5. **Analyze intermediate data**

6. **Remove debug node** after issue resolved
   - **IMPORTANT**: Always remove debug nodes before final PUSH
   - Debug callbacks left in production create noise in traces and potential data leaks

### Debug Data Capture Template

```markdown
## Debug Capture: {nodeName}

**Captured Data**:
```json
{paste from trace}
```

**Observations**:
- [what the data shows]

**Root Cause**:
- [identified issue]

**Fix Required**:
- [specific change needed]
```

---

## Execution Modes

### Deliberate Mode (Default for Complex Changes)

- Agent PAUSES at each checkpoint
- Agent produces written artifacts before proceeding
- Agent asks for confirmation at gates (or self-confirms with explicit statement)

### Continuous Mode (For Simple, Known Fixes)

- Agent proceeds through all phases without pausing
- Agent still produces all artifacts
- Agent logs checkpoint completion inline

### Mode Selection

Use **Deliberate Mode** when:
- First time modifying a workflow
- Root cause is unclear
- Multiple potential issues
- Previous fix attempt failed

Use **Continuous Mode** when:
- Applying known, tested pattern
- Simple configuration change
- Following documented fix from INT-002

---

## Loop Protocol

If VERIFY fails:

```
VERIFY FAILED
├── Document: What went wrong
├── Preserve: Debug data captured
├── Loop back to: PHASE 2 (ANALYZE)
├── Constraint: Different hypothesis required
└── Max loops: 3 (then escalate to human)
```

After 3 failed cycles, agent must:
1. Document all attempts
2. Summarize findings
3. Request human assistance with specific questions

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────────┐
│                 n8n DEVELOPMENT CYCLE                      │
├────────────────────────────────────────────────────────────┤
│ 1. FETCH    │ GET from n8n, save to temp                   │
│ 2. ANALYZE  │ Identify target, document current/expected   │
│ 3. MODIFY   │ ONE change only, show diff                   │
│ 4. PUSH     │ PUT to n8n, verify response                  │
│ 5. BACKUP   │ Save to codebase with metadata               │
│ 6. VERIFY   │ Test, confirm expected output                │
├────────────────────────────────────────────────────────────┤
│ IF FAIL:    │ Loop to ANALYZE (max 3x), then escalate      │
│ DEBUG:      │ Add temp callback, capture data, remove      │
└────────────────────────────────────────────────────────────┘
```

## Rationale

This workflow exists because:
1. **Assumption-free development**: Always work with actual deployed state
2. **Single-change discipline**: Isolates cause and effect
3. **Audit trail**: Every change is documented and backed up
4. **Pacing**: Prevents rushed, cascading fixes that compound problems
5. **Agent-agnostic**: Any agent can follow this protocol

## Related Rules

- INT-002: n8n API Best Practices
- INT-005: Callback Persistence Contract
- ARCH-000-B: Headless Operation
