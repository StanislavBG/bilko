import { LogOut, Eye, EyeOff, Settings } from "lucide-react";
import { useViewMode } from "@/contexts/view-mode-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function GlobalHeader() {
  const { isViewingAsUser, toggleViewMode, canToggleViewMode } = useViewMode();

  return (
    <header className="h-12 shrink-0 border-b bg-background flex items-center justify-end gap-1 px-4" data-testid="global-header">
      {canToggleViewMode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleViewMode}
              data-testid="button-toggle-view-mode"
            >
              {isViewingAsUser ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="sr-only">
                {isViewingAsUser ? "Exit user view" : "View as user"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isViewingAsUser ? "Exit user view" : "View as user"}
          </TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            disabled
            className="opacity-50"
            data-testid="button-settings"
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Settings (coming soon)</TooltipContent>
      </Tooltip>
      <ThemeToggle />
      <Button variant="ghost" size="icon" asChild data-testid="button-logout">
        <a href="/api/logout">
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Sign out</span>
        </a>
      </Button>
    </header>
  );
}
