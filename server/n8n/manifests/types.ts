/**
 * Manifest types for n8n workflow definitions.
 *
 * A manifest is a human-curated JSON file that describes an n8n workflow
 * step by step. The incremental builder reads it and generates n8n nodes.
 *
 * Rate limit config follows INT-N8N-002 D11 and ISSUE-013.
 */

// ── Rate Limiting (INT-N8N-002 D11, ISSUE-013) ──

export interface RateLimitConfig {
  /** Wait node inserted between sequential Gemini API calls (D11) */
  betweenSteps: {
    amount: number;
    unit: "seconds" | "minutes";
  };
  /** HTTP Request node retry config (D11) */
  httpRetry: {
    enabled: boolean;
    maxTries: number;
    waitMs: number;
  };
  /** Batching for multi-item workflows (ISSUE-013) */
  batching: {
    batchSize: number;
    intervalMs: number;
  };
}

// ── Gemini Config ──

export interface GeminiConfig {
  /** Model name (e.g., "gemini-2.5-flash") */
  model: string;
  /** Full Gemini API URL */
  url: string;
  /** Custom User-Agent to avoid blocks (D12) */
  userAgent: string;
}

// ── Step Prompt Inputs ──

export interface StepInput {
  /**
   * Where to get the raw value:
   * - "webhook": from webhook payload (first step only)
   * - "previous": from the previous step's parse output
   * - "<step-id>": from a specific earlier step's parse output
   */
  source: "webhook" | "previous" | string;
  /** Dot-path to the value (e.g., "body.recentTopics", "topics") */
  path: string;
  /**
   * JS expression to format the raw value.
   * Receives `items` (the resolved value at `path`).
   * Must return a string to interpolate into the prompt.
   */
  formatCode?: string;
  /** If true, append result to end of prompt instead of replacing {varName} */
  append?: boolean;
}

// ── Validation ──

export interface StepValidation {
  /** Keys that must exist in the parsed output */
  required?: string[];
  /** Minimum array length per key */
  minCount?: Record<string, number>;
}

// ── Milestone Callback ──

export interface MilestoneCallback {
  /** Callback step name (e.g., "research-complete") */
  name: string;
  /** Status to report */
  status: "in_progress" | "success";
  /** Fields from step output to include in callback */
  fields?: string[];
}

// ── Manifest Step ──

export interface ManifestStep {
  id: string;
  name: string;
  type: "gemini";
  description: string;

  // Prompt
  prompt: string;
  promptInputs?: Record<string, StepInput>;
  temperature?: number;
  maxTokens?: number;

  // Output processing
  /** Key to extract from parsed Gemini JSON (e.g., "topics") */
  outputKey?: string;
  /** Truncate the extracted array to this length */
  outputSlice?: number;

  // Milestone callback after this step (production mode)
  milestoneCallback?: MilestoneCallback;

  // Validation rules checked against trace output
  validation?: StepValidation;
}

// ── Workflow Manifest ──

export interface WorkflowManifest {
  id: string;
  name: string;
  version: string;
  webhookPath: string;
  description: string;
  category: string;

  triggers: {
    webhook: boolean;
    schedule?: { cron: string };
  };

  rateLimits: RateLimitConfig;
  gemini: GeminiConfig;

  steps: ManifestStep[];
}
