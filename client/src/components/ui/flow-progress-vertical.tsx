/**
 * FlowProgressVertical — Re-export from bilko-flow/react.
 *
 * Previously this file duplicated shared utilities (computeWindow, resolveStepBg,
 * getTypeIcon, etc.) from the bilko-flow library. The upstream now provides
 * FlowProgressVertical as a first-class export with centralized shared logic
 * in flow-progress-shared.ts, proper data-testid attributes, ARIA labels,
 * and displayName.
 *
 * Consumers should import { FlowProgressVertical } from this file or from
 * bilko-flow/react directly.
 */

export { FlowProgressVertical } from "bilko-flow/react";
export type { FlowProgressVerticalProps } from "bilko-flow/react";
