import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useViewMode } from "@/contexts/view-mode-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock, GitBranch, Link2 } from "lucide-react";
import { PageContent } from "@/components/page-content";
import { ActionBar } from "@/components/action-bar";
import { ActionPanel } from "@/components/action-panel";
import { NavPanel } from "@/components/nav";

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
      <NavPanel
        header="Partitions"
        items={catalog.partitions.map((p) => ({
          id: p.id,
          label: p.id,
          shortLabel: p.id.charAt(0).toUpperCase(),
        }))}
        selectedId={selectedPartitionId}
        onSelect={(id) => { setSelectedPartitionId(id); setSelectedRuleId(null); }}
        isCollapsed={isPartitionCollapsed}
        onToggleCollapse={() => setIsPartitionCollapsed(!isPartitionCollapsed)}
        expandedWidth="min-w-[8rem] max-w-[10rem]"
        collapsedWidth="min-w-12 max-w-12"
        bg="bg-muted/20"
        testId="partition-nav"
      />

      {selectedPartition && (
        <NavPanel
          header="Rules"
          items={selectedPartition.rules.map((rule) => ({
            id: rule.id,
            label: rule.id,
            shortLabel: rule.id.split("-")[0],
          }))}
          selectedId={selectedRuleId}
          onSelect={(id) => setSelectedRuleId(id)}
          isCollapsed={isTertiaryCollapsed}
          onToggleCollapse={() => setIsTertiaryCollapsed(!isTertiaryCollapsed)}
          expandedWidth="min-w-[10rem] max-w-[12rem]"
          collapsedWidth="min-w-12 max-w-12"
          testId="tertiary-nav-rules"
        />
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
