import Link from 'next/link';
import { Card } from '@/shared/components/ui/card';
import TopicBadge from '@/shared/components/TopicBadge';
import CreatorBadge from '@/shared/components/CreatorBadge';
import { EventSummarySchema } from '@/generated';

interface EventCardProps {
  event: EventSummarySchema;
}

export default function EventCard({ event }: EventCardProps) {
  const eventUrl = `/@${event.lead_investigator.handle}/${event.slug}`;
  const startDate = new Date(event.start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <Link href={eventUrl} className="block group">
      <Card className="overflow-hidden flex flex-col h-full border-none shadow-sm hover:shadow-md transition-shadow bg-zinc-50 dark:bg-zinc-900">
        <div className="aspect-[16/9] w-full bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden">
          {event.primary_thumbnail ? (
            <img 
              src={event.primary_thumbnail} 
              alt={event.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400">
              No Thumbnail
            </div>
          )}
        </div>
        
        <div className="p-4 flex flex-col flex-grow gap-2">
          <CreatorBadge creator={event.lead_investigator} />
          
          <h3 className="font-bold text-lg leading-tight line-clamp-2 mt-1">
            {event.title}
          </h3>
          
          {event.summary && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
              {event.summary}
            </p>
          )}
          
          <div className="mt-auto pt-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 items-center flex-wrap">
              {event.primary_topic && (
                <TopicBadge topic={event.primary_topic} />
              )}
              <span className="text-xs text-zinc-500 font-medium">
                {startDate}
              </span>
            </div>
            
            <div className="text-xs text-zinc-500 font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
              {event.evidence_count} evidence
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
