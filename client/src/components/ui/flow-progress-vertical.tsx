/**
 * FlowProgressVertical — Mobile-first vertical timeline for flow progress.
 *
 * Invented for mobile screens where horizontal step chains cramp.
 * Uses the same sliding-window algorithm (First, X-1, X, X+1, Last)
 * but renders top-to-bottom instead of left-to-right.
 *
 * Reuses bilko-flow/react's theme system, types, and icon conventions.
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  XCircle,
  MoreVertical,
  Brain,
  ArrowRightLeft,
  ShieldCheck,
  Monitor,
  MessageSquare,
  Globe,
  PlugZap,
  RotateCcw,
} from "lucide-react";
import type {
  FlowProgressStep,
  FlowProgressTheme,
  FlowProgressProps,
} from "bilko-flow/react";
import { mergeTheme } from "bilko-flow/react";

// ── Sliding-window algorithm (mirrored from bilko-flow) ──────────

const DEFAULT_RADIUS = 2;

function needsWindow(count: number, radius: number): boolean {
  return count > 2 * radius + 3;
}

type WindowItem =
  | { kind: "step"; index: number; step: FlowProgressStep }
  | {
      kind: "ellipsis";
      hiddenSteps: Array<{ index: number; step: FlowProgressStep }>;
    };

function computeWindow(
  steps: FlowProgressStep[],
  radius: number,
): WindowItem[] {
  if (!needsWindow(steps.length, radius)) {
    return steps.map((step, index) => ({ kind: "step", index, step }));
  }

  const activeIdx = steps.findIndex((s) => s.status === "active");
  const center = activeIdx >= 0 ? activeIdx : 0;

  const visible = new Set<number>();
  visible.add(0);
  visible.add(steps.length - 1);
  for (
    let i = Math.max(0, center - radius);
    i <= Math.min(steps.length - 1, center + radius);
    i++
  ) {
    visible.add(i);
  }

  const sortedVisible = Array.from(visible).sort((a, b) => a - b);
  const items: WindowItem[] = [];

  let prevIdx = -1;
  for (const idx of sortedVisible) {
    if (prevIdx >= 0 && idx > prevIdx + 1) {
      const hidden: Array<{ index: number; step: FlowProgressStep }> = [];
      for (let h = prevIdx + 1; h < idx; h++) {
        hidden.push({ index: h, step: steps[h] });
      }
      items.push({ kind: "ellipsis", hiddenSteps: hidden });
    }
    items.push({ kind: "step", index: idx, step: steps[idx] });
    prevIdx = idx;
  }

  return items;
}

// ── Theme helpers (mirrored from bilko-flow) ──────────────────

function resolveStepBg(
  step: FlowProgressStep,
  theme: FlowProgressTheme,
): string {
  switch (step.status) {
    case "complete":
      return step.type && theme.stepColors[step.type]
        ? theme.stepColors[step.type]
        : theme.completedColor;
    case "active":
      return step.type && theme.stepColors[step.type]
        ? theme.stepColors[step.type]
        : theme.activeColor;
    case "error":
      return theme.errorColor;
    default:
      return theme.pendingColor;
  }
}

function resolveConnectorColor(
  step: FlowProgressStep,
  theme: FlowProgressTheme,
): string {
  if (step.status === "complete") {
    return step.type && theme.stepColors[step.type]
      ? theme.stepColors[step.type]
      : theme.completedColor;
  }
  return theme.pendingColor;
}

// ── Type icon (mirrored from bilko-flow) ──────────────────────

function getTypeIcon(type?: string): React.ReactNode {
  switch (type) {
    case "llm":
    case "ai.summarize":
    case "ai.generate-text":
    case "ai.generate-text-local":
    case "ai.summarize-local":
    case "ai.embed-local":
    case "ai.generate-image":
    case "ai.generate-video":
      return <Brain size={14} />;
    case "transform":
    case "transform.filter":
    case "transform.map":
    case "transform.reduce":
      return <ArrowRightLeft size={14} />;
    case "validate":
      return <ShieldCheck size={14} />;
    case "display":
    case "notification.send":
      return <Monitor size={14} />;
    case "chat":
    case "social.post":
      return <MessageSquare size={14} />;
    case "external-input":
    case "http.search":
    case "http.request":
      return <Globe size={14} />;
    case "user-input":
      return <PlugZap size={14} />;
    default:
      return null;
  }
}

// ── Status icon for a step ────────────────────────────────────

function StepIcon({
  step,
  size = 18,
}: {
  step: FlowProgressStep;
  size?: number;
}) {
  const typeIcon = step.type ? getTypeIcon(step.type) : null;

  switch (step.status) {
    case "complete":
      return <CheckCircle2 size={size} className="text-green-500" />;
    case "active":
      return typeIcon ? (
        <span className="text-blue-400 animate-pulse">{typeIcon}</span>
      ) : (
        <Loader2 size={size} className="text-blue-400 animate-spin" />
      );
    case "error":
      return <XCircle size={size} className="text-red-500" />;
    default:
      return typeIcon ? (
        <span className="text-gray-500">{typeIcon}</span>
      ) : (
        <Circle size={size} className="text-gray-500" />
      );
  }
}

// ── Expandable ellipsis (vertical) ────────────────────────────

function VerticalEllipsis({
  hiddenSteps,
  onStepClick,
  theme,
}: {
  hiddenSteps: Array<{ index: number; step: FlowProgressStep }>;
  onStepClick?: (stepId: string) => void;
  theme: FlowProgressTheme;
}) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <>
        {hiddenSteps.map(({ index, step }) => (
          <StepRow
            key={step.id}
            step={step}
            index={index}
            isActive={false}
            isLast={false}
            theme={theme}
            onStepClick={onStepClick}
            dimmed
          />
        ))}
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center gap-2 pl-[11px] py-1 group"
        >
          {/* Rail connector */}
          <div className="w-[18px] flex items-center justify-center flex-shrink-0">
            <MoreVertical size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
          </div>
          <span className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors">
            collapse
          </span>
        </button>
      </>
    );
  }

  return (
    <button
      onClick={() => setExpanded(true)}
      className="flex items-center gap-2 pl-[11px] py-1.5 group"
    >
      {/* Rail connector */}
      <div className="w-[18px] flex items-center justify-center flex-shrink-0">
        <MoreVertical size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
      </div>
      <span className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors">
        {hiddenSteps.length} more step{hiddenSteps.length !== 1 ? "s" : ""}
      </span>
    </button>
  );
}

