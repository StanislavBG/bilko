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
 * ║  v0.3.0: SSE hook, parallel threads, FlowErrorBoundary, ║
 * ║    FlowProgressVertical, mergeTheme, DOMAIN_STEP_TYPE_MAP║
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
export { apiPost, apiGet, apiPatch, validateVideos, searchYouTube, generateImage, generateImages, generateClip, generateClips, generateVideo, concatenateVideos, extractLastFrame, createVideoRun, updateVideoRun, saveVideoClip, saveVideoFinal, listVideoRuns, getVideoRun, APIError } from "./llm/api";
export type { VideoCandidate, ImageGenerationResult, ClipGenerationResult, VideoGenerationResult, VideoResult, ContinuousVideoResult, ConcatResult, VideoRunSummary, VideoRunDetail } from "./llm/api";

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
export { STEP_TYPE_CONFIG, LLM_SUBTYPE_CONFIG, getStepVisuals, mergeTheme, DEFAULT_FLOW_PROGRESS_THEME } from "bilko-flow/react";
export type { StepTypeVisuals } from "bilko-flow/react";

// ── Domain Step Type Map (v0.3.0 — now from bilko-flow/react) ─
export { DOMAIN_STEP_TYPE_MAP } from "bilko-flow/react";

// ── Component Definitions (from bilko-flow/react) ───────────
export { DEFAULT_COMPONENT_DEFINITIONS, getComponentByType } from "bilko-flow/react";
export type { ComponentDefinition, ComponentFieldSpec, ComponentUseCase, ComponentReference } from "bilko-flow/react";

// ── v0.3.0: FlowErrorBoundary ────────────────────────────────
export { FlowErrorBoundary } from "bilko-flow/react";
export type { FlowErrorBoundaryProps } from "bilko-flow/react";

// ── v0.3.0: FlowProgressVertical ─────────────────────────────
export { FlowProgressVertical } from "bilko-flow/react";
export type { FlowProgressVerticalProps } from "bilko-flow/react";

// ── v0.3.0: Parallel Threads ─────────────────────────────────
export { ParallelThreadsSection, MAX_PARALLEL_THREADS } from "bilko-flow/react";
export type { ParallelThreadsSectionProps } from "bilko-flow/react";

// ── v0.3.0: SSE Hook ────────────────────────────────────────
export { useFlowSSE } from "bilko-flow/react";
export type { UseFlowSSEOptions, UseFlowSSEReturn, SSEConnectionState, SSEStepUpdate } from "bilko-flow/react";

// ── v0.3.0: Shared Utilities ─────────────────────────────────
export { resolveStepMeta, applyStatusMap, getStatusIcon } from "bilko-flow/react";
export type { ResolvedStepMeta } from "bilko-flow/react";

// ── v0.3.0: Additional types ─────────────────────────────────
export type {
  FlowProgressStep,
  FlowProgressProps,
  FlowProgressTheme,
  ParallelThread,
  ParallelConfig,
  PipelineConfig,
} from "bilko-flow/react";
