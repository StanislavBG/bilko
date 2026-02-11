/**
 * Bilko Flow API — Step Type Visual Configuration
 *
 * Re-exports from bilko-flow/react. The visual configuration is maintained
 * in the bilko-flow package and consumed here for backward compatibility.
 *
 * Also provides resolveIcon() for components that need actual lucide-react
 * icon components (the bilko-flow/react version uses string-based icon names).
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
  Blocks,
} from "lucide-react";

export { STEP_TYPE_CONFIG, LLM_SUBTYPE_CONFIG, getStepVisuals } from "bilko-flow/react";
export type { StepTypeVisuals } from "bilko-flow/react";

/** Map icon name strings to actual lucide-react components */
const ICON_MAP: Record<string, typeof Brain> = {
  Brain,
  MousePointerClick,
  ArrowRightLeft,
  ShieldCheck,
  Monitor,
  MessageSquare,
  PlugZap,
  ImageIcon,
  Film,
};

/**
 * Resolve a string icon name to a lucide-react component.
 * Falls back to Blocks icon if the name is not recognized.
 */
export function resolveIcon(name: string): typeof Brain {
  return ICON_MAP[name] ?? Blocks;
}
