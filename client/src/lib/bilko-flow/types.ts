/**
 * Bilko Flow API — Core Type Definitions
 *
 * Shared types are re-exported from bilko-flow/react (canonical source).
 * Bilko-specific extensions (FlowDefinition, SchemaField, FlowOutput,
 * FlowExecution) are defined locally.
 */

import type {
  UIStepType,
  StepStatus as LibStepStatus,
  StepExecution as LibStepExecution,
} from "bilko-flow/react";

// ── Shared types from bilko-flow/react ─────────────────────

/** Step type alias — re-exported from bilko-flow/react's UIStepType */
export type StepType = UIStepType;

export type StepStatus = LibStepStatus;

/** Identical to bilko-flow/react's StepExecution */
export type StepExecution = LibStepExecution;

// ── Bilko-specific types ───────────────────────────────────

export interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  example?: string;
}

/** Describes the single logical output of a flow */
export interface FlowOutput {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
}

/** User-facing phase group for progress display.
 *  Maps bus-published phase IDs to short labels and registry step ranges. */
export interface FlowPhase {
  /** Phase ID as published to FlowBus (e.g. "researching-topics") */
  id: string;
  /** Short user-facing label (e.g. "Research") */
  label: string;
  /** Registry step IDs covered by this phase */
  stepIds: string[];
}

/** A single step in a flow */
export interface FlowStep {
  id: string;
  name: string;
  type: StepType;
  /** Optional subtype refining the step's type (e.g. "menu", "text", "form" for user-input) */
  subtype?: string;
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

/** A complete inspectable flow definition */
export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  /** Where this flow is used */
  location: "landing" | "admin";
  /** The React component that renders this flow */
  componentPath: string;
  /** Steps (order in array is irrelevant — graph is defined by dependsOn) */
  steps: FlowStep[];
  /** Tags for filtering */
  tags: string[];
  /** The single logical output of the flow (can be complex) */
  output?: FlowOutput;
  /** Lucide icon name for menu rendering (e.g. "Play", "MessageCircle") */
  icon?: string;
  /** Voice trigger keywords for voice-based selection */
  voiceTriggers?: string[];
  /** User-facing phase groups for progress stepper display.
   *  Each phase maps a bus-published phase ID → short label + covered steps. */
  phases?: FlowPhase[];
  /** Canonical URL where this flow can be tested (shown on landing tiles for in-testing flows) */
  websiteUrl?: string;
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
