import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <main className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Bilko Bibitkov AI Academy
          </h1>
          
          <Button size="lg" asChild data-testid="button-sign-in">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </main>
    </div>
  );
}
