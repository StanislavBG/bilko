import { LogOut, Eye, EyeOff, Settings, Mic, MicOff } from "lucide-react";
import { useViewMode } from "@/contexts/view-mode-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export interface VoiceHeaderProps {
  isListening: boolean;
  isSupported: boolean;
  permissionDenied: boolean;
  transcript: string;
  onToggle: () => void;
}

interface GlobalHeaderProps {
  variant?: "authenticated" | "landing";
  voice?: VoiceHeaderProps;
}

function VoiceButton({ voice }: { voice: VoiceHeaderProps }) {
  if (!voice.isSupported) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={voice.isListening ? "default" : "ghost"}
          size="sm"
          onClick={voice.onToggle}
          className={`gap-1.5 ${
            voice.isListening
              ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
              : ""
          }`}
        >
          {voice.isListening ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4" />
          )}
          <span className="hidden sm:inline text-xs">
            {voice.isListening ? "Listening..." : "Voice"}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {voice.permissionDenied
          ? "Microphone permission denied — check browser settings"
          : voice.isListening
          ? "Voice active — say a command or click to stop"
          : "Enable voice commands"}
      </TooltipContent>
    </Tooltip>
  );
}

function VoiceTranscript({ voice }: { voice: VoiceHeaderProps }) {
  if (!voice.isListening) return null;

  return (
    <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
      {voice.transcript ? `"${voice.transcript}"` : "Listening..."}
    </span>
  );
}

export function GlobalHeader({ variant = "authenticated", voice }: GlobalHeaderProps) {
  // Landing page header (for non-authenticated users)
  if (variant === "landing") {
    return (
      <header className="h-14 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center gap-3 px-4 fixed top-0 left-0 right-0 z-50">
        <span className="font-bold text-lg shrink-0">
          Bilko Bibitkov AI Academy
        </span>
        {voice && <VoiceButton voice={voice} />}
        {voice && <VoiceTranscript voice={voice} />}
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
  return <AuthenticatedHeader voice={voice} />;
}

function AuthenticatedHeader({ voice }: { voice?: VoiceHeaderProps }) {
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
      {voice && <VoiceButton voice={voice} />}
      {voice && <VoiceTranscript voice={voice} />}
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
