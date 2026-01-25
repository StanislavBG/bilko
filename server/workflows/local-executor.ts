import type { WorkflowInput, WorkflowOutput, LocalWorkflowHandler } from "./types";

const handlers: Record<string, LocalWorkflowHandler> = {};

export function registerHandler(name: string, handler: LocalWorkflowHandler): void {
  handlers[name] = handler;
}

export async function executeLocal(
  handlerName: string,
  input: WorkflowInput
): Promise<WorkflowOutput> {
  const handler = handlers[handlerName];
  
  if (!handler) {
    return {
      success: false,
      error: {
        code: "HANDLER_NOT_FOUND",
        message: `Local handler '${handlerName}' is not registered`,
        retryable: false,
      },
      metadata: {
        workflowId: input.action,
        executedAt: new Date().toISOString(),
        durationMs: 0,
      },
    };
  }

  try {
    return await handler(input);
  } catch (error) {
    return {
      success: false,
      error: {
        code: "EXECUTION_ERROR",
        message: error instanceof Error ? error.message : String(error),
        retryable: false,
      },
      metadata: {
        workflowId: input.action,
        executedAt: new Date().toISOString(),
        durationMs: 0,
      },
    };
  }
}

export function getRegisteredHandlers(): string[] {
  return Object.keys(handlers);
}
