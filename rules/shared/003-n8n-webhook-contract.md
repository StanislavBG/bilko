# n8n Webhook Contract

Rule ID: SHARED-003
Priority: HIGH
Version: 1.0.0
Applies To: All Bilko Bibitkov projects (UI and n8n)

## Context
This rule defines the technical contract for communication between the web application and n8n workflows.

## Web App → n8n (Outbound Requests)

### Endpoint Pattern
The web application uses a generic webhook proxy:
```
POST /api/webhook/:workflowId
```

### Request Headers
```
Content-Type: application/json
X-Bilko-User-Id: <authenticated user id>
X-Bilko-Request-Id: <unique request identifier>
X-Bilko-Timestamp: <ISO 8601 timestamp>
```

### Request Body
```json
{
  "action": "string",
  "payload": {
    // Workflow-specific data
  },
  "context": {
    "userId": "string",
    "sessionId": "string",
    "requestedAt": "ISO 8601 timestamp"
  }
}
```

## n8n → Web App (Response)

### Success Response
```json
{
  "success": true,
  "data": {
    // Workflow-specific response data
  },
  "metadata": {
    "workflowId": "string",
    "executionId": "string",
    "executedAt": "ISO 8601 timestamp"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  },
  "metadata": {
    "workflowId": "string",
    "executionId": "string",
    "executedAt": "ISO 8601 timestamp"
  }
}
```

## n8n Webhook Configuration

### n8n Project Environment Variables
```
N8N_HOST=<your-n8n-replit-url>.replit.app
N8N_PORT=5000
N8N_PROTOCOL=https
WEBHOOK_URL=https://<your-n8n-replit-url>.replit.app/
```

### Webhook Node Settings in n8n
- Path: Use descriptive paths like `/chat`, `/support`, `/analyze`
- Method: POST
- Authentication: None (handled by web app proxy)

## Security

### Authentication Flow
1. User authenticates with Web App (Replit Auth)
2. Web App validates session
3. Web App proxies request to n8n with user context headers
4. n8n trusts requests from the Web App (same Replit account)

### Future Considerations
- API key authentication between projects
- Request signing for additional security
- Rate limiting at the proxy layer

## Rationale
A well-defined contract ensures both projects can evolve independently while maintaining compatibility.
