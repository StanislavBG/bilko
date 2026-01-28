import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ExecutionListItem {
  id: string;
  workflowId: string;
  triggerTraceId: string | null;
  externalExecutionId: string | null;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  userId: string | null;
}

interface ExecutionsResponse {
  executions: ExecutionListItem[];
}

interface ExecutionsListProps {
  workflowId: string;
  selectedExecutionId: string | null;
  onSelectExecution: (execution: ExecutionListItem) => void;
}

function StatusIcon({ status }: { status: ExecutionListItem["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-3 w-3 text-green-600" />;
    case "failed":
      return <XCircle className="h-3 w-3 text-red-600" />;
    case "running":
      return <Loader2 className="h-3 w-3 animate-spin text-blue-600" />;
    default:
      return <Clock className="h-3 w-3 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: ExecutionListItem["status"] }) {
  const variants: Record<ExecutionListItem["status"], "default" | "secondary" | "outline" | "destructive"> = {
    completed: "default",
    failed: "destructive",
    running: "secondary",
    pending: "outline",
  };
  
  return (
    <Badge variant={variants[status]} className="text-xs">
      {status}
    </Badge>
  );
}

export function ExecutionsList({ workflowId, selectedExecutionId, onSelectExecution }: ExecutionsListProps) {
  const { data, isLoading } = useQuery<ExecutionsResponse>({
    queryKey: ["/api/workflows", workflowId, "executions"],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}/executions`);
      return res.json();
    },
    refetchInterval: 10000,
  });

  const executions = data?.executions || [];

  useEffect(() => {
    if (!selectedExecutionId && executions.length > 0) {
      onSelectExecution(executions[0]);
    }
  }, [executions, selectedExecutionId, onSelectExecution]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Executions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (executions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-muted-foreground">
          <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No executions yet</p>
          <p className="text-xs mt-1">Execute the workflow to see history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Execution History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-2">
        {executions.map((execution) => {
          const startTime = new Date(execution.startedAt);
          const isSelected = execution.id === selectedExecutionId;
          
          return (
            <button
              key={execution.id}
              onClick={() => onSelectExecution(execution)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                isSelected
                  ? "bg-foreground text-background"
                  : "hover-elevate"
              }`}
              data-testid={`execution-item-${execution.id}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusIcon status={execution.status} />
                  <span className="font-mono text-xs truncate">
                    {execution.id.slice(0, 8)}
                  </span>
                </div>
                <StatusBadge status={execution.status} />
              </div>
              <div className="text-xs opacity-70 mt-1">
                {startTime.toLocaleDateString()} {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
