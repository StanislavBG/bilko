/**
 * Step validator — checks trace output against manifest validation rules.
 *
 * After triggering a workflow and receiving traces, call validateStepTraces()
 * to get a structured pass/fail report per step.
 */

import type { WorkflowManifest, ManifestStep, StepValidation } from "./manifests/types";
import { loadManifest } from "./incremental-builder";

// ── Types ──

export interface StepResult {
  stepId: string;
  stepName: string;
  status: "pass" | "fail" | "missing";
  checks: CheckResult[];
}

export interface CheckResult {
  check: string;
  passed: boolean;
  detail: string;
}

export interface ValidationReport {
  workflowId: string;
  manifestVersion: string;
  stepsChecked: number;
  passed: number;
  failed: number;
  missing: number;
  steps: StepResult[];
}

// ── Trace shape from Memory Explorer ──

interface TraceData {
  action: string | null;
  overallStatus: string;
  responsePayload?: Record<string, unknown>;
}

// ── Validator ──

export function validateStepTraces(
  manifestId: string,
  traces: TraceData[],
  options: { upToStep?: string } = {}
): ValidationReport | null {
  const manifest = loadManifest(manifestId);
  if (!manifest) return null;

  let steps = manifest.steps;
  if (options.upToStep) {
    const idx = steps.findIndex(s => s.id === options.upToStep);
    if (idx >= 0) steps = steps.slice(0, idx + 1);
  }

  const results: StepResult[] = [];

  for (const step of steps) {
    // Look for troubleshoot parse trace (ts-parse-<id>) or final-output
    const tsTrace = traces.find(t => t.action === `ts-parse-${step.id}`);
    const tracePayload = tsTrace?.responsePayload;

    if (!tsTrace && !tracePayload) {
      // Look for the step data in the final-output trace
      const finalTrace = traces.find(t => t.action === "final-output");
      const finalPayload = finalTrace?.responsePayload as Record<string, unknown> | undefined;
      const data = finalPayload?.data as Record<string, unknown> | undefined;

      if (data && step.outputKey && data[step.outputKey] !== undefined) {
        results.push(validateStep(step, data));
      } else {
        results.push({
          stepId: step.id,
          stepName: step.name,
          status: "missing",
          checks: [{ check: "trace_exists", passed: false, detail: `No trace found for step ${step.id}` }]
        });
      }
      continue;
    }

    results.push(validateStep(step, tracePayload || {}));
  }

  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "fail").length;
  const missing = results.filter(r => r.status === "missing").length;

  return {
    workflowId: manifestId,
    manifestVersion: manifest.version,
    stepsChecked: steps.length,
    passed,
    failed,
    missing,
    steps: results
  };
}

function validateStep(step: ManifestStep, data: Record<string, unknown>): StepResult {
  const checks: CheckResult[] = [];
  const validation = step.validation;

  if (!validation) {
    return {
      stepId: step.id,
      stepName: step.name,
      status: "pass",
      checks: [{ check: "no_rules", passed: true, detail: "No validation rules defined — auto-pass" }]
    };
  }

  // Required keys
  if (validation.required) {
    for (const key of validation.required) {
      const val = data[key];
      const exists = val !== undefined && val !== null;
      checks.push({
        check: `required:${key}`,
        passed: exists,
        detail: exists ? `Key "${key}" present` : `Key "${key}" missing from output`
      });
    }
  }

  // Min count
  if (validation.minCount) {
    for (const [key, min] of Object.entries(validation.minCount)) {
      const arr = data[key];
      const count = Array.isArray(arr) ? arr.length : 0;
      const passed = count >= min;
      checks.push({
        check: `minCount:${key}>=${min}`,
        passed,
        detail: passed ? `${key} has ${count} items (>= ${min})` : `${key} has ${count} items, expected >= ${min}`
      });
    }
  }

  const allPassed = checks.every(c => c.passed);
  return {
    stepId: step.id,
    stepName: step.name,
    status: allPassed ? "pass" : "fail",
    checks
  };
}
