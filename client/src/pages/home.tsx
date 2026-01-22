import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import type { User } from "@shared/models/auth";

interface HomeProps {
  user: User;
}

export default function Home({ user }: HomeProps) {
  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n) => n?.[0])
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">B</span>
            </div>
            <span className="font-semibold text-lg">Bilko Bibitkov</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profileImageUrl ?? undefined} alt={displayName} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline" data-testid="text-username">
                {displayName}
              </span>
            </div>
            <Button variant="ghost" size="icon" asChild data-testid="button-logout">
              <a href="/api/logout">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container px-4 py-8 md:py-12">
        <div className="flex flex-col gap-6 max-w-2xl mx-auto">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-welcome">
              Welcome, {user.firstName || "there"}
            </h1>
            <p className="text-muted-foreground">
              Your workspace is ready. Bilko Bibitkov is standing by.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex flex-col gap-4">
              <h2 className="font-medium">Getting Started</h2>
              <p className="text-sm text-muted-foreground">
                This is your authenticated home page. As features are built, they will appear here.
              </p>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>Phase 1 complete:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Authentication configured</li>
                  <li>Rule framework established</li>
                  <li>Foundation ready for n8n integration</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container flex flex-col items-center gap-4 px-4 md:flex-row md:justify-between">
          <p className="text-sm text-muted-foreground">
            Bilko Bibitkov. Built with care.
          </p>
        </div>
      </footer>
    </div>
  );
}
