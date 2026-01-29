# AGENT-003: Workflow Contract

**Version:** 1.0.0  
**Priority:** HIGH  
**Partition:** agent  
**Dependencies:** ARCH-000, ARCH-003, INT-003

## Purpose

Defines the standard interface for all agentic workflows. Workflows conforming to this contract can execute locally (in-app) or remotely (n8n) without code changes.

## Architecture

```
┌─────────────────────────────────────────┐
│         BILKO ORCHESTRATOR              │
│    (proactive dispatch decisions)       │
└─────────────────────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   Workflow Router   │
         │  mode: n8n | local  │
         └──────────┬──────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
 ┌──────▼──────┐         ┌──────▼──────┐
 │   LOCAL     │         │    N8N      │
 │  Executor   │         │   Webhook   │
 │ (in-app JS) │         │  (remote)   │
 └─────────────┘         └─────────────┘
```

## Execution Modes

| Mode | Description | Endpoint |
|------|-------------|----------|
| `local` | Runs in-app via Local Executor | Handler function |
| `n8n` | Runs remotely via n8n webhook | Webhook URL |

## Workflow Registration

All workflows are registered in `/server/workflows/registry.json`:

```json
{
  "workflows": [
    {
      "id": "echo-test",
      "name": "Bilko Echo Test",
      "mode": "n8n",
      "description": "Test connectivity to n8n",
      "endpoint": "N8N_WEBHOOK_ECHO_TEST"
    },
    {
      "id": "rules-audit",
      "name": "Rules Audit",
      "mode": "local",
      "description": "Validate rule structure and coverage",
      "handler": "rulesAudit"
    }
  ]
}
```

## Standard Input Schema

Every workflow receives this payload:

```typescript
interface WorkflowInput {
  action: string;
  payload: Record<string, unknown>;
  context: {
    userId: string;
    traceId: string;
    requestedAt: string; // ISO 8601
    sourceService: string; // "bilko" | "replit:shell" | "n8n"
    attempt: number;
  };
}
```

### Source Service Values

| Value | Description |
|-------|-------------|
| `replit:shell` | User manually triggered from UI |
| `bilko` | Bilko orchestrator triggered proactively |
| `n8n` | n8n workflow calling back |

## Standard Output Schema

Every workflow returns this response:

```typescript
interface WorkflowOutput {
  success: boolean;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  metadata: {
    workflowId: string;
    executionId?: string;
    executedAt: string; // ISO 8601
    durationMs: number;
  };
}
```

## Tracing Integration

All workflow invocations are logged to `communication_traces` (DATA-002):

1. **Before Execution**: Create trace with `overallStatus: "in_progress"`
2. **After Execution**: Update trace with response and `overallStatus: "success" | "failed"`

The trace captures:
- `sourceService` / `destinationService`
- `requestPayload` / `responsePayload`
- `traceId` for correlation
- Timing information

## Local Executor

Local workflows are JavaScript/TypeScript functions that:

1. Accept `WorkflowInput`
2. Perform the workflow logic
3. Return `WorkflowOutput`

```typescript
// Example local workflow handler
async function rulesAudit(input: WorkflowInput): Promise<WorkflowOutput> {
  const startTime = Date.now();
  
  try {
    // Perform audit logic...
    const results = await performRulesAudit(input.payload);
    
    return {
      success: true,
      data: { findings: results },
      metadata: {
        workflowId: "rules-audit",
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "AUDIT_FAILED",
        message: error.message,
        retryable: false,
      },
      metadata: {
        workflowId: "rules-audit",
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  }
}
```

## Workflow Router

The router dispatches to the appropriate executor:

```typescript
async function routeWorkflow(
  workflowId: string,
  input: WorkflowInput
): Promise<WorkflowOutput> {
  const workflow = registry.get(workflowId);
  
  if (workflow.mode === "local") {
    return localExecutor.run(workflow.handler, input);
  } else {
    return n8nExecutor.call(workflow.endpoint, input);
  }
}
```

## Migration Strategy

To migrate a workflow from local to n8n (or vice versa):

1. Implement the equivalent logic in the target environment
2. Update the `mode` in `registry.json`
3. Update the `endpoint` or `handler` field
4. No other code changes needed

## Cross-References

- ARCH-003: Orchestration Layer
- INT-003: Orchestrator Communication Contract
- DATA-002: Communication Trace Storage
- AGENT-002: Auditor protocols (can become local workflows)
