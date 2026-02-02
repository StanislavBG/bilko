import { createN8nClient, buildWorkflowNodes, type N8nWorkflow, type N8nNode } from "./client";
import { setWebhookUrl, setN8nWorkflowId } from "./webhook-cache";
import registry from "../workflows/registry.json";
import type { WorkflowDefinition, WorkflowRegistry } from "../workflows/types";
import { createLogger } from "../logger";

const log = createLogger("n8n");

const workflowRegistry = registry as WorkflowRegistry;

export interface SyncResult {
  success: boolean;
  synced: Array<{
    id: string;
    name: string;
    action: "created" | "updated" | "skipped";
    n8nId?: string;
    webhookUrl?: string;
    error?: string;
    activationNote?: string;
  }>;
  errors: string[];
}

export async function syncWorkflowsToN8n(): Promise<SyncResult> {
  const client = createN8nClient();
  
  if (!client) {
    return {
      success: false,
      synced: [],
      errors: ["n8n client not configured. Set N8N_API_BASE_URL and N8N_API_KEY."]
    };
  }

  const result: SyncResult = {
    success: true,
    synced: [],
    errors: []
  };

  const n8nWorkflows = workflowRegistry.workflows.filter(w => w.mode === "n8n");

  for (const workflow of n8nWorkflows) {
    try {
      const syncStatus = await syncWorkflow(client, workflow);
      result.synced.push(syncStatus);
      
      if (syncStatus.error) {
        result.errors.push(`${workflow.id}: ${syncStatus.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.synced.push({
        id: workflow.id,
        name: workflow.name,
        action: "skipped",
        error: errorMessage
      });
      result.errors.push(`${workflow.id}: ${errorMessage}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

async function syncWorkflow(
  client: ReturnType<typeof createN8nClient>,
  workflow: WorkflowDefinition
): Promise<SyncResult["synced"][0]> {
  if (!client) {
    return {
      id: workflow.id,
      name: workflow.name,
      action: "skipped",
      error: "Client not initialized"
    };
  }

  const { nodes, connections } = buildWorkflowNodes(workflow);
  
  // Check if workflow exists in n8n FIRST (before failing on missing local nodes)
  const existing = await client.findWorkflowByName(workflow.name);

  // For n8n-hosted workflows without local definitions, we just cache the webhook
  if (nodes.length === 0 && !existing) {
    return {
      id: workflow.id,
      name: workflow.name,
      action: "skipped",
      error: "No node definition available and workflow not found in n8n"
    };
  }

  if (existing) {
    // IMPORTANT: Do NOT overwrite existing workflows!
    // This preserves user changes (sticky notes, etc.) and webhook registration.
    // See INT-002 ISSUE-001: API updates reset webhook registration.
    // See INT-002 ISSUE-004: n8n API doesn't return node definitions.
    
    // Cache webhook URL: prefer LOCAL nodes, fallback to registry webhookPath (for n8n-hosted workflows)
    let webhookUrl = extractWebhookUrl({ nodes } as N8nWorkflow, nodes);
    
    if (!webhookUrl && workflow.webhookPath) {
      // Fallback for n8n-hosted workflows without local node definitions
      const baseUrl = process.env.N8N_API_BASE_URL?.replace("/api/v1", "") || "";
      webhookUrl = `${baseUrl}/webhook/${workflow.webhookPath}`;
    }
    
    if (webhookUrl) {
      setWebhookUrl(workflow.id, webhookUrl);
    }
    
    setN8nWorkflowId(workflow.id, existing.id);

    return {
      id: workflow.id,
      name: workflow.name,
      action: "skipped",
      n8nId: existing.id,
      webhookUrl,
      activationNote: "Existing workflow preserved (not overwritten)"
    };
  }

  const created = await client.createWorkflow({
    name: workflow.name,
    nodes,
    connections,
    settings: {
      executionOrder: "v1"
    }
  });

  try {
    await client.activateWorkflow(created.id);
    log.info(`Activated new workflow: ${workflow.name}`);
  } catch (activateError) {
    log.warn(`Failed to activate ${workflow.name}`, activateError);
  }

  const webhookUrl = extractWebhookUrl(created, nodes);
  
  if (webhookUrl) {
    setWebhookUrl(workflow.id, webhookUrl);
  }
  
  setN8nWorkflowId(workflow.id, created.id);

  return {
    id: workflow.id,
    name: workflow.name,
    action: "created",
    n8nId: created.id,
    webhookUrl,
    activationNote: "Note: Webhook may require manual save in n8n UI due to known bug (INT-002 ISSUE-001)"
  };
}

function extractWebhookUrl(workflow: N8nWorkflow, localNodes?: N8nNode[]): string | undefined {
  const allNodes = workflow.nodes || localNodes || [];
  const webhookNode = allNodes.find(n => 
    n.type === "n8n-nodes-base.webhook"
  );
  
  if (!webhookNode?.parameters) {
    return undefined;
  }

  const path = webhookNode.parameters.path as string | undefined;
  if (!path) {
    return undefined;
  }

  const baseUrl = process.env.N8N_API_BASE_URL?.replace("/api/v1", "") || "";
  return `${baseUrl}/webhook/${path}`;
}

export async function getN8nWorkflowStatus(): Promise<{
  configured: boolean;
  workflows: Array<{
    id: string;
    name: string;
    registeredInBilko: boolean;
    existsInN8n: boolean;
    active: boolean;
    n8nId?: string;
  }>;
}> {
  const client = createN8nClient();
  
  if (!client) {
    return { configured: false, workflows: [] };
  }

  const n8nWorkflows = await client.listWorkflows();
  const bilkoWorkflows = workflowRegistry.workflows.filter(w => w.mode === "n8n");

  const status = bilkoWorkflows.map(bw => {
    const n8nMatch = n8nWorkflows.find(nw => nw.name === bw.name);
    return {
      id: bw.id,
      name: bw.name,
      registeredInBilko: true,
      existsInN8n: !!n8nMatch,
      active: n8nMatch?.active || false,
      n8nId: n8nMatch?.id
    };
  });

  const unmatchedN8n = n8nWorkflows.filter(
    nw => !bilkoWorkflows.some(bw => bw.name === nw.name)
  );

  for (const nw of unmatchedN8n) {
    status.push({
      id: nw.id,
      name: nw.name,
      registeredInBilko: false,
      existsInN8n: true,
      active: nw.active,
      n8nId: nw.id
    });
  }

  return { configured: true, workflows: status };
}
