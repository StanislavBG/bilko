import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useViewMode } from "@/contexts/view-mode-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Clock, GitBranch, Link2,
  Plus, History, ScrollText, Save, PanelLeft, X
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageContent } from "@/components/page-content";
import { ActionBar } from "@/components/action-bar";
import { ActionPanel } from "@/components/action-panel";

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
  auditType: "rules" | "code";
  content: string;
  createdAt: string;
  createdBy: string | null;
}

function formatTimestamp(date: string): string {
  const d = new Date(date);
  return d.toLocaleString();
}

const PRIORITY_DESCRIPTIONS: Record<string, string> = {
  ABSOLUTE: "Must always be followed without exception",
  CRITICAL: "Essential for system integrity",
  HIGH: "Important for correct behavior",
  MEDIUM: "Recommended best practice",
  LOW: "Optional guidance",
};

function getPriorityDescription(priority: string): string {
  return PRIORITY_DESCRIPTIONS[priority] ?? priority;
}

function SecondaryNavItem({ 
  label, 
  isActive, 
  onClick,
  testId,
  isCollapsed = false
}: { 
  label: string;
  isActive: boolean;
  onClick: () => void;
  testId: string;
  isCollapsed?: boolean;
}) {
  const button = (
    <Button
      variant="ghost"
      className={`w-full h-9 ${
        isCollapsed ? "justify-center px-0" : "justify-start"
      } ${isActive ? "bg-accent text-accent-foreground" : ""}`}
      onClick={onClick}
      data-testid={testId}
    >
      {isCollapsed ? (
        <span className="text-sm font-medium">{label.charAt(0)}</span>
      ) : (
        <span className="text-sm">{label}</span>
      )}
    </Button>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">
          <span>{label}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

function PartitionNavItem({
  partition,
  isSelected,
  onSelect,
  isCollapsed = false
}: {
  partition: PartitionInfo;
  isSelected: boolean;
  onSelect: () => void;
  isCollapsed?: boolean;
}) {
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-center h-8 ${
              isSelected ? "bg-accent text-accent-foreground" : ""
            }`}
            onClick={onSelect}
            data-testid={`nav-partition-${partition.id}`}
          >
            <span className="text-sm uppercase">{partition.id.charAt(0)}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{partition.id}</TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start h-8 ${
        isSelected ? "bg-accent text-accent-foreground" : ""
      }`}
      onClick={onSelect}
      data-testid={`nav-partition-${partition.id}`}
    >
      <span className="text-sm capitalize truncate">{partition.id}</span>
    </Button>
  );
}

