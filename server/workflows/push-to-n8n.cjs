const fs = require('fs');
const path = require('path');

const N8N_API_BASE_URL = process.env.N8N_API_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_BASE_URL || !N8N_API_KEY) {
  console.error("Missing N8N_API_BASE_URL or N8N_API_KEY environment variables");
  process.exit(1);
}

const backupPath = path.join(__dirname, 'backups/oV6WGX5uBeTZ9tRa_PROD.json');
const workflow = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
const workflowId = workflow.id;

async function makeRequest(method, endpoint, body = null) {
  const url = `${N8N_API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${endpoint} failed: ${response.status} - ${text}`);
  }
  return response.json();
}

async function pushWorkflow() {
  console.log("1. Deactivating workflow...");
  try {
    await makeRequest('POST', `/workflows/${workflowId}/deactivate`);
    console.log("   Workflow deactivated");
  } catch (e) {
    console.log("   Could not deactivate (may already be inactive):", e.message);
  }

  console.log("2. Updating workflow with new nodes...");
  await makeRequest('PUT', `/workflows/${workflowId}`, {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings
  });
  console.log("   Workflow updated");

  console.log("3. Reactivating workflow...");
  try {
    await makeRequest('POST', `/workflows/${workflowId}/activate`);
    console.log("   Workflow activated");
  } catch (e) {
    console.log("   Note: Activation via API may need manual toggle in n8n UI:", e.message);
  }

  console.log("\\nDone! Workflow pushed to n8n.");
}

pushWorkflow().catch(err => {
  console.error("Error pushing workflow:", err);
  process.exit(1);
});
