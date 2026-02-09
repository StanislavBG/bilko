import { LogOut, Eye, EyeOff, Wrench, Volume2, VolumeX, RotateCcw, PanelLeft } from "lucide-react";
import { Link } from "wouter";
import { useViewMode } from "@/contexts/view-mode-context";
import { useVoice } from "@/contexts/voice-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useSidebar } from "@/components/ui/sidebar";
import { DebugButton } from "@/components/debug-panel";
import { queryClient } from "@/lib/queryClient";

interface GlobalHeaderProps {
  variant?: "authenticated" | "landing";
}

export function GlobalHeader({ variant = "authenticated" }: GlobalHeaderProps) {
  // Landing page header (for non-authenticated users)
  if (variant === "landing") {
    return <LandingHeader />;
  }

  // Authenticated user header - needs ViewMode and Sidebar context
  return <AuthenticatedHeader />;
}

function LandingHeader() {
  const { toggleSidebar, state } = useSidebar();
  const isOpen = state === "expanded";

  return (
    <header className="h-14 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center gap-3 px-4 fixed top-0 left-0 right-0 z-50">
      <span className="font-bold text-lg shrink-0">
        Bilko's AI School
      </span>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              data-testid="button-explore-site"
            >
              <PanelLeft className="h-4 w-4" />
              <span className="sr-only">{isOpen ? "Hide navigation" : "Explore site"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isOpen ? "Hide navigation" : "Explore site"}</TooltipContent>
        </Tooltip>
        <ToolsMenu />
        <DebugButton />
        <ThemeToggle />
        <Button variant="ghost" size="sm" asChild>
          <a href="/api/auth/login">Sign In</a>
        </Button>
      </div>
    </header>
  );
}

const TTS_TEST_PHRASE = "Hello! This is Bilko's Mental Gym testing text-to-speech. Can you hear me?";

/**
 * Clears all client-side session state for a fresh start.
 * Clears: sessionStorage (conversation), localStorage (voice, execution history),
 * and React Query cache. Does NOT log the user out.
 */
function resetSession() {
  // Clear sessionStorage (conversation state)
  sessionStorage.removeItem("bilko-conversation");

  // Clear localStorage items (keep theme + voice preferences)
  // Voice preference is a user setting, not session state — preserve it
  // so Bilko's greeting TTS and mic auto-start work after reset.
  localStorage.removeItem("bilko-execution-history");

  // Clear all React Query cache
  queryClient.clear();

  // Reload the page for a clean start
  window.location.href = "/";
}

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
          {ttsSupported && ttsUnlocked && (
            <span className="ml-auto text-[10px] text-emerald-400">OpenAI</span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-amber-600 dark:text-amber-400"
          onClick={resetSession}
          data-testid="button-reset-session"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Session
          <span className="ml-auto text-[10px] text-muted-foreground">fresh start</span>
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function AuthenticatedHeader() {
  const { isViewingAsUser, toggleViewMode, canToggleViewMode } = useViewMode();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <header className="h-11 shrink-0 border-b bg-sidebar flex items-center gap-2 px-2" data-testid="global-header">
      <Link href="/" className="font-semibold text-sm shrink-0 hover:opacity-80 transition-opacity cursor-pointer" data-testid="logo-text">
        AI School
      </Link>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              data-testid="button-sidebar-toggle"
            >
              <PanelLeft className="h-4 w-4" />
              <span className="sr-only">{isCollapsed ? "Explore site" : "Hide navigation"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isCollapsed ? "Explore site" : "Hide navigation"}</TooltipContent>
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
        <ToolsMenu />
        <DebugButton />
        <ThemeToggle />
        <Button variant="ghost" size="icon" asChild data-testid="button-logout">
          <a href="/api/auth/logout">
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sign out</span>
          </a>
        </Button>
      </div>
    </header>
  );
}
