/**
 * bilko-flow Integration Routes
 *
 * Exposes the bilko-flow deterministic workflow engine as API endpoints
 * within the Bilko web application.
 *
 * Endpoints:
 *   POST /api/bilko-flow/demo/run     — Execute the DEMO fake-game workflow
 *   GET  /api/bilko-flow/demo/status   — Check status and see results
 *   POST /api/bilko-flow/demo/test     — Dry-run validation (no execution)
 */

import { Router, Request, Response } from "express";
import { createAppContext } from "bilko-flow/dist/server";
import { compileWorkflow } from "bilko-flow/dist/dsl/compiler";
import { validateWorkflow } from "bilko-flow/dist/dsl/validator";
import type { Run } from "bilko-flow/dist/domain/run";
import type { Workflow } from "bilko-flow/dist/domain/workflow";
import type { TenantScope } from "bilko-flow/dist/domain/account";
import { registerLLMStepHandler } from "./llm-step-handler";
import { createFakeGameWorkflowInput } from "./fake-game-workflow";

const router = Router();

// ── Initialize bilko-flow context (in-memory store, no separate server) ──

const bfContext = createAppContext();
registerLLMStepHandler();

// Track the seeded workflow ID and tenant scope
let seededWorkflowId: string | null = null;
const TENANT_SCOPE: TenantScope = {
  accountId: "",
  projectId: "",
  environmentId: "",
};

/**
 * Initialize: seed account + project + environment + workflow into bilko-flow's store.
 * Called lazily on first request.
 */
async function ensureSeeded(): Promise<string> {
  if (seededWorkflowId) return seededWorkflowId;

  const { store } = bfContext;

  // Create account
  const account = await store.accounts.create({
    id: "bilko-gym-account",
    name: "Bilko's Mental Gym",
    status: "active" as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Create project
  const project = await store.projects.create({
    id: "bilko-gym-project",
    accountId: account.id,
    name: "Demo Flows",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Create environment
  const environment = await store.environments.create({
    id: "bilko-gym-dev",
    accountId: account.id,
    projectId: project.id,
    name: "Development",
    type: "development" as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  TENANT_SCOPE.accountId = account.id;
  TENANT_SCOPE.projectId = project.id;
  TENANT_SCOPE.environmentId = environment.id;

  // Create the fake-game workflow
  const workflowInput = createFakeGameWorkflowInput(
    account.id,
    project.id,
    environment.id,
  );

  const workflow = await store.workflows.create({
    ...workflowInput,
    id: "demo-fake-game",
    version: 1,
    specVersion: "1.0.0",
    status: "active" as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: workflowInput.steps.map((s) => ({
      ...s,
      workflowId: "demo-fake-game",
    })),
  } as Workflow);

  seededWorkflowId = workflow.id;
  console.log(`[bilko-flow] Seeded DEMO workflow: ${workflow.name} (${workflow.id})`);
  return seededWorkflowId;
}

// ── Routes ──────────────────────────────────────────────────────────

/**
 * POST /api/bilko-flow/demo/run
 *
 * Execute the DEMO fake-game workflow through bilko-flow's engine.
 * Returns the full run result with step outputs, provenance, and timing.
 */
router.post("/demo/run", async (_req: Request, res: Response) => {
  try {
    const workflowId = await ensureSeeded();

    console.log("[bilko-flow] Starting DEMO workflow execution...");
    const startTime = Date.now();

    // Create and execute a run
    const run = await bfContext.executor.createRun({
      workflowId,
      accountId: TENANT_SCOPE.accountId,
      projectId: TENANT_SCOPE.projectId,
      environmentId: TENANT_SCOPE.environmentId,
    });

    const completedRun: Run = await bfContext.executor.executeRun(
      run.id,
      TENANT_SCOPE,
    );

    const durationMs = Date.now() - startTime;
    console.log(
      `[bilko-flow] DEMO workflow ${completedRun.status} in ${durationMs}ms`,
    );

    // Extract the interesting outputs from each step
    const stepOutputs: Record<string, unknown> = {};
    for (const [stepId, result] of Object.entries(completedRun.stepResults)) {
      stepOutputs[stepId] = {
        status: result.status,
        outputs: result.outputs,
        attempts: result.attempts,
        durationMs: result.durationMs,
      };
    }

    res.json({
      success: completedRun.status === "succeeded",
      runId: completedRun.id,
      status: completedRun.status,
      durationMs,
      determinismGrade: completedRun.determinismGrade,
      steps: stepOutputs,
      error: completedRun.error,
    });
  } catch (error) {
    console.error("[bilko-flow] DEMO workflow error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/bilko-flow/demo/test
 *
 * Dry-run: validate and compile the DEMO workflow without executing it.
 * Tests that the workflow definition passes bilko-flow's DSL validation
 * and compiles into a valid execution plan.
 */
router.post("/demo/test", async (_req: Request, res: Response) => {
  try {
    const workflowId = await ensureSeeded();
    const workflow = await bfContext.store.workflows.getById(
      workflowId,
      TENANT_SCOPE.accountId,
      TENANT_SCOPE.projectId,
      TENANT_SCOPE.environmentId,
    );

    if (!workflow) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    // Validate
    const validation = validateWorkflow(workflow);

    // Compile
    const compilation = compileWorkflow(workflow);

    res.json({
      workflowId: workflow.id,
      name: workflow.name,
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      compilation: {
        success: compilation.success,
        errors: compilation.errors,
        executionOrder: compilation.plan?.executionOrder,
        determinism: compilation.plan?.determinismAnalysis,
        planHash: compilation.plan?.planHash,
      },
      steps: workflow.steps.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        dependsOn: s.dependsOn,
      })),
    });
  } catch (error) {
    console.error("[bilko-flow] DEMO test error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/bilko-flow/demo/status
 *
 * Returns the current state of the bilko-flow integration:
 * whether it's initialized, the workflow definition, and recent run history.
 */
router.get("/demo/status", async (_req: Request, res: Response) => {
  try {
    const initialized = seededWorkflowId !== null;
    let workflow = null;

    if (initialized) {
      workflow = await bfContext.store.workflows.getById(
        seededWorkflowId!,
        TENANT_SCOPE.accountId,
        TENANT_SCOPE.projectId,
        TENANT_SCOPE.environmentId,
      );
    }

    res.json({
      initialized,
      workflowId: seededWorkflowId,
      workflow: workflow
        ? {
            name: workflow.name,
            description: workflow.description,
            version: workflow.version,
            status: workflow.status,
            stepCount: workflow.steps.length,
            steps: workflow.steps.map((s) => ({
              id: s.id,
              name: s.name,
              type: s.type,
            })),
          }
        : null,
      engine: "bilko-flow@0.1.0",
      store: "in-memory",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
