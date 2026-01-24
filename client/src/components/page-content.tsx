import { GlobalHeader } from "@/components/global-header";
import { ViewModeIndicator } from "@/components/view-mode-indicator";

interface PageContentProps {
  children: React.ReactNode;
}

export function PageContent({ children }: PageContentProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ViewModeIndicator />
      <GlobalHeader />
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}
