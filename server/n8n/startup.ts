import { createN8nClient, buildWorkflowNodes } from "./client";
import registry from "../workflows/registry.json";
import type { WorkflowRegistry } from "../workflows/types";

const workflowRegistry = registry as WorkflowRegistry;

export async function syncWorkflowsOnStartup(): Promise<void> {
  const client = createN8nClient();
  
  if (!client) {
    console.log("[n8n] Skipping workflow sync - n8n client not configured");
    return;
  }

  const n8nWorkflows = workflowRegistry.workflows.filter(w => w.mode === "n8n");
  
  if (n8nWorkflows.length === 0) {
    console.log("[n8n] No n8n workflows in registry");
    return;
  }

  console.log(`[n8n] Syncing ${n8nWorkflows.length} workflow(s) to n8n...`);

  let existingWorkflows;
  try {
    existingWorkflows = await client.listWorkflows();
  } catch (error) {
    console.error("[n8n] Failed to connect to n8n:", error instanceof Error ? error.message : error);
    return;
  }

  for (const workflow of n8nWorkflows) {
    try {
      const existing = existingWorkflows.find(w => w.name === workflow.name);
      const { nodes, connections } = buildWorkflowNodes(workflow);

      if (nodes.length === 0) {
        console.log(`[n8n] ${workflow.id}: No node definition, skipping`);
        continue;
      }

      if (existing) {
        await client.updateWorkflow(existing.id, {
          name: workflow.name,
          nodes,
          connections,
          settings: { executionOrder: "v1" }
        });

        if (!existing.active) {
          try {
            await client.activateWorkflow(existing.id);
          } catch {
            console.warn(`[n8n] ${workflow.id}: Could not activate (may need manual save in n8n UI)`);
          }
        }

        console.log(`[n8n] ${workflow.id}: Updated (n8n id: ${existing.id})`);
      } else {
        const created = await client.createWorkflow({
          name: workflow.name,
          nodes,
          connections,
          settings: { executionOrder: "v1" }
        });

        try {
          await client.activateWorkflow(created.id);
        } catch {
          console.warn(`[n8n] ${workflow.id}: Could not activate (may need manual save in n8n UI)`);
        }

        console.log(`[n8n] ${workflow.id}: Created (n8n id: ${created.id})`);
      }
    } catch (error) {
      console.error(`[n8n] ${workflow.id}: Failed -`, error instanceof Error ? error.message : error);
    }
  }

  console.log("[n8n] Workflow sync complete");
}
