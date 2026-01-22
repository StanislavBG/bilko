import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
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
    <Switch>
      <Route path="/" component={() => <Home user={user} />} />
      <Route component={NotFound} />
    </Switch>
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
