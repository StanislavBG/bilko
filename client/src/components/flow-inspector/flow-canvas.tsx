/**
 * FlowCanvas — 2D DAG visualisation with zoom/pan.
 *
 * Renders flow steps as positioned nodes connected by SVG bezier edges.
 * Supports branching/parallel flows via the DAG layout engine.
 *
 * Features:
 * - Zoom in/out via buttons, scroll-wheel, or keyboard (+/-)
 * - Pan via pointer drag or scroll
 * - Keyboard navigation (arrow keys, Escape, F for fit)
 * - Search toolbar to filter/highlight nodes
 * - Minimap for large flow orientation
 * - Memoized nodes to skip re-renders during zoom/pan
 */

import { useMemo, useRef, useState, useCallback, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  X,
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
  Keyboard,
} from "lucide-react";
import type { FlowDefinition, StepExecution, StepStatus, StepType, FlowStep } from "@/lib/flow-inspector/types";
import { computeLayout, NODE_W, NODE_H, PADDING, type DAGLayout } from "@/lib/flow-inspector/layout";

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

// ── Minimap constants ─────────────────────────────────────
const MINIMAP_W = 160;
const MINIMAP_H = 100;

// ── Component ─────────────────────────────────────────────

interface FlowCanvasProps {
  flow: FlowDefinition;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onDeselectStep?: () => void;
  executions?: Record<string, StepExecution>;
  /** Externally-controlled highlighted step (e.g. from step-through) */
  highlightStepId?: string | null;
  /** Multi-select: set of selected step IDs (voice builder mode) */
  selectedStepIds?: Set<string>;
  /** Multi-select: toggle a step in/out of selection */
  onToggleSelect?: (stepId: string) => void;
}

