/**
 * bilko-flow Integration Routes
 *
 * Exposes the bilko-flow deterministic workflow engine as API endpoints
 * within the Bilko web application.
 *
 * All flows (newsletter, work-with-me, ai-consultation, recursive-interviewer,
 * linkedin-strategist, socratic-architect) are registered as bilko-flow DSL
 * workflows and seeded into the in-memory store on first request.
 *
 * Endpoints:
 *   POST /api/bilko-flow/demo/run     — Execute a workflow by ID (default: newsletter)
 *   GET  /api/bilko-flow/demo/status   — Check status and list all registered workflows
 *   POST /api/bilko-flow/demo/test     — Dry-run validation & compilation
 *   GET  /api/bilko-flow/workflows     — List all registered workflow definitions
 */

import { Router, Request, Response } from "express";
import {
  createAppContext,
  compileWorkflow,
  validateHandlers,
  validateWorkflow,
} from "bilko-flow";
import type { Run, Workflow, CreateWorkflowInput, TenantScope } from "bilko-flow";
import { registerLLMStepHandler } from "./llm-step-handler";
import { createNewsletterWorkflowInput } from "./newsletter-workflow";
import { createWorkWithMeWorkflowInput } from "./work-with-me-workflow";
import { createAiConsultationWorkflowInput } from "./ai-consultation-workflow";
import { createRecursiveInterviewerWorkflowInput } from "./recursive-interviewer-workflow";
import { createLinkedInStrategistWorkflowInput } from "./linkedin-strategist-workflow";
import { createSocraticArchitectWorkflowInput } from "./socratic-architect-workflow";
import { createAiVideoWorkflowInput } from "./ai-video-workflow";

const router = Router();

// ── Initialize bilko-flow context (in-memory store, no separate server) ──

const bfContext = createAppContext();
registerLLMStepHandler();

// Track seeded state and tenant scope
let seeded = false;
const seededWorkflowIds: string[] = [];
const TENANT_SCOPE: TenantScope = {
  accountId: "",
  projectId: "",
  environmentId: "",
};

/** All workflow factories keyed by their runtime ID */
const WORKFLOW_REGISTRY: Array<{
  id: string;
  factory: (a: string, p: string, e: string) => CreateWorkflowInput;
}> = [
  { id: "demo-newsletter", factory: createNewsletterWorkflowInput },
  { id: "work-with-me", factory: createWorkWithMeWorkflowInput },
  { id: "ai-consultation", factory: createAiConsultationWorkflowInput },
  { id: "recursive-interviewer", factory: createRecursiveInterviewerWorkflowInput },
  { id: "linkedin-strategist", factory: createLinkedInStrategistWorkflowInput },
  { id: "socratic-architect", factory: createSocraticArchitectWorkflowInput },
  { id: "ai-video", factory: createAiVideoWorkflowInput },
];

/**
 * Initialize: seed account + project + environment + ALL workflows into bilko-flow's store.
 * Called lazily on first request.
 */
async function ensureSeeded(): Promise<void> {
  if (seeded) return;

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
    name: "Bilko Flows",
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

  // Seed all workflows
  for (const { id, factory } of WORKFLOW_REGISTRY) {
    const workflowInput = factory(account.id, project.id, environment.id);

    const workflow = await store.workflows.create({
      ...workflowInput,
      id,
      version: 1,
      specVersion: "1.0.0",
      status: "active" as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: workflowInput.steps.map((s) => ({
        ...s,
        workflowId: id,
      })),
    } as Workflow);

    seededWorkflowIds.push(workflow.id);
    console.log(`[bilko-flow] Seeded workflow: ${workflow.name} (${workflow.id})`);
  }

  seeded = true;
  console.log(`[bilko-flow] All ${seededWorkflowIds.length} workflows seeded`);
}

// ── Routes ──────────────────────────────────────────────────────────

/**
 * POST /api/bilko-flow/demo/run
 *
 * Execute a workflow through bilko-flow's engine.
 * Accepts optional ?workflowId= query param (defaults to "demo-newsletter").
 * Returns the full run result with step outputs, provenance, and timing.
 */
