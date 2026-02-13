/**
 * FlowProgress — Re-export from bilko-flow/react.
 *
 * The upstream library now handles all five display modes natively:
 *   - "full"     → Large numbered circles with phase labels
 *   - "compact"  → Inline dot chain with type-aware theming
 *   - "expanded" → Rectangular step cards with icons and labels
 *   - "vertical" → Top-to-bottom timeline (FlowProgressVertical)
 *   - "auto"     → ResizeObserver switches vertical ↔ expanded at breakpoint
 *
 * Previously this file wrapped BaseFlowProgress to add auto-mode
 * ResizeObserver logic and FlowProgressVertical delegation. That logic
 * now lives in the upstream FlowProgress component, making this wrapper
 * redundant.
 *
 * Parallel thread visualization is also built in — pass `parallelThreads`
 * and `parallelConfig` props for fork-join workflows.
 */

export { FlowProgress, adaptSteps } from "bilko-flow/react";
export type {
  FlowProgressStep,
  FlowProgressProps,
  FlowProgressTheme,
  FlowProgressAdapter,
  FlowProgressStepRenderer,
} from "bilko-flow/react";
