import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PanelLeft } from "lucide-react";

interface ActionItem {
  id: string;
  label: string;
  icon?: ReactNode;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
}

interface ActionPanelProps {
  title?: string;
  actions: ActionItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  testId?: string;
}

export function ActionPanel({
  title = "Actions",
  actions,
  isCollapsed,
  onToggleCollapse,
  testId = "action-panel"
}: ActionPanelProps) {
  return (
    <div 
      className={`shrink-0 border-l bg-muted/20 flex flex-col transition-all duration-200 ${
        isCollapsed ? "min-w-12 max-w-12" : "min-w-[12rem] max-w-[14rem]"
      }`}
      data-testid={testId}
    >
      <div className="border-b px-2 h-8 flex items-center shrink-0">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs font-medium text-muted-foreground block w-full text-center cursor-default">A</span>
            </TooltipTrigger>
            <TooltipContent side="left">{title}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="flex flex-col gap-2">
          {actions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      </div>

      <div className="border-t h-11 flex items-center justify-center shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              data-testid="button-toggle-action-panel"
            >
              <PanelLeft className={`h-4 w-4 transition-transform ${isCollapsed ? "" : "rotate-180"}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isCollapsed ? "Expand actions" : "Collapse actions"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  action: ActionItem;
  isCollapsed: boolean;
}

function ActionButton({ action, isCollapsed }: ActionButtonProps) {
  const methodColors: Record<string, string> = {
    GET: "text-emerald-600 dark:text-emerald-400",
    POST: "text-blue-600 dark:text-blue-400",
    PUT: "text-amber-600 dark:text-amber-400",
    PATCH: "text-orange-600 dark:text-orange-400",
    DELETE: "text-red-600 dark:text-red-400",
  };

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={action.variant || "outline"}
            size="icon"
            onClick={action.onClick}
            disabled={action.disabled}
            data-testid={`button-action-${action.id}`}
          >
            {action.icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[200px]">
          <div className="space-y-1">
            <div className="font-medium">{action.label}</div>
            <code className={`text-xs ${methodColors[action.method]}`}>
              {action.method} {action.endpoint}
            </code>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={action.variant || "outline"}
        size="sm"
        onClick={action.onClick}
        disabled={action.disabled}
        className="w-full justify-start"
        data-testid={`button-action-${action.id}`}
      >
        {action.icon && <span className="mr-2">{action.icon}</span>}
        {action.label}
      </Button>
      <code className={`text-xs px-2 ${methodColors[action.method]}`}>
        {action.method} {action.endpoint}
      </code>
      {action.description && (
        <p className="text-xs text-muted-foreground px-2">{action.description}</p>
      )}
    </div>
  );
}
