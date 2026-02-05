# n8n Self-Hosting Setup Guide

Rule ID: INT-004
Priority: HIGH
Version: 1.1.0
Partition: integration
Migrated From: SHARED-004 (v1.0.1)

## Context
This rule provides the complete setup guide for self-hosting n8n on Replit as part of the Bilko Bibitkov system.

## Project Creation

### Step 1: Create New Replit Project
- Template: **Node.js**
- Name: `bilko-bibitkov-n8n` (or similar)

### Step 2: Provision Database
Use Replit's built-in PostgreSQL database. This provides:
- Automatic `DATABASE_URL` environment variable
- Automatic `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` variables
- No external service dependencies

Note: Handle your own backup strategy for critical data if needed.

### Step 3: Install n8n
In the Shell, run:
```bash
npm install n8n
```

### Step 4: Configure Workflow
Configure a Replit workflow to run n8n. In the n8n project, set the run command to:
```
npx n8n start
```

Note: Unlike the web app project, the n8n project is a standalone tool installation. You may configure the start command via Replit's workflow UI rather than editing package.json.

## Required Environment Variables (Secrets)

Set these in Replit's Secrets tab:

### Critical Security
```
N8N_ENCRYPTION_KEY=<random-64-character-string>
```
**WARNING**: If this key is lost or changed, all saved credentials become unreadable. Store a backup externally.

### Webhook Configuration
```
WEBHOOK_URL=https://<your-repl-name>.<your-username>.repl.co/
N8N_HOST=0.0.0.0
N8N_PORT=${PORT:-5000}
N8N_PROTOCOL=https
```
Note: Replit provides a `PORT` environment variable. Bind to this value, falling back to 5000 if not set. Avoid n8n's default 5678 as Replit may not expose it.

### Database Connection
Replit automatically provides `DATABASE_URL`. Configure n8n to use it:
```
DB_TYPE=postgresdb
DB_POSTGRESDB_CONNECTION_URL=${DATABASE_URL}
```

Or use individual variables (Replit provides these automatically):
```
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=${PGHOST}
DB_POSTGRESDB_PORT=${PGPORT}
DB_POSTGRESDB_DATABASE=${PGDATABASE}
DB_POSTGRESDB_USER=${PGUSER}
DB_POSTGRESDB_PASSWORD=${PGPASSWORD}
```

### Timezone
```
TZ=America/New_York
```
Adjust to your timezone for accurate scheduling.

### Performance Optimization
```
N8N_EXECUTIONS_PROCESS=main
EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
```
These settings reduce memory usage on Replit's resource-constrained environment.

## Deployment Configuration

### Use Reserved VM (Critical)
n8n MUST be deployed as a **Reserved VM** deployment, NOT Autoscale:
- n8n needs to be always-on to receive webhooks
- Autoscale deployments can scale to zero, breaking webhook triggers
- Reserved VM provides consistent, predictable performance

### Recommended Resources
- **RAM**: Minimum 2GB (n8n can be memory-intensive)
- **CPU**: 1-2 vCPUs depending on workflow complexity

## Security Configuration

### Option A: Built-in User Management (Recommended)
n8n v1.0+ prompts for owner account creation on first launch. No additional config needed.

### Option B: Basic Auth (Legacy)
```
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=bilko
N8N_BASIC_AUTH_PASSWORD=<strong-password>
```

## Copy Core Rules

After project creation, copy the following rules from the web application project:
- ARCH-001: System Overview (rules/architecture/)
- ARCH-003: System Architecture (rules/architecture/)
- INT-003: Orchestrator Communication Contract (rules/integration/)
- INT-004: This setup guide (rules/integration/)

This ensures both Replit agents understand the complete system.

## Verification Checklist

After setup, verify:
- [ ] n8n starts without errors
- [ ] Can access n8n editor at your Replit URL
- [ ] Database connection works (check Settings > Database)
- [ ] Webhook URL is correctly set (check Settings > Webhook URL)
- [ ] Create a test workflow with a webhook trigger and verify it's reachable

## Integration with Web Application

Once n8n is running:
1. Create workflows with Webhook trigger nodes
2. Note the webhook paths (e.g., `/webhook/chat`, `/webhook/support`)
3. The web application will proxy requests via `/api/orchestrate/:workflowId` per INT-003

## Troubleshooting

### "Cannot connect to database"
- Verify PostgreSQL is provisioned in Replit
- Check that `DATABASE_URL` exists in environment
- Restart the Repl after adding database

### "Webhook not reachable"
- Verify `WEBHOOK_URL` is set correctly
- Ensure Reserved VM deployment (not Autoscale)
- Check that n8n is bound to the correct port (use `PORT` env var or 5000)

### "Credentials cannot be decrypted"
- `N8N_ENCRYPTION_KEY` was changed or lost
- Must restore original key or re-enter all credentials

## n8n Credentials for Gemini API

For workflows that call the Google Gemini API via HTTP Request nodes:

### Header Auth Credential Setup
1. In n8n → Credentials → Add Credential
2. Search for "Header Auth"
3. Configure:
   - **Name**: `x-goog-api-key`
   - **Value**: Your Gemini API key

### Credential Usage in Workflows
HTTP Request nodes calling Gemini should be configured:
```
Authentication: Generic Credential Type
Generic Auth Type: httpHeaderAuth
Credential: x-goog-api-key (Header Auth)
```

The credential ID (from URL `credentials/xxxxx`) is used in workflow JSON:
```json
{
  "credentials": {
    "httpHeaderAuth": {
      "id": "YOUR_CREDENTIAL_ID",
      "name": "x-goog-api-key"
    }
  }
}
```

### Current Production Credential
- **ID**: `K9oPxIngg8rE26T6`
- **Type**: Header Auth
- **Used by**: All Gemini API nodes in PROD workflow (7 nodes)

## Rationale
Self-hosting n8n on Replit provides full control over AI workflows while maintaining the separation of concerns defined in ARCH-003. The Reserved VM deployment ensures reliable webhook operation.
