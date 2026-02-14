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
  "GET /api/auth/login": {
    method: "GET",
    description: "Initiates Replit OIDC login flow"
  },
  "GET /api/auth/callback": {
    method: "GET",
    description: "OIDC callback handler after authentication"
  },
  "GET /api/auth/logout": {
    method: "GET",
    description: "Destroys session and redirects to OIDC logout"
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
  "POST /api/workflows/callback": {
    method: "POST",
    description: "Receives step-by-step callbacks from n8n workflows (canonical path per INT-005)"
  },
  "POST /api/n8n/callback": {
    method: "POST",
    description: "Receives step-by-step callbacks from n8n workflows (legacy alias)"
  },
  "GET /api/auth/user": {
    method: "GET",
    description: "Returns current authenticated user profile"
  },
  "GET /api/projects/unfurl": {
    method: "GET",
    description: "Extracts OG image, title, description, and favicon from a project URL"
  },
  "GET /api/projects/proxy-image": {
    method: "GET",
    description: "Proxies an external image URL to avoid CORS issues"
  },
  "POST /api/projects/unfurl-batch": {
    method: "POST",
    description: "Batch unfurl multiple project URLs at once"
  },
  "POST /api/projects/unfurl-cache/clear": {
    method: "POST",
    description: "Clears the unfurl metadata cache"
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
