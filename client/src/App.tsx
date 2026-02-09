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
import { ConversationDesignProvider } from "@/contexts/conversation-design-context";
import { useAuth } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalHeader } from "@/components/global-header";
import { LandingContent } from "@/pages/landing";
import { FlowBusProvider } from "@/contexts/flow-bus-context";
import { FlowChatProvider } from "@/lib/flow-engine";
import Projects from "@/pages/projects";
import AgenticWorkflows from "@/pages/agentic-workflows";
import MemoryExplorer from "@/pages/memory-explorer";
import RulesExplorer from "@/pages/rules-explorer";
import Academy from "@/pages/academy";
import FlowExplorer from "@/pages/flow-explorer";
import FlowDetail from "@/pages/flow-detail";
import BilkosWay from "@/pages/bilkos-way";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";
import { DebugProvider } from "@/contexts/debug-context";

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

  // Landing page IS the Home App — same layout for both auth and unauth.
  // Unauth: sidebar starts closed, full greeting.
  // Auth: sidebar starts open, skipWelcome greeting.
  return (
    <Switch>
      <Route>
        {() => {
          if (!isAuthenticated || !user) {
            // Unauth: Landing = Home App without nav initially.
            // SidebarProvider(defaultOpen=false) so "Explore the Site" can open it.
            return (
              <ViewModeProvider>
                <SidebarProvider defaultOpen={false}>
                  <NavigationProvider>
                    <div className="flex flex-col h-screen w-full">
                      <GlobalHeader variant="landing" />
                      <div className="flex flex-1 overflow-hidden pt-14">
                        <AppSidebar />
                        <main className="flex-1 flex overflow-hidden">
                          <FlowBusProvider>
                            <FlowChatProvider voiceDefaultOn>
                              <LandingContent />
                            </FlowChatProvider>
                          </FlowBusProvider>
                        </main>
                      </div>
                    </div>
                  </NavigationProvider>
                </SidebarProvider>
              </ViewModeProvider>
            );
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
                            <FlowBusProvider>
                              <FlowChatProvider voiceDefaultOn>
                                <LandingContent skipWelcome />
                              </FlowChatProvider>
                            </FlowBusProvider>
                          </Route>
                          <Route path="/academy" component={Academy} />
                          <Route path="/academy/:levelId" component={Academy} />
                          <Route path="/projects/:projectId?" component={Projects} />
                          <Route path="/workflows" component={AgenticWorkflows} />
                          <Route path="/memory" component={MemoryExplorer} />
                          <Route path="/rules" component={RulesExplorer} />
                          <Route path="/bilkos-way" component={BilkosWay} />
                          <Route path="/flows/:flowId" component={FlowDetail} />
                          <Route path="/flows" component={FlowExplorer} />
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

function App() {
  return (
    <DebugProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="bilko-ui-theme">
          <TooltipProvider>
            <VoiceProvider>
              <ConversationDesignProvider>
                <Toaster />
                <AuthenticatedApp />
              </ConversationDesignProvider>
            </VoiceProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </DebugProvider>
  );
}

export default App;
