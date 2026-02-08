import { Calendar, Users } from "lucide-react";

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  people?: string[];
  isShared?: boolean;
}

interface CalendarUpcomingProps {
  events: CalendarEvent[];
}

export function CalendarUpcoming({ events }: CalendarUpcomingProps) {
  if (events.length === 0) return null;

  return (
    <div className="relative rounded-lg border bg-card">
      {/* "Upcoming" as a legend-style label sitting on the top border */}
      <span className="absolute -top-2.5 left-3 flex items-center gap-1.5 bg-card px-2 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        Upcoming
      </span>

      {/* Cards row — takes all vertical space, no header overhead */}
      <div className="flex gap-3 overflow-x-auto px-3 py-3 scrollbar-thin">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const dateLabel = event.endDate
    ? `${event.startDate} – ${event.endDate}`
    : event.startDate;

  return (
    <div className="flex min-w-[200px] max-w-[260px] shrink-0 flex-col gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight line-clamp-2">
          {event.title}
        </span>
        {event.isShared && (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Shared
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3 shrink-0" />
        <span>{dateLabel}</span>
      </div>
      {event.people && event.people.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          <span>{event.people.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
