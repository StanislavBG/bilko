import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useViewMode } from "@/contexts/view-mode-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EndpointInfo } from "@/components/endpoint-info";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Shield, Clock, Server,
  Book, ChevronDown, ChevronRight, FileText, ArrowLeft, Layers, Tag, GitBranch, Link2
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

interface AuditResult {
  checkId: string;
  passed: boolean;
  message: string;
  details?: string[];
  endpoint: string;
  runTimestamp: string;
  checkName: string;
  checkDescription: string;
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

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "ABSOLUTE": return "bg-red-600 text-white";
    case "CRITICAL": return "bg-orange-500 text-white";
    case "HIGH": return "bg-amber-500 text-white";
    case "MEDIUM": return "bg-blue-500 text-white";
    case "LOW": return "bg-slate-500 text-white";
    default: return "bg-muted";
  }
}

function CheckStatusIcon({ passed }: { passed: boolean }) {
  if (passed) {
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  }
  return <XCircle className="h-5 w-5 text-destructive" />;
}

function CheckCard({ result }: { result: AuditResult }) {
  return (
    <Card className="p-4" data-testid={`card-check-${result.checkId.toLowerCase()}`}>
      <div className="flex items-start gap-4">
        <div className="mt-0.5">
          <CheckStatusIcon passed={result.passed} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-semibold bg-muted px-2 py-0.5 rounded">
              {result.checkId}
            </code>
            <span className="text-sm font-medium">{result.checkName}</span>
            <Badge variant={result.passed ? "default" : "destructive"}>
              {result.passed ? "Passed" : "Failed"}
            </Badge>
          </div>
          
          <p className="mt-2 text-sm text-muted-foreground">
            {result.checkDescription}
          </p>
          
          <div className="mt-3 p-3 bg-muted/50 rounded-md space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Result</span>
              <span className={result.passed ? "text-green-600" : "text-destructive"}>
                {result.message}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium flex items-center gap-1">
                <Server className="h-3 w-3" />
                Powered by
              </span>
              <code className="bg-background px-1.5 py-0.5 rounded text-muted-foreground" data-testid={`text-endpoint-${result.checkId.toLowerCase()}`}>
                {result.endpoint}
              </code>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Run at
              </span>
              <span className="text-muted-foreground" data-testid={`text-timestamp-${result.checkId.toLowerCase()}`}>
                {formatTimestamp(result.runTimestamp)}
              </span>
            </div>
          </div>

          {result.details && result.details.length > 0 && (
            <div className="mt-3 space-y-1">
              <span className="text-xs font-medium">Issues found:</span>
              {result.details.map((detail, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function OverallStatus({ report }: { report: AuditReport }) {
  const statusColor = report.passed ? "bg-green-600" : "bg-destructive";
  const statusText = report.passed ? "All Checks Passed" : "Checks Failed";
  
  return (
    <Card className="p-6" data-testid="card-overall-status">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-full ${statusColor} flex items-center justify-center`}>
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold" data-testid="text-overall-status">
            {statusText}
          </h2>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Last run: {formatTimestamp(report.timestamp)}</span>
            </div>
            <span>{report.results.length} checks</span>
            {report.criticalFailures > 0 && (
              <Badge variant="destructive">{report.criticalFailures} critical</Badge>
            )}
            {report.warnings > 0 && (
              <Badge variant="secondary">{report.warnings} warnings</Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function RuleCard({ 
  rule, 
  isPrimary,
  onSelect 
}: { 
  rule: RuleMetadata; 
  isPrimary: boolean;
  onSelect: () => void;
}) {
  return (
    <Card 
      className="p-3 hover-elevate cursor-pointer" 
      onClick={onSelect}
      data-testid={`card-rule-${rule.id.toLowerCase()}`}
    >
      <div className="flex items-start gap-3">
        <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">
              {rule.id}
            </code>
            <Badge className={`text-xs ${getPriorityColor(rule.priority)}`} variant="secondary">
              {rule.priority}
            </Badge>
            {isPrimary && (
              <Badge variant="default" className="text-xs">
                Primary Directive
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm font-medium">{rule.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{rule.description}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Card>
  );
}

function CompactRuleItem({ 
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
      className={`w-full justify-start gap-2 ${
        isSelected ? "bg-accent text-accent-foreground" : ""
      }`}
      onClick={onSelect}
      data-testid={`nav-rule-${rule.id.toLowerCase()}`}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <code className="text-xs font-medium">{rule.id}</code>
        {isPrimary && (
          <Shield className="h-3 w-3 text-primary shrink-0" />
        )}
      </div>
      <span className={`text-[10px] px-1 py-0.5 rounded ${getPriorityColor(rule.priority)}`}>
        {rule.priority.charAt(0)}
      </span>
    </Button>
  );
}

function CompactPartitionSection({ 
  partition, 
  primaryDirectiveId,
  selectedRuleId,
  onSelectRule 
}: { 
  partition: PartitionInfo; 
  primaryDirectiveId: string;
  selectedRuleId: string | null;
  onSelectRule: (ruleId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-1">
      <button
        className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide"
        onClick={() => setIsOpen(!isOpen)}
        data-testid={`nav-partition-${partition.id}`}
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span>{partition.id}</span>
        <span className="text-[10px] opacity-70">({partition.rules.length})</span>
      </button>
      {isOpen && (
        <div className="ml-1 space-y-0.5">
          {partition.rules.map((rule) => (
            <CompactRuleItem
              key={rule.id}
              rule={rule}
              isPrimary={rule.id === primaryDirectiveId}
              isSelected={selectedRuleId === rule.id}
              onSelect={() => onSelectRule(rule.id)}
            />
          ))}
        </div>
      )}
    </div>
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
          <Badge className={getPriorityColor(rule.priority)}>
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

function PartitionSection({ 
  partition, 
  primaryDirectiveId,
  onSelectRule 
}: { 
  partition: PartitionInfo; 
  primaryDirectiveId: string;
  onSelectRule: (ruleId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 h-auto py-3"
          data-testid={`button-partition-${partition.id}`}
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          <Layers className="h-4 w-4 shrink-0" />
          <div className="flex-1 text-left">
            <span className="font-medium capitalize">{partition.id}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              ({partition.rules.length} {partition.rules.length === 1 ? "rule" : "rules"})
            </span>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-6 pb-2 space-y-2">
          <p className="text-xs text-muted-foreground mb-3">{partition.description}</p>
          {partition.rules.map((rule) => (
            <RuleCard 
              key={rule.id} 
              rule={rule} 
              isPrimary={rule.id === primaryDirectiveId}
              onSelect={() => onSelectRule(rule.id)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function RulePreview({ 
  ruleId, 
  onBack,
  onSelectRule
}: { 
  ruleId: string; 
  onBack: () => void;
  onSelectRule: (ruleId: string) => void;
}) {
  const { data: rule, isLoading, error } = useQuery<RuleContent>({
    queryKey: ["/api/rules", ruleId],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Catalog
        </Button>
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Failed to load rule: {ruleId}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid={`preview-rule-${ruleId.toLowerCase()}`}>
      <Button 
        variant="ghost" 
        onClick={onBack} 
        className="gap-2"
        data-testid="button-back-to-catalog"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Catalog
      </Button>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-sm font-bold bg-muted px-2 py-1 rounded">
                {rule.id}
              </code>
              <Badge className={getPriorityColor(rule.priority)}>
                {rule.priority}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {rule.partition}
              </Badge>
            </div>
            <h2 className="mt-2 text-xl font-semibold" data-testid="text-rule-title">
              {rule.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div className="flex items-center gap-1 justify-end">
              <Tag className="h-3 w-3" />
              v{rule.version}
            </div>
          </div>
        </div>

        {(rule.dependencies.length > 0 || rule.crossReferences.length > 0) && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4">
            {rule.dependencies.length > 0 && (
              <div>
                <span className="text-xs font-medium flex items-center gap-1 mb-1">
                  <GitBranch className="h-3 w-3" />
                  Dependencies
                </span>
                <div className="flex flex-wrap gap-1">
                  {rule.dependencies.map((dep) => (
                    <Button
                      key={dep}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => onSelectRule(dep)}
                      data-testid={`link-dep-${dep.toLowerCase()}`}
                    >
                      {dep}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {rule.crossReferences.length > 0 && (
              <div>
                <span className="text-xs font-medium flex items-center gap-1 mb-1">
                  <Link2 className="h-3 w-3" />
                  Cross-References
                </span>
                <div className="flex flex-wrap gap-1">
                  {rule.crossReferences.map((ref) => (
                    <Button
                      key={ref}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => onSelectRule(ref)}
                      data-testid={`link-ref-${ref.toLowerCase()}`}
                    >
                      {ref}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="text-rule-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {rule.content}
          </ReactMarkdown>
        </div>
      </Card>
    </div>
  );
}

function CatalogTab() {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  const { data: catalog, isLoading } = useQuery<RulesCatalog>({
    queryKey: ["/api/rules"],
  });

  if (isLoading) {
    return (
      <div className="flex gap-4 h-[calc(100vh-220px)]">
        <div className="w-64 shrink-0">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (!catalog) {
    return (
      <Card className="p-8 text-center">
        <Book className="h-8 w-8 mx-auto opacity-50" />
        <p className="mt-2 text-muted-foreground">No rules catalog available</p>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)]" data-testid="catalog-layout">
      <Card className="w-64 shrink-0 flex flex-col overflow-hidden">
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Book className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium" data-testid="text-catalog-title">
              Rules Catalog
            </span>
            <EndpointInfo endpoint="GET /api/rules" className="ml-auto" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {catalog.totalRules} rules
          </p>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {catalog.partitions.map((partition) => (
            <CompactPartitionSection
              key={partition.id}
              partition={partition}
              primaryDirectiveId={catalog.primaryDirectiveId}
              selectedRuleId={selectedRuleId}
              onSelectRule={setSelectedRuleId}
            />
          ))}
        </div>
      </Card>

      <Card className="flex-1 overflow-hidden">
        {selectedRuleId ? (
          <RuleDetailPanel 
            ruleId={selectedRuleId}
            onSelectRule={setSelectedRuleId}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Book className="h-8 w-8 mx-auto opacity-50 mb-2" />
              <p className="text-sm">Select a rule to view details</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function AuditTab() {
  const { data: report, isLoading, refetch, isRefetching } = useQuery<AuditReport>({
    queryKey: ["/api/audit"],
  });

  const handleRefresh = async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["/api/audit"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card className="p-8 text-center">
        <Shield className="h-8 w-8 mx-auto opacity-50" />
        <p className="mt-2 text-muted-foreground">No audit data available</p>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4">
          Run Audit
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefetching}
          data-testid="button-refresh-audit"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          {isRefetching ? "Running..." : "Re-run Audit"}
        </Button>
      </div>

      <OverallStatus report={report} />
      
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Check Results
          </h3>
          <EndpointInfo endpoint="GET /api/audit" />
        </div>
        {report.results.map((result) => (
          <CheckCard key={result.checkId} result={result} />
        ))}
      </div>
    </div>
  );
}

export default function RulesExplorer() {
  const { effectiveIsAdmin } = useViewMode();
  const [activeTab, setActiveTab] = useState("catalog");

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
    <div className="p-6 h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
              Rules Explorer
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse the rules catalog and monitor system integrity
            </p>
          </div>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="catalog" data-testid="tab-catalog">
              <Book className="h-4 w-4 mr-2" />
              Catalog
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <Shield className="h-4 w-4 mr-2" />
              Audit
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="catalog" className="mt-0 flex-1">
          <CatalogTab />
        </TabsContent>

        <TabsContent value="audit" className="mt-0">
          <div className="max-w-4xl">
            <AuditTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
