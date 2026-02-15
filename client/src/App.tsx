/**
 * Application root — ARCH-007 compliant provider hierarchy.
 *
 * Global (hub-level) providers:  Auth, Theme, Sidebar, ViewMode,
 *   GlobalControls, QueryClient, Tooltip, Debug, Toaster.
 *
 * App-scoped providers (inside their own page tree):
 *   - Landing: ConversationDesignProvider, FlowBusProvider, FlowChatProvider
 *
 * Every route is wrapped in an AppErrorBoundary (ARCH-007 I4).
 */

import { lazy, Suspense, type ComponentType } from "react";
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

/** Wrap any page component in an error boundary so a crash never blanks the shell */
function withErrorBoundary<P extends object>(Comp: ComponentType<P>, appName: string) {
  function Wrapped(props: P) {
    return (
      <AppErrorBoundary appName={appName}>
        <Comp {...props} />
      </AppErrorBoundary>
    );
  }
  Wrapped.displayName = `ErrorBoundary(${appName})`;
  return Wrapped;
}

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

const ProjectsPage = withErrorBoundary(Projects, "Projects");
const BilkosWayPage = withErrorBoundary(BilkosWay, "Bilko's Way");
const N8nWorkflowsPage = withErrorBoundary(N8nWorkflows, "N8N Workflows");
const RulesExplorerPage = withErrorBoundary(RulesExplorer, "Rules Explorer");
const FlowExplorerPage = withErrorBoundary(FlowExplorer, "Flow Explorer");
const FlowDetailPage = withErrorBoundary(FlowDetail, "Flow Detail");

// ── Hub shell ────────────────────────────────────────────────────

function AuthenticatedApp() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/bilko-logo.svg" alt="Bilko" className="h-14 w-14 animate-bounce" style={{ animationDuration: "2s" }} />
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
                      <Route path="/projects/:projectId?" component={ProjectsPage} />
                      <Route path="/bilkos-way" component={BilkosWayPage} />
                      {isAuth && <Route path="/workflows" component={N8nWorkflowsPage} />}
                      {isAuth && <Route path="/rules" component={RulesExplorerPage} />}
                      {isAuth && <Route path="/flows/:flowId" component={FlowDetailPage} />}
                      {isAuth && <Route path="/flows" component={FlowExplorerPage} />}
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
