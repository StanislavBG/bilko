import { syncWorkflowsToN8n } from "./sync";
import { createLogger } from "../logger";

const log = createLogger("n8n");

export async function syncWorkflowsOnStartup(): Promise<void> {
  const result = await syncWorkflowsToN8n();
  
  if (!result.success && result.errors.length > 0) {
    log.error("Some workflows failed to sync", { errors: result.errors });
  }
}
