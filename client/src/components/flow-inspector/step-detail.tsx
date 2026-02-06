/**
 * StepDetail - Detailed view of a selected step.
 * Shows prompt, input/output schemas, execution data, and raw responses.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  MousePointerClick,
  ArrowRightLeft,
  ShieldCheck,
  Monitor,
  Clock,
  Zap,
  FileJson,
  MessageSquare,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import type { FlowStep, StepExecution, StepType } from "@/lib/flow-inspector/types";

const TYPE_ICON: Record<StepType, typeof Brain> = {
  llm: Brain,
  "user-input": MousePointerClick,
  transform: ArrowRightLeft,
  validate: ShieldCheck,
  display: Monitor,
};

interface StepDetailProps {
  step: FlowStep;
  execution?: StepExecution;
}

export function StepDetail({ step, execution }: StepDetailProps) {
  const Icon = TYPE_ICON[step.type];

  const defaultTab = step.prompt ? "prompt" : "schema";

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{step.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
        </div>
        {execution && (
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {execution.durationMs != null && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {execution.durationMs}ms
              </span>
            )}
            {execution.usage && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                {execution.usage.totalTokens} tokens
              </span>
            )}
            <Badge
              variant={
                execution.status === "success"
                  ? "default"
                  : execution.status === "error"
                  ? "destructive"
                  : "secondary"
              }
              className="text-xs"
            >
              {execution.status}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
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
                Execution
              </TabsTrigger>
            )}
          </TabsList>

          {/* Prompt Tab */}
          {step.prompt && (
            <TabsContent value="prompt" className="space-y-3 mt-3">
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">system</Badge>
                </h5>
                <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap overflow-auto max-h-[300px] font-mono">
                  {step.prompt}
                </pre>
              </div>
              {step.userMessage && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">user</Badge>
                  </h5>
                  <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap overflow-auto max-h-[200px] font-mono">
                    {step.userMessage}
                  </pre>
                </div>
              )}
              {step.model && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Model:</span>
                  <Badge variant="secondary" className="text-xs">{step.model}</Badge>
                </div>
              )}
            </TabsContent>
          )}

          {/* Schema Tab */}
          <TabsContent value="schema" className="space-y-4 mt-3">
            {step.inputSchema && step.inputSchema.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <ArrowDown className="h-3 w-3" /> Input
                </h5>
                <div className="space-y-2">
                  {step.inputSchema.map((field) => (
                    <div key={field.name} className="bg-muted rounded-md p-2">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-medium">{field.name}</code>
                        <Badge variant="outline" className="text-xs">{field.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
                      {field.example && (
                        <pre className="text-xs font-mono text-muted-foreground mt-1 truncate">
                          {field.example}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {step.outputSchema && step.outputSchema.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" /> Output
                </h5>
                <div className="space-y-2">
                  {step.outputSchema.map((field) => (
                    <div key={field.name} className="bg-muted rounded-md p-2">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-medium">{field.name}</code>
                        <Badge variant="outline" className="text-xs">{field.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
                      {field.example && (
                        <pre className="text-xs font-mono text-muted-foreground mt-1 truncate">
                          {field.example}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(!step.inputSchema || step.inputSchema.length === 0) &&
              (!step.outputSchema || step.outputSchema.length === 0) && (
                <p className="text-xs text-muted-foreground">No schema defined for this step.</p>
              )}
          </TabsContent>

          {/* Execution Tab */}
          {execution && (
            <TabsContent value="execution" className="space-y-3 mt-3">
              {execution.input != null && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <ArrowDown className="h-3 w-3" /> Input Data
                  </h5>
                  <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap overflow-auto max-h-[200px] font-mono">
                    {JSON.stringify(execution.input, null, 2)}
                  </pre>
                </div>
              )}
              {execution.output != null && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" /> Output Data
                  </h5>
                  <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap overflow-auto max-h-[200px] font-mono">
                    {JSON.stringify(execution.output, null, 2)}
                  </pre>
                </div>
              )}
              {execution.rawResponse && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1">Raw LLM Response</h5>
                  <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap overflow-auto max-h-[200px] font-mono">
                    {execution.rawResponse}
                  </pre>
                </div>
              )}
              {execution.error && (
                <div>
                  <h5 className="text-xs font-medium text-red-500 mb-1">Error</h5>
                  <pre className="text-xs bg-red-500/10 border border-red-500/20 rounded-md p-3 whitespace-pre-wrap text-red-500">
                    {execution.error}
                  </pre>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
