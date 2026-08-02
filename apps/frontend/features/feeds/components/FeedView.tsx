'use client';

import { useState, useCallback } from 'react';
import { PaginatedEventSummarySchema, EventSummarySchema } from '@/generated';
import EventCardGrid from './EventCardGrid';
import LoadMoreButton from '@/shared/components/LoadMoreButton';

// Maximum cards kept in the DOM at any time.
// When exceeded, the oldest items are trimmed to free memory.
const MAX_ITEMS = 60;

interface FeedViewProps {
  initialData?: PaginatedEventSummarySchema;
  fetchNextPage: (cursor: string) => Promise<PaginatedEventSummarySchema>;
  header?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function FeedView({
  initialData,
  fetchNextPage,
  header,
  emptyTitle,
  emptyDescription,
}: FeedViewProps) {
  const [items, setItems] = useState<EventSummarySchema[]>(initialData?.items ?? []);
  const [nextCursor, setNextCursor] = useState<string | null>(initialData?.next_cursor ?? null);
  const [hasNext, setHasNext] = useState<boolean>(initialData?.has_next ?? false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Track whether we trimmed the top so the user knows they can scroll up for older items
  const [isTrimmed, setIsTrimmed] = useState(false);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const result = await fetchNextPage(nextCursor);
      setItems(prev => {
        const merged = [...prev, ...result.items];
        // If we're over the ceiling, drop the oldest PAGE_SIZE from the top
        if (merged.length > MAX_ITEMS) {
          setIsTrimmed(true);
          return merged.slice(merged.length - MAX_ITEMS);
        }
        return merged;
      });
      setNextCursor(result.next_cursor ?? null);
      setHasNext(result.has_next);
    } catch (err) {
      console.error('Failed to fetch next page', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, fetchNextPage]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {header && <div className="mb-8">{header}</div>}

      {isTrimmed && (
        <p className="text-xs text-center text-zinc-400 mb-6">
          Earlier results were removed to keep the page fast.{' '}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="underline hover:text-zinc-600"
          >
            Scroll to top
          </button>
        </p>
      )}

      <EventCardGrid
        events={items}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />

      <LoadMoreButton
        hasNext={hasNext}
        isLoading={isLoadingMore}
        onClick={handleLoadMore}
      />
    </div>
  );
}
