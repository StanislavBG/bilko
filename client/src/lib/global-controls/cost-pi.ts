/**
 * Cost PI — Non-UI cost computation for all applications.
 *
 * The single source of truth for cost estimation and formatting.
 * No application should compute costs locally; they must use this PI.
 */

import type {
  CostPI,
  CostModelConfig,
  CostPIState,
  CostPIActions,
  TokenUsageSummary,
} from "./types";

// ── Default model config (Gemini 2.5 Flash pricing) ──────

const DEFAULT_CONFIG: CostModelConfig = {
  inputPer1K: 0.00015,
  outputPer1K: 0.0006,
  model: "gemini-2.5-flash",
};

// ── Pure cost estimation (no UI dependency) ──────────────

function computeCost(
  steps: Record<string, { usage?: TokenUsageSummary }>,
  config: CostModelConfig,
): number {
  let cost = 0;
  for (const step of Object.values(steps)) {
    if (step.usage) {
      cost += (step.usage.promptTokens / 1000) * config.inputPer1K;
      cost += (step.usage.completionTokens / 1000) * config.outputPer1K;
    }
  }
  return cost;
}

function formatCostValue(cost: number): string {
  if (cost < 0.001) return "<$0.001";
  return `$${cost.toFixed(4)}`;
}

// ── PI factory ───────────────────────────────────────────

export function createCostPI(initialConfig?: CostModelConfig): {
  getPI: () => CostPI;
  setConfig: (config: CostModelConfig) => void;
} {
  let config = initialConfig ?? { ...DEFAULT_CONFIG };

  function getPI(): CostPI {
    const state: CostPIState = { config: { ...config } };

    const actions: CostPIActions = {
      estimateCost: (steps) => computeCost(steps, config),
      formatCost: formatCostValue,
      setConfig: (newConfig) => {
        config = { ...newConfig };
      },
    };

    return {
      id: "PI-COST",
      label: "Cost Estimation",
      state,
      actions,
    };
  }

  return {
    getPI,
    setConfig: (newConfig) => {
      config = { ...newConfig };
    },
  };
}

/**
 * Singleton cost PI for non-React contexts.
 * React consumers should use the context-based hook instead.
 */
const singleton = createCostPI();

/** Direct access: estimate cost from step executions */
export const estimateCost = (
  steps: Record<string, { usage?: TokenUsageSummary }>,
): number => singleton.getPI().actions.estimateCost(steps);

/** Direct access: format a cost number */
export const formatCost = (cost: number): string =>
  singleton.getPI().actions.formatCost(cost);

/** Direct access: get current config */
export const getCostConfig = (): CostModelConfig => ({
  ...singleton.getPI().state.config,
});
