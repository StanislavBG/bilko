/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║            BILKO FLOW API — Unified Service             ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║                                                          ║
 * ║  The single entry point for all in-platform flow         ║
 * ║  operations in Bilko's Mental Gym.                       ║
 * ║                                                          ║
 * ║  Architecture: ARCH-005 (Flow Steel Frame)               ║
 * ║  Persona:      PER-002 (In-Platform Workflow Agent)      ║
 * ║                                                          ║
 * ║  Sub-modules:                                            ║
 * ║    llm/          — LLM client (chatJSON, chat)           ║
 * ║    runtime/      — Execution tracking, chat, bridge      ║
 * ║    definitions/  — Registry, validation, mutations       ║
 * ║    inspector/    — DAG layout, step visuals              ║
 * ║                                                          ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ── Core Types ──────────────────────────────────────────────
export type {
  StepType,
  StepStatus,
  FlowStep,
  SchemaField,
  FlowOutput,
  FlowPhase,
  FlowDefinition,
  StepExecution,
  FlowExecution,
} from "./types";

// ── LLM Client ──────────────────────────────────────────────
export { chat, chatJSON, jsonPrompt, LLMError, LLMParseError } from "./llm/client";
export type { ChatMessage, TokenUsage, LLMResult, LLMOptions } from "./llm/client";

// ── HTTP API Helpers ────────────────────────────────────────
export { apiPost, apiGet, validateVideos, searchYouTube, generateImage, generateImages, generateVideo, generateVideos, APIError } from "./llm/api";
export type { VideoCandidate, ImageGenerationResult, VideoGenerationResult } from "./llm/api";

// ── Flow Execution Runtime ──────────────────────────────────
export { useFlowExecution, useExecutionStore } from "./runtime/use-flow-execution";
export type { TrackStepResult, UseFlowExecutionReturn } from "./runtime/use-flow-execution";

// ── Execution Store ─────────────────────────────────────────
export { getExecutionHistory, getHistoricalExecution, clearHistory, clearLiveExecution } from "./runtime/execution-store";

// ── Flow Chat ───────────────────────────────────────────────
export { FlowChatProvider, useFlowChat } from "./runtime/flow-chat";
export type {
  FlowChatMessage,
  PushMessageParams,
  PushMessageFn,
  MessageDirection,
} from "./runtime/flow-chat";

// ── Flow Definition Bridge ──────────────────────────────────
export { useFlowDefinition } from "./runtime/use-flow-definition";
export type { FlowDefinitionBridge } from "./runtime/use-flow-definition";

// ── Flow Definitions & Registry ─────────────────────────────
export { flowRegistry, activeFlowIds, getFlowById } from "./definitions/registry";
export { validateFlowDefinition, validateRegistry } from "./definitions/validate";
export type { FlowValidationError } from "./definitions/validate";

// ── Flow Mutations ──────────────────────────────────────────
export {
  applyMutation,
  generateStepId,
  createBlankStep,
} from "./definitions/mutations";
export type { FlowMutation, MutationResult, MutationValidationError } from "./definitions/mutations";

// ── Inspector: DAG Layout ───────────────────────────────────
export { computeLayout, NODE_W, NODE_H, COL_GAP, ROW_GAP, PADDING } from "./inspector/layout";
export type { NodeLayout, EdgeLayout, DAGLayout } from "./inspector/layout";

// ── Inspector: Step Visuals ─────────────────────────────────
export { STEP_TYPE_CONFIG, LLM_SUBTYPE_CONFIG, getStepVisuals } from "./inspector/step-type-config";
export type { StepTypeVisuals } from "./inspector/step-type-config";
