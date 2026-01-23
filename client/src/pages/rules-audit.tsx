import { useQuery } from "@tanstack/react-query";
import { useViewMode } from "@/contexts/view-mode-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Shield, Clock, Server } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

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
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
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

export default function RulesAudit() {
  const { effectiveIsAdmin } = useViewMode();

  const { data: report, isLoading, refetch, isRefetching } = useQuery<AuditReport>({
    queryKey: ["/api/audit"],
  });

  const handleRefresh = async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["/api/audit"] });
  };

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
    <div className="p-6">
      <div className="flex flex-col gap-6 max-w-4xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
              Rules Audit
            </h1>
            <p className="text-muted-foreground">
              System integrity checks for the rule framework
            </p>
          </div>
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

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : report ? (
          <div className="space-y-4">
            <OverallStatus report={report} />
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Check Results
              </h3>
              {report.results.map((result) => (
                <CheckCard key={result.checkId} result={result} />
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <Shield className="h-8 w-8 opacity-50" />
              <p className="text-muted-foreground">No audit data available</p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Run Audit
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
