import { useViewMode } from "@/contexts/view-mode-context";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ViewModeIndicator() {
  const { isViewingAsUser, toggleViewMode } = useViewMode();

  if (!isViewingAsUser) {
    return null;
  }

  return (
    <div 
      className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400"
      data-testid="banner-view-as-user"
    >
      <div className="flex items-center gap-2 text-sm">
        <Eye className="h-4 w-4" />
        <span>You are viewing as a regular user</span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={toggleViewMode}
        className="text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
        data-testid="button-exit-view-mode"
      >
        Exit preview
      </Button>
    </div>
  );
}
