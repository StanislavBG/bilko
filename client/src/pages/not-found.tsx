import { Card, CardContent } from "@/components/ui/card";
import { PageContent } from "@/components/page-content";

export default function NotFound() {
  return (
    <PageContent>
      <div className="flex-1 flex items-center justify-center bg-background" data-testid="not-found-container">
        <Card className="w-full max-w-md mx-4" data-testid="card-not-found">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <span className="text-2xl font-bold" data-testid="text-error-code">404</span>
              <h1 className="text-2xl font-bold" data-testid="text-error-title">Page Not Found</h1>
            </div>

            <p className="mt-4 text-sm text-muted-foreground" data-testid="text-error-message">
              Did you forget to add the page to the router?
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}
