import { LogOut, Eye, EyeOff, Settings } from "lucide-react";
import { Link } from "wouter";
import { useViewMode } from "@/contexts/view-mode-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { DebugButton } from "@/components/debug-panel";

interface GlobalHeaderProps {
  variant?: "authenticated" | "landing";
}

export function GlobalHeader({ variant = "authenticated" }: GlobalHeaderProps) {
  // Landing page header (for non-authenticated users)
  if (variant === "landing") {
    return (
      <header className="h-14 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center gap-3 px-4 fixed top-0 left-0 right-0 z-50">
        <span className="font-bold text-lg shrink-0">
          Bilko's AI School
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <DebugButton />
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>
    );
  }

  // Authenticated user header - needs ViewMode and Sidebar context
  return <AuthenticatedHeader />;
}

function AuthenticatedHeader() {
  const { isViewingAsUser, toggleViewMode, canToggleViewMode } = useViewMode();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <header className="h-11 shrink-0 border-b bg-sidebar flex items-center gap-2 px-2" data-testid="global-header">
      <SidebarTrigger data-testid="button-sidebar-toggle" className="shrink-0" />
      {!isCollapsed && (
        <Link href="/" className="font-semibold text-sm shrink-0 hover:opacity-80 transition-opacity cursor-pointer" data-testid="logo-text">
          AI School
        </Link>
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
        <DebugButton />
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
