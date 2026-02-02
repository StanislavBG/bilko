import { createN8nClient, type N8nExecution } from "./client";
import { orchestratorStorage } from "../orchestrator/storage";
import { createLogger } from "../logger";

const log = createLogger("execution-monitor");

interface ExecutionReport {
  status: "success" | "error" | "running" | "timeout";
  executionId?: string;
  n8nExecutionId?: string;
  lastNodeExecuted?: string;
  errorMessage?: string;
  errorNode?: string;
  durationMs?: number;
  startedAt?: string;
  stoppedAt?: string;
}

export async function pollExecutionStatus(
  n8nWorkflowId: string,
  traceId: string,
  executionId: string,
  triggerTime: Date,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    timeoutMs?: number;
  } = {}
): Promise<ExecutionReport> {
  const { maxAttempts = 10, intervalMs = 3000, timeoutMs = 60000 } = options;
  
  const client = createN8nClient();
  if (!client) {
    log.warn("n8n client not available for execution monitoring");
    const report: ExecutionReport = { status: "error", errorMessage: "n8n client not configured" };
    await updateTraceWithReport(traceId, executionId, report);
    return report;
  }

  const startTime = Date.now();
  const triggerTimeMs = triggerTime.getTime();
  let attempts = 0;
  let matchedExecution: N8nExecution | null = null;

  log.debug(`Starting execution monitor for trace ${traceId}, triggered at ${triggerTime.toISOString()}`);

  while (attempts < maxAttempts && (Date.now() - startTime) < timeoutMs) {
    attempts++;
    
    try {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      
      const executions = await client.getRecentExecutions(n8nWorkflowId, 5);
      
      if (executions.length === 0) {
        log.debug(`No executions found yet (attempt ${attempts})`);
        continue;
      }

      const candidateExecution = executions.find(exec => {
        const execStartTime = new Date(exec.startedAt).getTime();
        return Math.abs(execStartTime - triggerTimeMs) < 10000;
      });
      
      if (!candidateExecution) {
        log.debug(`No matching execution found for trigger time (attempt ${attempts})`);
        continue;
      }

      matchedExecution = candidateExecution;
      
      if (candidateExecution.finished) {
        const report = buildReport(candidateExecution);
        log.info(`Execution finished: ${report.status}`, { 
          n8nExecutionId: candidateExecution.id,
          lastNode: report.lastNodeExecuted 
        });
        
        await updateTraceWithReport(traceId, executionId, report);
        return report;
      }
      
      log.debug(`Execution ${candidateExecution.id} still running (attempt ${attempts})`);
      
    } catch (error) {
      log.error(`Error polling execution (attempt ${attempts})`, error);
    }
  }

  if (matchedExecution && !matchedExecution.finished) {
    const report: ExecutionReport = {
      status: "running",
      n8nExecutionId: matchedExecution.id,
      lastNodeExecuted: matchedExecution.data?.resultData?.lastNodeExecuted,
      startedAt: matchedExecution.startedAt,
      errorMessage: "Execution still running after polling timeout",
    };
    await updateTraceWithReport(traceId, executionId, report);
    return report;
  }

  const timeoutReport: ExecutionReport = { 
    status: "timeout", 
    errorMessage: `Execution status check timed out after ${attempts} attempts. No matching execution found.`
  };
  await updateTraceWithReport(traceId, executionId, timeoutReport);
  return timeoutReport;
}

