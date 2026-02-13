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
 * ║    definitions/  — Registry, validation                  ║
 * ║                                                          ║
 * ║  Shared modules (from bilko-flow/react):                 ║
 * ║    Layout, step visuals, mutations, component defs       ║
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
export { apiPost, apiGet, validateVideos, searchYouTube, generateImage, generateImages, generateVideo, generateVideos, generateContinuousVideo, concatenateVideos, APIError } from "./llm/api";
export type { VideoCandidate, ImageGenerationResult, VideoGenerationResult, ContinuousVideoResult, ConcatResult } from "./llm/api";

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

// ── Flow Mutations (from bilko-flow/react) ──────────────────
export {
  applyMutation,
  generateStepId,
  createBlankStep,
} from "bilko-flow/react";
export type { FlowMutation, MutationResult, MutationValidationError } from "bilko-flow/react";

// ── Inspector: DAG Layout (from bilko-flow/react) ───────────
export { computeLayout, NODE_W, NODE_H, COL_GAP, ROW_GAP, PADDING } from "bilko-flow/react";
export type { NodeLayout, EdgeLayout, DAGLayout } from "bilko-flow/react";

// ── Inspector: Step Visuals (from bilko-flow/react) ─────────
export { STEP_TYPE_CONFIG, LLM_SUBTYPE_CONFIG, getStepVisuals } from "bilko-flow/react";
export type { StepTypeVisuals } from "bilko-flow/react";

// ── Domain Step Type Map (local) ─────────────────────────────
export const DOMAIN_STEP_TYPE_MAP: Record<string, string> = {
  "ai.generate-text": "llm",
  "ai.generate-text-local": "llm",
  "ai.summarize": "llm",
  "ai.summarize-local": "llm",
  "ai.embed-local": "llm",
  "ai.generate-image": "llm",
  "ai.generate-video": "llm",
  "transform.filter": "transform",
  "transform.map": "transform",
  "transform.reduce": "transform",
  "http.search": "external-input",
  "http.request": "external-input",
  "notification.send": "display",
  "social.post": "chat",
  "user.text-input": "user-input",
  "ui.display": "display",
};

// ── Component Definitions (from bilko-flow/react) ───────────
export { DEFAULT_COMPONENT_DEFINITIONS, getComponentByType } from "bilko-flow/react";
export type { ComponentDefinition, ComponentFieldSpec, ComponentUseCase, ComponentReference } from "bilko-flow/react";
