import { ViewModeIndicator } from "@/components/view-mode-indicator";

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContent({ children, className = "" }: PageContentProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ViewModeIndicator />
      <div className={`flex-1 flex min-h-0 ${className || "flex-col"}`}>
        {children}
      </div>
    </div>
  );
}