// ── Individual step row ───────────────────────────────────────

function StepRow({
  step,
  index,
  isActive,
  isLast,
  theme,
  onStepClick,
  activity,
  dimmed,
}: {
  step: FlowProgressStep;
  index: number;
  isActive: boolean;
  isLast: boolean;
  theme: FlowProgressTheme;
  onStepClick?: (stepId: string) => void;
  activity?: string;
  dimmed?: boolean;
}) {
  const connectorColor = resolveConnectorColor(step, theme);

  return (
    <div className="relative">
      {/* Row */}
      <button
        className={`
          w-full flex items-start gap-2.5 pl-2 pr-3 py-1.5 rounded-lg text-left
          transition-all duration-200
          ${isActive
            ? "bg-gray-800/80 ring-1 ring-green-500/20"
            : "hover:bg-gray-800/40"
          }
        `}
        onClick={() => onStepClick?.(step.id)}
      >
        {/* Icon column with vertical rail */}
        <div className="relative flex flex-col items-center flex-shrink-0 w-[18px]">
          {/* Status icon */}
          <div className={`relative z-10 ${dimmed ? "opacity-50" : ""}`}>
            <StepIcon step={step} size={18} />
          </div>
        </div>

        {/* Label + metadata */}
        <div className={`min-w-0 flex-1 pt-px ${dimmed ? "opacity-50" : ""}`}>
          <div
            className={`text-sm leading-tight truncate ${
              isActive
                ? "text-white font-medium"
                : step.status === "complete"
                  ? "text-gray-300"
                  : step.status === "error"
                    ? "text-red-300"
                    : "text-gray-400"
            }`}
          >
            {step.label}
          </div>
          {step.type && (
            <div className="text-[10px] text-gray-600 truncate mt-0.5">
              Step {index + 1} &middot; {step.type}
            </div>
          )}
          {/* Activity text for the active step */}
          {isActive && activity && (
            <div className="text-xs text-green-400/80 truncate mt-0.5">
              {activity}
            </div>
          )}
        </div>

        {/* Type color dot */}
        {step.type && theme.stepColors[step.type] && (
          <div
            className={`
              w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5
              ${resolveStepBg(step, theme)}
            `}
          />
        )}
      </button>

      {/* Vertical connector line (below the icon, behind the next row) */}
      {!isLast && (
        <div
          className={`
            absolute left-[19px] top-[26px] bottom-[-2px] w-[2px] rounded-full
            ${step.status === "complete" ? connectorColor : "bg-gray-700/60"}
          `}
        />
      )}
    </div>
  );
}