router.post("/demo/run", async (req: Request, res: Response) => {
  try {
    await ensureSeeded();
    const workflowId = (req.query.workflowId as string) || "demo-newsletter";

    console.log(`[bilko-flow] Starting workflow execution: ${workflowId}...`);

    // Pre-flight: compile and validate handler contracts before execution
    const workflow = await bfContext.store.workflows.getById(
      workflowId,
      TENANT_SCOPE,
    );

    if (!workflow) {
      res.status(404).json({ error: `Workflow "${workflowId}" not found` });
      return;
    }

    const compilation = compileWorkflow(workflow);
    if (!compilation.success) {
      console.error(`[bilko-flow] Workflow "${workflowId}" failed compilation:`, compilation.errors);
      res.status(400).json({
        error: "Workflow failed compilation (contract validation)",
        details: compilation.errors,
      });
      return;
    }

    // Run async handler validation (model availability, input constraints)
    if (compilation.plan) {
      const handlerErrors = await validateHandlers(compilation.plan.steps ?? {});
      if (handlerErrors.length > 0) {
        console.error(`[bilko-flow] Workflow "${workflowId}" failed handler validation:`, handlerErrors);
        res.status(400).json({
          error: "Workflow failed pre-flight validation",
          details: handlerErrors.map((e) => ({
            code: e.code,
            message: e.message,
            stepId: e.stepId,
            suggestedFixes: e.suggestedFixes,
          })),
        });
        return;
      }
    }

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
      `[bilko-flow] Workflow ${workflowId} ${completedRun.status} in ${durationMs}ms`,
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
      workflowId,
      status: completedRun.status,
      durationMs,
      determinismGrade: completedRun.determinismGrade,
      steps: stepOutputs,
      error: completedRun.error,
    });
  } catch (error) {
    console.error("[bilko-flow] Workflow execution error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/bilko-flow/demo/test
 *
 * Dry-run: validate and compile a workflow without executing it.
 * Accepts optional ?workflowId= query param (defaults to "demo-newsletter").
 */
router.post("/demo/test", async (req: Request, res: Response) => {
  try {
    await ensureSeeded();
    const workflowId = (req.query.workflowId as string) || "demo-newsletter";

    const workflow = await bfContext.store.workflows.getById(
      workflowId,
      TENANT_SCOPE,
    );

    if (!workflow) {
      res.status(404).json({ error: `Workflow "${workflowId}" not found` });
      return;
    }

    // Validate structure
    const validation = validateWorkflow(workflow);

    // Compile (includes sync handler contract validation)
    const compilation = compileWorkflow(workflow);

    // Async handler validation (model availability, pre-flight checks)
    let handlerValidation: { valid: boolean; errors: Array<{ code: string; message: string; stepId?: string }> } = {
      valid: true,
      errors: [],
    };
    if (compilation.success && compilation.plan) {
      const handlerErrors = await validateHandlers(compilation.plan.steps ?? {});
      if (handlerErrors.length > 0) {
        handlerValidation = {
          valid: false,
          errors: handlerErrors.map((e) => ({
            code: e.code,
            message: e.message,
            stepId: e.stepId,
          })),
        };
      }
    }

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
      handlerValidation,
      steps: workflow.steps.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        dependsOn: s.dependsOn,
      })),
    });
  } catch (error) {
    console.error("[bilko-flow] Test error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/bilko-flow/demo/status
 *
 * Returns the current state of the bilko-flow integration:
 * whether it's initialized and the list of all registered workflows.
 */
router.get("/demo/status", async (_req: Request, res: Response) => {
  try {
    await ensureSeeded();

    const workflows = [];
    for (const id of seededWorkflowIds) {
      const workflow = await bfContext.store.workflows.getById(
        id,
        TENANT_SCOPE,
      );
      if (workflow) {
        workflows.push({
          id: workflow.id,
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
        });
      }
    }

    res.json({
      initialized: seeded,
      workflowCount: workflows.length,
      workflows,
      engine: "bilko-flow@0.1.0",
      store: "in-memory",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/bilko-flow/workflows
 *
 * List all registered workflow definitions with their steps and metadata.
 */
router.get("/workflows", async (_req: Request, res: Response) => {
  try {
    await ensureSeeded();

    const workflows = [];
    for (const id of seededWorkflowIds) {
      const workflow = await bfContext.store.workflows.getById(
        id,
        TENANT_SCOPE,
      );
      if (workflow) {
        workflows.push({
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          stepCount: workflow.steps.length,
          entryStepId: workflow.entryStepId,
          determinism: workflow.determinism,
          steps: workflow.steps.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            description: s.description,
            dependsOn: s.dependsOn,
          })),
        });
      }
    }

    res.json({ workflows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
