/**
 * Global Controls — Barrel export.
 *
 * This module defines the cross-application boundary layer.
 * Applications interact with global controls exclusively through
 * the PI (Program Interface) contract exported here.
 */

// PI types
export type {
  GlobalControlId,
  GlobalControlsMap,
  ProgramInterface,
  ThemePI,
  ThemePIState,
  ThemePIActions,
  ThemeValue,
  ViewModePI,
  ViewModePIState,
  ViewModePIActions,
  DebugPI,
  DebugPIState,
  DebugPIActions,
  DebugEntry,
  SessionPI,
  SessionPIState,
  SessionPIActions,
  NavTogglePI,
  NavTogglePIState,
  NavTogglePIActions,
  CostPI,
  CostPIState,
  CostPIActions,
  CostModelConfig,
  TokenUsageSummary,
  ChatDirectionPI,
  ChatDirectionPIState,
  ChatDirectionPIActions,
  ChatDirectionValue,
} from "./types";

// Context provider and hooks
export {
  GlobalControlsProvider,
  useGlobalControls,
  useGlobalControl,
} from "./context";

// Standalone cost utilities (for non-React contexts)
export { estimateCost, formatCost, getCostConfig } from "./cost-pi";

// Application boundary
export type { ApplicationDefinition } from "./application-boundary";
export {
  applicationRegistry,
  getApplicationById,
  getApplicationForRoute,
} from "./application-boundary";
