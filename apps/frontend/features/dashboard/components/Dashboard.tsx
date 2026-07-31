'use client';
import { useState, useEffect, useRef } from 'react';
import { EventSummarySchema, appsEventsCreatorRoutersListCreatorEvents, appsEventsCreatorRoutersGetDraftsCount } from '@/generated';
import EventRow from './EventRow';
import LoadMoreButton from '@/shared/components/LoadMoreButton';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import Link from 'next/link';

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [events, setEvents] = useState<EventSummarySchema[]>([]);

  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Use a ref for the cursor to avoid stale closures in fetchEvents
  const cursorRef = useRef<string | null>(null);

  const fetchEvents = async (reset: boolean, statusOverride?: string) => {
    const status = statusOverride ?? statusFilter;
    const cursor = reset ? null : cursorRef.current;

    if (reset) {
      setIsLoading(true);
      setFetchError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const { data: result, error } = await appsEventsCreatorRoutersListCreatorEvents({
        query: {
          status: status === 'all' ? undefined : status,
          cursor: cursor || undefined,
          limit: 20,
        },
      } as any);

      if (error) {
        // Non-200 from API — don't throw, show inline message
        const msg = (error as any)?.detail ?? 'Failed to load events.';
        setFetchError(msg);
        return;
      }

      if (result) {
        const items = result.items ?? [];
        if (reset) {
          setEvents(items);
        } else {
          setEvents(prev => [...prev, ...items]);
        }
        cursorRef.current = result.next_cursor ?? null;
        setHasNext(result.has_next ?? false);
      }
    } catch (e: any) {
      // Network error or non-JSON response — show inline, don't throw
      console.error('[Dashboard] fetchEvents error:', e);
      setFetchError('Could not connect to the server. Please check the backend is running.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: res } = await appsEventsCreatorRoutersGetDraftsCount();
      if (res) setDraftCount(res.count);
    } catch {
      // Stats are non-critical — fail silently
    }
  };

  // When the status filter changes, reset and refetch
  useEffect(() => {
    cursorRef.current = null;
    fetchEvents(true, statusFilter);
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleUpdate = () => {
    cursorRef.current = null;
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

        <Link
          href="/editor/new"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
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

      {fetchError && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {fetchError}
        </div>
      )}

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
              <Link
                href="/editor/new"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
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
