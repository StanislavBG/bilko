import { createLogger } from "../logger";

const log = createLogger("webhook-cache");
const webhookUrlCache = new Map<string, string>();

export function setWebhookUrl(workflowId: string, url: string): void {
  webhookUrlCache.set(workflowId, url);
  log.debug(`Cached URL for ${workflowId}: ${url}`);
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