export function FlowCanvas({
  flow,
  selectedStepId,
  onSelectStep,
  onDeselectStep,
  executions,
  highlightStepId,
  selectedStepIds,
  onToggleSelect,
}: FlowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const [isPanningState, setIsPanningState] = useState(false);
  const panRef = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Shortcuts help
  const [showShortcuts, setShowShortcuts] = useState(false);

  panRef.current = pan;

  const layout = useMemo(() => computeLayout(flow.steps), [flow.steps]);

  // Search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    return new Set(
      flow.steps
        .filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.type.includes(q))
        .map((s) => s.id),
    );
  }, [flow.steps, searchQuery]);

  const hasSearch = searchQuery.trim().length > 0;

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

  const handleWheel = useCallback((e: globalThis.WheelEvent) => {
    // Always prevent default to stop browser zoom/scroll when pointer is over canvas
    e.preventDefault();
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.min(Math.max(z + delta, ZOOM_MIN), ZOOM_MAX));
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  // Attach wheel handler as non-passive native listener so preventDefault() works
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Pan (drag) ─────────────────────────────────────────
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

  const onSelectStepRef = useRef(onSelectStep);
  onSelectStepRef.current = onSelectStep;
  const onToggleSelectRef = useRef(onToggleSelect);
  onToggleSelectRef.current = onToggleSelect;
  const handleNodeClick = useCallback((stepId: string, shiftKey: boolean) => {
    if (shiftKey && onToggleSelectRef.current) {
      onToggleSelectRef.current(stepId);
    } else {
      onSelectStepRef.current(stepId);
    }
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────
  useEffect(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in search input
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case "Escape":
          if (searchOpen) {
            setSearchOpen(false);
            setSearchQuery("");
          } else {
            onDeselectStep?.();
          }
          break;
        case "f":
        case "F":
          if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); zoomFit(); }
          break;
        case "=":
        case "+":
          e.preventDefault(); zoomIn();
          break;
        case "-":
          e.preventDefault(); zoomOut();
          break;
        case "/":
          e.preventDefault();
          setSearchOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 50);
          break;
        case "?":
          setShowShortcuts((s) => !s);
          break;
        case "ArrowRight":
        case "ArrowDown": {
          e.preventDefault();
          const stepIds = flow.steps.map((s) => s.id);
          const idx = selectedStepId ? stepIds.indexOf(selectedStepId) : -1;
          const next = stepIds[idx + 1] ?? stepIds[0];
          if (next) onSelectStep(next);
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          e.preventDefault();
          const stepIds = flow.steps.map((s) => s.id);
          const idx = selectedStepId ? stepIds.indexOf(selectedStepId) : stepIds.length;
          const prev = stepIds[idx - 1] ?? stepIds[stepIds.length - 1];
          if (prev) onSelectStep(prev);
          break;
        }
      }
    };

    container.addEventListener("keydown", handler);
    return () => container.removeEventListener("keydown", handler);
  }, [flow.steps, selectedStepId, onSelectStep, onDeselectStep, searchOpen, zoomFit, zoomIn, zoomOut]);

  const zoomPercent = Math.round(zoom * 100);

  // ── Minimap geometry ───────────────────────────────────
  const miniScale = layout.width > 0 ? Math.min(MINIMAP_W / layout.width, MINIMAP_H / layout.height) : 0;
  const containerW = containerRef.current?.clientWidth ?? 600;
  const containerH = containerRef.current?.clientHeight ?? 400;

  return (
    <div className="relative h-full flex flex-col" tabIndex={0} style={{ outline: "none" }}>
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-1 p-2 border-b bg-muted/30">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out (-)</TooltipContent>
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
          <TooltipContent>Zoom in (+)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomFit}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to view (F)</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Search */}
        {searchOpen ? (
          <div className="flex items-center gap-1 bg-background border rounded-md px-2 py-0.5">
            <Search className="h-3 w-3 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search steps..."
              className="text-xs bg-transparent outline-none w-32 placeholder:text-muted-foreground/50"
              onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
            />
            {hasSearch && (
              <span className="text-[10px] text-muted-foreground">{searchMatches.size}</span>
            )}
            <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}>
                <Search className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search (/)</TooltipContent>
          </Tooltip>
        )}

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowShortcuts((s) => !s)}>
              <Keyboard className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Shortcuts (?)</TooltipContent>
        </Tooltip>

        {selectedStepIds && selectedStepIds.size > 0 && (
          <Badge variant="default" className="text-xs gap-1">
            {selectedStepIds.size} selected
          </Badge>
        )}

        <Badge variant="outline" className="text-xs">
          {flow.steps.length} steps &middot; {layout.columns} cols
        </Badge>
      </div>

      {/* Shortcuts overlay */}
      {showShortcuts && (
        <div className="absolute top-12 right-3 z-20 bg-background border rounded-lg shadow-lg p-3 text-xs space-y-1.5 w-48">
          <div className="flex justify-between font-medium mb-2">
            <span>Keyboard Shortcuts</span>
            <button onClick={() => setShowShortcuts(false)}><X className="h-3 w-3" /></button>
          </div>
          {[
            ["/", "Search"],
            ["F", "Fit to view"],
            ["+ / -", "Zoom in/out"],
            ["Arrow keys", "Navigate steps"],
            ["Escape", "Deselect / close"],
            ["?", "Toggle this help"],
          ].map(([key, desc]) => (
            <div key={key} className="flex justify-between">
              <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{key}</kbd>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      )}

      {/* Canvas area */}
      <div
        ref={containerRef}
        className={cn("flex-1 overflow-hidden relative", isPanningState ? "cursor-grabbing" : "cursor-grab")}
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
              const dimmed = hasSearch && (!searchMatches.has(edge.from) || !searchMatches.has(edge.to));
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={edge.path}
                  fill="none"
                  stroke={lit ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.25)"}
                  strokeWidth={lit ? 2 : 1.5}
                  strokeDasharray={toStatus === "running" ? "6 3" : undefined}
                  opacity={dimmed ? 0.15 : 1}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {flow.steps.map((step) => {
            const pos = layout.nodes.get(step.id);
            if (!pos) return null;
            const dimmed = hasSearch && !searchMatches.has(step.id);
            return (
              <CanvasNode
                key={step.id}
                step={step}
                x={pos.x}
                y={pos.y}
                status={getStatus(step.id)}
                isSelected={selectedStepId === step.id}
                isHighlighted={highlightStepId === step.id}
                isMultiSelected={selectedStepIds?.has(step.id) ?? false}
                dimmed={dimmed}
                onClick={handleNodeClick}
              />
            );
          })}
        </div>

        {/* Minimap */}
        {layout.width > 0 && (
          <div className="absolute bottom-3 right-3 border rounded bg-background/90 backdrop-blur shadow-sm overflow-hidden" style={{ width: MINIMAP_W, height: MINIMAP_H }}>
            <svg width={MINIMAP_W} height={MINIMAP_H}>
              {/* Edges */}
              {layout.edges.map((edge) => {
                const from = layout.nodes.get(edge.from);
                const to = layout.nodes.get(edge.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={`mm-${edge.from}-${edge.to}`}
                    x1={(from.x + NODE_W / 2) * miniScale}
                    y1={(from.y + NODE_H / 2) * miniScale}
                    x2={(to.x + NODE_W / 2) * miniScale}
                    y2={(to.y + NODE_H / 2) * miniScale}
                    stroke="hsl(var(--muted-foreground) / 0.2)"
                    strokeWidth={0.5}
                  />
                );
              })}
              {/* Nodes */}
              {flow.steps.map((step) => {
                const pos = layout.nodes.get(step.id);
                if (!pos) return null;
                const st = getStatus(step.id);
                const fill = st === "success" ? "hsl(var(--primary))"
                  : st === "error" ? "hsl(0 80% 55%)"
                  : st === "running" ? "hsl(var(--primary) / 0.5)"
                  : "hsl(var(--muted-foreground) / 0.3)";
                const isSel = selectedStepId === step.id;
                return (
                  <rect
                    key={`mm-n-${step.id}`}
                    x={pos.x * miniScale}
                    y={pos.y * miniScale}
                    width={NODE_W * miniScale}
                    height={NODE_H * miniScale}
                    rx={2}
                    fill={fill}
                    stroke={isSel ? "hsl(var(--primary))" : "none"}
                    strokeWidth={isSel ? 1.5 : 0}
                  />
                );
              })}
              {/* Viewport rectangle */}
              <rect
                x={Math.max(0, -pan.x / zoom * miniScale)}
                y={Math.max(0, -pan.y / zoom * miniScale)}
                width={Math.min(MINIMAP_W, containerW / zoom * miniScale)}
                height={Math.min(MINIMAP_H, containerH / zoom * miniScale)}
                fill="none"
                stroke="hsl(var(--primary) / 0.5)"
                strokeWidth={1}
                rx={1}
              />
            </svg>
          </div>
        )}
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
  isHighlighted: boolean;
  isMultiSelected: boolean;
  dimmed: boolean;
  onClick: (stepId: string, shiftKey: boolean) => void;
}

const CanvasNode = memo(function CanvasNode({ step, x, y, status, isSelected, isHighlighted, isMultiSelected, dimmed, onClick }: CanvasNodeProps) {
  const config = TYPE_CONFIG[step.type];
  const TypeIcon = config.icon;
  const StatusIcon = STATUS_ICON[status];

  return (
    <button
      data-step-node
      onClick={(e) => onClick(step.id, e.shiftKey)}
      className={cn(
        "absolute rounded-lg border bg-background shadow-sm transition-all",
        "hover:shadow-md hover:border-primary/50 text-left",
        isSelected ? "border-primary ring-2 ring-primary/20 shadow-md" : config.border,
        isMultiSelected && !isSelected && "ring-2 ring-blue-400/50 border-blue-400/60 bg-blue-500/5",
        isHighlighted && !isSelected && !isMultiSelected && "ring-2 ring-yellow-400/50 border-yellow-400/60",
        status === "running" && "border-primary/60",
        status === "error" && "border-red-500/60",
        dimmed && "opacity-20",
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
