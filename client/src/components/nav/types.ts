/**
 * Nav Component Types
 *
 * Data shapes for the reusable multi-level navigation system.
 * These types unify the L2/L3/L4 nav patterns across
 * rules, projects, bilko's way, and any future pages.
 */

import type { ComponentType } from "react";

/** A single item in a nav panel */
export interface NavPanelItem {
  id: string;
  label: string;
  /** Short label for collapsed state (defaults to first char of label) */
  shortLabel?: string;
  /** Sub-text shown below the label when expanded */
  description?: string;
  /** Icon component (shown in both collapsed and expanded states) */
  icon?: ComponentType<{ className?: string }>;
  /** Text color class (e.g. "text-emerald-500") — applied to label and icon */
  color?: string;
  /** Background class when this item is active (e.g. "bg-emerald-500/20") */
  activeBg?: string;
  /** Hover background class (e.g. "hover:bg-emerald-500/10") */
  hoverBg?: string;
}

/** Props for the NavPanel container */
export interface NavPanelProps {
  /** Header text shown at the top */
  header: string;
  /** Items to render */
  items: NavPanelItem[];
  /** Currently selected item ID (null = none) */
  selectedId: string | null;
  /** Called when an item is clicked */
  onSelect: (id: string) => void;
  /** Whether the panel is in collapsed state */
  isCollapsed: boolean;
  /** Toggle collapse/expand */
  onToggleCollapse: () => void;
  /** Width classes when expanded (default: "min-w-[9rem] max-w-[10rem]") */
  expandedWidth?: string;
  /** Width classes when collapsed (default: "min-w-10 max-w-10") */
  collapsedWidth?: string;
  /** Background class (default: "bg-muted/10") */
  bg?: string;
  /** Additional className for the outer container */
  className?: string;
  /** data-testid for the panel */
  testId?: string;
}
