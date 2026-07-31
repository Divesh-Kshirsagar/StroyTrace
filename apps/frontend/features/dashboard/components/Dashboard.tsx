'use client';
import { useState, useEffect, useCallback } from 'react';
import { EventSummarySchema, appsEventsCreatorRoutersListCreatorEvents, appsEventsCreatorRoutersGetDraftsCount } from '@/generated';
import EventRow from './EventRow';
import LoadMoreButton from '@/shared/components/LoadMoreButton';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import Link from 'next/link';

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [events, setEvents] = useState<EventSummarySchema[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    throw error;
  }

  const fetchEvents = useCallback(async (reset = false) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const cursor = reset ? null : nextCursor;
      const result = await appsEventsCreatorRoutersListCreatorEvents({
        status: statusFilter === 'all' ? undefined : statusFilter,
        cursor: cursor || undefined,
        limit: 20
      });
      
      if (reset) {
        setEvents(result.items);
      } else {
        setEvents(prev => [...prev, ...result.items]);
      }
      
      setNextCursor(result.next_cursor || null);
      setHasNext(result.has_next);
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [statusFilter, nextCursor]);

  const fetchStats = async () => {
    try {
      const res = await appsEventsCreatorRoutersGetDraftsCount();
      setDraftCount(res.count);
    } catch (e: any) {
      setError(e);
    }
  };

  useEffect(() => {
    fetchEvents(true);
    fetchStats();
  }, [statusFilter]);

  const handleUpdate = () => {
    fetchEvents(true);
    fetchStats();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Creator Dashboard</h1>
          <p className="text-zinc-500">Manage your investigations and events.</p>
        </div>
        
        <Link href="/editor/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          Create Event
        </Link>
      </div>
      
      <div className="mb-6 flex items-center justify-between">
        <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">
              Drafts
              {draftCount > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400 px-1.5 py-0.5 rounded-full text-xs font-bold">
                  {draftCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <h3 className="text-xl font-semibold mb-2">No events found</h3>
            <p className="text-zinc-500 mb-6">
              {statusFilter === 'all' 
                ? "You haven't created any events yet." 
                : `You don't have any ${statusFilter} events.`}
            </p>
            {statusFilter === 'all' && (
              <Link href="/editor/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                Start your first investigation
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {events.map(event => (
              <EventRow key={event.id} event={event} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>
      
      {!isLoading && hasNext && (
        <div className="mt-6">
          <LoadMoreButton hasNext={hasNext} isLoading={isLoadingMore} onClick={() => fetchEvents(false)} />
        </div>
      )}
    </div>
  );
}
