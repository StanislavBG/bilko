/**
 * FlowProgress — Mobile-aware wrapper around bilko-flow/react.
 *
 * When mode="auto" and the container is narrow (< autoBreakpoint, default 480px),
 * renders FlowProgressVertical (a vertical timeline) instead of the horizontal
 * compact layout. This is the first-class mobile experience for bilko flows.
 *
 * All other modes delegate directly to bilko-flow/react's FlowProgress.
 */

import React, { useRef, useState, useEffect } from "react";
import {
  FlowProgress as BaseFlowProgress,
  adaptSteps as baseAdaptSteps,
} from "bilko-flow/react";
import type {
  FlowProgressProps,
  FlowProgressStep,
  FlowProgressTheme,
  FlowProgressAdapter,
  FlowProgressStepRenderer,
} from "bilko-flow/react";
import { FlowProgressVertical } from "./flow-progress-vertical";

export { baseAdaptSteps as adaptSteps };
export type {
  FlowProgressStep,
  FlowProgressProps,
  FlowProgressTheme,
  FlowProgressAdapter,
  FlowProgressStepRenderer,
};

/** Default breakpoint below which auto mode renders vertical */
const DEFAULT_AUTO_BREAKPOINT = 480;

/**
 * FlowProgress — Drop-in replacement that adds vertical mobile support.
 *
 * - mode="auto" on narrow screens → FlowProgressVertical (vertical timeline)
 * - mode="auto" on wide screens  → bilko-flow ExpandedMode (horizontal cards)
 * - All other modes              → bilko-flow FlowProgress unchanged
 */
export function FlowProgress(props: FlowProgressProps) {
  const { mode, autoBreakpoint, className } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (mode !== "auto") return;

    const el = containerRef.current;
    if (!el) return;

    const breakpoint = autoBreakpoint ?? DEFAULT_AUTO_BREAKPOINT;

    const update = () => {
      const width = el.getBoundingClientRect().width;
      setIsNarrow(width < breakpoint);
    };

    update();

    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, autoBreakpoint]);

  // Non-auto modes: pass straight through to base
  if (mode !== "auto") {
    return <BaseFlowProgress {...props} />;
  }

  // Auto mode: measure container, render vertical or horizontal
  return (
    <div
      ref={containerRef}
      className={`max-w-full overflow-hidden ${className ?? ""}`}
    >
      {isNarrow ? (
        <FlowProgressVertical
          steps={props.steps}
          label={props.label}
          status={props.status}
          activity={props.activity}
          lastResult={props.lastResult}
          onReset={props.onReset}
          onStepClick={props.onStepClick}
          theme={props.theme}
          radius={props.radius}
        />
      ) : (
        <BaseFlowProgress {...props} mode="expanded" />
      )}
    </div>
  );
}
