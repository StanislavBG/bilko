import { ReactNode } from "react";

interface ActionBarProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  titleExtra?: ReactNode;
  testId?: string;
  variant?: "page" | "section";
  icon?: ReactNode;
}

export function ActionBar({ 
  title, 
  description, 
  actions,
  titleExtra,
  testId = "action-bar",
  variant = "page",
  icon
}: ActionBarProps) {
  const titleClass = variant === "page" 
    ? "text-2xl font-semibold tracking-tight" 
    : "text-lg font-semibold";
  const descClass = variant === "page"
    ? "text-muted-foreground"
    : "text-sm text-muted-foreground";

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap" data-testid={testId}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className={titleClass} data-testid="text-section-title">
            {title}
          </h2>
          {titleExtra}
        </div>
        {description && (
          <p className={descClass}>{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0" data-testid="action-bar-actions">
          {actions}
        </div>
      )}
    </div>
  );
}
