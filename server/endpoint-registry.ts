export interface EndpointMeta {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  description: string;
}

export interface EndpointRegistry {
  [endpoint: string]: EndpointMeta;
}

const registry: EndpointRegistry = {
  "GET /api/rules": {
    method: "GET",
    description: "Returns all rules grouped by partition with metadata"
  },
  "GET /api/rules/:ruleId": {
    method: "GET",
    description: "Returns single rule content with markdown body"
  },
  "GET /api/audit/protocol": {
    method: "GET",
    description: "Returns the Rule Architect Protocol markdown content"
  },
  "GET /api/audits": {
    method: "GET",
    description: "Returns all saved rule audit reports"
  },
  "POST /api/audits": {
    method: "POST",
    description: "Saves a new rule audit report"
  },
  "GET /api/n8n/traces": {
    method: "GET",
    description: "Returns n8n orchestration layer communication traces"
  },
  "GET /api/n8n/traces/:traceId": {
    method: "GET",
    description: "Returns single n8n trace with full request/response details"
  },
  "POST /api/n8n/orchestrate/:workflowId": {
    method: "POST",
    description: "Forwards request to n8n workflow via orchestration layer"
  },
  "POST /api/n8n/workflows/:id/execute": {
    method: "POST",
    description: "Triggers an n8n workflow execution"
  },
  "GET /api/n8n/workflows/:id/output": {
    method: "GET",
    description: "Returns latest output from an n8n workflow execution"
  },
  "POST /api/n8n/callback": {
    method: "POST",
    description: "Receives step-by-step callbacks from n8n workflows"
  },
  "GET /api/auth/user": {
    method: "GET",
    description: "Returns current authenticated user profile"
  }
};

export function getEndpointMeta(endpoint: string): EndpointMeta | undefined {
  return registry[endpoint];
}

export function getAllEndpoints(): EndpointRegistry {
  return { ...registry };
}

export function registerEndpoint(endpoint: string, meta: EndpointMeta): void {
  registry[endpoint] = meta;
}
