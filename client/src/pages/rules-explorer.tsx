import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useViewMode } from "@/contexts/view-mode-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock, GitBranch, Link2, PanelLeft } from "lucide-react";
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
  onSelectRule,
  onBack
}: { 
  ruleId: string;
  onSelectRule: (ruleId: string) => void;
  onBack?: () => void;
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
        {/* Mobile back button */}
        {onBack && (
          <div className="md:hidden mb-3">
            <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-rules">
              Back
            </Button>
          </div>
        )}
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
        <div className="hidden md:flex w-44 shrink-0 border-r bg-muted/20 p-2 flex-col">
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
      <div className={`hidden md:flex shrink-0 border-r bg-muted/20 flex-col transition-all duration-200 ${
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
          className={`hidden md:flex transition-all duration-200 ${
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
            onBack={() => setSelectedRuleId(null)}
          />
        ) : selectedPartition ? (
          <>
            {/* Desktop: prompt to select rule from nav */}
            <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground bg-background">
              <p className="text-sm">Select a rule to view details</p>
            </div>
            {/* Mobile: show rules as cards */}
            <div className="md:hidden flex-1 p-4 overflow-auto">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPartitionId(null)}
                  data-testid="button-back-to-partitions"
                >
                  Back
                </Button>
                <h2 className="text-lg font-semibold capitalize" data-testid="text-partition-name">{selectedPartition.id}</h2>
              </div>
              <div className="space-y-3">
                {selectedPartition.rules.map((rule) => (
                  <Card
                    key={rule.id}
                    className="p-4 cursor-pointer hover-elevate"
                    onClick={() => setSelectedRuleId(rule.id)}
                    data-testid={`card-rule-${rule.id}`}
                  >
                    <div className="font-medium text-sm">{rule.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{rule.id} v{rule.version}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{rule.description}</div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Desktop: prompt to select partition from nav */}
            <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground bg-background">
              <p className="text-sm">Select a partition to browse rules</p>
            </div>
            {/* Mobile: show partitions as cards */}
            <div className="md:hidden flex-1 p-4 overflow-auto">
              <h2 className="text-lg font-semibold mb-4" data-testid="text-rules-heading">Rules Explorer</h2>
              {isLoading ? (
                <div className="space-y-3" data-testid="status-loading-partitions-mobile">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {catalog?.partitions.map((partition) => (
                    <Card
                      key={partition.id}
                      className="p-4 cursor-pointer hover-elevate"
                      onClick={() => setSelectedPartitionId(partition.id)}
                      data-testid={`card-partition-${partition.id}`}
                    >
                      <div className="font-medium text-sm capitalize">{partition.id}</div>
                      <div className="text-xs text-muted-foreground mt-1">{partition.rules.length} rules</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{partition.description}</div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </PageContent>
    </>
  );
}

export default function RulesExplorer() {
  const { effectiveIsAdmin } = useViewMode();
  const [selectedPartitionId, setSelectedPartitionId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

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
    <CatalogView
      selectedPartitionId={selectedPartitionId}
      setSelectedPartitionId={setSelectedPartitionId}
      selectedRuleId={selectedRuleId}
      setSelectedRuleId={setSelectedRuleId}
    />
  );
}
