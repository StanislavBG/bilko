import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useViewMode } from "@/contexts/view-mode-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EndpointInfo } from "@/components/endpoint-info";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Shield, Clock,
  Book, ChevronDown, ChevronRight, FileText, Layers, Tag, GitBranch, Link2,
  FileSearch, ListChecks, Search
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface RuleMetadata {
  id: string;
  title: string;
  partition: string;
  priority: string;
  version: string;
  description: string;
  dependencies: string[];
  crossReferences: string[];
  triggers: string[];
}

interface PartitionInfo {
  id: string;
  description: string;
  readOrder: number;
  rules: RuleMetadata[];
}

interface RulesCatalog {
  totalRules: number;
  partitions: PartitionInfo[];
  primaryDirectiveId: string;
}

interface RuleContent {
  id: string;
  title: string;
  partition: string;
  priority: string;
  version: string;
  description: string;
  dependencies: string[];
  crossReferences: string[];
  content: string;
}

interface PatternCheck {
  pattern: string;
  label: string;
  found: boolean;
  matchedText?: string;
  lineNumber?: number;
}

interface FileEvidence {
  path: string;
  exists: boolean;
  sizeBytes?: number;
  lineCount?: number;
  contentPreview?: string;
  relevantLines?: { lineNumber: number; content: string }[];
}

interface AuditEvidence {
  filesExamined: FileEvidence[];
  patternsChecked?: PatternCheck[];
  validationSteps?: { step: string; result: string; passed: boolean }[];
  summary: string;
}

interface AuditResult {
  checkId: string;
  passed: boolean;
  message: string;
  details?: string[];
  endpoint: string;
  runTimestamp: string;
  checkName: string;
  checkDescription: string;
  severity: "critical" | "warning" | "info";
  evidence: AuditEvidence;
}

interface AuditReport {
  timestamp: string;
  passed: boolean;
  criticalFailures: number;
  warnings: number;
  results: AuditResult[];
}

function formatTimestamp(date: string): string {
  const d = new Date(date);
  return d.toLocaleString();
}

const PRIORITY_INFO: Record<string, { color: string; description: string }> = {
  ABSOLUTE: { 
    color: "bg-red-600 text-white", 
    description: "ABSOLUTE - Must always be followed without exception" 
  },
  CRITICAL: { 
    color: "bg-orange-500 text-white", 
    description: "CRITICAL - Essential for system integrity" 
  },
  HIGH: { 
    color: "bg-amber-500 text-white", 
    description: "HIGH - Important for correct behavior" 
  },
  MEDIUM: { 
    color: "bg-blue-500 text-white", 
    description: "MEDIUM - Recommended best practice" 
  },
  LOW: { 
    color: "bg-slate-500 text-white", 
    description: "LOW - Optional guidance" 
  },
};

const SEVERITY_INFO: Record<string, string> = {
  critical: "Critical - Failure blocks deployment",
  warning: "Warning - Should be addressed",
  info: "Info - For awareness only",
};

function getPriorityColor(priority: string): string {
  return PRIORITY_INFO[priority]?.color ?? "bg-muted";
}

function getPriorityDescription(priority: string): string {
  return PRIORITY_INFO[priority]?.description ?? priority;
}

function getSeverityDescription(severity: string): string {
  return SEVERITY_INFO[severity] ?? severity;
}

function CheckStatusIcon({ passed }: { passed: boolean }) {
  if (passed) {
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  }
  return <XCircle className="h-4 w-4 text-destructive" />;
}

function SecondaryNavItem({ 
  icon: Icon,
  label, 
  isActive, 
  onClick,
  badge,
  testId
}: { 
  icon: typeof Book;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: { text: string; variant?: "default" | "destructive" };
  testId: string;
}) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start gap-2 h-9 ${
        isActive ? "bg-accent text-accent-foreground" : ""
      }`}
      onClick={onClick}
      data-testid={testId}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left text-sm">{label}</span>
      {badge && (
        <Badge variant={badge.variant || "default"} className="text-[10px] px-1.5">
          {badge.text}
        </Badge>
      )}
    </Button>
  );
}

function PartitionNavItem({
  partition,
  isSelected,
  onSelect
}: {
  partition: PartitionInfo;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start gap-2 h-8 ${
        isSelected ? "bg-accent text-accent-foreground" : ""
      }`}
      onClick={onSelect}
      data-testid={`nav-partition-${partition.id}`}
    >
      <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-left text-sm capitalize truncate">{partition.id}</span>
      <span className="text-xs text-muted-foreground">{partition.rules.length}</span>
    </Button>
  );
}

