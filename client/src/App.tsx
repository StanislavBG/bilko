import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ViewModeProvider } from "@/contexts/view-mode-context";
import { NavigationProvider } from "@/contexts/navigation-context";
import { VoiceProvider } from "@/contexts/voice-context";
import { useAuth } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalHeader } from "@/components/global-header";
import Landing, { LandingContent } from "@/pages/landing";
import { ConversationProvider } from "@/contexts/conversation-context";
import Projects from "@/pages/projects";
import AgenticWorkflows from "@/pages/agentic-workflows";
import MemoryExplorer from "@/pages/memory-explorer";
import RulesExplorer from "@/pages/rules-explorer";
import Academy from "@/pages/academy";
import FlowExplorer from "@/pages/flow-explorer";
import FlowDetail from "@/pages/flow-detail";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Public routes — accessible to everyone (no auth required)
  return (
    <Switch>
      <Route path="/flows">
        <PublicShell>
          <FlowExplorer />
        </PublicShell>
      </Route>
      <Route path="/flows/:flowId">
        <PublicShell>
          <FlowDetail />
        </PublicShell>
      </Route>

      {/* Everything else goes through the auth gate */}
      <Route>
        {() => {
          if (!isAuthenticated || !user) {
            return <Landing />;
          }

          return (
            <ViewModeProvider>
              <SidebarProvider>
                <NavigationProvider>
                  <div className="flex flex-col h-screen w-full">
                    <GlobalHeader />
                    <div className="flex flex-1 overflow-hidden">
                      <AppSidebar />
                      <main className="flex-1 flex overflow-hidden">
                        <Switch>
                          <Route path="/">
                            <ConversationProvider>
                              <LandingContent skipWelcome />
                            </ConversationProvider>
                          </Route>
                          <Route path="/academy" component={Academy} />
                          <Route path="/academy/:levelId" component={Academy} />
                          <Route path="/projects/:projectId?" component={Projects} />
                          <Route path="/workflows" component={AgenticWorkflows} />
                          <Route path="/memory" component={MemoryExplorer} />
                          <Route path="/rules" component={RulesExplorer} />
                          <Route component={NotFound} />
                        </Switch>
                      </main>
                    </div>
                  </div>
                </NavigationProvider>
              </SidebarProvider>
            </ViewModeProvider>
          );
        }}
      </Route>
    </Switch>
  );
}

/** Minimal shell for public pages (header + content, no sidebar) */
function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full">
      <GlobalHeader variant="landing" />
      <main className="flex-1 flex overflow-hidden pt-14">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="bilko-ui-theme">
        <TooltipProvider>
          <VoiceProvider>
            <Toaster />
            <AuthenticatedApp />
          </VoiceProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
