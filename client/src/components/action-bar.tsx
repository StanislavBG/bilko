import { ReactNode } from "react";

interface ActionBarProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  titleExtra?: ReactNode;
  testId?: string;
}

export function ActionBar({ 
  title, 
  description, 
  actions,
  titleExtra,
  testId = "action-bar"
}: ActionBarProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap" data-testid={testId}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
            {title}
          </h1>
          {titleExtra}
        </div>
        {description && (
          <p className="text-muted-foreground">{description}</p>
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
