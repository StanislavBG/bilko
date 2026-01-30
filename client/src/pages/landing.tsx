import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <main className="flex-1 flex flex-col items-center pt-[25vh]">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-center">
          Bilko Bibitkov AI Academy
        </h1>
        
        <Button size="lg" className="mt-12" asChild data-testid="button-sign-in">
          <a href="/api/login">Sign In</a>
        </Button>
      </main>
    </div>
  );
}
