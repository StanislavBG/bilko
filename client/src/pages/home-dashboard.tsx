import { useViewMode } from "@/contexts/view-mode-context";
import { useAuth } from "@/hooks/use-auth";
import { PageContent } from "@/components/page-content";
import { CalendarUpcoming, type CalendarEvent } from "@/components/calendar-upcoming";

// Sample data — replace with real data source when available
const upcomingEvents: CalendarEvent[] = [
  { id: "1", title: "DL4100 SJC-SEA 1830 2045", startDate: "Mar 5", isShared: true },
  { id: "2", title: "Microsoft Offsite", startDate: "Mar 9", endDate: "Mar 13", people: ["Petya"], isShared: true },
  { id: "3", title: "DL3736 SEA-SJC 0830 1050", startDate: "Mar 16", isShared: true },
  { id: "4", title: "Informatica Conference - Las Vegas", startDate: "May 19", endDate: "May 21", people: ["Stani"], isShared: true },
];

export default function HomeDashboard() {
  const { effectiveIsAdmin } = useViewMode();
  const { user } = useAuth();
  const firstName = user?.firstName || "there";

  if (effectiveIsAdmin) {
    return (
      <PageContent>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="flex flex-col gap-4 md:gap-6 max-w-4xl">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight" data-testid="text-welcome">
                Welcome, {firstName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Admin Dashboard - Your command center.
              </p>
            </div>

            <CalendarUpcoming events={upcomingEvents} />

            <div className="rounded-lg border bg-card p-4 md:p-6">
              <div className="flex flex-col gap-4">
                <h2 className="font-medium">Dashboard Overview</h2>
                <p className="text-sm text-muted-foreground">
                  As applications are built, their summaries will appear here.
                </p>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <p>Current status:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>Application Hub: Active</li>
                    <li>Authentication: Configured</li>
                    <li>Orchestration Layer: Pending</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex flex-col gap-4 md:gap-6 max-w-4xl">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight" data-testid="text-welcome">
              Welcome, {firstName}!
            </h1>
            <p className="text-sm text-muted-foreground">
              We're building something great.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 md:p-6">
            <div className="flex flex-col gap-4 text-center py-6 md:py-8">
              <div>
                <span className="inline-flex h-16 w-16 rounded-full bg-muted items-center justify-center mx-auto">
                  <span className="text-foreground text-2xl font-bold">B</span>
                </span>
              </div>
              <h2 className="text-xl font-medium" data-testid="text-coming-soon">
                Exciting things are coming
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your applications will appear here once they're ready.
                Check back soon for updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageContent>
  );
}
