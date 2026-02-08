import { LogOut, Eye, EyeOff, Wrench, Volume2, VolumeX } from "lucide-react";
import { Link } from "wouter";
import { useViewMode } from "@/contexts/view-mode-context";
import { useVoice } from "@/contexts/voice-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
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
          Bilko's Mental Gym
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <ToolsMenu />
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

const TTS_TEST_PHRASE = "Hello! This is Bilko's Mental Gym testing text-to-speech. Can you hear me?";

function ToolsMenu() {
  const { speak, stopSpeaking, isSpeaking, ttsSupported, ttsUnlocked } = useVoice();

  const handleTestTTS = () => {
    if (isSpeaking) {
      stopSpeaking();
      console.info("[TTS] Test stopped by user");
    } else {
      console.info("[TTS] Test triggered from tools menu");
      speak(TTS_TEST_PHRASE);
    }
  };

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-tools">
              <Wrench className="h-4 w-4" />
              <span className="sr-only">Tools</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Tools</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-56 p-2">
        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Dev Tools</p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          onClick={handleTestTTS}
        >
          {isSpeaking ? (
            <VolumeX className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
          {isSpeaking ? "Stop TTS" : "Test TTS"}
          {!ttsSupported && (
            <span className="ml-auto text-[10px] text-red-400">unsupported</span>
          )}
          {ttsSupported && !ttsUnlocked && (
            <span className="ml-auto text-[10px] text-amber-400">locked</span>
          )}
        </Button>
      </PopoverContent>
    </Popover>
  );
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
          Mental Gym
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
        <ToolsMenu />
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
