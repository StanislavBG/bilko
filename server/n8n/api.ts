import { createLogger } from "../logger";

const log = createLogger("n8n");
const API_TIMEOUT = 10000;
const WEBHOOK_TIMEOUT = 30000;

function getApiBaseUrl(): string {
  return process.env.N8N_API_BASE_URL || "https://bilkobibitkov.app.n8n.cloud/api/v1";
}

function getWebhookBaseUrl(): string {
  return process.env.N8N_WEBHOOK_BASE_URL || "https://bilkobibitkov.app.n8n.cloud/webhook";
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
}

interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  webhookId?: string;
}

interface CreateWorkflowParams {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
}

async function getHeaders(requestId?: string): Promise<Record<string, string>> {
  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey) {
    throw new Error("N8N_API_KEY is not configured");
  }
  const headers: Record<string, string> = {
    "X-N8N-API-KEY": apiKey,
    "Content-Type": "application/json",
  };
  if (requestId) {
    headers["X-Bilko-Request-Id"] = requestId;
  }
  return headers;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function listWorkflows(): Promise<N8nWorkflow[]> {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/workflows`,
    { headers },
    API_TIMEOUT
  );
  
  if (!response.ok) {
    throw new Error(`Failed to list workflows: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data || [];
}

export async function createWorkflow(params: CreateWorkflowParams): Promise<N8nWorkflow> {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/workflows`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: params.name,
        nodes: params.nodes,
        connections: params.connections,
        settings: { executionOrder: "v1" },
      }),
    },
    API_TIMEOUT
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create workflow: ${response.status} - ${error}`);
  }
  
  return response.json();
}

export async function activateWorkflow(workflowId: string): Promise<void> {
  const headers = await getHeaders();
  log.debug(`Calling POST ${getApiBaseUrl()}/workflows/${workflowId}/activate`);
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/workflows/${workflowId}/activate`,
    { method: "POST", headers },
    API_TIMEOUT
  );
  
  if (!response.ok) {
    const error = await response.text();
    log.warn(`Activation failed: ${response.status} - ${error}`);
    throw new Error(`Failed to activate workflow: ${response.status} - ${error}`);
  }
  log.info(`Workflow ${workflowId} activated successfully`);
}

export async function getWorkflow(workflowId: string): Promise<N8nWorkflow> {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/workflows/${workflowId}`,
    { headers },
    API_TIMEOUT
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get workflow: ${response.status}`);
  }
  
  return response.json();
}

export async function updateWorkflow(workflowId: string, params: { nodes: N8nNode[]; connections: Record<string, unknown> }): Promise<N8nWorkflow> {
  const headers = await getHeaders();
  log.debug(`Updating workflow ${workflowId}...`);
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/workflows/${workflowId}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        nodes: params.nodes,
        connections: params.connections,
        settings: { executionOrder: "v1" },
      }),
    },
    API_TIMEOUT
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update workflow: ${response.status} - ${error}`);
  }
  
  log.info(`Workflow ${workflowId} updated successfully`);
  return response.json();
}

export function getWebhookUrl(webhookPath: string): string {
  return `${getWebhookBaseUrl()}/${webhookPath}`;
}

export { WEBHOOK_TIMEOUT };
