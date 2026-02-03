# Callback Persistence Contract

Rule ID: INT-005
Priority: HIGH
Version: 1.0.0
Partition: integration
Dependencies: INT-003, DATA-002

## Purpose

Defines how n8n workflow callbacks persist execution results (postContent, imagePrompt, imageUrl) for distribution workflows.

## Callback Endpoint

```
POST /api/workflows/callback
```

## Request Payload

```typescript
interface CallbackPayload {
  workflowId: string;       // e.g., "european-football-daily"
  step: string;             // e.g., "extract-articles", "sentiment-analysis", "final-output"
  stepIndex: number;        // Step sequence number (1, 2, 3...)
  traceId: string;          // Correlates all steps in one execution
  executionId?: string;     // n8n's execution ID (external reference)
  status: "success" | "failed" | "pending";
  output?: Record<string, unknown>;  // Step-specific output data
}
```

## Final Output Schema

The `final-output` step MUST include distributable content:

```typescript
interface FinalOutputPayload {
  step: "final-output";
  stepIndex: number;
  traceId: string;
  executionId: string;
  status: "success";
  output: {
    success: true;
    data: {
      postContent: string;    // Facebook post text (required)
      imagePrompt: string;    // Image generation prompt (required)
      imageUrl?: string;      // Generated image URL (optional)
    };
    metadata: {
      workflowId: string;
      executedAt: string;     // ISO 8601
    };
  };
}
```

## Persistence Flow

```
n8n Workflow
    │
    ▼
POST /api/workflows/callback
    │
    ├─► First callback for traceId?
    │   YES → Create workflow_executions record
    │         status: "running"
    │
    ├─► Create communication_traces record
    │   Link to execution via executionId
    │
    └─► step === "final-output"?
        YES → Update workflow_executions:
              - status: "completed"
              - completedAt: now()
              - finalOutput: output (JSONB)
```

## Database Schema

### workflow_executions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| workflowId | VARCHAR | Workflow identifier |
| triggerTraceId | VARCHAR | TraceId from first callback |
| externalExecutionId | VARCHAR | n8n's execution ID |
| status | VARCHAR | pending, running, completed, failed |
| startedAt | TIMESTAMP | Execution start time |
| completedAt | TIMESTAMP | Execution end time |
| finalOutput | JSONB | Final step output data |
| userId | VARCHAR | User who triggered |

### communication_traces

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| executionId | UUID | FK to workflow_executions |
| traceId | VARCHAR | Correlation ID |
| attemptNumber | INTEGER | Step index |
| action | VARCHAR | Step name |
| responsePayload | JSONB | Step output data |
| overallStatus | VARCHAR | success, failed, pending |

## Retrieval Endpoints

### List Executions
```
GET /api/workflows/:workflowId/executions
```

Response:
```json
{
  "executions": [
    {
      "id": "uuid",
      "workflowId": "european-football-daily",
      "status": "completed",
      "startedAt": "2026-01-25T19:19:49.332Z",
      "completedAt": "2026-01-25T19:19:49.352Z",
      "finalOutput": {
        "success": true,
        "data": {
          "postContent": "...",
          "imagePrompt": "..."
        }
      }
    }
  ]
}
```

### Get Execution Detail
```
GET /api/executions/:executionId
```

Response:
```json
{
  "execution": { /* full execution record */ },
  "traces": [ /* all traces for this execution */ ]
}
```

## n8n Workflow Requirements

The n8n workflow MUST:

1. Generate a unique `traceId` at webhook start (e.g., `trace_${executionId}`)
2. Pass `traceId` through all steps
3. Send callback for each major step
4. Send `final-output` callback with complete content:
   - Real `postContent` from Gemini generation
   - Real `imagePrompt` from Gemini generation
   - Optional `imageUrl` if image was generated

## Example n8n Final Callback Code

```javascript
// In n8n Code node before HTTP Request to callback
const finalData = {
  workflowId: "european-football-daily",
  step: "final-output",
  stepIndex: 3,
  traceId: $('Webhook').first().json.body.traceId || `trace_${$execution.id}`,
  executionId: $execution.id,
  status: "success",
  output: {
    success: true,
    data: {
      postContent: items[0].json.postContent,  // From GeneratePost step
      imagePrompt: items[0].json.imagePrompt,  // From GenerateImagePrompt step
      imageUrl: items[0].json.imageUrl || null
    },
    metadata: {
      workflowId: "european-football-daily",
      executedAt: new Date().toISOString()
    }
  }
};

return [{ json: finalData }];
```

## Cross-References

- INT-003: Orchestrator Communication Contract
- DATA-002: Communication Trace Storage
- INT-002: n8n API Practices (User-Agent, data flow)
