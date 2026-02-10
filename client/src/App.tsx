/**
 * Application root — ARCH-007 compliant provider hierarchy.
 *
 * Global (hub-level) providers:  Auth, Theme, Sidebar, ViewMode,
 *   GlobalControls, QueryClient, Tooltip, Debug, Toaster.
 *
 * App-scoped providers (inside their own page tree):
 *   - Landing: VoiceProvider, ConversationDesignProvider, FlowBusProvider, FlowChatProvider
 *   - Academy: NavigationProvider
 *
 * Every route is wrapped in an AppErrorBoundary (ARCH-007 I4).
 */

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ViewModeProvider } from "@/contexts/view-mode-context";
import { VoiceProvider } from "@/contexts/voice-context";
import { ConversationDesignProvider } from "@/contexts/conversation-design-context";
import { NavigationProvider } from "@/contexts/navigation-context";
import { useAuth } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalHeader } from "@/components/global-header";
import { LandingContent } from "@/pages/landing";
import { FlowBusProvider } from "@/contexts/flow-bus-context";
import { FlowChatProvider } from "@/lib/bilko-flow";
import Projects from "@/pages/projects";
import N8nWorkflows from "@/pages/n8n-workflows";
import MemoryExplorer from "@/pages/memory-explorer";
import RulesExplorer from "@/pages/rules-explorer";
import Academy from "@/pages/academy";
import FlowExplorer from "@/pages/flow-explorer";
import FlowDetail from "@/pages/flow-detail";
import BilkosWay from "@/pages/bilkos-way";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";
import { DebugProvider } from "@/contexts/debug-context";
import { GlobalControlsProvider } from "@/lib/global-controls";
import { AppErrorBoundary } from "@/components/app-error-boundary";

// ── App-scoped wrappers (ARCH-007 I3: context scoping) ──────────

/** Landing — owns Voice, ConversationDesign, FlowBus, FlowChat */
function MainFlow() {
  return (
    <AppErrorBoundary appName="Landing">
      <VoiceProvider>
        <ConversationDesignProvider>
          <FlowBusProvider>
            <FlowChatProvider voiceDefaultOn>
              <LandingContent />
            </FlowChatProvider>
          </FlowBusProvider>
        </ConversationDesignProvider>
      </VoiceProvider>
    </AppErrorBoundary>
  );
}

/** Academy — owns NavigationProvider (multi-level collapse) */
function AcademyApp() {
  return (
    <AppErrorBoundary appName="Academy">
      <NavigationProvider>
        <Academy />
      </NavigationProvider>
    </AppErrorBoundary>
  );
}

// ── Hub shell ────────────────────────────────────────────────────

function AuthenticatedApp() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-md bg-primary flex items-center justify-center animate-pulse">
            <span className="text-primary-foreground font-bold">B</span>
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  const isAuth = isAuthenticated && !!user;

  // Unified shell — auth only affects header variant and available routes.
  // The chat/flow experience (MainFlow → LandingContent) is identical for all users.
  return (
    <ViewModeProvider>
      <SidebarProvider defaultOpen={false}>
        <GlobalControlsProvider>
          <div className="flex flex-col h-screen w-full">
            <GlobalHeader variant={isAuth ? "authenticated" : "landing"} />
            <div className={`flex flex-1 overflow-hidden${isAuth ? "" : " pt-14"}`}>
              <AppSidebar />
              <main className="flex-1 flex overflow-hidden">
                <Switch>
                  <Route path="/" component={MainFlow} />
                  <Route path="/academy" component={AcademyApp} />
                  <Route path="/academy/:levelId" component={AcademyApp} />
                  <Route path="/projects/:projectId?">
                    {() => <AppErrorBoundary appName="Projects"><Projects /></AppErrorBoundary>}
                  </Route>
                  <Route path="/bilkos-way">
                    {() => <AppErrorBoundary appName="Bilko's Way"><BilkosWay /></AppErrorBoundary>}
                  </Route>
                  {isAuth && (
                    <Route path="/workflows">
                      {() => <AppErrorBoundary appName="Workflows"><N8nWorkflows /></AppErrorBoundary>}
                    </Route>
                  )}
                  {isAuth && (
                    <Route path="/memory">
                      {() => <AppErrorBoundary appName="Memory"><MemoryExplorer /></AppErrorBoundary>}
                    </Route>
                  )}
                  {isAuth && (
                    <Route path="/rules">
                      {() => <AppErrorBoundary appName="Rules"><RulesExplorer /></AppErrorBoundary>}
                    </Route>
                  )}
                  {isAuth && (
                    <Route path="/flows/:flowId">
                      {() => <AppErrorBoundary appName="Flow Detail"><FlowDetail /></AppErrorBoundary>}
                    </Route>
                  )}
                  {isAuth && (
                    <Route path="/flows">
                      {() => <AppErrorBoundary appName="Flow Explorer"><FlowExplorer /></AppErrorBoundary>}
                    </Route>
                  )}
                  <Route>
                    {() => <AppErrorBoundary appName="Not Found"><NotFound /></AppErrorBoundary>}
                  </Route>
                </Switch>
              </main>
            </div>
          </div>
        </GlobalControlsProvider>
      </SidebarProvider>
    </ViewModeProvider>
  );
}

// ── Root — only truly global (hub-level) providers ───────────────

function App() {
  return (
    <DebugProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="bilko-ui-theme">
          <TooltipProvider>
            <Toaster />
            <AuthenticatedApp />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </DebugProvider>
  );
}

export default App;
