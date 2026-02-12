/**
 * Flow Detail — Full inspection page for a single PER-002 flow.
 *
 * Features:
 * - Execution history browser (persisted past runs)
 * - Execution summary bar (duration, tokens, cost, status)
 * - Step-through mode (walk completed steps in order)
 * - DAG canvas with search, minimap, keyboard shortcuts
 * - Step inspector panel (slide-in right)
 */

import { useState, useMemo, useCallback, useSyncExternalStore } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Workflow,
  GitBranch,
  MapPin,
  PanelRightClose,
  Clock,
  Zap,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  History,
  Play,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Circle,
  Sparkles,
} from "lucide-react";
import { getFlowById } from "@/lib/bilko-flow/definitions/registry";
import { FlowCanvas, StepDetail, CanvasBuilder } from "@/components/flow-inspector";
import { useExecutionStore } from "@/lib/bilko-flow";
import {
  getExecutionHistory,
  subscribe as storeSubscribe,
} from "@/lib/bilko-flow/runtime/execution-store";
import { useGlobalControl } from "@/lib/global-controls";
import type { FlowDefinition, FlowExecution, StepExecution, MutationResult } from "@/lib/bilko-flow";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Main component ───────────────────────────────────────

export default function FlowDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/flows/:flowId");
  const flowId = params?.flowId;
  const flow = flowId ? getFlowById(flowId) : undefined;

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [stepThroughIdx, setStepThroughIdx] = useState<number | null>(null);

  // Voice builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [multiSelectIds, setMultiSelectIds] = useState<Set<string>>(new Set());
  const [liveFlow, setLiveFlow] = useState<FlowDefinition | null>(null);

  const handleToggleSelect = useCallback((stepId: string) => {
    setMultiSelectIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  }, []);

  const handleApplyMutation = useCallback((result: MutationResult) => {
    // applyMutation spreads the original flow, preserving Bilko's extra fields at runtime
    setLiveFlow(result.flow as FlowDefinition);
    // Clear multi-selection after applying
    setMultiSelectIds(new Set());
  }, []);

  const handleBuilderClose = useCallback(() => {
    setBuilderOpen(false);
    setMultiSelectIds(new Set());
  }, []);

  // Live execution from global store
  const liveExecution = useExecutionStore(flowId ?? "");

  // History list (reactive)
  const historyList = useSyncExternalStore(
    storeSubscribe,
    () => getExecutionHistory(flowId ?? ""),
  );

  // Determine which execution to display
  const execution: FlowExecution | undefined = viewingHistoryId
    ? historyList.find((e) => e.id === viewingHistoryId)
    : liveExecution;

  // Step-through: sorted completed steps
  const completedSteps = useMemo(() => {
    if (!execution) return [];
    return Object.values(execution.steps)
      .filter((s) => s.completedAt != null)
      .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
  }, [execution]);

  const isSteppingThrough = stepThroughIdx !== null;
  const currentStepThrough = isSteppingThrough ? completedSteps[stepThroughIdx!] : null;

  const startStepThrough = useCallback(() => {
    if (completedSteps.length > 0) {
      setStepThroughIdx(0);
      setSelectedStepId(completedSteps[0].stepId);
    }
  }, [completedSteps]);

  const stepPrev = useCallback(() => {
    if (stepThroughIdx !== null && stepThroughIdx > 0) {
      const next = stepThroughIdx - 1;
      setStepThroughIdx(next);
      setSelectedStepId(completedSteps[next].stepId);
    }
  }, [stepThroughIdx, completedSteps]);

  const stepNext = useCallback(() => {
    if (stepThroughIdx !== null && stepThroughIdx < completedSteps.length - 1) {
      const next = stepThroughIdx + 1;
      setStepThroughIdx(next);
      setSelectedStepId(completedSteps[next].stepId);
    }
  }, [stepThroughIdx, completedSteps]);

  const exitStepThrough = useCallback(() => {
    setStepThroughIdx(null);
  }, []);

  // Cost PI — all cost computation goes through the global control contract
  const costPI = useGlobalControl("PI-COST");

  // Execution stats
  const stats = useMemo(() => {
    if (!execution) return null;
    const steps = Object.values(execution.steps);
    const totalTokens = steps.reduce((sum, s) => sum + (s.usage?.totalTokens ?? 0), 0);
    const totalDuration = steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
    const cost = costPI.actions.estimateCost(execution.steps);
    const completed = steps.filter((s) => s.status === "success").length;
    const errored = steps.filter((s) => s.status === "error").length;
    const running = steps.filter((s) => s.status === "running").length;
    return { totalTokens, totalDuration, cost, completed, errored, running, total: steps.length };
  }, [execution, costPI]);

  if (!match || !flow) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-muted-foreground mb-4">Flow not found.</p>
          <Button variant="outline" onClick={() => setLocation("/flows")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Flow Explorer
          </Button>
        </div>
      </div>
    );
  }

  // The flow to render: liveFlow (after mutations) or the registry flow
  const activeFlow = liveFlow ?? flow;

  const selectedStep = selectedStepId
    ? activeFlow.steps.find((s) => s.id === selectedStepId)
    : null;

  const selectedExecution = selectedStepId
    ? execution?.steps[selectedStepId]
    : undefined;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Top bar ──────────────────────────────────────── */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/flows")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Workflow className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">{activeFlow.name}</h1>
                <Badge variant="outline" className="text-xs">v{activeFlow.version}</Badge>
                {liveFlow && (
                  <Badge variant="default" className="text-xs gap-1">
                    <Sparkles className="h-3 w-3" /> Modified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{activeFlow.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={builderOpen ? "default" : "outline"}
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setBuilderOpen((o) => !o)}
              >
                <Sparkles className="h-3 w-3" />
                Voice Builder
              </Button>
              <Badge variant="secondary" className="gap-1 text-xs">
                <MapPin className="h-3 w-3" /> {activeFlow.location}
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs">
                <GitBranch className="h-3 w-3" /> {activeFlow.steps.length} steps
              </Badge>
              {activeFlow.output && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  out: {activeFlow.output.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Execution summary + controls bar ─────────────── */}
      <div className="shrink-0 border-b bg-muted/20 px-4 py-2 flex items-center gap-3 flex-wrap">
        {/* History selector */}
        <div className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="text-xs bg-transparent border rounded px-2 py-1 outline-none cursor-pointer"
            value={viewingHistoryId ?? "live"}
            onChange={(e) => {
              const val = e.target.value;
              setViewingHistoryId(val === "live" ? null : val);
              setStepThroughIdx(null);
            }}
          >
            <option value="live">
              Live {liveExecution ? `(${liveExecution.status})` : "(no data)"}
            </option>
            {historyList.map((exec, i) => (
              <option key={exec.id} value={exec.id}>
                Run #{historyList.length - i} — {exec.status} — {new Date(exec.startedAt).toLocaleTimeString()}
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-4 bg-border" />

        {/* Step-through controls */}
        {completedSteps.length > 0 && (
          <>
            {isSteppingThrough ? (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={stepPrev} disabled={stepThroughIdx === 0}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs font-mono text-muted-foreground">
                  {(stepThroughIdx ?? 0) + 1}/{completedSteps.length}
                </span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={stepNext} disabled={stepThroughIdx === completedSteps.length - 1}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={exitStepThrough}>
                  Exit
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={startStepThrough}>
                <Play className="h-3 w-3" /> Step through
              </Button>
            )}
            <div className="w-px h-4 bg-border" />
          </>
        )}

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {stats.running > 0 ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : stats.errored > 0 ? (
                <AlertTriangle className="h-3 w-3 text-red-500" />
              ) : stats.completed > 0 ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              {stats.completed}/{stats.total} steps
            </span>
            {stats.totalDuration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(stats.totalDuration)}
              </span>
            )}
            {stats.totalTokens > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {stats.totalTokens.toLocaleString()} tokens
              </span>
            )}
            {stats.cost > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {costPI.actions.formatCost(stats.cost)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Main area: Canvas + optional detail/builder panel ── */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <FlowCanvas
            flow={activeFlow}
            selectedStepId={selectedStepId}
            onSelectStep={setSelectedStepId}
            onDeselectStep={() => setSelectedStepId(null)}
            executions={execution?.steps}
            highlightStepId={currentStepThrough?.stepId}
            selectedStepIds={builderOpen ? multiSelectIds : undefined}
            onToggleSelect={builderOpen ? handleToggleSelect : undefined}
          />
        </div>

        {/* Voice Builder panel (takes priority over step inspector) */}
        {builderOpen ? (
          <div className="w-[420px] shrink-0 border-l overflow-hidden">
            <CanvasBuilder
              flow={activeFlow}
              selectedStepIds={multiSelectIds}
              onApplyMutation={handleApplyMutation}
              onClose={handleBuilderClose}
            />
          </div>
        ) : selectedStep ? (
          <div className="w-[420px] shrink-0 border-l overflow-auto">
            <div className="flex items-center justify-between px-3 pt-3">
              <span className="text-xs text-muted-foreground font-medium">Step Inspector</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedStepId(null)}
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="p-3">
              <StepDetail step={selectedStep} flow={activeFlow} execution={selectedExecution} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
