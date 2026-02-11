/**
 * StepDetail — Rich "step homepage" for the Flow Inspector.
 *
 * Shows an at-a-glance hero, dependency context, and tabbed detail panes
 * for prompt, schema, and execution data.
 */

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Clock,
  Zap,
  FileJson,
  MessageSquare,
  ArrowDown,
  ArrowUp,
  GitBranch,
  Layers,
  Activity,
  CircleDot,
  AlertTriangle,
} from "lucide-react";
import type {
  FlowStep,
  FlowDefinition,
  StepExecution,
} from "@/lib/bilko-flow/types";
import { getStepVisuals } from "@/lib/bilko-flow/inspector/step-type-config";

// ── Props ────────────────────────────────────────────────

interface StepDetailProps {
  step: FlowStep;
  flow: FlowDefinition;
  execution?: StepExecution;
}

// ── Component ────────────────────────────────────────────

export function StepDetail({ step, flow, execution }: StepDetailProps) {
  const config = getStepVisuals(step);
  const Icon = config.icon;

  // Derive dependency context from the flow graph
  const deps = useMemo(() => {
    const upstream = step.dependsOn
      .map((id) => flow.steps.find((s) => s.id === id))
      .filter(Boolean) as FlowStep[];
    const downstream = flow.steps.filter((s) => s.dependsOn.includes(step.id));
    return { upstream, downstream };
  }, [step, flow.steps]);

  const defaultTab = step.prompt ? "prompt" : "schema";

  const inputCount = step.inputSchema?.length ?? 0;
  const outputCount = step.outputSchema?.length ?? 0;

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ── Hero ────────────────────────────────────────── */}
      <div className={`rounded-lg border ${config.accent} ${config.bg} p-4`}>
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg ${config.bg} border ${config.accent} flex items-center justify-center shrink-0`}
          >
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold">{step.name}</h2>
              {step.parallel && (
                <Badge variant="secondary" className="text-[10px]">
                  parallel
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                {config.label}
              </Badge>
              {step.subtype && (
                <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                  {step.subtype.charAt(0).toUpperCase() + step.subtype.slice(1)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        {/* Model badge for LLM steps */}
        {step.model && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-foreground/5">
            <Brain className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Model</span>
            <Badge variant="secondary" className="text-xs font-mono">
              {step.model}
            </Badge>
          </div>
        )}
      </div>

      {/* ── Quick Stats Strip ───────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={<ArrowDown className="h-3 w-3" />}
          label="Inputs"
          value={inputCount}
        />
        <StatCard
          icon={<ArrowUp className="h-3 w-3" />}
          label="Outputs"
          value={outputCount}
        />
        <StatCard
          icon={<GitBranch className="h-3 w-3" />}
          label="Deps"
          value={deps.upstream.length}
        />
      </div>

      {/* ── Execution Status (when running/completed) ──── */}
      {execution && (
        <Card className="border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Live Execution</span>
              <div className="flex-1" />
              <Badge
                variant={
                  execution.status === "success"
                    ? "default"
                    : execution.status === "error"
                    ? "destructive"
                    : "secondary"
                }
                className="text-[10px]"
              >
                {execution.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {execution.durationMs != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {execution.durationMs}ms
                </span>
              )}
              {execution.usage && (
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {execution.usage.totalTokens} tokens
                </span>
              )}
              {execution.usage && (
                <span className="flex items-center gap-1 text-muted-foreground/60">
                  {execution.usage.promptTokens}p / {execution.usage.completionTokens}c
                </span>
              )}
            </div>
            {execution.error && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-red-500">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{execution.error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Dependency Context ──────────────────────────── */}
      {(deps.upstream.length > 0 || deps.downstream.length > 0) && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3 w-3" />
            Flow Context
          </h4>
          <div className="flex gap-2 flex-wrap">
            {deps.upstream.map((dep) => {
              const depConfig = getStepVisuals(dep);
              const DepIcon = depConfig.icon;
              return (
                <div
                  key={dep.id}
                  className="flex items-center gap-1.5 text-xs bg-muted rounded-md px-2 py-1"
                >
                  <DepIcon className={`h-3 w-3 ${depConfig.color}`} />
                  <span className="text-muted-foreground">{dep.name}</span>
                  <ArrowDown className="h-2.5 w-2.5 text-muted-foreground/50" />
                </div>
              );
            })}
            {deps.upstream.length > 0 && deps.downstream.length > 0 && (
              <div className="flex items-center">
                <CircleDot className={`h-3.5 w-3.5 ${config.color}`} />
              </div>
            )}
            {deps.downstream.map((dep) => {
              const depConfig = getStepVisuals(dep);
              const DepIcon = depConfig.icon;
              return (
                <div
                  key={dep.id}
                  className="flex items-center gap-1.5 text-xs bg-muted rounded-md px-2 py-1"
                >
                  <ArrowDown className="h-2.5 w-2.5 text-muted-foreground/50 rotate-180" />
                  <span className="text-muted-foreground">{dep.name}</span>
                  <DepIcon className={`h-3 w-3 ${depConfig.color}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* ── Tabbed Detail ───────────────────────────────── */}
      <div className="flex-1 overflow-auto min-h-0">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full">
            {step.prompt && (
              <TabsTrigger value="prompt" className="flex-1 text-xs gap-1">
                <MessageSquare className="h-3 w-3" />
                Prompt
              </TabsTrigger>
            )}
            <TabsTrigger value="schema" className="flex-1 text-xs gap-1">
              <FileJson className="h-3 w-3" />
              Schema
            </TabsTrigger>
            {execution && (
              <TabsTrigger value="execution" className="flex-1 text-xs gap-1">
                <Zap className="h-3 w-3" />
                Data
              </TabsTrigger>
            )}
          </TabsList>

          {/* Prompt Tab */}
          {step.prompt && (
            <TabsContent value="prompt" className="space-y-3 mt-3">
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    system
                  </Badge>
                </h5>
                <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap overflow-auto max-h-[300px] font-mono leading-relaxed border">
                  {step.prompt}
                </pre>
              </div>
              {step.userMessage && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      user
                    </Badge>
                  </h5>
                  <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap overflow-auto max-h-[200px] font-mono leading-relaxed border">
                    {step.userMessage}
                  </pre>
                </div>
              )}
            </TabsContent>
          )}

          {/* Schema Tab */}
          <TabsContent value="schema" className="space-y-4 mt-3">
            {inputCount > 0 && (
              <SchemaSection
                label="Input"
                icon={<ArrowDown className="h-3 w-3" />}
                fields={step.inputSchema!}
              />
            )}
            {outputCount > 0 && (
              <SchemaSection
                label="Output"
                icon={<ArrowUp className="h-3 w-3" />}
                fields={step.outputSchema!}
              />
            )}
            {inputCount === 0 && outputCount === 0 && (
              <div className="text-center py-6">
                <FileJson className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  No schema defined for this step.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Execution Data Tab */}
          {execution && (
            <TabsContent value="execution" className="space-y-3 mt-3">
              {execution.input != null && (
                <DataBlock label="Input Data" icon={<ArrowDown className="h-3 w-3" />}>
                  {JSON.stringify(execution.input, null, 2)}
                </DataBlock>
              )}
              {execution.output != null && (
                <DataBlock label="Output Data" icon={<ArrowUp className="h-3 w-3" />}>
                  {JSON.stringify(execution.output, null, 2)}
                </DataBlock>
              )}
              {execution.rawResponse && (
                <DataBlock label="Raw LLM Response" icon={<MessageSquare className="h-3 w-3" />}>
                  {execution.rawResponse}
                </DataBlock>
              )}
              {execution.error && (
                <div>
                  <h5 className="text-xs font-medium text-red-500 mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Error
                  </h5>
                  <pre className="text-xs bg-red-500/10 border border-red-500/20 rounded-md p-3 whitespace-pre-wrap text-red-500 max-h-[200px] overflow-auto">
                    {execution.error}
                  </pre>
                </div>
              )}
              {execution.input == null &&
                execution.output == null &&
                !execution.rawResponse &&
                !execution.error && (
                  <div className="text-center py-6">
                    <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Waiting for execution data...
                    </p>
                  </div>
                )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function SchemaSection({
  label,
  icon,
  fields,
}: {
  label: string;
  icon: React.ReactNode;
  fields: FlowStep["inputSchema"] & {};
}) {
  return (
    <div>
      <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        {icon} {label}
      </h5>
      <div className="space-y-1.5">
        {fields.map((field) => (
          <div
            key={field.name}
            className="rounded-md border bg-muted/40 p-2.5"
          >
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono font-semibold">{field.name}</code>
              <Badge variant="outline" className="text-[10px] font-mono">
                {field.type}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {field.description}
            </p>
            {field.example && (
              <pre className="text-[10px] font-mono text-muted-foreground/70 mt-1.5 bg-background rounded px-2 py-1 truncate border">
                {field.example}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DataBlock({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: string;
}) {
  return (
    <div>
      <h5 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
        {icon} {label}
      </h5>
      <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap overflow-auto max-h-[200px] font-mono leading-relaxed border">
        {children}
      </pre>
    </div>
  );
}
