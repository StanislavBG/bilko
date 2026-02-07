import { LogOut, Eye, EyeOff, Settings, Mic, MicOff, MessageSquareText, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useViewMode } from "@/contexts/view-mode-context";
import { useVoice } from "@/contexts/voice-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

interface GlobalHeaderProps {
  variant?: "authenticated" | "landing";
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function VoiceWidget() {
  const {
    isListening, isMuted, isSupported, permissionDenied, transcript,
    transcriptLog, toggleListening, clearTranscriptLog,
  } = useVoice();

  if (!isSupported) return null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isListening ? "default" : "ghost"}
            size="sm"
            onClick={toggleListening}
            className={`gap-1.5 shrink-0 ${
              isListening && isMuted
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : isListening
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  : ""
            }`}
          >
            {isListening ? (
              <Mic className="h-4 w-4" />
            ) : (
              <MicOff className="h-4 w-4" />
            )}
            <span className="hidden sm:inline text-xs">
              {isListening && isMuted ? "Bilko speaking..." : isListening ? "Listening..." : "Voice"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {permissionDenied
            ? "Microphone permission denied — check browser settings"
            : isListening && isMuted
            ? "Mic muted while Bilko speaks"
            : isListening
            ? "Voice active — say a command or click to stop"
            : "Enable voice commands"}
        </TooltipContent>
      </Tooltip>

      {isListening && transcript && (
        <span className="text-xs text-muted-foreground italic truncate max-w-[200px] sm:max-w-[300px]">
          "{transcript}"
        </span>
      )}

      {transcriptLog.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 shrink-0 text-xs text-muted-foreground">
              <MessageSquareText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{transcriptLog.length}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-sm font-medium">Voice Summary</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearTranscriptLog}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto p-3 space-y-2">
              {transcriptLog.map((entry, i) => (
                <div key={i} className="text-sm">
                  <span className="text-[10px] text-muted-foreground font-mono mr-1.5">
                    {formatTime(entry.timestamp)}
                  </span>
                  {entry.text}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function GlobalHeader({ variant = "authenticated" }: GlobalHeaderProps) {
  // Landing page header (for non-authenticated users)
  if (variant === "landing") {
    return (
      <header className="h-14 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center gap-3 px-4 fixed top-0 left-0 right-0 z-50">
        <span className="font-bold text-lg shrink-0">
          Bilko's Mental Gym
        </span>
        <VoiceWidget />
        <div className="flex-1" />
        <div className="flex items-center gap-2">
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
          Mental Gym
        </Link>
      )}
      <VoiceWidget />
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
