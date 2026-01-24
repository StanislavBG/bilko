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
  "GET /api/audit": {
    method: "GET",
    description: "Runs comprehensive audit with detailed evidence for each check including files examined, patterns checked, and validation steps"
  },
  "GET /api/traces": {
    method: "GET",
    description: "Returns orchestration layer communication traces"
  },
  "GET /api/traces/:traceId": {
    method: "GET",
    description: "Returns single trace with full request/response details"
  },
  "POST /api/orchestrator/dispatch": {
    method: "POST",
    description: "Dispatches a request to n8n workflow via orchestration layer"
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
