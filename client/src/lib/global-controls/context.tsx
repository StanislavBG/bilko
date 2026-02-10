/**
 * Global Controls Context — Provides all PIs to the component tree.
 *
 * Each global control is a distinctive PI (Program Interface) with a unique ID.
 * Applications access controls exclusively through the useGlobalControl(id) hook,
 * enforcing the cross-application contract.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useTheme } from "@/components/theme-provider";
import { useViewMode } from "@/contexts/view-mode-context";
import { useDebug } from "@/contexts/debug-context";
import { useSidebar } from "@/components/ui/sidebar";
import { queryClient } from "@/lib/queryClient";
import type {
  GlobalControlsMap,
  GlobalControlId,
  ThemePI,
  ViewModePI,
  DebugPI,
  SessionPI,
  NavTogglePI,
  CostPI,
  CostModelConfig,
  TokenUsageSummary,
} from "./types";

// ── Cost defaults (Gemini 2.5 Flash) ─────────────────────

const DEFAULT_COST_CONFIG: CostModelConfig = {
  inputPer1K: 0.00015,
  outputPer1K: 0.0006,
  model: "gemini-2.5-flash",
};

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

// ── Context ──────────────────────────────────────────────

const GlobalControlsContext = createContext<GlobalControlsMap | undefined>(
  undefined,
);

// ── Provider ─────────────────────────────────────────────

export function GlobalControlsProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { isViewingAsUser, effectiveIsAdmin, toggleViewMode, canToggleViewMode } =
    useViewMode();
  const { entries, unreadCount, markRead, clear, copyToClipboard } = useDebug();
  const { toggleSidebar, toggleHidden, hidden, isMobile } = useSidebar();

  // Cost config is the only locally-owned state in this provider
  const [costConfig, setCostConfig] = useState<CostModelConfig>(DEFAULT_COST_CONFIG);

  // ── Theme PI ─────────────────────────────────

  const themePI: ThemePI = useMemo(
    () => ({
      id: "PI-THEME",
      label: "Theme",
      state: { theme },
      actions: {
        setTheme,
        toggle: () => setTheme(theme === "light" ? "dark" : "light"),
      },
    }),
    [theme, setTheme],
  );

  // ── View-Mode PI ─────────────────────────────

  const viewModePI: ViewModePI = useMemo(
    () => ({
      id: "PI-VIEW-MODE",
      label: "View Mode",
      state: { isViewingAsUser, effectiveIsAdmin, canToggleViewMode },
      actions: { toggleViewMode },
    }),
    [isViewingAsUser, effectiveIsAdmin, canToggleViewMode, toggleViewMode],
  );

  // ── Debug PI ─────────────────────────────────

  const debugPI: DebugPI = useMemo(
    () => ({
      id: "PI-DEBUG",
      label: "Debug Log",
      state: { entries, unreadCount },
      actions: { markRead, clear, copyToClipboard },
    }),
    [entries, unreadCount, markRead, clear, copyToClipboard],
  );

  // ── Session PI ───────────────────────────────

  const resetSession = useCallback(() => {
    sessionStorage.removeItem("bilko-conversation");
    localStorage.removeItem("bilko-execution-history");
    queryClient.clear();
    window.location.href = "/";
  }, []);

  const sessionPI: SessionPI = useMemo(
    () => ({
      id: "PI-SESSION",
      label: "Session",
      state: { isSpeaking: false },
      actions: { resetSession },
    }),
    [resetSession],
  );

  // ── Nav Toggle PI ────────────────────────────

  const navToggle = useCallback(() => {
    if (isMobile) {
      toggleSidebar();
    } else {
      toggleHidden();
    }
  }, [isMobile, toggleSidebar, toggleHidden]);

  const navTogglePI: NavTogglePI = useMemo(
    () => ({
      id: "PI-NAV-TOGGLE",
      label: "Navigation Toggle",
      state: { hidden, isMobile },
      actions: { toggle: navToggle },
    }),
    [hidden, isMobile, navToggle],
  );

  // ── Cost PI ──────────────────────────────────

  const costEstimate = useCallback(
    (steps: Record<string, { usage?: TokenUsageSummary }>) =>
      computeCost(steps, costConfig),
    [costConfig],
  );

  const costPI: CostPI = useMemo(
    () => ({
      id: "PI-COST",
      label: "Cost Estimation",
      state: { config: { ...costConfig } },
      actions: {
        estimateCost: costEstimate,
        formatCost: formatCostValue,
        setConfig: setCostConfig,
      },
    }),
    [costConfig, costEstimate],
  );

  // ── Assemble map ─────────────────────────────

  const controls: GlobalControlsMap = useMemo(
    () => ({
      "PI-THEME": themePI,
      "PI-VIEW-MODE": viewModePI,
      "PI-DEBUG": debugPI,
      "PI-SESSION": sessionPI,
      "PI-NAV-TOGGLE": navTogglePI,
      "PI-COST": costPI,
    }),
    [themePI, viewModePI, debugPI, sessionPI, navTogglePI, costPI],
  );

  return (
    <GlobalControlsContext.Provider value={controls}>
      {children}
    </GlobalControlsContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────

/** Access all global controls. Primarily for the global header. */
export function useGlobalControls(): GlobalControlsMap {
  const ctx = useContext(GlobalControlsContext);
  if (ctx === undefined) {
    throw new Error(
      "useGlobalControls must be used within a GlobalControlsProvider",
    );
  }
  return ctx;
}

/** Access a single global control PI by its unique ID. This is the primary contract for applications. */
export function useGlobalControl<K extends GlobalControlId>(
  id: K,
): GlobalControlsMap[K] {
  const controls = useGlobalControls();
  return controls[id];
}
