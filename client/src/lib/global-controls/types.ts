/**
 * Global Controls — Program Interface (PI) Types
 *
 * Each global control is defined as a distinctive PI with a unique ID.
 * PIs are independent from any specific application's UI layout or components.
 * Applications may call/read global controls only through their PI contract.
 */

/** Unique identifiers for each global control PI */
export type GlobalControlId =
  | "PI-THEME"
  | "PI-VIEW-MODE"
  | "PI-DEBUG"
  | "PI-SESSION"
  | "PI-NAV-TOGGLE"
  | "PI-COST";

/** Base interface every Program Interface must implement */
export interface ProgramInterface<TState, TActions> {
  /** Unique PI identifier — stable across the entire codebase */
  readonly id: GlobalControlId;
  /** Human-readable label for tooling and inspection */
  readonly label: string;
  /** Current state (read-only from the consumer's perspective) */
  readonly state: TState;
  /** Actions the PI exposes to consumers */
  readonly actions: TActions;
}

// ── Theme PI ──────────────────────────────────────────────

export type ThemeValue = "dark" | "light" | "system";

export interface ThemePIState {
  theme: ThemeValue;
}

export interface ThemePIActions {
  setTheme: (theme: ThemeValue) => void;
  toggle: () => void;
}

export type ThemePI = ProgramInterface<ThemePIState, ThemePIActions>;

// ── View-Mode PI ──────────────────────────────────────────

export interface ViewModePIState {
  isViewingAsUser: boolean;
  effectiveIsAdmin: boolean;
  canToggleViewMode: boolean;
}

export interface ViewModePIActions {
  toggleViewMode: () => void;
}

export type ViewModePI = ProgramInterface<ViewModePIState, ViewModePIActions>;

// ── Debug PI ──────────────────────────────────────────────

export interface DebugEntry {
  id: number;
  level: "error" | "warn" | "info";
  message: string;
  timestamp: number;
}

export interface DebugPIState {
  entries: DebugEntry[];
  unreadCount: number;
}

export interface DebugPIActions {
  markRead: () => void;
  clear: () => void;
  copyToClipboard: () => Promise<void>;
}

export type DebugPI = ProgramInterface<DebugPIState, DebugPIActions>;

// ── Session PI ────────────────────────────────────────────

export interface SessionPIState {
  /** Whether TTS is currently playing */
  isSpeaking: boolean;
  ttsSupported: boolean;
  ttsUnlocked: boolean;
}

export interface SessionPIActions {
  resetSession: () => void;
  testTTS: () => void;
}

export type SessionPI = ProgramInterface<SessionPIState, SessionPIActions>;

// ── Navigation Toggle PI ──────────────────────────────────

export interface NavTogglePIState {
  hidden: boolean;
  isMobile: boolean;
}

export interface NavTogglePIActions {
  toggle: () => void;
}

export type NavTogglePI = ProgramInterface<NavTogglePIState, NavTogglePIActions>;

// ── Cost PI ───────────────────────────────────────────────

export interface CostModelConfig {
  /** Cost per 1K input tokens */
  inputPer1K: number;
  /** Cost per 1K output tokens */
  outputPer1K: number;
  /** Model name this config applies to */
  model: string;
}

export interface TokenUsageSummary {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CostPIState {
  /** Current cost model configuration */
  config: CostModelConfig;
}

export interface CostPIActions {
  /** Estimate cost from a set of step executions (keyed by step ID) */
  estimateCost: (steps: Record<string, { usage?: TokenUsageSummary }>) => number;
  /** Format a cost number for display */
  formatCost: (cost: number) => string;
  /** Update the cost model configuration */
  setConfig: (config: CostModelConfig) => void;
}

export type CostPI = ProgramInterface<CostPIState, CostPIActions>;

// ── Aggregate ─────────────────────────────────────────────

/** All global control PIs as a single map, keyed by their unique ID */
export interface GlobalControlsMap {
  "PI-THEME": ThemePI;
  "PI-VIEW-MODE": ViewModePI;
  "PI-DEBUG": DebugPI;
  "PI-SESSION": SessionPI;
  "PI-NAV-TOGGLE": NavTogglePI;
  "PI-COST": CostPI;
}
