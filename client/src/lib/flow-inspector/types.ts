/**
 * Flow Inspector Types
 *
 * Defines the schema for inspectable PER-002 flows.
 * Each flow definition describes its steps, prompts, inputs, and outputs
 * so the inspector can visualize and replay them.
 */

export type StepType = "llm" | "user-input" | "transform" | "validate" | "display";
export type StepStatus = "idle" | "running" | "success" | "error" | "skipped";

/** A single step in a flow */
export interface FlowStep {
  id: string;
  name: string;
  type: StepType;
  description: string;
  /** The system prompt (for LLM steps) */
  prompt?: string;
  /** The user message template (for LLM steps) */
  userMessage?: string;
  /** Model used */
  model?: string;
  /** JSON schema description of expected input */
  inputSchema?: SchemaField[];
  /** JSON schema description of expected output */
  outputSchema?: SchemaField[];
  /** IDs of steps this depends on */
  dependsOn: string[];
  /** Can this step run in parallel with siblings? */
  parallel?: boolean;
}

export interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  example?: string;
}

/** A complete inspectable flow definition */
export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  /** Where this flow is used */
  location: "landing" | "academy" | "admin";
  /** The React component that renders this flow */
  componentPath: string;
  /** Ordered steps */
  steps: FlowStep[];
  /** Tags for filtering */
  tags: string[];
}

/** Runtime execution data captured from a step */
export interface StepExecution {
  stepId: string;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  /** Raw LLM response (before parsing) */
  rawResponse?: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** A complete execution trace of a flow run */
export interface FlowExecution {
  id: string;
  flowId: string;
  startedAt: number;
  completedAt?: number;
  status: "running" | "completed" | "failed";
  steps: Record<string, StepExecution>;
}
