import { LogOut, Eye, EyeOff, Settings } from "lucide-react";
import { useViewMode } from "@/contexts/view-mode-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function GlobalHeader() {
  const { isViewingAsUser, toggleViewMode, canToggleViewMode } = useViewMode();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <header className="h-11 shrink-0 border-b bg-sidebar flex items-center gap-2 px-2" data-testid="global-header">
      <SidebarTrigger data-testid="button-sidebar-toggle" className="shrink-0" />
      {!isCollapsed && (
        <span className="font-semibold text-sm shrink-0" data-testid="logo-text">
          Bilko Bibitkov
        </span>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-1">
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
      </div>
    </header>
  );
}
