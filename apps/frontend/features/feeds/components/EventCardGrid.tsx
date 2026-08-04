import type { EventSummarySchema } from "@/generated";
import EmptyState from "@/shared/components/EmptyState";
import SkeletonCard from "@/shared/components/SkeletonCard";
import EventCard from "./EventCard";

interface EventCardGridProps {
  events: EventSummarySchema[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function EventCardGrid({
  events,
  isLoading,
  emptyTitle = "No events found",
  emptyDescription = "There are no events matching your criteria right now.",
}: EventCardGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
