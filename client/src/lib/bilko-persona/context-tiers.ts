/**
 * Context Tiers — Layered Information Architecture for Communication Assembly
 *
 * When Bilko communicates, he draws from multiple layers of context.
 * Each tier has a different scope, persistence, and role in shaping
 * what he says and how he says it.
 *
 * ┌────────────────────────────────────────────────┐
 * │  Tier 1: IDENTITY (always present)             │
 * │  Who Bilko is. Core personality. Never changes. │
 * ├────────────────────────────────────────────────┤
 * │  Tier 2: SITUATIONAL (per-interaction)          │
 * │  What's happening right now. Mode, phase, task. │
 * ├────────────────────────────────────────────────┤
 * │  Tier 3: RELATIONAL (per-session)               │
 * │  What we know about the user THIS session.      │
 * │  Choices made, topics discussed, skill level.   │
 * ├────────────────────────────────────────────────┤
 * │  Tier 4: HISTORICAL (cross-session)             │
 * │  Past interactions, preferences, progress.      │
 * │  (Future: requires auth + persistence.)         │
 * └────────────────────────────────────────────────┘
 *
 * Design principles:
 * - Higher tiers override lower when they conflict
 * - Each tier is independently testable
 * - Context assembly is explicit, never implicit
 * - The user never sees tier machinery — just feels "Bilko knows me"
 */

// ── Tier definitions ──────────────────────────────────────

export type ContextTier = "identity" | "situational" | "relational" | "historical";

/** Identity tier — immutable core. Comes from system-prompt.ts */
export interface IdentityContext {
  tier: "identity";
  /** Always loaded from BILKO_IDENTITY */
}

/** Situational tier — what's happening right now */
export interface SituationalContext {
  tier: "situational";
  /** Which mode is active (e.g. "quiz", "video", "chat") */
  activeMode?: string;
  /** Current phase within the mode (e.g. "questioning", "analyzing") */
  phase?: string;
  /** What step/task Bilko is performing */
  currentTask?: string;
  /** Tone override from the current event */
  toneHint?: string;
}

/** Relational tier — what we know about the user this session */
export interface RelationalContext {
  tier: "relational";
  /** Modes the user has explored */
  modesVisited: string[];
  /** Topics the user has engaged with */
  topicsDiscussed: string[];
  /** Questions the user has asked */
  questionsAsked: string[];
  /** Inferred skill level from interactions */
  inferredLevel?: "beginner" | "intermediate" | "advanced";
  /** Key facts the user volunteered (role, industry, etc.) */
  userFacts: Record<string, string>;
}

/** Historical tier — cross-session knowledge (future) */
export interface HistoricalContext {
  tier: "historical";
  /** Total sessions completed */
  sessionCount?: number;
  /** Badges or milestones earned */
  achievements?: string[];
  /** Preferred learning style */
  preferredStyle?: string;
  /** Topics previously completed */
  completedTopics?: string[];
}

// ── Communication context (assembled for each LLM call) ──

export interface CommunicationContext {
  /** Tier 1: always present via BILKO_IDENTITY */
  identity: true;
  /** Tier 2: what's happening now */
  situational?: SituationalContext;
  /** Tier 3: session-level user knowledge */
  relational?: RelationalContext;
  /** Tier 4: cross-session history (future) */
  historical?: HistoricalContext;
}

/**
 * Assemble context tiers into a string block for injection
 * into LLM system prompts.
 *
 * Only non-empty tiers are included. This keeps prompts lean
 * when context is sparse (first interaction) and rich when
 * we know more about the user.
 */
export function assembleContext(ctx: CommunicationContext): string {
  const parts: string[] = [];

  // Tier 2: Situational
  if (ctx.situational) {
    const s = ctx.situational;
    const lines: string[] = [];
    if (s.activeMode) lines.push(`Current mode: ${s.activeMode}`);
    if (s.phase) lines.push(`Phase: ${s.phase}`);
    if (s.currentTask) lines.push(`Task: ${s.currentTask}`);
    if (s.toneHint) lines.push(`Tone: ${s.toneHint}`);
    if (lines.length > 0) {
      parts.push(`SITUATION:\n${lines.join("\n")}`);
    }
  }

  // Tier 3: Relational
  if (ctx.relational) {
    const r = ctx.relational;
    const lines: string[] = [];
    if (r.modesVisited.length > 0) {
      lines.push(`User has explored: ${r.modesVisited.join(", ")}`);
    }
    if (r.topicsDiscussed.length > 0) {
      lines.push(`Topics discussed: ${r.topicsDiscussed.join(", ")}`);
    }
    if (r.inferredLevel) {
      lines.push(`Estimated skill level: ${r.inferredLevel}`);
    }
    const facts = Object.entries(r.userFacts);
    if (facts.length > 0) {
      lines.push(`Known about user: ${facts.map(([k, v]) => `${k}: ${v}`).join(", ")}`);
    }
    if (lines.length > 0) {
      parts.push(`USER CONTEXT (this session):\n${lines.join("\n")}`);
    }
  }

  // Tier 4: Historical (future — included for forward compatibility)
  if (ctx.historical) {
    const h = ctx.historical;
    const lines: string[] = [];
    if (h.sessionCount) lines.push(`Previous sessions: ${h.sessionCount}`);
    if (h.completedTopics && h.completedTopics.length > 0) {
      lines.push(`Completed topics: ${h.completedTopics.join(", ")}`);
    }
    if (h.preferredStyle) lines.push(`Preferred style: ${h.preferredStyle}`);
    if (lines.length > 0) {
      parts.push(`USER HISTORY:\n${lines.join("\n")}`);
    }
  }

  return parts.join("\n\n");
}
