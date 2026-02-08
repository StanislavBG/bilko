import type { WorkflowDefinition } from "../workflows/types";
import { getCallbackUrl } from "../lib/utils";
import { createLogger } from "../logger";

const log = createLogger("n8n");

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes?: N8nNode[];
  connections?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  staticData?: Record<string, unknown>;
  tags?: { id: string; name: string }[];
}

export interface N8nNode {
  id?: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

export interface N8nCreateWorkflowRequest {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  staticData?: Record<string, unknown>;
}

export interface N8nListResponse {
  data: N8nWorkflow[];
  nextCursor?: string | null;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  status: "error" | "success" | "running" | "waiting" | "unknown";
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  data?: {
    resultData?: {
      error?: {
        message: string;
        name?: string;
        node?: { name: string };
      };
      lastNodeExecuted?: string;
    };
  };
}

export interface N8nExecutionListResponse {
  data: N8nExecution[];
  nextCursor?: string | null;
}

export interface N8nApiError {
  code: string;
  message: string;
  hint?: string;
}

export class N8nClientError extends Error {
  code: string;
  retryable: boolean;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "N8nClientError";
    this.code = code;
    this.retryable = retryable;
  }
}

function generateRequestId(): string {
  return `n8n_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function mapN8nError(status: number, rawMessage: string): { code: string; message: string; retryable: boolean } {
  const statusMap: Record<number, { code: string; message: string; retryable: boolean }> = {
    400: { code: "N8N_BAD_REQUEST", message: "Invalid request to n8n", retryable: false },
    401: { code: "N8N_UNAUTHORIZED", message: "n8n authentication failed", retryable: false },
    403: { code: "N8N_FORBIDDEN", message: "n8n access denied", retryable: false },
    404: { code: "N8N_NOT_FOUND", message: "Workflow not found in n8n", retryable: false },
    429: { code: "N8N_RATE_LIMITED", message: "n8n rate limit exceeded", retryable: true },
    500: { code: "N8N_SERVER_ERROR", message: "n8n server error", retryable: true },
    502: { code: "N8N_BAD_GATEWAY", message: "n8n service unavailable", retryable: true },
    503: { code: "N8N_UNAVAILABLE", message: "n8n service unavailable", retryable: true },
  };

  const mapped = statusMap[status] || { 
    code: "N8N_ERROR", 
    message: "n8n operation failed", 
    retryable: status >= 500 
  };

  log.error(`API error: ${status} - ${rawMessage}`);
  return mapped;
}

export class N8nClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(timeoutMs = 10000) {
    const baseUrl = process.env.N8N_API_BASE_URL;
    const apiKey = process.env.N8N_API_KEY;

    if (!baseUrl) {
      throw new Error("N8N_API_BASE_URL environment variable is not set");
    }
    if (!apiKey) {
      throw new Error("N8N_API_KEY secret is not set");
    }

    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const requestId = generateRequestId();
    
    const headers: Record<string, string> = {
      "X-N8N-API-KEY": this.apiKey,
      "Accept": "application/json",
      "X-Bilko-Request-Id": requestId,
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    log.debug(`${method} ${path} (request: ${requestId})`);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        let rawMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json() as N8nApiError;
          rawMessage = errorData.message || rawMessage;
        } catch {
          rawMessage = await response.text() || rawMessage;
        }
        
        const mapped = mapN8nError(response.status, rawMessage);
        throw new N8nClientError(mapped.code, mapped.message, mapped.retryable);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeout);
      
      if (error instanceof N8nClientError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === "AbortError") {
        throw new N8nClientError("N8N_TIMEOUT", "n8n request timed out", true);
      }
      
      throw new N8nClientError(
        "N8N_NETWORK_ERROR",
        "Failed to connect to n8n",
        true
      );
    }
  }

  async listWorkflows(): Promise<N8nWorkflow[]> {
    const response = await this.request<N8nListResponse>("GET", "/workflows");
    return response.data;
  }

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>("GET", `/workflows/${id}`);
  }

  async createWorkflow(workflow: N8nCreateWorkflowRequest): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>("POST", "/workflows", workflow);
  }

  async updateWorkflow(
    id: string,
    workflow: Partial<N8nCreateWorkflowRequest>
  ): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>("PUT", `/workflows/${id}`, workflow);
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.request<void>("DELETE", `/workflows/${id}`);
  }

  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>("POST", `/workflows/${id}/activate`);
  }

  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>("POST", `/workflows/${id}/deactivate`);
  }

  async findWorkflowByName(name: string): Promise<N8nWorkflow | undefined> {
    const workflows = await this.listWorkflows();
    return workflows.find((w) => w.name === name);
  }

  async getRecentExecutions(workflowId: string, limit = 5): Promise<N8nExecution[]> {
    const response = await this.request<N8nExecutionListResponse>(
      "GET",
      `/executions?workflowId=${workflowId}&limit=${limit}`
    );
    return response.data;
  }

  async getExecution(executionId: string): Promise<N8nExecution> {
    return this.request<N8nExecution>("GET", `/executions/${executionId}`);
  }

  async getMostRecentExecution(workflowId: string): Promise<N8nExecution | null> {
    const executions = await this.getRecentExecutions(workflowId, 1);
    return executions.length > 0 ? executions[0] : null;
  }
}

export function createN8nClient(): N8nClient | null {
  try {
    return new N8nClient();
  } catch (error) {
    log.warn("n8n client not configured", error);
    return null;
  }
}

export function buildWorkflowNodes(
  definition: WorkflowDefinition
): { nodes: N8nNode[]; connections: Record<string, unknown> } {
  if (definition.id === "echo-test") {
    return buildEchoTestNodes(definition.webhookPath || "bilko-echo-test");
  }
  if (definition.id === "european-football-daily") {
    return buildEuropeanFootballDailyNodes(definition.webhookPath || "european-football-daily");
  }
  
  return { nodes: [], connections: {} };
}

function buildEchoTestNodes(webhookPath: string): {
  nodes: N8nNode[];
  connections: Record<string, unknown>;
} {
  const nodes: N8nNode[] = [
    {
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1,
      position: [0, 0],
      parameters: {
        path: webhookPath,
        httpMethod: "POST",
        responseMode: "responseNode"
      }
    },
    {
      name: "Build Response",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [250, 0],
      parameters: {
        jsCode: `const input = $input.first().json;
const output = {
  success: true,
  data: {
    echo: input,
    receivedAt: new Date().toISOString(),
    message: "Hello from n8n! Your message was received."
  },
  metadata: {
    workflowId: "echo-test",
    executedAt: new Date().toISOString(),
    durationMs: 0
  }
};
return [{ json: output }];`
      }
    },
    {
      name: "Respond to Webhook",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1,
      position: [500, 0],
      parameters: {
        respondWith: "json",
        responseBody: "={{ $json }}"
      }
    }
  ];

  const connections: Record<string, unknown> = {
    "Webhook": {
      main: [[{ node: "Build Response", type: "main", index: 0 }]]
    },
    "Build Response": {
      main: [[{ node: "Respond to Webhook", type: "main", index: 0 }]]
    }
  };

  return { nodes, connections };
}

function buildEuropeanFootballDailyNodes(webhookPath: string): {
  nodes: N8nNode[];
  connections: Record<string, unknown>;
} {
  const callbackUrl = getCallbackUrl();
  
  const nodes: N8nNode[] = [
    {
      name: "Schedule Trigger",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1,
      position: [0, 0],
      parameters: {
        rule: {
          interval: [{ field: "cronExpression", expression: "0 0 * * *" }]
        }
      }
    },
    {
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1,
      position: [0, 200],
      parameters: {
        path: webhookPath,
        httpMethod: "POST",
        responseMode: "responseNode"
      }
    },
    {
      name: "Merge Triggers",
      type: "n8n-nodes-base.merge",
      typeVersion: 2,
      position: [250, 100],
      parameters: {
        mode: "append"
      }
    },
    {
      name: "Fetch RSS",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [500, 100],
      parameters: {
        url: "https://news.google.com/rss/search?q=european+football+champions+league+OR+premier+league+OR+la+liga+OR+bundesliga+OR+serie+a&hl=en-US&gl=US&ceid=US:en",
        method: "GET"
      }
    },
    {
      name: "Parse XML",
      type: "n8n-nodes-base.xml",
      typeVersion: 1,
      position: [750, 100],
      parameters: {
        operation: "xmlToJson"
      }
    },
    {
      name: "Extract Articles",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1000, 100],
      parameters: {
        jsCode: `const rss = $input.first().json;
const items = rss?.rss?.channel?.[0]?.item || [];
const articles = items.slice(0, 10).map(item => ({
  title: item.title?.[0] || '',
  link: item.link?.[0] || '',
  source: item.source?.[0]?._ || 'Unknown',
  pubDate: item.pubDate?.[0] || ''
}));
return articles.map(a => ({ json: a }));`
      }
    },
    {
      name: "Callback Articles",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [1100, 250],
      parameters: {
        url: callbackUrl,
        method: "POST",
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={
  "workflowId": "european-football-daily",
  "step": "extract-articles",
  "stepIndex": 1,
  "traceId": "{{ $('Webhook').first().json.traceId || $('Merge Triggers').first().json.traceId || 'trace_' + $execution.id }}",
  "output": {
    "articles": {{ JSON.stringify($input.all().map(i => i.json)) }},
    "count": {{ $input.all().length }}
  },
  "executionId": "{{ $execution.id }}"
}`
      }
    },
    {
      name: "Gemini Sentiment",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [1250, 100],
      parameters: {
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        method: "POST",
        sendHeaders: true,
        headerParameters: {
          parameters: [{ name: "Content-Type", value: "application/json" }]
        },
        sendQuery: true,
        queryParameters: {
          parameters: [{ name: "key", value: "={{ $env.GEMINI_API_KEY }}" }]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={
  "contents": [{
    "parts": [{
      "text": "Analyze these football news headlines and identify which one represents the most positive, cheerful, or celebratory event. Score each from 1-10 for positivity and explain briefly. Return JSON with format: { \\"articles\\": [{ \\"title\\": \\"...\\", \\"score\\": N, \\"reason\\": \\"...\\" }], \\"winner\\": { \\"title\\": \\"...\\", \\"score\\": N, \\"reason\\": \\"...\\", \\"index\\": N } }. Headlines: {{ JSON.stringify($input.all().map(i => i.json.title)) }}"
    }]
  }]
}`
      }
    },
    {
      name: "Parse Sentiment",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1500, 100],
      parameters: {
        jsCode: `const response = $input.first().json;
const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { winner: null };
return [{ json: parsed }];`
      }
    },
    {
      name: "Callback Sentiment",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [1600, 250],
      parameters: {
        url: callbackUrl,
        method: "POST",
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={
  "workflowId": "european-football-daily",
  "step": "sentiment-analysis",
  "stepIndex": 2,
  "traceId": "{{ $('Webhook').first().json.traceId || $('Merge Triggers').first().json.traceId || 'trace_' + $execution.id }}",
  "output": {{ JSON.stringify($input.first().json) }},
  "executionId": "{{ $execution.id }}"
}`
      }
    },
    {
      name: "Generate Post",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [1750, 100],
      parameters: {
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        method: "POST",
        sendHeaders: true,
        headerParameters: {
          parameters: [{ name: "Content-Type", value: "application/json" }]
        },
        sendQuery: true,
        queryParameters: {
          parameters: [{ name: "key", value: "={{ $env.GEMINI_API_KEY }}" }]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={
  "contents": [{
    "parts": [{
      "text": "Write an engaging Facebook post about this football news: {{ $input.first().json.winner?.title || 'Football news today' }}. Reason it's positive: {{ $input.first().json.winner?.reason || 'Great news' }}. Make it enthusiastic but professional, include relevant hashtags, and keep it under 280 characters. Return JSON: { \\"postContent\\": \\"...\\" }"
    }]
  }]
}`
      }
    },
    {
      name: "Parse Post",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [2000, 100],
      parameters: {
        jsCode: `const response = $input.first().json;
const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { postContent: null };
return [{ json: parsed }];`
      }
    },
    {
      name: "Generate Image",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [2250, 100],
      parameters: {
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        method: "POST",
        sendHeaders: true,
        headerParameters: {
          parameters: [{ name: "Content-Type", value: "application/json" }]
        },
        sendQuery: true,
        queryParameters: {
          parameters: [{ name: "key", value: "={{ $env.GEMINI_API_KEY }}" }]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={
  "contents": [{
    "parts": [{
      "text": "Generate a detailed image prompt for a football-themed social media image about: {{ $input.first().json.postContent }}. The image should be vibrant, celebratory, and suitable for Facebook. Return JSON: { \\"imagePrompt\\": \\"...\\" }"
    }]
  }]
}`
      }
    },
    {
      name: "Parse Image Prompt",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [2500, 100],
      parameters: {
        jsCode: `const response = $input.first().json;
const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { imagePrompt: null };
return [{ json: parsed }];`
      }
    },
    {
      name: "Build Final Output",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [2750, 100],
      parameters: {
        jsCode: `// Gather all outputs from the workflow
const imagePrompt = $input.first().json;
const postContent = $('Parse Post').first().json.postContent || 'Football news update!';

const output = {
  success: true,
  data: {
    postContent: postContent,
    imagePrompt: imagePrompt.imagePrompt || 'European football celebration',
    imageUrl: null // Placeholder - real image gen would go here
  },
  metadata: {
    workflowId: "european-football-daily",
    executedAt: new Date().toISOString()
  }
};
return [{ json: output }];`
      }
    },
    {
      name: "Callback Final",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [3000, 100],
      parameters: {
        url: callbackUrl,
        method: "POST",
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={
  "workflowId": "european-football-daily",
  "step": "final-output",
  "stepIndex": 3,
  "traceId": "{{ $('Webhook').first().json.traceId || $('Merge Triggers').first().json.traceId || 'trace_' + $execution.id }}",
  "output": {{ JSON.stringify($input.first().json) }},
  "executionId": "{{ $execution.id }}"
}`
      }
    },
    {
      name: "Respond to Webhook",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1,
      position: [3250, 200],
      parameters: {
        respondWith: "json",
        responseBody: "={{ $('Build Final Output').first().json }}"
      }
    }
  ];

  const connections: Record<string, unknown> = {
    "Schedule Trigger": {
      main: [[{ node: "Merge Triggers", type: "main", index: 0 }]]
    },
    "Webhook": {
      main: [[{ node: "Merge Triggers", type: "main", index: 1 }]]
    },
    "Merge Triggers": {
      main: [[{ node: "Fetch RSS", type: "main", index: 0 }]]
    },
    "Fetch RSS": {
      main: [[{ node: "Parse XML", type: "main", index: 0 }]]
    },
    "Parse XML": {
      main: [[{ node: "Extract Articles", type: "main", index: 0 }]]
    },
    "Extract Articles": {
      main: [
        [{ node: "Callback Articles", type: "main", index: 0 }],
        [{ node: "Gemini Sentiment", type: "main", index: 0 }]
      ]
    },
    "Callback Articles": {
      main: []
    },
    "Gemini Sentiment": {
      main: [[{ node: "Parse Sentiment", type: "main", index: 0 }]]
    },
    "Parse Sentiment": {
      main: [
        [{ node: "Callback Sentiment", type: "main", index: 0 }],
        [{ node: "Generate Post", type: "main", index: 0 }]
      ]
    },
    "Callback Sentiment": {
      main: []
    },
    "Generate Post": {
      main: [[{ node: "Parse Post", type: "main", index: 0 }]]
    },
    "Parse Post": {
      main: [[{ node: "Generate Image", type: "main", index: 0 }]]
    },
    "Generate Image": {
      main: [[{ node: "Parse Image Prompt", type: "main", index: 0 }]]
    },
    "Parse Image Prompt": {
      main: [[{ node: "Build Final Output", type: "main", index: 0 }]]
    },
    "Build Final Output": {
      main: [[{ node: "Callback Final", type: "main", index: 0 }]]
    },
    "Callback Final": {
      main: [[{ node: "Respond to Webhook", type: "main", index: 0 }]]
    }
  };

  return { nodes, connections };
}