function RuleNavItem({
  rule,
  isPrimary,
  isSelected,
  onSelect
}: {
  rule: RuleMetadata;
  isPrimary: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start gap-2 h-8 ${
        isSelected ? "bg-accent text-accent-foreground" : ""
      }`}
      onClick={onSelect}
      data-testid={`nav-rule-${rule.id.toLowerCase()}`}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <code className="text-xs font-medium">{rule.id}</code>
        {isPrimary && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Shield className="h-3 w-3 text-primary shrink-0" />
            </TooltipTrigger>
            <TooltipContent>Primary Directive</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`text-[10px] px-1 py-0.5 rounded cursor-help ${getPriorityColor(rule.priority)}`}>
            {rule.priority.charAt(0)}
          </span>
        </TooltipTrigger>
        <TooltipContent>{getPriorityDescription(rule.priority)}</TooltipContent>
      </Tooltip>
    </Button>
  );
}

function AuditCheckNavItem({
  result,
  isSelected,
  onSelect
}: {
  result: AuditResult;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start gap-2 h-8 ${
        isSelected ? "bg-accent text-accent-foreground" : ""
      }`}
      onClick={onSelect}
      data-testid={`nav-check-${result.checkId.toLowerCase()}`}
    >
      <CheckStatusIcon passed={result.passed} />
      <code className="text-xs font-medium flex-1 text-left">{result.checkId}</code>
      <Badge 
        variant={result.passed ? "default" : "destructive"} 
        className="text-[10px] px-1"
      >
        {result.passed ? "OK" : "FAIL"}
      </Badge>
    </Button>
  );
}

