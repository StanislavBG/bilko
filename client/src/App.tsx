import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ViewModeProvider } from "@/contexts/view-mode-context";
import { useAuth } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/app-sidebar";
import { ViewModeIndicator } from "@/components/view-mode-indicator";
import Landing from "@/pages/landing";
import HomeDashboard from "@/pages/home-dashboard";
import MemoryExplorer from "@/pages/memory-explorer";
import RulesExplorer from "@/pages/rules-explorer";
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

  if (!isAuthenticated || !user) {
    return <Landing />;
  }

  return (
    <ViewModeProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar user={user} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <ViewModeIndicator />
            <main className="flex-1 overflow-y-auto">
              <Switch>
                <Route path="/" component={() => <HomeDashboard user={user} />} />
                <Route path="/memory" component={MemoryExplorer} />
                <Route path="/rules" component={RulesExplorer} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ViewModeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="bilko-ui-theme">
        <TooltipProvider>
          <Toaster />
          <AuthenticatedApp />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
