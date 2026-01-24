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
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
