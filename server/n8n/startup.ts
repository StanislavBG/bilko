import { syncWorkflowsToN8n } from "./sync";

export async function syncWorkflowsOnStartup(): Promise<void> {
  const result = await syncWorkflowsToN8n();
  
  if (!result.success && result.errors.length > 0) {
    console.error("[n8n] Some workflows failed to sync:", result.errors);
  }
}
