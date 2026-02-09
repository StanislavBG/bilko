/**
 * Speaker Identity — Visual differentiation system for multi-speaker conversations.
 *
 * Three tiers of speakers in the conversation:
 * 1. Bilko (primary) — Full-width bold text, no frame. The page IS Bilko.
 * 2. Sub-agents (secondary) — Left-border accent, name badge, surface tint.
 * 3. User (tertiary) — Right-aligned bubble (handled elsewhere).
 *
 * Plus system messages for handoffs and status updates.
 *
 * Design principles (from research):
 * - Color is NEVER the only differentiator (WCAG 1.4.1)
 * - Every agent gets: colored left border + name label + icon
 * - Surface tints at 5% opacity for safe contrast ratios
 * - Spatial layout: all AI speakers left-aligned, user right-aligned
 */

import { Bot, Search, MessageSquare, Mic, Linkedin, BookOpen, Wrench } from "lucide-react";
import type { ReactNode } from "react";

// ── Agent color palette ─────────────────────────────────
// Each agent gets a consistent color set derived from their accent.
// The `accentColor` field on AgentTurn (e.g. "text-red-500") is the
// source of truth. This maps chatName → full palette.

export interface AgentColorSet {
  /** Left border class (e.g. "border-l-red-500") */
  border: string;
  /** Badge background + text (e.g. "bg-red-500/10 text-red-400") */
  badge: string;
  /** Surface tint (e.g. "bg-red-500/5") */
  surface: string;
  /** Icon/text accent (e.g. "text-red-500") */
  accent: string;
  /** Ping dot color (e.g. "bg-red-500") */
  dot: string;
}

const AGENT_PALETTES: Record<string, AgentColorSet> = {
  YoutubeExpert: {
    border: "border-l-red-500",
    badge: "bg-red-500/10 text-red-400",
    surface: "bg-red-500/[0.03]",
    accent: "text-red-500",
    dot: "bg-red-500",
  },
  LeverageAdvisor: {
    border: "border-l-yellow-500",
    badge: "bg-yellow-500/10 text-yellow-500",
    surface: "bg-yellow-500/[0.03]",
    accent: "text-yellow-500",
    dot: "bg-yellow-500",
  },
  RecursiveInterviewer: {
    border: "border-l-violet-500",
    badge: "bg-violet-500/10 text-violet-400",
    surface: "bg-violet-500/[0.03]",
    accent: "text-violet-500",
    dot: "bg-violet-500",
  },
  LinkedInStrategist: {
    border: "border-l-blue-500",
    badge: "bg-blue-500/10 text-blue-400",
    surface: "bg-blue-500/[0.03]",
    accent: "text-blue-500",
    dot: "bg-blue-500",
  },
  SocraticArchitect: {
    border: "border-l-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-400",
    surface: "bg-emerald-500/[0.03]",
    accent: "text-emerald-500",
    dot: "bg-emerald-500",
  },
  TaskGuide: {
    border: "border-l-orange-500",
    badge: "bg-orange-500/10 text-orange-400",
    surface: "bg-orange-500/[0.03]",
    accent: "text-orange-500",
    dot: "bg-orange-500",
  },
};

const DEFAULT_PALETTE: AgentColorSet = {
  border: "border-l-violet-500",
  badge: "bg-violet-500/10 text-violet-400",
  surface: "bg-violet-500/[0.03]",
  accent: "text-violet-500",
  dot: "bg-violet-500",
};

/**
 * Get the full color palette for an agent by chatName.
 */
export function getAgentColors(chatName: string): AgentColorSet {
  return AGENT_PALETTES[chatName] ?? DEFAULT_PALETTE;
}

// ── Agent icons ─────────────────────────────────────────

const AGENT_ICONS: Record<string, ReactNode> = {
  YoutubeExpert: <Search className="w-3 h-3" />,
  LeverageAdvisor: <MessageSquare className="w-3 h-3" />,
  RecursiveInterviewer: <Mic className="w-3 h-3" />,
  LinkedInStrategist: <Linkedin className="w-3 h-3" />,
  SocraticArchitect: <BookOpen className="w-3 h-3" />,
  TaskGuide: <Wrench className="w-3 h-3" />,
};

/**
 * Get the icon for an agent by chatName. Falls back to a generic Bot icon.
 */
export function getAgentIcon(chatName: string): ReactNode {
  return AGENT_ICONS[chatName] ?? <Bot className="w-3 h-3" />;
}

// ── Agent identity badge ────────────────────────────────

interface AgentBadgeProps {
  chatName: string;
  displayName: string;
  colors: AgentColorSet;
  /** Show animated ping dot (for "thinking" state) */
  thinking?: boolean;
}

/**
 * Compact identity badge shown above agent messages.
 * Includes icon + name + optional thinking indicator.
 */
export function AgentBadge({ chatName, displayName, colors, thinking }: AgentBadgeProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center ${colors.badge}`}
      >
        {getAgentIcon(chatName)}
      </div>
      <span
        className={`text-[11px] font-semibold uppercase tracking-wider ${colors.accent}`}
      >
        {displayName}
      </span>
      {thinking && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors.dot}`}
          />
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${colors.dot}`}
          />
        </span>
      )}
    </div>
  );
}