// ── Main vertical component ───────────────────────────────────

export interface FlowProgressVerticalProps {
  steps: FlowProgressStep[];
  label?: string;
  status?: FlowProgressProps["status"];
  activity?: string;
  lastResult?: string;
  onReset?: () => void;
  onStepClick?: (stepId: string) => void;
  theme?: Partial<FlowProgressTheme>;
  radius?: number;
  className?: string;
}

export function FlowProgressVertical({
  steps,
  label,
  status,
  activity,
  lastResult,
  onReset,
  onStepClick,
  theme: themeOverride,
  radius = DEFAULT_RADIUS,
  className,
}: FlowProgressVerticalProps) {
  const theme = useMemo(() => mergeTheme(themeOverride), [themeOverride]);
  const completedCount = steps.filter((s) => s.status === "complete").length;
  const activeIdx = steps.findIndex((s) => s.status === "active");

  const windowItems = useMemo(
    () => computeWindow(steps, radius),
    [steps, radius],
  );

  if (steps.length === 0) return null;

  return (
    <div
      className={`w-full max-w-full rounded-lg border border-gray-700 bg-gray-900 p-3 overflow-hidden ${className ?? ""}`}
    >
      {/* Header row: counter + mini progress bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {status === "running" && (
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          )}
          {status === "complete" && (
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          )}
          {status === "error" && (
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          )}
          {label && (
            <span className="text-xs font-medium text-white truncate">
              {label}
            </span>
          )}
          <span className="text-xs text-gray-500 flex-shrink-0">
            {completedCount}/{steps.length}
          </span>
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Reset flow"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {/* Mini segmented progress bar */}
      <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden flex mb-3">
        {steps.map((step, i) => {
          const segColor = resolveStepBg(step, theme);
          return (
            <div
              key={i}
              className={`
                h-full transition-all duration-500
                ${step.status === "pending" ? "bg-gray-700" : segColor}
                ${i === 0 ? "rounded-l-full" : ""}
                ${i === steps.length - 1 ? "rounded-r-full" : ""}
              `}
              style={{ width: `${100 / steps.length}%` }}
            />
          );
        })}
      </div>

      {/* Vertical step timeline */}
      <div className="relative space-y-0">
        {windowItems.map((item, i) => {
          const isLast = i === windowItems.length - 1;

          if (item.kind === "ellipsis") {
            return (
              <VerticalEllipsis
                key={`ellipsis-${i}`}
                hiddenSteps={item.hiddenSteps}
                onStepClick={onStepClick}
                theme={theme}
              />
            );
          }

          const { step, index } = item;
          const isActive = step.status === "active";

          return (
            <StepRow
              key={step.id}
              step={step}
              index={index}
              isActive={isActive}
              isLast={isLast}
              theme={theme}
              onStepClick={onStepClick}
              activity={isActive ? activity : undefined}
            />
          );
        })}
      </div>

      {/* Last result */}
      {lastResult && (
        <p className="mt-2 text-xs text-green-400 truncate pl-2">
          {lastResult}
        </p>
      )}
    </div>
  );
}
