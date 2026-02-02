import { createLogger } from "../logger";

const log = createLogger("webhook-cache");
const webhookUrlCache = new Map<string, string>();
const n8nWorkflowIdCache = new Map<string, string>();

export function setWebhookUrl(workflowId: string, url: string): void {
  webhookUrlCache.set(workflowId, url);
  log.debug(`Cached URL for ${workflowId}: ${url}`);
}

export function setN8nWorkflowId(localWorkflowId: string, n8nId: string): void {
  n8nWorkflowIdCache.set(localWorkflowId, n8nId);
  log.debug(`Cached n8n ID for ${localWorkflowId}: ${n8nId}`);
}

export function getN8nWorkflowId(localWorkflowId: string): string | undefined {
  return n8nWorkflowIdCache.get(localWorkflowId);
}

export function getWebhookUrl(workflowId: string): string | undefined {
  return webhookUrlCache.get(workflowId);
}

export function getAllWebhookUrls(): Record<string, string> {
  const result: Record<string, string> = {};
  webhookUrlCache.forEach((url, id) => {
    result[id] = url;
  });
  return result;
}

export function clearWebhookCache(): void {
  webhookUrlCache.clear();
}
