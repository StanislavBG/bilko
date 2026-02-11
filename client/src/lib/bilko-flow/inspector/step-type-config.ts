/**
 * Bilko Flow API — Step Type Visual Configuration
 *
 * Single source of truth for step type icons, colors, labels, and styling.
 * All flow-inspector components import from here instead of defining
 * their own TYPE_CONFIG maps.
 */

import {
  Brain,
  MousePointerClick,
  ArrowRightLeft,
  ShieldCheck,
  Monitor,
  MessageSquare,
  PlugZap,
  ImageIcon,
  Film,
} from "lucide-react";
import type { StepType, FlowStep } from "../types";

export interface StepTypeVisuals {
  /** Lucide icon component */
  icon: typeof Brain;
  /** Full label (e.g. "LLM Call", "User Input") */
  label: string;
  /** Short label for compact views (e.g. "LLM", "Input") */
  shortLabel: string;
  /** Text color class */
  color: string;
  /** Background tint class */
  bg: string;
  /** Border accent class (lower opacity) */
  accent: string;
  /** Border class (higher opacity, for canvas nodes) */
  border: string;
  /** Category label for component catalog */
  categoryLabel: string;
}

/**
 * The canonical visual configuration for each step type.
 *
 * Color scheme:
 * - llm:        purple (AI/intelligence)
 * - user-input: blue   (interaction)
 * - transform:  orange (data processing)
 * - validate:   green  (quality/verification)
 * - display:    cyan   (presentation)
 */
export const STEP_TYPE_CONFIG: Record<StepType, StepTypeVisuals> = {
  llm: {
    icon: Brain,
    label: "LLM Call",
    shortLabel: "LLM",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    accent: "border-purple-500/30",
    border: "border-purple-500/40",
    categoryLabel: "AI",
  },
  "user-input": {
    icon: MousePointerClick,
    label: "User Input",
    shortLabel: "Input",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    accent: "border-blue-500/30",
    border: "border-blue-500/40",
    categoryLabel: "Interaction",
  },
  transform: {
    icon: ArrowRightLeft,
    label: "Transform",
    shortLabel: "Transform",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    accent: "border-orange-500/30",
    border: "border-orange-500/40",
    categoryLabel: "Data",
  },
  validate: {
    icon: ShieldCheck,
    label: "Validate",
    shortLabel: "Validate",
    color: "text-green-500",
    bg: "bg-green-500/10",
    accent: "border-green-500/30",
    border: "border-green-500/40",
    categoryLabel: "Quality",
  },
  display: {
    icon: Monitor,
    label: "Display",
    shortLabel: "Display",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    accent: "border-cyan-500/30",
    border: "border-cyan-500/40",
    categoryLabel: "Presentation",
  },
  chat: {
    icon: MessageSquare,
    label: "Chat Publish",
    shortLabel: "Chat",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    accent: "border-emerald-500/30",
    border: "border-emerald-500/40",
    categoryLabel: "Chat",
  },
  "external-input": {
    icon: PlugZap,
    label: "External Input",
    shortLabel: "Ext-In",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    accent: "border-amber-500/30",
    border: "border-amber-500/40",
    categoryLabel: "External",
  },
};

/**
 * LLM subtype visual overrides.
 *
 * When an LLM step has a subtype (e.g. "image", "video"), use these
 * visuals instead of the default purple LLM config. This makes it
 * easy to distinguish text-generation, image-generation (Nano Banana),
 * and video-generation (Veo) nodes at a glance.
 *
 * Color scheme:
 * - text:  purple (default LLM — Brain icon)
 * - image: pink   (Nano Banana image gen — ImageIcon)
 * - video: rose    (Veo video gen — Film icon)
 */
export const LLM_SUBTYPE_CONFIG: Record<string, StepTypeVisuals> = {
  image: {
    icon: ImageIcon,
    label: "Image Gen",
    shortLabel: "Image",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    accent: "border-pink-500/30",
    border: "border-pink-500/40",
    categoryLabel: "AI Image",
  },
  video: {
    icon: Film,
    label: "Video Gen",
    shortLabel: "Video",
    color: "text-rose-600",
    bg: "bg-rose-600/10",
    accent: "border-rose-600/30",
    border: "border-rose-600/40",
    categoryLabel: "AI Video",
  },
};

/**
 * Resolve the visual config for a step, accounting for LLM subtypes.
 *
 * If the step is type "llm" and has a subtype that matches an entry
 * in LLM_SUBTYPE_CONFIG, the subtype config is returned instead of
 * the generic purple LLM visuals.
 */
export function getStepVisuals(step: FlowStep): StepTypeVisuals {
  if (step.type === "llm" && step.subtype && LLM_SUBTYPE_CONFIG[step.subtype]) {
    return LLM_SUBTYPE_CONFIG[step.subtype];
  }
  return STEP_TYPE_CONFIG[step.type];
}