function RuleDetailPanel({ 
  ruleId,
  onSelectRule
}: { 
  ruleId: string;
  onSelectRule: (ruleId: string) => void;
}) {
  const { data: rule, isLoading, error } = useQuery<RuleContent>({
    queryKey: ["/api/rules", ruleId],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Failed to load rule</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto" data-testid={`detail-rule-${ruleId.toLowerCase()}`}>
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <code className="text-sm font-bold bg-muted px-2 py-0.5 rounded">
            {rule.id}
          </code>
          <Badge className={getPriorityColor(rule.priority)} data-testid="badge-priority">
            {rule.priority}
          </Badge>
          <Badge variant="outline" className="capitalize text-xs">
            {rule.partition}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Tag className="h-3 w-3" />
            v{rule.version}
          </span>
        </div>
        <h2 className="text-lg font-semibold" data-testid="text-rule-title">
          {rule.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>

        {(rule.dependencies.length > 0 || rule.crossReferences.length > 0) && (
          <div className="mt-3 pt-3 border-t flex flex-wrap gap-3">
            {rule.dependencies.length > 0 && (
              <div>
                <span className="text-xs font-medium flex items-center gap-1 mb-1 text-muted-foreground">
                  <GitBranch className="h-3 w-3" />
                  Dependencies
                </span>
                <div className="flex flex-wrap gap-1">
                  {rule.dependencies.map((dep) => (
                    <Button
                      key={dep}
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectRule(dep)}
                      data-testid={`link-dep-${dep.toLowerCase()}`}
                    >
                      <code className="text-xs">{dep}</code>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {rule.crossReferences.length > 0 && (
              <div>
                <span className="text-xs font-medium flex items-center gap-1 mb-1 text-muted-foreground">
                  <Link2 className="h-3 w-3" />
                  Cross-References
                </span>
                <div className="flex flex-wrap gap-1">
                  {rule.crossReferences.map((ref) => (
                    <Button
                      key={ref}
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectRule(ref)}
                      data-testid={`link-ref-${ref.toLowerCase()}`}
                    >
                      <code className="text-xs">{ref}</code>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="text-rule-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {rule.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function AuditDetailPanel({ result }: { result: AuditResult }) {
  return (
    <div className="h-full overflow-auto" data-testid={`detail-check-${result.checkId.toLowerCase()}`}>
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <code className="text-sm font-bold bg-muted px-2 py-0.5 rounded">
            {result.checkId}
          </code>
          <Badge variant={result.passed ? "default" : "destructive"}>
            {result.passed ? "Passed" : "Failed"}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs capitalize cursor-help">
                {result.severity}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{getSeverityDescription(result.severity)}</TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimestamp(result.runTimestamp)}
          </span>
        </div>
        <h2 className="text-lg font-semibold" data-testid="text-check-title">
          {result.checkName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{result.checkDescription}</p>
        
        <div className="mt-3 p-2 bg-muted rounded-md">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Result:</span>
            <span className={result.passed ? "text-green-600" : "text-destructive"}>
              {result.message}
            </span>
          </div>
        </div>

        {result.details && result.details.length > 0 && (
          <div className="mt-3 space-y-1">
            <span className="text-xs font-medium text-destructive">Issues found:</span>
            {result.details.map((detail, i) => (
              <div key={i} className="flex items-start gap-2 text-xs bg-destructive/10 p-2 rounded">
                <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                <span>{detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
          <Search className="h-4 w-4" />
          Evidence Summary
        </div>
        <p className="text-sm">{result.evidence.summary}</p>

        {result.evidence.filesExamined.length > 0 && (
          <div>
            <div className="text-xs font-medium flex items-center gap-2 text-muted-foreground mb-2">
              <FileSearch className="h-3 w-3" />
              Files Examined ({result.evidence.filesExamined.length})
            </div>
            <div className="space-y-2">
              {result.evidence.filesExamined.map((file, i) => (
                <Card key={i} className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <code className="text-xs font-medium">{file.path}</code>
                    {file.exists ? (
                      <Badge variant="outline" className="text-[10px]">
                        {file.lineCount} lines, {file.sizeBytes} bytes
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">Not found</Badge>
                    )}
                  </div>
                  {file.contentPreview && (
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                      {file.contentPreview}
                    </pre>
                  )}
                  {file.relevantLines && file.relevantLines.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Relevant lines:</span>
                      {file.relevantLines.map((line, j) => (
                        <div key={j} className="flex gap-2 text-xs bg-muted/50 p-1 rounded mt-1">
                          <span className="text-muted-foreground w-8 text-right shrink-0">
                            {line.lineNumber}:
                          </span>
                          <code className="flex-1">{line.content}</code>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {result.evidence.patternsChecked && result.evidence.patternsChecked.length > 0 && (
          <div>
            <div className="text-xs font-medium flex items-center gap-2 text-muted-foreground mb-2">
              <ListChecks className="h-3 w-3" />
              Patterns Checked ({result.evidence.patternsChecked.length})
            </div>
            <div className="space-y-1">
              {result.evidence.patternsChecked.map((pattern, i) => (
                <div 
                  key={i} 
                  className={`flex items-start gap-2 text-xs p-2 rounded ${
                    pattern.found ? "bg-destructive/10" : "bg-muted/50"
                  }`}
                >
                  {pattern.found ? (
                    <XCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{pattern.label}</div>
                    <code className="text-muted-foreground text-[10px]">{pattern.pattern}</code>
                    {pattern.found && pattern.matchedText && (
                      <div className="mt-1 text-destructive">
                        Line {pattern.lineNumber}: "{pattern.matchedText}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.evidence.validationSteps && result.evidence.validationSteps.length > 0 && (
          <div>
            <div className="text-xs font-medium flex items-center gap-2 text-muted-foreground mb-2">
              <ListChecks className="h-3 w-3" />
              Validation Steps ({result.evidence.validationSteps.length})
            </div>
            <div className="space-y-1">
              {result.evidence.validationSteps.map((step, i) => (
                <div 
                  key={i} 
                  className={`flex items-start gap-2 text-xs p-2 rounded ${
                    step.passed ? "bg-muted/50" : "bg-destructive/10"
                  }`}
                >
                  {step.passed ? (
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{step.step}</div>
                    <div className={step.passed ? "text-muted-foreground" : "text-destructive"}>
                      {step.result}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CatalogView({
  selectedPartitionId,
  setSelectedPartitionId,
  selectedRuleId,
  setSelectedRuleId
}: {
  selectedPartitionId: string | null;
  setSelectedPartitionId: (id: string | null) => void;
  selectedRuleId: string | null;
  setSelectedRuleId: (id: string | null) => void;
}) {
  const { data: catalog, isLoading } = useQuery<RulesCatalog>({
    queryKey: ["/api/rules"],
  });

  if (isLoading) {
    return (
      <>
        <div className="w-44 shrink-0 border-r bg-muted/20 p-2">
          <Skeleton className="h-6 w-full mb-2" />
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-8 w-full mb-1" />
          ))}
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </>
    );
  }

  if (!catalog) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Book className="h-8 w-8 mx-auto opacity-50 mb-2" />
          <p className="text-sm text-muted-foreground">No rules catalog available</p>
        </div>
      </div>
    );
  }

  const selectedPartition = catalog.partitions.find(p => p.id === selectedPartitionId);

  const handleSelectRule = (ruleId: string) => {
    const rule = catalog.partitions.flatMap(p => p.rules).find(r => r.id === ruleId);
    if (rule) {
      setSelectedPartitionId(rule.partition);
      setSelectedRuleId(ruleId);
    }
  };

  return (
    <>
      <div className="w-44 shrink-0 border-r bg-muted/20 flex flex-col">
        <div className="p-2 border-b">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Partitions
            </span>
            <EndpointInfo endpoint="GET /api/rules" className="ml-auto" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {catalog.totalRules} rules
          </p>
        </div>
        <div className="flex-1 overflow-auto p-1 space-y-0.5">
          {catalog.partitions.map((partition) => (
            <PartitionNavItem
              key={partition.id}
              partition={partition}
              isSelected={selectedPartitionId === partition.id}
              onSelect={() => {
                setSelectedPartitionId(partition.id);
                setSelectedRuleId(null);
              }}
            />
          ))}
        </div>
      </div>

      {selectedPartition && (
        <div className="w-48 shrink-0 border-r bg-background flex flex-col">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium capitalize truncate">
                {selectedPartition.id}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
              {selectedPartition.description}
            </p>
          </div>
          <div className="flex-1 overflow-auto p-1 space-y-0.5">
            {selectedPartition.rules.map((rule) => (
              <RuleNavItem
                key={rule.id}
                rule={rule}
                isPrimary={rule.id === catalog.primaryDirectiveId}
                isSelected={selectedRuleId === rule.id}
                onSelect={() => setSelectedRuleId(rule.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden bg-background">
        {selectedRuleId ? (
          <RuleDetailPanel 
            ruleId={selectedRuleId}
            onSelectRule={handleSelectRule}
          />
        ) : selectedPartition ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-8 w-8 mx-auto opacity-50 mb-2" />
              <p className="text-sm">Select a rule to view details</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Layers className="h-8 w-8 mx-auto opacity-50 mb-2" />
              <p className="text-sm">Select a partition to browse rules</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function AuditView({
  selectedCheckId,
  setSelectedCheckId
}: {
  selectedCheckId: string | null;
  setSelectedCheckId: (id: string | null) => void;
}) {
  const { data: report, isLoading, refetch, isRefetching } = useQuery<AuditReport>({
    queryKey: ["/api/audit"],
  });

  const handleRefresh = async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["/api/audit"] });
  };

  const selectedResult = report?.results.find(r => r.checkId === selectedCheckId);

  if (isLoading) {
    return (
      <>
        <div className="w-52 shrink-0 border-r bg-muted/20 p-2">
          <Skeleton className="h-6 w-full mb-2" />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-8 w-full mb-1" />
          ))}
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </>
    );
  }

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-8 w-8 mx-auto opacity-50 mb-2" />
          <p className="text-sm text-muted-foreground">No audit data available</p>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4">
            Run Audit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-52 shrink-0 border-r bg-muted/20 flex flex-col">
        <div className="p-2 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Checks
              </span>
            </div>
            <div className="flex items-center gap-1">
              <EndpointInfo endpoint="GET /api/audit" />
              <Button 
                variant="ghost" 
                size="icon"
                className="h-6 w-6"
                onClick={handleRefresh}
                disabled={isRefetching}
                data-testid="button-refresh-audit"
              >
                <RefreshCw className={`h-3 w-3 ${isRefetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {formatTimestamp(report.timestamp)}
          </p>
          <div className="mt-1.5">
            {report.passed ? (
              <Badge variant="default" className="text-[10px]">All Passed</Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px]">
                {report.criticalFailures} Failed
              </Badge>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-1 space-y-0.5">
          {report.results.map((result) => (
            <AuditCheckNavItem
              key={result.checkId}
              result={result}
              isSelected={selectedCheckId === result.checkId}
              onSelect={() => setSelectedCheckId(result.checkId)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-background">
        {selectedResult ? (
          <AuditDetailPanel result={selectedResult} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Shield className="h-8 w-8 mx-auto opacity-50 mb-2" />
              <p className="text-sm">Select a check to view evidence</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function RulesExplorer() {
  const { effectiveIsAdmin } = useViewMode();
  const [activeView, setActiveView] = useState<"catalog" | "audit">("catalog");
  const [selectedPartitionId, setSelectedPartitionId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);

  if (!effectiveIsAdmin) {
    return (
      <div className="p-6">
        <div className="flex flex-col gap-6 max-w-4xl">
          <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full" data-testid="rules-explorer-layout">
      <div className="w-40 shrink-0 border-r bg-sidebar flex flex-col">
        <div className="p-3 border-b">
          <h1 className="text-sm font-semibold" data-testid="text-page-title">
            Rules Explorer
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Browse and audit
          </p>
        </div>
        <div className="flex-1 p-2 space-y-1">
          <SecondaryNavItem
            icon={Book}
            label="Catalog"
            isActive={activeView === "catalog"}
            onClick={() => setActiveView("catalog")}
            testId="nav-catalog"
          />
          <SecondaryNavItem
            icon={Shield}
            label="Audit"
            isActive={activeView === "audit"}
            onClick={() => setActiveView("audit")}
            testId="nav-audit"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {activeView === "catalog" ? (
          <CatalogView
            selectedPartitionId={selectedPartitionId}
            setSelectedPartitionId={setSelectedPartitionId}
            selectedRuleId={selectedRuleId}
            setSelectedRuleId={setSelectedRuleId}
          />
        ) : (
          <AuditView
            selectedCheckId={selectedCheckId}
            setSelectedCheckId={setSelectedCheckId}
          />
        )}
      </div>
    </div>
  );
}
