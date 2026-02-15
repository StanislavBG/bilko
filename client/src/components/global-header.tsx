/**
 * Global Header — The only UI element that crosses application boundaries.
 *
 * All global controls are accessed exclusively through their PI contracts
 * via useGlobalControl(id). No direct context access to individual providers.
 */

import { LogOut, Eye, EyeOff, Settings, Wrench, RotateCcw, PanelLeft, Moon, Sun, ArrowUpDown } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DebugButton } from "@/components/debug-panel";
import { useGlobalControls } from "@/lib/global-controls";

interface GlobalHeaderProps {
  variant?: "authenticated" | "landing";
}

export function GlobalHeader({ variant = "authenticated" }: GlobalHeaderProps) {
  if (variant === "landing") {
    return <LandingHeader />;
  }
  return <AuthenticatedHeader />;
}

function LandingHeader() {
  const controls = useGlobalControls();
  const nav = controls["PI-NAV-TOGGLE"];
  const theme = controls["PI-THEME"];
  const navLabel = nav.state.hidden ? "Show navigation" : "Hide navigation";

  return (
    <header className="h-14 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center gap-3 px-4 fixed top-0 left-0 right-0 z-50">
      <span className="flex items-center gap-2 font-bold text-lg shrink-0">
        <img src="/bilko-logo.svg" alt="" className="h-7 w-7" />
        Bilko's AI School
      </span>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={nav.actions.toggle}
              data-testid="button-explore-site"
            >
              <PanelLeft className="h-4 w-4" />
              <span className="sr-only">{navLabel}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{navLabel}</TooltipContent>
        </Tooltip>
        <SettingsMenu />
        <ToolsMenu />
        <DebugButton />
        <PIThemeToggle theme={theme} />
        <Button variant="ghost" size="sm" asChild>
          <a href="/api/auth/login">Sign In</a>
        </Button>
      </div>
    </header>
  );
}

function AuthenticatedHeader() {
  const controls = useGlobalControls();
  const nav = controls["PI-NAV-TOGGLE"];
  const viewMode = controls["PI-VIEW-MODE"];
  const theme = controls["PI-THEME"];
  const navLabel = nav.state.hidden ? "Show navigation" : "Hide navigation";

  return (
    <header className="h-11 shrink-0 border-b bg-sidebar flex items-center gap-2 px-2" data-testid="global-header">
      <Link href="/" className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity cursor-pointer" data-testid="logo-text">
        <img src="/bilko-logo.svg" alt="" className="h-6 w-6" />
        <span className="font-semibold text-sm">AI School</span>
      </Link>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={nav.actions.toggle}
              data-testid="button-sidebar-toggle"
            >
              <PanelLeft className="h-4 w-4" />
              <span className="sr-only">{navLabel}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{navLabel}</TooltipContent>
        </Tooltip>
        {viewMode.state.canToggleViewMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={viewMode.actions.toggleViewMode}
                data-testid="button-toggle-view-mode"
              >
                {viewMode.state.isViewingAsUser ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {viewMode.state.isViewingAsUser ? "Exit user view" : "View as user"}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {viewMode.state.isViewingAsUser ? "Exit user view" : "View as user"}
            </TooltipContent>
          </Tooltip>
        )}
        <SettingsMenu />
        <ToolsMenu />
        <DebugButton />
        <PIThemeToggle theme={theme} />
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

// ── Theme toggle driven by PI-THEME ─────────────────────

function PIThemeToggle({ theme }: { theme: ReturnType<typeof useGlobalControls>["PI-THEME"] }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={theme.actions.toggle}
      data-testid="button-theme-toggle"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

// ── Settings menu — chat direction + preferences ─────────

function SettingsMenu() {
  const chatDir = useGlobalControls()["PI-CHAT-DIRECTION"];
  const isBottomUp = chatDir.state.direction === "bottom-up";

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-settings">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-56 p-2">
        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Chat</p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          onClick={chatDir.actions.toggle}
          data-testid="button-chat-direction"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {isBottomUp ? "Newest first" : "Classic chat order"}
          <span className="ml-auto text-[10px] text-muted-foreground">
            {isBottomUp ? "top-down" : "bottom-up"}
          </span>
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// ── Tools menu driven by PI-SESSION ─────────────────────

function ToolsMenu() {
  const session = useGlobalControls()["PI-SESSION"];

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
          className="w-full justify-start gap-2 text-xs text-amber-600 dark:text-amber-400"
          onClick={session.actions.resetSession}
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
