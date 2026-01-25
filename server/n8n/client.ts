import type { WorkflowDefinition } from "../workflows/types";

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

export interface N8nApiError {
  code: string;
  message: string;
  hint?: string;
}

export class N8nClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
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
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const headers: Record<string, string> = {
      "X-N8N-API-KEY": this.apiKey,
      "Accept": "application/json",
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorMessage = `n8n API error: ${response.status}`;
      try {
        const errorData = await response.json() as N8nApiError;
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
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
    return this.request<N8nWorkflow>("PATCH", `/workflows/${id}`, workflow);
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
}

export function createN8nClient(): N8nClient | null {
  try {
    return new N8nClient();
  } catch (error) {
    console.warn("n8n client not configured:", error instanceof Error ? error.message : error);
    return null;
  }
}

export function buildWorkflowNodes(
  definition: WorkflowDefinition
): { nodes: N8nNode[]; connections: Record<string, unknown> } {
  if (definition.id === "european-football-daily") {
    return buildEuropeanFootballDailyNodes();
  }
  
  return { nodes: [], connections: {} };
}

function buildEuropeanFootballDailyNodes(): {
  nodes: N8nNode[];
  connections: Record<string, unknown>;
} {
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
        path: "european-football-daily",
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
      name: "Build Response",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1750, 100],
      parameters: {
        jsCode: `const data = $input.first().json;
const output = {
  success: !!data.winner,
  data: data.winner ? {
    winningEvent: {
      title: data.winner.title,
      sentimentScore: data.winner.score,
      reason: data.winner.reason
    }
  } : undefined,
  error: !data.winner ? {
    code: "NO_POSITIVE_EVENT",
    message: "Could not identify a positive event",
    retryable: false
  } : undefined,
  metadata: {
    workflowId: "european-football-daily",
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
      position: [2000, 200],
      parameters: {
        respondWith: "json",
        responseBody: "={{ $json }}"
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
      main: [[{ node: "Gemini Sentiment", type: "main", index: 0 }]]
    },
    "Gemini Sentiment": {
      main: [[{ node: "Parse Sentiment", type: "main", index: 0 }]]
    },
    "Parse Sentiment": {
      main: [[{ node: "Build Response", type: "main", index: 0 }]]
    },
    "Build Response": {
      main: [[{ node: "Respond to Webhook", type: "main", index: 0 }]]
    }
  };

  return { nodes, connections };
}
