const webhookUrlCache = new Map<string, string>();

export function setWebhookUrl(workflowId: string, url: string): void {
  webhookUrlCache.set(workflowId, url);
  console.log(`[webhook-cache] Cached URL for ${workflowId}: ${url}`);
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
