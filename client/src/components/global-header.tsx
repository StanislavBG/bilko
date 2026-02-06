import { LogOut, Eye, EyeOff, Settings, Mic, MicOff } from "lucide-react";
import { useState } from "react";
import { useViewMode } from "@/contexts/view-mode-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

interface GlobalHeaderProps {
  variant?: "authenticated" | "landing";
}

export function GlobalHeader({ variant = "authenticated" }: GlobalHeaderProps) {
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const handleMicToggle = async () => {
    if (isMicEnabled) {
      setIsMicEnabled(false);
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsMicEnabled(true);
      setMicPermissionDenied(false);
    } catch {
      setMicPermissionDenied(true);
    }
  };

  // Landing page header (for non-authenticated users)
  if (variant === "landing") {
    return (
      <header className="h-14 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center gap-4 px-4 fixed top-0 left-0 right-0 z-50">
        <span className="font-bold text-lg">
          Bilko Bibitkov AI Academy
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild>
            <a href="/api/login">Sign In</a>
          </Button>
          <Button size="sm" asChild>
            <a href="/api/login">Get Started</a>
          </Button>
        </div>
      </header>
    );
  }

  // Authenticated user header - needs ViewMode and Sidebar context
  return <AuthenticatedHeader
    isMicEnabled={isMicEnabled}
    micPermissionDenied={micPermissionDenied}
    onMicToggle={handleMicToggle}
  />;
}

function AuthenticatedHeader({
  isMicEnabled,
  micPermissionDenied,
  onMicToggle,
}: {
  isMicEnabled: boolean;
  micPermissionDenied: boolean;
  onMicToggle: () => void;
}) {
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
        {/* Voice Control - Mic Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isMicEnabled ? "default" : "ghost"}
              size="icon"
              onClick={onMicToggle}
              className={isMicEnabled ? "bg-red-500 hover:bg-red-600" : ""}
              data-testid="button-mic-toggle"
            >
              {isMicEnabled ? (
                <Mic className="h-4 w-4 text-white" />
              ) : (
                <MicOff className="h-4 w-4" />
              )}
              <span className="sr-only">
                {isMicEnabled ? "Disable voice control" : "Enable voice control"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {micPermissionDenied
              ? "Microphone permission denied"
              : isMicEnabled
              ? "Voice control active - click to disable"
              : "Enable voice control"}
          </TooltipContent>
        </Tooltip>

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
