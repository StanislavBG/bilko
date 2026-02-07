/**
 * FlowCanvas — 2D DAG visualisation with zoom/pan.
 *
 * Renders flow steps as positioned nodes connected by SVG bezier edges.
 * Supports branching/parallel flows via the DAG layout engine.
 * Zoom in/out with buttons or scroll-wheel.
 */

import { useMemo, useRef, useState, useCallback, memo, type WheelEvent } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Brain,
  MousePointerClick,
  ArrowRightLeft,
  ShieldCheck,
  Monitor,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  SkipForward,
} from "lucide-react";
import type { FlowDefinition, StepExecution, StepStatus, StepType, FlowStep } from "@/lib/flow-inspector/types";
import { computeLayout, NODE_W, NODE_H, type DAGLayout } from "@/lib/flow-inspector/layout";

// ── Step type visuals ─────────────────────────────────────
const TYPE_CONFIG: Record<StepType, { icon: typeof Brain; label: string; color: string; border: string }> = {
  llm:          { icon: Brain,             label: "LLM",        color: "text-purple-500", border: "border-purple-500/40" },
  "user-input": { icon: MousePointerClick, label: "Input",      color: "text-blue-500",   border: "border-blue-500/40" },
  transform:    { icon: ArrowRightLeft,    label: "Transform",  color: "text-orange-500", border: "border-orange-500/40" },
  validate:     { icon: ShieldCheck,       label: "Validate",   color: "text-green-500",  border: "border-green-500/40" },
  display:      { icon: Monitor,           label: "Display",    color: "text-cyan-500",   border: "border-cyan-500/40" },
};

const STATUS_ICON: Record<StepStatus, typeof Circle> = {
  idle: Circle, running: Loader2, success: CheckCircle2, error: XCircle, skipped: SkipForward,
};

// ── Zoom helpers ──────────────────────────────────────────
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.15;

// ── Component ─────────────────────────────────────────────

interface FlowCanvasProps {
  flow: FlowDefinition;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  executions?: Record<string, StepExecution>;
}

export function FlowCanvas({ flow, selectedStepId, onSelectStep, executions }: FlowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const [isPanningState, setIsPanningState] = useState(false);
  const panRef = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Keep panRef in sync with state
  panRef.current = pan;

  const layout = useMemo(() => computeLayout(flow.steps), [flow.steps]);

  // ── Zoom controls ───────────────────────────────────────
  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN)), []);
  const zoomFit = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    if (layout.width === 0 || layout.height === 0) return;
    const scale = Math.min(cw / layout.width, ch / layout.height, 1);
    setZoom(Math.max(scale, ZOOM_MIN));
    setPan({ x: 0, y: 0 });
  }, [layout.width, layout.height]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.min(Math.max(z + delta, ZOOM_MIN), ZOOM_MAX));
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  // ── Pan (drag) — uses refs to avoid stale closures ─────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-step-node]")) return;
    isPanningRef.current = true;
    setIsPanningState(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanningRef.current) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    isPanningRef.current = false;
    setIsPanningState(false);
  }, []);

  const getStatus = useCallback(
    (stepId: string): StepStatus => executions?.[stepId]?.status ?? "idle",
    [executions],
  );

  // Stable callback ref for node selection
  const onSelectStepRef = useRef(onSelectStep);
  onSelectStepRef.current = onSelectStep;
  const handleNodeClick = useCallback((stepId: string) => onSelectStepRef.current(stepId), []);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="relative h-full flex flex-col">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-1 p-2 border-b bg-muted/30">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>

        <span className="text-xs text-muted-foreground w-10 text-center font-mono">
          {zoomPercent}%
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomFit}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to view</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <Badge variant="outline" className="text-xs">
          {flow.steps.length} steps &middot; {layout.columns} cols
        </Badge>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className={cn("flex-1 overflow-hidden", isPanningState ? "cursor-grabbing" : "cursor-grab")}
        onWheel={handleWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: layout.width,
            height: layout.height,
            position: "relative",
          }}
        >
          {/* SVG edges */}
          <svg
            width={layout.width}
            height={layout.height}
            className="absolute inset-0 pointer-events-none"
          >
            {layout.edges.map((edge) => {
              const fromStatus = getStatus(edge.from);
              const toStatus = getStatus(edge.to);
              const lit = fromStatus === "success" && (toStatus === "success" || toStatus === "running");
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={edge.path}
                  fill="none"
                  stroke={lit ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.25)"}
                  strokeWidth={lit ? 2 : 1.5}
                  strokeDasharray={toStatus === "running" ? "6 3" : undefined}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {flow.steps.map((step) => {
            const pos = layout.nodes.get(step.id);
            if (!pos) return null;
            return (
              <CanvasNode
                key={step.id}
                step={step}
                x={pos.x}
                y={pos.y}
                status={getStatus(step.id)}
                isSelected={selectedStepId === step.id}
                onClick={handleNodeClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── CanvasNode ─────────────────────────────────────────────

interface CanvasNodeProps {
  step: FlowStep;
  x: number;
  y: number;
  status: StepStatus;
  isSelected: boolean;
  onClick: (stepId: string) => void;
}

const CanvasNode = memo(function CanvasNode({ step, x, y, status, isSelected, onClick }: CanvasNodeProps) {
  const config = TYPE_CONFIG[step.type];
  const TypeIcon = config.icon;
  const StatusIcon = STATUS_ICON[status];

  return (
    <button
      data-step-node
      onClick={() => onClick(step.id)}
      className={cn(
        "absolute rounded-lg border bg-background shadow-sm transition-all",
        "hover:shadow-md hover:border-primary/50 text-left",
        isSelected ? "border-primary ring-2 ring-primary/20 shadow-md" : config.border,
        status === "running" && "border-primary/60",
        status === "error" && "border-red-500/60",
      )}
      style={{
        left: x,
        top: y,
        width: NODE_W,
        height: NODE_H,
      }}
    >
      <div className="px-3 py-2 h-full flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <StatusIcon
            className={cn(
              "h-3 w-3 shrink-0",
              status === "running" && "animate-spin text-primary",
              status === "success" && "text-green-500",
              status === "error" && "text-red-500",
              status === "idle" && "text-muted-foreground/50",
              status === "skipped" && "text-muted-foreground/50",
            )}
          />
          <span className="text-xs font-medium truncate flex-1">{step.name}</span>
          <TypeIcon className={cn("h-3 w-3 shrink-0", config.color)} />
        </div>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5 pl-[18px]">
          {step.description}
        </p>
      </div>
    </button>
  );
});