function TertiaryNavPanel({
  children,
  className = "",
  testId,
  isCollapsed,
  onToggleCollapse,
  header
}: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  header?: string;
}) {
  return (
    <div className={`shrink-0 border-r bg-background flex flex-col ${className}`} data-testid={testId}>
      {header && (
        <div className="border-b px-2 h-8 flex items-center shrink-0">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-medium text-muted-foreground block w-full text-center cursor-default">
                  {header.charAt(0)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">{header}</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">{header}</span>
          )}
        </div>
      )}
      <div className="flex-1 overflow-auto p-1 space-y-0.5">
        {children}
      </div>
      <div className="border-t h-11 flex items-center justify-center shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              data-testid={`${testId}-toggle`}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expand" : "Collapse"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function RuleNavItem({
  rule,
  isSelected,
  onSelect,
  isCollapsed = false
}: {
  rule: RuleMetadata;
  isSelected: boolean;
  onSelect: () => void;
  isCollapsed?: boolean;
}) {
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-center h-8 ${
              isSelected ? "bg-accent text-accent-foreground" : ""
            }`}
            onClick={onSelect}
            data-testid={`nav-rule-${rule.id.toLowerCase()}`}
          >
            <code className="text-xs font-medium">{rule.id.split("-")[0]}</code>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{rule.id}</TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start h-8 ${
        isSelected ? "bg-accent text-accent-foreground" : ""
      }`}
      onClick={onSelect}
      data-testid={`nav-rule-${rule.id.toLowerCase()}`}
    >
      <code className="text-xs font-medium">{rule.id}</code>
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
      <div className="flex-1 p-4 flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Failed to load rule</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background" data-testid={`detail-rule-${ruleId.toLowerCase()}`}>
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <code className="text-sm font-bold bg-muted px-2 py-0.5 rounded">
            {rule.id}
          </code>
          <span className="text-xs text-muted-foreground" data-testid="text-priority">
            {rule.priority}
          </span>
          <span className="text-xs text-muted-foreground capitalize">
            {rule.partition}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
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
  const [isPartitionCollapsed, setIsPartitionCollapsed] = useState(false);
  const [isTertiaryCollapsed, setIsTertiaryCollapsed] = useState(false);
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
        <p className="text-sm text-muted-foreground">No rules catalog available</p>
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
      <div className={`shrink-0 border-r bg-muted/20 flex flex-col transition-all duration-200 ${
        isPartitionCollapsed ? "min-w-12 max-w-12" : "min-w-[8rem] max-w-[10rem] flex-1"
      }`} data-testid="partition-nav">
        <div className="border-b px-2 h-8 flex items-center shrink-0">
          {isPartitionCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-medium text-muted-foreground block w-full text-center cursor-default">P</span>
              </TooltipTrigger>
              <TooltipContent side="right">Partitions</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">Partitions</span>
          )}
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
              isCollapsed={isPartitionCollapsed}
            />
          ))}
        </div>
        <div className="border-t h-11 flex items-center justify-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsPartitionCollapsed(!isPartitionCollapsed)}
                data-testid="button-toggle-partition-nav"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isPartitionCollapsed ? "Expand" : "Collapse"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {selectedPartition && (
        <TertiaryNavPanel
          isCollapsed={isTertiaryCollapsed}
          onToggleCollapse={() => setIsTertiaryCollapsed(!isTertiaryCollapsed)}
          className={`transition-all duration-200 ${
            isTertiaryCollapsed ? "min-w-12 max-w-12" : "min-w-[10rem] max-w-[12rem] flex-1"
          }`}
          testId="tertiary-nav-rules"
          header="Rules"
        >
          {selectedPartition.rules.map((rule) => (
            <RuleNavItem
              key={rule.id}
              rule={rule}
              isSelected={selectedRuleId === rule.id}
              onSelect={() => setSelectedRuleId(rule.id)}
              isCollapsed={isTertiaryCollapsed}
            />
          ))}
        </TertiaryNavPanel>
      )}

      <PageContent>
        {selectedRuleId ? (
          <RuleDetailPanel 
            ruleId={selectedRuleId}
            onSelectRule={handleSelectRule}
          />
        ) : selectedPartition ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
            <p className="text-sm">Select a rule to view details</p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
            <p className="text-sm">Select a partition to browse rules</p>
          </div>
        )}
      </PageContent>
    </>
  );
}

