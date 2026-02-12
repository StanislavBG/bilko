/**
 * FlowProgress — Re-export from bilko-flow/react.
 *
 * The canonical implementation lives in the bilko-flow package.
 * This re-export exists for backward compatibility with components
 * that import from "@/components/ui/flow-progress".
 */
export { FlowProgress, adaptSteps } from "bilko-flow/react";
export type {
  FlowProgressStep,
  FlowProgressProps,
  FlowProgressTheme,
  FlowProgressAdapter,
  FlowProgressStepRenderer,
} from "bilko-flow/react";
