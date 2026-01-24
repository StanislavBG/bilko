import { ViewModeIndicator } from "@/components/view-mode-indicator";

interface PageContentProps {
  children: React.ReactNode;
}

export function PageContent({ children }: PageContentProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ViewModeIndicator />
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}
