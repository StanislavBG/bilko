import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Zap, Shield, Workflow } from "lucide-react";

export default function Landing() {
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container flex flex-col items-center justify-center gap-8 px-4 py-16 md:py-24 lg:py-32">
          <div className="flex flex-col items-center gap-4 text-center max-w-3xl">
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Workflow Automation,
              <span className="text-primary"> Simplified</span>
            </h1>
            <p className="max-w-[600px] text-muted-foreground text-lg md:text-xl">
              Connect your AI agents with powerful automation. Bilko Bibitkov brings n8n workflows to life through an elegant, intuitive interface.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">Get Started</a>
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span>Secure by default</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </section>

        <section className="container px-4 py-16 md:py-24">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col gap-3 p-6 rounded-lg border bg-card">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Workflow className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Workflow Integration</h3>
              <p className="text-muted-foreground text-sm">
                Seamlessly connect to n8n workflows and trigger automations from a beautiful web interface.
              </p>
            </div>
            <div className="flex flex-col gap-3 p-6 rounded-lg border bg-card">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Enterprise Security</h3>
              <p className="text-muted-foreground text-sm">
                Built-in authentication with support for Google, GitHub, and more. Your data stays protected.
              </p>
            </div>
            <div className="flex flex-col gap-3 p-6 rounded-lg border bg-card">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">AI-Powered</h3>
              <p className="text-muted-foreground text-sm">
                Leverage AI agents to automate complex tasks and make intelligent decisions.
              </p>
            </div>
          </div>
        </section>
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