export async function checkAndUpdateFailedExecutions(
  n8nWorkflowId: string
): Promise<number> {
  const client = createN8nClient();
  if (!client) {
    return 0;
  }

  try {
    const recentExecutions = await client.getRecentExecutions(n8nWorkflowId, 10);
    const failedExecutions = recentExecutions.filter(e => e.status === "error");
    
    let updatedCount = 0;
    
    for (const execution of failedExecutions) {
      const report = buildReport(execution);
      
      const runningExecutions = await orchestratorStorage.getRunningExecutions(n8nWorkflowId);
      
      for (const runningExec of runningExecutions) {
        const execStartTime = new Date(runningExec.startedAt || 0).getTime();
        const n8nStartTime = new Date(execution.startedAt).getTime();
        
        if (Math.abs(execStartTime - n8nStartTime) < 5000) {
          await orchestratorStorage.updateExecution(runningExec.id, {
            status: "failed",
            completedAt: execution.stoppedAt ? new Date(execution.stoppedAt) : new Date(),
            externalExecutionId: execution.id,
          });
          
          if (runningExec.triggerTraceId) {
            await updateTraceWithReport(runningExec.triggerTraceId, runningExec.id, report);
          }
          
          updatedCount++;
          log.info(`Updated failed execution ${runningExec.id} with n8n execution ${execution.id}`);
        }
      }
    }
    
    return updatedCount;
  } catch (error) {
    log.error("Error checking failed executions", error);
    return 0;
  }
}

function buildReport(execution: N8nExecution): ExecutionReport {
  const errorData = execution.data?.resultData?.error;
  
  const report: ExecutionReport = {
    status: execution.status === "success" ? "success" : "error",
    n8nExecutionId: execution.id,
    lastNodeExecuted: execution.data?.resultData?.lastNodeExecuted,
    startedAt: execution.startedAt,
    stoppedAt: execution.stoppedAt,
  };

  if (execution.startedAt && execution.stoppedAt) {
    report.durationMs = new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime();
  }

  if (errorData) {
    report.errorMessage = errorData.message;
    report.errorNode = errorData.node?.name;
  }

  return report;
}

async function updateTraceWithReport(
  traceId: string,
  executionId: string,
  report: ExecutionReport
): Promise<void> {
  try {
    const traces = await orchestratorStorage.getTracesByTraceId(traceId);
    
    let overallStatus: "success" | "failed" | "in_progress";
    let errorCode: string | null = null;
    let errorDetail: string | null = null;
    
    switch (report.status) {
      case "success":
        overallStatus = "success";
        break;
      case "error":
        overallStatus = "failed";
        errorCode = "N8N_EXECUTION_FAILED";
        errorDetail = report.errorNode 
          ? `Failed at node "${report.errorNode}": ${report.errorMessage || 'Unknown error'}`
          : report.errorMessage || "Workflow execution failed";
        break;
      case "running":
        overallStatus = "in_progress";
        errorDetail = report.errorMessage || "Workflow still running after monitoring timeout";
        break;
      case "timeout":
        overallStatus = "failed";
        errorCode = "N8N_MONITORING_TIMEOUT";
        errorDetail = report.errorMessage || "Unable to determine execution status";
        break;
      default:
        overallStatus = "failed";
        errorCode = "N8N_UNKNOWN_STATUS";
        errorDetail = `Unknown status: ${report.status}`;
    }
    
    for (const trace of traces) {
      await orchestratorStorage.updateTrace(trace.id, {
        overallStatus,
        respondedAt: report.stoppedAt ? new Date(report.stoppedAt) : new Date(),
        durationMs: report.durationMs,
        n8nExecutionId: report.n8nExecutionId,
        errorCode,
        errorDetail,
      });
    }

    let executionStatus: "completed" | "failed" | "running";
    if (report.status === "success") {
      executionStatus = "completed";
    } else if (report.status === "running") {
      executionStatus = "running";
    } else {
      executionStatus = "failed";
    }

    await orchestratorStorage.updateExecution(executionId, {
      status: executionStatus,
      completedAt: report.status !== "running" ? (report.stoppedAt ? new Date(report.stoppedAt) : new Date()) : undefined,
      externalExecutionId: report.n8nExecutionId,
    });
    
  } catch (error) {
    log.error("Failed to update trace with execution report", error);
  }
}

export async function getExecutionReport(n8nExecutionId: string): Promise<ExecutionReport | null> {
  const client = createN8nClient();
  if (!client) {
    return null;
  }

  try {
    const execution = await client.getExecution(n8nExecutionId);
    return buildReport(execution);
  } catch (error) {
    log.error(`Failed to get execution ${n8nExecutionId}`, error);
    return null;
  }
}