function AuditNavItem({
  audit,
  isSelected,
  onSelect,
  isCollapsed = false
}: {
  audit: RuleAudit;
  isSelected: boolean;
  onSelect: () => void;
  isCollapsed?: boolean;
}) {
  const dateStr = new Date(audit.createdAt).toLocaleDateString();
  const shortDate = new Date(audit.createdAt).getDate().toString();
  const typeLabel = audit.auditType === "code" ? "C" : "R";
  const typeFull = audit.auditType === "code" ? "Code" : "Rules";
  
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-center h-8 ${
              isSelected ? "bg-accent text-accent-foreground" : ""
            }`}
            onClick={onSelect}
            data-testid={`nav-audit-${audit.id}`}
          >
            <span className="text-xs">{typeLabel}{shortDate}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{typeFull} - {dateStr}</TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start h-8 gap-1 ${
        isSelected ? "bg-accent text-accent-foreground" : ""
      }`}
      onClick={onSelect}
      data-testid={`nav-audit-${audit.id}`}
    >
      <span className="text-xs font-medium w-4">{typeLabel}</span>
      <span className="text-xs">{dateStr}</span>
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
  const [isCategoryNavCollapsed, setIsCategoryNavCollapsed] = useState(false);
  const [isAuditListCollapsed, setIsAuditListCollapsed] = useState(false);
  const [isActionPanelCollapsed, setIsActionPanelCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"protocol" | "history">("protocol");
  const [showNewAuditForm, setShowNewAuditForm] = useState(false);
  const [newAuditContent, setNewAuditContent] = useState("");
  const [newAuditType, setNewAuditType] = useState<"rules" | "code">("rules");

  const { data: protocol, isLoading: protocolLoading } = useQuery<{ content: string }>({
    queryKey: ["/api/audit/protocol"],
  });

  const { data: audits, isLoading: auditsLoading } = useQuery<RuleAudit[]>({
    queryKey: ["/api/audits"],
  });

  const saveAuditMutation = useMutation({
    mutationFn: async ({ content, auditType }: { content: string; auditType: "rules" | "code" }) => {
      return await apiRequest("POST", "/api/audits", { content, auditType });
    },
    onSuccess: () => {
      toast({ title: "Audit saved", description: "Your audit report has been saved." });
      setNewAuditContent("");
      setNewAuditType("rules");
      setShowNewAuditForm(false);
      setActiveCategory("history");
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
    saveAuditMutation.mutate({ content: newAuditContent, auditType: newAuditType });
  };

  const selectedAudit = audits?.find(a => a.id === selectedAuditId);

  return (
    <>
      {/* Level 3: Category Navigation (Protocol, New, History) */}
      <div className={`shrink-0 border-r bg-muted/20 flex flex-col transition-all duration-200 ${
        isCategoryNavCollapsed ? "min-w-12 max-w-12" : "min-w-[8rem] max-w-[10rem] flex-1"
      }`} data-testid="audit-category-nav">
        <div className="border-b px-2 h-8 flex items-center shrink-0">
          {isCategoryNavCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-medium text-muted-foreground block w-full text-center cursor-default">C</span>
              </TooltipTrigger>
              <TooltipContent side="right">Categories</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">Categories</span>
          )}
        </div>
        <div className="p-1 space-y-0.5 flex-1 overflow-auto">
          {isCategoryNavCollapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-full justify-center h-8 ${activeCategory === "protocol" && !showNewAuditForm ? "bg-accent text-accent-foreground" : ""}`}
                    onClick={() => { setActiveCategory("protocol"); setSelectedAuditId(null); setShowNewAuditForm(false); }}
                    data-testid="nav-audit-protocol"
                  >
                    <span className="text-sm">P</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Protocol</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-full justify-center h-8 ${activeCategory === "history" && !showNewAuditForm ? "bg-accent text-accent-foreground" : ""}`}
                    onClick={() => { setActiveCategory("history"); setShowNewAuditForm(false); }}
                    data-testid="nav-audit-history"
                  >
                    <span className="text-sm">H</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">History</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className={`w-full justify-start h-8 ${activeCategory === "protocol" && !showNewAuditForm ? "bg-accent text-accent-foreground" : ""}`}
                onClick={() => { setActiveCategory("protocol"); setSelectedAuditId(null); setShowNewAuditForm(false); }}
                data-testid="nav-audit-protocol"
              >
                <span className="text-sm">Protocol</span>
              </Button>
              <Button
                variant="ghost"
                className={`w-full justify-start h-8 ${activeCategory === "history" && !showNewAuditForm ? "bg-accent text-accent-foreground" : ""}`}
                onClick={() => { setActiveCategory("history"); setShowNewAuditForm(false); }}
                data-testid="nav-audit-history"
              >
                <span className="text-sm">History</span>
              </Button>
            </>
          )}
        </div>
        
        <div className="border-t h-11 flex items-center justify-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsCategoryNavCollapsed(!isCategoryNavCollapsed)}
                data-testid="button-toggle-category-nav"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCategoryNavCollapsed ? "Expand" : "Collapse"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Level 4: Audit List (only shown when History is selected) */}
      {activeCategory === "history" && (
        <TertiaryNavPanel
          isCollapsed={isAuditListCollapsed}
          onToggleCollapse={() => setIsAuditListCollapsed(!isAuditListCollapsed)}
          className={`transition-all duration-200 ${
            isAuditListCollapsed ? "min-w-12 max-w-12" : "min-w-[10rem] max-w-[12rem] flex-1"
          }`}
          testId="audit-list-nav"
          header="Audits"
        >
          {auditsLoading ? (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : audits && audits.length > 0 ? (
            audits.map((audit) => (
              <AuditNavItem
                key={audit.id}
                audit={audit}
                isSelected={selectedAuditId === audit.id}
                onSelect={() => setSelectedAuditId(audit.id)}
                isCollapsed={isAuditListCollapsed}
              />
            ))
          ) : !isAuditListCollapsed && (
            <p className="text-xs text-muted-foreground p-2 text-center">No audits yet</p>
          )}
        </TertiaryNavPanel>
      )}

      <PageContent className="flex-row">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {showNewAuditForm ? (
            <div className="flex-1 overflow-auto p-4 bg-background" data-testid="audit-new-view">
              <div className="max-w-3xl">
                <ActionBar
                  variant="section"
                  icon={<Plus className="h-5 w-5" />}
                  title="Save Audit Report"
                  description="Paste the audit report from the agent below"
                  testId="action-bar-new-audit"
                />

                <div className="mb-4 mt-4">
                  <label className="text-sm font-medium mb-2 block">Audit Type</label>
                  <div className="flex gap-2">
                    <Button
                      variant={newAuditType === "rules" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewAuditType("rules")}
                      data-testid="button-audit-type-rules"
                    >
                      Rules
                    </Button>
                    <Button
                      variant={newAuditType === "code" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewAuditType("code")}
                      data-testid="button-audit-type-code"
                    >
                      Code
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {newAuditType === "rules" 
                      ? "AGENT-002-RULES: Validates rule structure, conflicts, and coverage" 
                      : "AGENT-002-CODE: Validates code implements rules correctly"}
                  </p>
                </div>

                <Textarea
                  placeholder="Paste your audit report here..."
                  value={newAuditContent}
                  onChange={(e) => setNewAuditContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  data-testid="input-audit-content"
                />
              </div>
            </div>
          ) : activeCategory === "protocol" ? (
            <div className="flex-1 overflow-auto p-4 bg-background" data-testid="audit-protocol-view">
              <div className="max-w-3xl">
                <ActionBar
                  variant="section"
                  icon={<ScrollText className="h-5 w-5" />}
                  title="Auditor Base Protocol"
                  description="Instructions for performing agentic audits (AGENT-002)"
                  testId="action-bar-protocol"
                />
                
                <Card className="p-4 bg-muted/30 mt-4 mb-4">
                  <h3 className="text-sm font-medium mb-2">How to Run an Audit</h3>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li>1. Ask the agent: <code className="bg-muted px-1 rounded">"Run a rule audit"</code> or <code className="bg-muted px-1 rounded">"Run a code audit"</code></li>
                    <li>2. The agent will analyze following the AGENT-002 protocol</li>
                    <li>3. Copy the audit report the agent provides</li>
                    <li>4. Click "New Audit" in the Actions panel and paste the report to save it</li>
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
          ) : activeCategory === "history" ? (
            <div className="flex-1 overflow-auto flex flex-col bg-background" data-testid="audit-history-view">
              {selectedAudit ? (
                <div className="p-4">
                  <ActionBar
                    variant="section"
                    icon={<History className="h-5 w-5 text-muted-foreground" />}
                    title={`${selectedAudit.auditType === "code" ? "Code" : "Rules"} Audit Report`}
                    titleExtra={
                      <span className="text-xs font-normal text-muted-foreground">
                        ({selectedAudit.auditType === "code" ? "AGENT-002-CODE" : "AGENT-002-RULES"})
                      </span>
                    }
                    description={`${formatTimestamp(selectedAudit.createdAt)}${selectedAudit.createdBy ? ` by ${selectedAudit.createdBy}` : ""}`}
                    testId="action-bar-history-detail"
                  />
                  <Card className="p-4 mt-4">
                    <pre className="text-sm whitespace-pre-wrap font-mono overflow-auto">
                      {selectedAudit.content}
                    </pre>
                  </Card>
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-4">
                  <ActionBar
                    variant="section"
                    icon={<History className="h-5 w-5" />}
                    title="Audit History"
                    description="Select an audit from the list to view details"
                    testId="action-bar-history"
                  />
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <History className="h-8 w-8 mx-auto opacity-50 mb-2" />
                      <p className="text-sm">Select an audit to view details</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Right Action Panel */}
        <ActionPanel
          title="Actions"
          isCollapsed={isActionPanelCollapsed}
          onToggleCollapse={() => setIsActionPanelCollapsed(!isActionPanelCollapsed)}
          testId="audit-action-panel"
          actions={
            showNewAuditForm
              ? [
                  {
                    id: "save-audit",
                    label: "Save Audit",
                    icon: <Save className="h-4 w-4" />,
                    endpoint: "/api/audits",
                    method: "POST",
                    description: "Save the audit report to history",
                    onClick: handleSaveAudit,
                    disabled: saveAuditMutation.isPending || !newAuditContent.trim(),
                    variant: "default"
                  },
                  {
                    id: "cancel",
                    label: "Cancel",
                    icon: <X className="h-4 w-4" />,
                    endpoint: "",
                    method: "GET",
                    description: "Return to previous view",
                    onClick: () => setShowNewAuditForm(false),
                    variant: "outline"
                  }
                ]
              : [
                  {
                    id: "new-audit",
                    label: "New Audit",
                    icon: <Plus className="h-4 w-4" />,
                    endpoint: "/api/audits",
                    method: "POST",
                    description: "Create a new audit report",
                    onClick: () => setShowNewAuditForm(true),
                    variant: "default"
                  }
                ]
          }
        />
      </PageContent>
    </>
  );
}

export default function RulesExplorer() {
  const { effectiveIsAdmin } = useViewMode();
  const [activeView, setActiveView] = useState<"catalog" | "audit">("catalog");
  const [selectedPartitionId, setSelectedPartitionId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [isSecNavCollapsed, setIsSecNavCollapsed] = useState(false);

  if (!effectiveIsAdmin) {
    return (
      <PageContent>
        <div className="p-6">
          <div className="flex flex-col gap-6 max-w-4xl">
            <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
            <p className="text-muted-foreground">
              You don't have permission to view this page.
            </p>
          </div>
        </div>
      </PageContent>
    );
  }

  return (
    <div className="flex flex-1" data-testid="rules-explorer-layout">
      <div className={`shrink-0 border-r bg-sidebar flex flex-col transition-all duration-200 ${
        isSecNavCollapsed ? "min-w-12 max-w-12" : "min-w-[10rem] max-w-[12rem] flex-1"
      }`}>
        <div className="border-b px-2 h-8 flex items-center shrink-0">
          {isSecNavCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-medium text-muted-foreground block w-full text-center cursor-default">R</span>
              </TooltipTrigger>
              <TooltipContent side="right">Rules Explorer</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">Rules Explorer</span>
          )}
        </div>
        <div className={`flex-1 space-y-1 overflow-y-auto ${isSecNavCollapsed ? "p-1" : "p-2"}`}>
          <SecondaryNavItem
            label="Catalog"
            isActive={activeView === "catalog"}
            onClick={() => setActiveView("catalog")}
            testId="nav-catalog"
            isCollapsed={isSecNavCollapsed}
          />
          <SecondaryNavItem
            label="Audit"
            isActive={activeView === "audit"}
            onClick={() => setActiveView("audit")}
            testId="nav-audit"
            isCollapsed={isSecNavCollapsed}
          />
        </div>
        <div className="border-t h-11 flex items-center justify-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsSecNavCollapsed(!isSecNavCollapsed)}
                data-testid="button-toggle-sec-nav"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isSecNavCollapsed ? "Expand" : "Collapse"}
            </TooltipContent>
          </Tooltip>
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
