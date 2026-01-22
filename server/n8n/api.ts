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
  console.log(`[n8n] Calling POST ${getApiBaseUrl()}/workflows/${workflowId}/activate`);
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/workflows/${workflowId}/activate`,
    { method: "POST", headers },
    API_TIMEOUT
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.log(`[n8n] Activation failed: ${response.status} - ${error}`);
    throw new Error(`Failed to activate workflow: ${response.status} - ${error}`);
  }
  console.log(`[n8n] Workflow ${workflowId} activated successfully`);
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

export async function createEchoTestWorkflow(): Promise<{ workflowId: string; webhookPath: string }> {
  console.log("[n8n] createEchoTestWorkflow: Starting...");
  const workflows = await listWorkflows();
  console.log(`[n8n] Found ${workflows.length} workflows`);
  const existing = workflows.find(w => w.name === "Bilko Echo Test");
  
  if (existing) {
    console.log(`[n8n] Found existing workflow: ${existing.id}, active: ${existing.active}`);
    const fullWorkflow = await getWorkflow(existing.id);
    const webhookNode = fullWorkflow.nodes.find(n => n.type === "n8n-nodes-base.webhook");
    const webhookPath = webhookNode?.parameters?.path as string || "bilko-echo-test";
    console.log(`[n8n] Webhook path: ${webhookPath}, fullWorkflow.active: ${fullWorkflow.active}`);
    
    console.log(`[n8n] Ensuring workflow ${existing.id} is active...`);
    try {
      await activateWorkflow(existing.id);
      console.log(`[n8n] Activation call completed, waiting 3s for webhook to register...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (activationError: any) {
      console.log(`[n8n] Activation error (may already be active): ${activationError.message}`);
    }
    
    return { workflowId: existing.id, webhookPath };
  }

  const webhookPath = "bilko-echo-test";
  
  const workflow = await createWorkflow({
    name: "Bilko Echo Test",
    nodes: [
      {
        id: "webhook-trigger",
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [250, 300],
        parameters: {
          path: webhookPath,
          httpMethod: "POST",
          responseMode: "lastNode",
        },
      },
      {
        id: "respond-node",
        name: "Respond",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1,
        position: [450, 300],
        parameters: {
          respondWith: "json",
          responseBody: '={{ { "echo": $json, "timestamp": $now, "workflowId": "' + webhookPath + '" } }}',
        },
      },
    ],
    connections: {
      "Webhook": {
        main: [[{ node: "Respond", type: "main", index: 0 }]],
      },
    },
  });

  await activateWorkflow(workflow.id);
  
  return { workflowId: workflow.id, webhookPath };
}

export function getWebhookUrl(webhookPath: string): string {
  return `${getWebhookBaseUrl()}/${webhookPath}`;
}

export { WEBHOOK_TIMEOUT };
