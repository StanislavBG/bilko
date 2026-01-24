import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useViewMode } from "@/contexts/view-mode-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EndpointInfo } from "@/components/endpoint-info";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Shield, Clock, Book, FileText, Layers, Tag, GitBranch, Link2,
  Plus, History, ScrollText, Save, ChevronDown, ChevronRight
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

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

interface RuleAudit {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string | null;
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

function getPriorityColor(priority: string): string {
  return PRIORITY_INFO[priority]?.color ?? "bg-muted";
}

function getPriorityDescription(priority: string): string {
  return PRIORITY_INFO[priority]?.description ?? priority;
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

function AuditNavItem({
  audit,
  isSelected,
  onSelect
}: {
  audit: RuleAudit;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const dateStr = new Date(audit.createdAt).toLocaleDateString();
  const timeStr = new Date(audit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start gap-2 h-10 ${
        isSelected ? "bg-accent text-accent-foreground" : ""
      }`}
      onClick={onSelect}
      data-testid={`nav-audit-${audit.id}`}
    >
      <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0 text-left">
        <div className="text-xs font-medium">{dateStr}</div>
        <div className="text-[10px] text-muted-foreground">{timeStr}</div>
      </div>
    </Button>
  );
}

function AuditView({
  selectedAuditId,
  setSelectedAuditId
}: {
  selectedAuditId: string | null;
  setSelectedAuditId: (id: string | null) => void;
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"protocol" | "new" | "history">("protocol");
  const [newAuditContent, setNewAuditContent] = useState("");

  const { data: protocol, isLoading: protocolLoading } = useQuery<{ content: string }>({
    queryKey: ["/api/audit/protocol"],
  });

  const { data: audits, isLoading: auditsLoading } = useQuery<RuleAudit[]>({
    queryKey: ["/api/audits"],
  });

  const saveAuditMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/audits", { content });
    },
    onSuccess: () => {
      toast({ title: "Audit saved", description: "Your audit report has been saved." });
      setNewAuditContent("");
      setActiveTab("history");
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSaveAudit = () => {
    if (!newAuditContent.trim()) {
      toast({ title: "Empty content", description: "Please paste an audit report first.", variant: "destructive" });
      return;
    }
    saveAuditMutation.mutate(newAuditContent);
  };

  const selectedAudit = audits?.find(a => a.id === selectedAuditId);

  return (
    <>
      <div className="w-52 shrink-0 border-r bg-muted/20 flex flex-col">
        <div className="p-2 border-b">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Audit
            </span>
            <EndpointInfo endpoint="GET /api/audits" className="ml-auto" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Agentic rule evaluation
          </p>
        </div>
        
        <div className="p-1 space-y-0.5">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 h-8 ${activeTab === "protocol" ? "bg-accent text-accent-foreground" : ""}`}
            onClick={() => setActiveTab("protocol")}
            data-testid="nav-audit-protocol"
          >
            <ScrollText className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm">Protocol Guide</span>
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 h-8 ${activeTab === "new" ? "bg-accent text-accent-foreground" : ""}`}
            onClick={() => setActiveTab("new")}
            data-testid="nav-audit-new"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm">New Audit</span>
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 h-8 ${activeTab === "history" ? "bg-accent text-accent-foreground" : ""}`}
            onClick={() => setActiveTab("history")}
            data-testid="nav-audit-history"
          >
            <History className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm">History</span>
            {audits && audits.length > 0 && (
              <Badge variant="outline" className="text-[10px] ml-auto">{audits.length}</Badge>
            )}
          </Button>
        </div>

        {activeTab === "history" && (
          <div className="flex-1 overflow-auto p-1 space-y-0.5 border-t mt-1 pt-1">
            {auditsLoading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : audits && audits.length > 0 ? (
              audits.map((audit) => (
                <AuditNavItem
                  key={audit.id}
                  audit={audit}
                  isSelected={selectedAuditId === audit.id}
                  onSelect={() => setSelectedAuditId(audit.id)}
                />
              ))
            ) : (
              <p className="text-xs text-muted-foreground p-2 text-center">No audits yet</p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden bg-background">
        {activeTab === "protocol" && (
          <div className="h-full overflow-auto p-4" data-testid="audit-protocol-view">
            <div className="max-w-3xl">
              <div className="mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ScrollText className="h-5 w-5" />
                  Rule Architect Protocol
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Instructions for performing agentic rule audits (ARCH-009)
                </p>
              </div>
              
              <Card className="p-4 bg-muted/30 mb-4">
                <h3 className="text-sm font-medium mb-2">How to Run an Audit</h3>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li>1. Ask the agent: <code className="bg-muted px-1 rounded">"Run a rule audit"</code> or <code className="bg-muted px-1 rounded">"Act as Rule Architect"</code></li>
                  <li>2. The agent will analyze all rules and code following this protocol</li>
                  <li>3. Copy the audit report the agent provides</li>
                  <li>4. Go to "New Audit" tab and paste the report to save it</li>
                </ol>
              </Card>

              {protocolLoading ? (
                <Skeleton className="h-96 w-full" />
              ) : protocol ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {protocol.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Failed to load protocol</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "new" && (
          <div className="h-full overflow-auto p-4" data-testid="audit-new-view">
            <div className="max-w-3xl">
              <div className="mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Save Audit Report
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Paste the audit report from the agent below
                </p>
              </div>

              <Textarea
                placeholder="Paste your audit report here..."
                value={newAuditContent}
                onChange={(e) => setNewAuditContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                data-testid="input-audit-content"
              />

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleSaveAudit}
                  disabled={saveAuditMutation.isPending || !newAuditContent.trim()}
                  data-testid="button-save-audit"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveAuditMutation.isPending ? "Saving..." : "Save Audit"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="h-full overflow-auto" data-testid="audit-history-view">
            {selectedAudit ? (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h2 className="text-lg font-semibold">Audit Report</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(selectedAudit.createdAt)}
                      {selectedAudit.createdBy && (
                        <span className="ml-2">by {selectedAudit.createdBy}</span>
                      )}
                    </p>
                  </div>
                </div>
                <Card className="p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono overflow-auto">
                    {selectedAudit.content}
                  </pre>
                </Card>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <History className="h-8 w-8 mx-auto opacity-50 mb-2" />
                  <p className="text-sm">Select an audit to view details</p>
                </div>
              </div>
            )}
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
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

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
      <div className="w-40 shrink-0 border-r bg-sidebar flex flex-col h-full">
        <div className="p-3 border-b shrink-0">
          <h1 className="text-sm font-semibold" data-testid="text-page-title">
            Rules Explorer
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Browse and audit
          </p>
        </div>
        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
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
            selectedAuditId={selectedAuditId}
            setSelectedAuditId={setSelectedAuditId}
          />
        )}
      </div>
    </div>
  );
}
