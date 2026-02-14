/**
 * Application root — ARCH-007 compliant provider hierarchy.
 *
 * Global (hub-level) providers:  Auth, Theme, Sidebar, ViewMode,
 *   GlobalControls, QueryClient, Tooltip, Debug, Toaster.
 *
 * App-scoped providers (inside their own page tree):
 *   - Landing: ConversationDesignProvider, FlowBusProvider, FlowChatProvider
 *   - Academy: NavigationProvider
 *
 * Every route is wrapped in an AppErrorBoundary (ARCH-007 I4).
 */

import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ViewModeProvider } from "@/contexts/view-mode-context";
import { ConversationDesignProvider } from "@/contexts/conversation-design-context";
import { NavigationProvider } from "@/contexts/navigation-context";
import { useAuth } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalHeader } from "@/components/global-header";
import { LandingContent } from "@/pages/landing";
import { FlowBusProvider } from "@/contexts/flow-bus-context";
import { FlowChatProvider } from "@/lib/bilko-flow";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";
import { DebugProvider } from "@/contexts/debug-context";
import { GlobalControlsProvider } from "@/lib/global-controls";
import { AppErrorBoundary } from "@/components/app-error-boundary";

// Lazy-loaded pages — only fetched when their route is visited
const Projects = lazy(() => import("@/pages/projects"));
const N8nWorkflows = lazy(() => import("@/pages/n8n-workflows"));
const RulesExplorer = lazy(() => import("@/pages/rules-explorer"));
const FlowExplorer = lazy(() => import("@/pages/flow-explorer"));
const FlowDetail = lazy(() => import("@/pages/flow-detail"));
const BilkosWay = lazy(() => import("@/pages/bilkos-way"));

// ── App-scoped wrappers (ARCH-007 I3: context scoping) ──────────

/** Landing — owns ConversationDesign, FlowBus, FlowChat */
function MainFlow() {
  return (
    <AppErrorBoundary appName="Landing">
      <ConversationDesignProvider>
        <FlowBusProvider>
          <FlowChatProvider>
            <LandingContent />
          </FlowChatProvider>
        </FlowBusProvider>
      </ConversationDesignProvider>
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
        <NavigationProvider>
          <GlobalControlsProvider>
            <div className="flex flex-col h-screen w-full">
              <GlobalHeader variant={isAuth ? "authenticated" : "landing"} />
              <div className={`flex flex-1 overflow-hidden${isAuth ? "" : " pt-14"}`}>
                <AppSidebar />
                <main className="flex-1 flex overflow-hidden">
                  <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Skeleton className="h-8 w-48" /></div>}>
                    <Switch>
                      <Route path="/s/:flowId" component={MainFlow} />
                      <Route path="/" component={MainFlow} />
                      <Route path="/projects/:projectId?" component={Projects} />
                      <Route path="/bilkos-way" component={BilkosWay} />
                      {isAuth && <Route path="/workflows" component={N8nWorkflows} />}
                      {isAuth && <Route path="/rules" component={RulesExplorer} />}
                      {isAuth && <Route path="/flows/:flowId" component={FlowDetail} />}
                      {isAuth && <Route path="/flows" component={FlowExplorer} />}
                      <Route component={NotFound} />
                    </Switch>
                  </Suspense>
                </main>
              </div>
            </div>
          </GlobalControlsProvider>
        </NavigationProvider>
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
