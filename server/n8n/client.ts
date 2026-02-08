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
  if (definition.id === "football-video-pipeline") {
    return buildFootballVideoPipelineNodes(definition.webhookPath || "football-video-pipeline");
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

/**
 * Football Video Pipeline — Research, curation, and video content generation.
 *
 * Flow:
 *   Schedule/Webhook → News Hound (Gemini search) → Parse Topics
 *   → Prepare Deep Diver → Deep Diver (Gemini verify) → Parse Verified
 *   → Wait → Prepare Journalist → Journalist (Gemini summarize) → Parse Summaries
 *   → Wait → Prepare Video Architect → Video Architect (Gemini script) → Parse Script
 *   → Wait → Prepare Image Stylist → Image Stylist (Gemini prompts) → Parse Image Prompts
 *   → Build Final Output → Callback Final → Respond to Webhook
 *
 * Follows INT-002 directives: D10 (header auth), D11 (rate limits / Wait nodes),
 * D12 (custom User-Agent), D13 (API key flow), D14 (Gemini JSON parsing).
 */
function buildFootballVideoPipelineNodes(webhookPath: string): {
  nodes: N8nNode[];
  connections: Record<string, unknown>;
} {
  const callbackUrl = getCallbackUrl();

  // Shared Gemini HTTP Request config (D10, D12)
  const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  const geminiHeaders = {
    parameters: [
      { name: "Content-Type", value: "application/json" },
      { name: "User-Agent", value: "Mozilla/5.0 (compatible; BilkoBibitkov/1.0; +https://bilkobibitkov.replit.app)" }
    ]
  };

  const nodes: N8nNode[] = [
    // ── Triggers ──
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
      position: [0, 250],
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
      position: [250, 125],
      parameters: { mode: "append" }
    },

    // ── Phase 1: News Hound ──
    {
      name: "Prepare News Hound Request",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [500, 125],
      parameters: {
        jsCode: `const geminiApiKey = $('Webhook').first().json.body?.geminiApiKey || '';
const recentTopics = $('Webhook').first().json.body?.recentTopics || [];

const recentList = recentTopics.map(t => t.headline).join('; ');
const exclusion = recentList
  ? '\\nDo NOT repeat any of these recently covered topics: ' + recentList
  : '';

const prompt = 'Perform a deep web search for European football news from the last 24 hours. ' +
  'Focus on data-heavy stories: match scores, confirmed transfers, contract details (salary/years), ' +
  'and advanced statistics. Identify the 3 most viral topics based on engagement and volume of coverage. ' +
  'Output ONLY a JSON object with this exact structure: ' +
  '{"topics": [{"title": "...", "category": "scores|transfers|stats", "keyDataPoints": ["..."], "estimatedEngagement": "high|medium"}]}' +
  exclusion;

const requestBody = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
};

return [{ json: { geminiApiKey, geminiRequestBody: requestBody, recentTopics } }];`
      }
    },
    {
      name: "News Hound",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [750, 125],
      parameters: {
        url: geminiUrl,
        method: "POST",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            ...geminiHeaders.parameters,
            { name: "x-goog-api-key", value: "={{ $json.geminiApiKey }}" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.geminiRequestBody) }}",
        options: {
          batching: { batch: { batchSize: 1, batchInterval: 2000 } }
        }
      }
    },
    {
      name: "Parse Topics",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1000, 125],
      parameters: {
        jsCode: `// D14: Strip markdown fences from Gemini response
const geminiApiKey = $('Prepare News Hound Request').first().json.geminiApiKey;
const response = $input.first().json;
let text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
text = text.trim().replace(/^\\\`\\\`\\\`[a-zA-Z]*\\n?/, '').replace(/\\n?\\\`\\\`\\\`\\s*$/, '');
const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
let parsed = { topics: [] };
if (jsonMatch) {
  try { parsed = JSON.parse(jsonMatch[0]); } catch (e) { /* fallback */ }
}
const topics = (parsed.topics || []).slice(0, 3);
return [{ json: { topics, geminiApiKey } }];`
      }
    },

    // ── Phase 2: Deep Diver ──
    {
      name: "Prepare Deep Diver Request",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1250, 125],
      parameters: {
        jsCode: `const input = $input.first().json;
const geminiApiKey = input.geminiApiKey;
const topics = input.topics || [];

const topicList = topics.map((t, i) => (i+1) + '. ' + t.title).join('\\n');

function sanitizeForJSON(str) {
  if (!str) return '';
  return String(str).replace(/[\\x00-\\x1F\\x7F]/g, ' ').replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"').replace(/\\n/g, ' ').replace(/\\r/g, ' ').substring(0, 10000);
}

const prompt = 'For each of these 3 European football topics, find 3-5 additional high-authority sources ' +
  '(e.g., Sky Sports, Fabrizio Romano, The Athletic, BBC Sport, ESPN) to verify the data points. ' +
  'Topics:\\n' + sanitizeForJSON(topicList) +
  '\\n\\nFor each topic, list the verified data points and sources. ' +
  'Output as JSON: {"verifiedTopics": [{"title": "...", "sources": [{"name": "...", "url": "...", "keyFact": "..."}], "verifiedDataPoints": ["..."]}]}';

const requestBody = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
};

return [{ json: { geminiApiKey, geminiRequestBody: requestBody, originalTopics: topics } }];`
      }
    },
    {
      name: "Deep Diver",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [1500, 125],
      parameters: {
        url: geminiUrl,
        method: "POST",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            ...geminiHeaders.parameters,
            { name: "x-goog-api-key", value: "={{ $json.geminiApiKey }}" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.geminiRequestBody) }}",
        options: {
          batching: { batch: { batchSize: 1, batchInterval: 2000 } }
        }
      }
    },
    {
      name: "Parse Verified Topics",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1750, 125],
      parameters: {
        jsCode: `const geminiApiKey = $('Prepare Deep Diver Request').first().json.geminiApiKey;
const originalTopics = $('Prepare Deep Diver Request').first().json.originalTopics;
const response = $input.first().json;
let text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
text = text.trim().replace(/^\\\`\\\`\\\`[a-zA-Z]*\\n?/, '').replace(/\\n?\\\`\\\`\\\`\\s*$/, '');
const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
let parsed = { verifiedTopics: [] };
if (jsonMatch) {
  try { parsed = JSON.parse(jsonMatch[0]); } catch (e) { /* fallback */ }
}
return [{ json: { verifiedTopics: parsed.verifiedTopics || [], originalTopics, geminiApiKey } }];`
      }
    },

    // ── Wait between Deep Diver and Journalist (D11) ──
    {
      name: "Wait After Verify",
      type: "n8n-nodes-base.wait",
      typeVersion: 1,
      position: [2000, 125],
      parameters: {
        amount: 3,
        unit: "seconds"
      }
    },

    // ── Phase 3: Journalist ──
    {
      name: "Prepare Journalist Request",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [2250, 125],
      parameters: {
        jsCode: `const input = $input.first().json;
const geminiApiKey = input.geminiApiKey;
const verifiedTopics = input.verifiedTopics || [];

function sanitizeForJSON(str) {
  if (!str) return '';
  return String(str).replace(/[\\x00-\\x1F\\x7F]/g, ' ').replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"').replace(/\\n/g, ' ').replace(/\\r/g, ' ').substring(0, 10000);
}

const topicDetails = verifiedTopics.map((t, i) => {
  const sources = (t.sources || []).map(s => s.name + ': ' + s.keyFact).join('; ');
  const data = (t.verifiedDataPoints || []).join(', ');
  return 'Topic ' + (i+1) + ': ' + t.title + '. Sources: ' + sources + '. Data: ' + data;
}).join('\\n');

const prompt = 'You are a professional sports journalist. For each of these 3 football topics, write a journalistic summary. ' +
  'Each summary must be EXACTLY 150 words, objective yet engaging. Include a markdown table of key data ' +
  '(scores, contract figures, or stats) within each summary. ' +
  'Topics with verified data:\\n' + sanitizeForJSON(topicDetails) +
  '\\n\\nOutput as JSON: {"summaries": [{"title": "...", "summary": "...", "dataTable": "...", "category": "scores|transfers|stats"}]}';

const requestBody = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
};

return [{ json: { geminiApiKey, geminiRequestBody: requestBody, verifiedTopics } }];`
      }
    },
    {
      name: "Journalist",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [2500, 125],
      parameters: {
        url: geminiUrl,
        method: "POST",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            ...geminiHeaders.parameters,
            { name: "x-goog-api-key", value: "={{ $json.geminiApiKey }}" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.geminiRequestBody) }}",
        options: {
          batching: { batch: { batchSize: 1, batchInterval: 2000 } }
        }
      }
    },
    {
      name: "Parse Summaries",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [2750, 125],
      parameters: {
        jsCode: `const geminiApiKey = $('Prepare Journalist Request').first().json.geminiApiKey;
const verifiedTopics = $('Prepare Journalist Request').first().json.verifiedTopics;
const response = $input.first().json;
let text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
text = text.trim().replace(/^\\\`\\\`\\\`[a-zA-Z]*\\n?/, '').replace(/\\n?\\\`\\\`\\\`\\s*$/, '');
const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
let parsed = { summaries: [] };
if (jsonMatch) {
  try { parsed = JSON.parse(jsonMatch[0]); } catch (e) { /* fallback */ }
}
return [{ json: { summaries: parsed.summaries || [], verifiedTopics, geminiApiKey } }];`
      }
    },

    // ── Callback after research phase ──
    {
      name: "Callback Research",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [2850, 300],
      parameters: {
        url: callbackUrl,
        method: "POST",
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={
  "workflowId": "football-video-pipeline",
  "step": "research-complete",
  "stepIndex": 1,
  "traceId": "{{ $('Webhook').first().json.body?.traceId || $('Webhook').first().json.traceId || 'trace_' + $execution.id }}",
  "output": {
    "topicCount": {{ $json.summaries.length }},
    "topics": {{ JSON.stringify($json.summaries.map(s => s.title)) }}
  },
  "executionId": "{{ $execution.id }}",
  "status": "in_progress"
}`
      }
    },

    // ── Wait between Journalist and Video Architect (D11) ──
    {
      name: "Wait After Summaries",
      type: "n8n-nodes-base.wait",
      typeVersion: 1,
      position: [3000, 125],
      parameters: {
        amount: 3,
        unit: "seconds"
      }
    },

    // ── Phase 4: Video Architect ──
    {
      name: "Prepare Video Architect Request",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [3250, 125],
      parameters: {
        jsCode: `const input = $input.first().json;
const geminiApiKey = input.geminiApiKey;
const summaries = input.summaries || [];

function sanitizeForJSON(str) {
  if (!str) return '';
  return String(str).replace(/[\\x00-\\x1F\\x7F]/g, ' ').replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"').replace(/\\n/g, ' ').replace(/\\r/g, ' ').substring(0, 10000);
}

const summaryText = summaries.map((s, i) =>
  'Topic ' + (i+1) + ': ' + s.title + '\\nSummary: ' + s.summary
).join('\\n\\n');

const prompt = 'You are a video content architect. Review these 3 curated football topics and create a script ' +
  'for a 65-second video.\\n\\n' +
  'Structure:\\n' +
  '- Segment 1 (Intro): 5 seconds. Text for a Headline Slide listing all 3 topic titles.\\n' +
  '- Segments 2-4 (News): 20 seconds each. For each topic provide:\\n' +
  '  - A spoken script of exactly 50-60 words (to fit ~20 seconds)\\n' +
  '  - Three Scene Descriptions for an image generator that visualize the data/action\\n\\n' +
  'Topics:\\n' + sanitizeForJSON(summaryText) +
  '\\n\\nOutput as JSON: {"videoScript": {"totalDuration": 65, "segments": [' +
  '{"id": "intro", "duration": 5, "type": "headline", "text": "...", "spokenScript": "Here are today top 3 football stories..."},' +
  '{"id": "topic1", "duration": 20, "type": "news", "title": "...", "spokenScript": "...", "wordCount": N, "sceneDescriptions": ["...", "...", "..."]},' +
  '{"id": "topic2", "duration": 20, "type": "news", "title": "...", "spokenScript": "...", "wordCount": N, "sceneDescriptions": ["...", "...", "..."]},' +
  '{"id": "topic3", "duration": 20, "type": "news", "title": "...", "spokenScript": "...", "wordCount": N, "sceneDescriptions": ["...", "...", "..."]}' +
  ']}}';

const requestBody = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { temperature: 0.5, maxOutputTokens: 4096 }
};

return [{ json: { geminiApiKey, geminiRequestBody: requestBody, summaries } }];`
      }
    },
    {
      name: "Video Architect",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [3500, 125],
      parameters: {
        url: geminiUrl,
        method: "POST",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            ...geminiHeaders.parameters,
            { name: "x-goog-api-key", value: "={{ $json.geminiApiKey }}" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.geminiRequestBody) }}",
        options: {
          batching: { batch: { batchSize: 1, batchInterval: 2000 } }
        }
      }
    },
    {
      name: "Parse Video Script",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [3750, 125],
      parameters: {
        jsCode: `const geminiApiKey = $('Prepare Video Architect Request').first().json.geminiApiKey;
const summaries = $('Prepare Video Architect Request').first().json.summaries;
const response = $input.first().json;
let text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
text = text.trim().replace(/^\\\`\\\`\\\`[a-zA-Z]*\\n?/, '').replace(/\\n?\\\`\\\`\\\`\\s*$/, '');
const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
let parsed = { videoScript: null };
if (jsonMatch) {
  try { parsed = JSON.parse(jsonMatch[0]); } catch (e) { /* fallback */ }
}
return [{ json: { videoScript: parsed.videoScript || null, summaries, geminiApiKey } }];`
      }
    },

    // ── Wait between Video Architect and Image Stylist (D11) ──
    {
      name: "Wait After Script",
      type: "n8n-nodes-base.wait",
      typeVersion: 1,
      position: [4000, 125],
      parameters: {
        amount: 3,
        unit: "seconds"
      }
    },

    // ── Phase 5: Image Stylist ──
    {
      name: "Prepare Image Stylist Request",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [4250, 125],
      parameters: {
        jsCode: `const input = $input.first().json;
const geminiApiKey = input.geminiApiKey;
const videoScript = input.videoScript;
const summaries = input.summaries;

function sanitizeForJSON(str) {
  if (!str) return '';
  return String(str).replace(/[\\x00-\\x1F\\x7F]/g, ' ').replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"').replace(/\\n/g, ' ').replace(/\\r/g, ' ').substring(0, 10000);
}

// Collect all scene descriptions from segments
const scenes = [];
if (videoScript && videoScript.segments) {
  videoScript.segments.forEach(seg => {
    if (seg.sceneDescriptions) {
      seg.sceneDescriptions.forEach((desc, i) => {
        scenes.push({ segmentId: seg.id, sceneIndex: i, description: desc });
      });
    }
  });
}

const sceneText = scenes.map((s, i) =>
  (i+1) + '. [' + s.segmentId + '] ' + s.description
).join('\\n');

const prompt = 'You are an expert image prompt engineer. Take these scene descriptions from a football news video ' +
  'and rewrite each one as a high-quality prompt for an AI image generator. ' +
  'Style: Hyper-realistic sports photography, 8k resolution, dramatic stadium lighting, motion blur. ' +
  'Ensure the descriptions avoid real player names (use descriptive appearance instead for content safety). ' +
  'Each prompt should be detailed (30-50 words).\\n\\n' +
  'Scene descriptions:\\n' + sanitizeForJSON(sceneText) +
  '\\n\\nOutput as JSON: {"imagePrompts": [{"segmentId": "...", "sceneIndex": N, "originalDescription": "...", "imagePrompt": "...", "style": "hyper-realistic sports photography"}]}';

const requestBody = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { temperature: 0.6, maxOutputTokens: 4096 }
};

return [{ json: { geminiApiKey, geminiRequestBody: requestBody, videoScript, summaries } }];`
      }
    },
    {
      name: "Image Stylist",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [4500, 125],
      parameters: {
        url: geminiUrl,
        method: "POST",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            ...geminiHeaders.parameters,
            { name: "x-goog-api-key", value: "={{ $json.geminiApiKey }}" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.geminiRequestBody) }}",
        options: {
          batching: { batch: { batchSize: 1, batchInterval: 2000 } }
        }
      }
    },
    {
      name: "Parse Image Prompts",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [4750, 125],
      parameters: {
        jsCode: `const geminiApiKey = $('Prepare Image Stylist Request').first().json.geminiApiKey;
const videoScript = $('Prepare Image Stylist Request').first().json.videoScript;
const summaries = $('Prepare Image Stylist Request').first().json.summaries;
const response = $input.first().json;
let text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
text = text.trim().replace(/^\\\`\\\`\\\`[a-zA-Z]*\\n?/, '').replace(/\\n?\\\`\\\`\\\`\\s*$/, '');
const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
let parsed = { imagePrompts: [] };
if (jsonMatch) {
  try { parsed = JSON.parse(jsonMatch[0]); } catch (e) { /* fallback */ }
}
return [{ json: { imagePrompts: parsed.imagePrompts || [], videoScript, summaries, geminiApiKey } }];`
      }
    },

    // ── Final Assembly ──
    {
      name: "Build Final Output",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [5000, 125],
      parameters: {
        jsCode: `const input = $input.first().json;
const videoScript = input.videoScript;
const summaries = input.summaries || [];
const imagePrompts = input.imagePrompts || [];

// Build the timing table
const timingTable = [
  { segment: 'Intro', duration: '5s', visuals: 'Headline Slide', audio: 'Here are today\\'s top 3 football stories...' }
];

const categories = ['Detailed summary with stats/scores', 'Transfer details and contract figures', 'Tactical breakdown or match analysis'];
summaries.forEach((s, i) => {
  timingTable.push({
    segment: 'Topic ' + (i+1) + ': ' + (s.title || 'TBD'),
    duration: '20s',
    visuals: '3 Images (6.6s each)',
    audio: categories[i] || s.category || 'News summary'
  });
});

// Map image prompts to segments
const segmentImages = {};
imagePrompts.forEach(ip => {
  if (!segmentImages[ip.segmentId]) segmentImages[ip.segmentId] = [];
  segmentImages[ip.segmentId].push(ip);
});

const output = {
  success: true,
  data: {
    pipeline: 'football-video-pipeline',
    researchPhase: {
      topicCount: summaries.length,
      summaries: summaries
    },
    videoPhase: {
      totalDuration: 65,
      script: videoScript,
      imagePrompts: imagePrompts,
      segmentImages: segmentImages
    },
    timingTable: timingTable,
    sourceHeadline: summaries[0]?.title || 'European Football Daily Video'
  },
  metadata: {
    workflowId: 'football-video-pipeline',
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
      position: [5250, 125],
      parameters: {
        url: callbackUrl,
        method: "POST",
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={
  "workflowId": "football-video-pipeline",
  "step": "final-output",
  "stepIndex": 2,
  "traceId": "{{ $('Webhook').first().json.body?.traceId || $('Webhook').first().json.traceId || 'trace_' + $execution.id }}",
  "output": {{ JSON.stringify($input.first().json) }},
  "executionId": "{{ $execution.id }}",
  "status": "success"
}`
      }
    },
    {
      name: "Respond to Webhook",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1,
      position: [5500, 250],
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
      main: [[{ node: "Prepare News Hound Request", type: "main", index: 0 }]]
    },
    "Prepare News Hound Request": {
      main: [[{ node: "News Hound", type: "main", index: 0 }]]
    },
    "News Hound": {
      main: [[{ node: "Parse Topics", type: "main", index: 0 }]]
    },
    "Parse Topics": {
      main: [[{ node: "Prepare Deep Diver Request", type: "main", index: 0 }]]
    },
    "Prepare Deep Diver Request": {
      main: [[{ node: "Deep Diver", type: "main", index: 0 }]]
    },
    "Deep Diver": {
      main: [[{ node: "Parse Verified Topics", type: "main", index: 0 }]]
    },
    "Parse Verified Topics": {
      main: [[{ node: "Wait After Verify", type: "main", index: 0 }]]
    },
    "Wait After Verify": {
      main: [[{ node: "Prepare Journalist Request", type: "main", index: 0 }]]
    },
    "Prepare Journalist Request": {
      main: [[{ node: "Journalist", type: "main", index: 0 }]]
    },
    "Journalist": {
      main: [[{ node: "Parse Summaries", type: "main", index: 0 }]]
    },
    "Parse Summaries": {
      main: [
        [{ node: "Callback Research", type: "main", index: 0 }],
        [{ node: "Wait After Summaries", type: "main", index: 0 }]
      ]
    },
    "Callback Research": {
      main: []
    },
    "Wait After Summaries": {
      main: [[{ node: "Prepare Video Architect Request", type: "main", index: 0 }]]
    },
    "Prepare Video Architect Request": {
      main: [[{ node: "Video Architect", type: "main", index: 0 }]]
    },
    "Video Architect": {
      main: [[{ node: "Parse Video Script", type: "main", index: 0 }]]
    },
    "Parse Video Script": {
      main: [[{ node: "Wait After Script", type: "main", index: 0 }]]
    },
    "Wait After Script": {
      main: [[{ node: "Prepare Image Stylist Request", type: "main", index: 0 }]]
    },
    "Prepare Image Stylist Request": {
      main: [[{ node: "Image Stylist", type: "main", index: 0 }]]
    },
    "Image Stylist": {
      main: [[{ node: "Parse Image Prompts", type: "main", index: 0 }]]
    },
    "Parse Image Prompts": {
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
