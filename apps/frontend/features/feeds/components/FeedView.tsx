'use client';
import { useState } from 'react';
import { PaginatedEventSummarySchema, EventSummarySchema } from '@/generated';
import EventCardGrid from './EventCardGrid';
import LoadMoreButton from '@/shared/components/LoadMoreButton';

interface FeedViewProps {
  initialData?: PaginatedEventSummarySchema;
  fetchNextPage: (cursor: string) => Promise<PaginatedEventSummarySchema>;
  header?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function FeedView({ initialData, fetchNextPage, header, emptyTitle, emptyDescription }: FeedViewProps) {
  const [items, setItems] = useState<EventSummarySchema[]>(initialData?.items || []);
  const [nextCursor, setNextCursor] = useState<string | null>(initialData?.next_cursor || null);
  const [hasNext, setHasNext] = useState<boolean>(initialData?.has_next || false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const result = await fetchNextPage(nextCursor);
      setItems(prev => [...prev, ...result.items]);
      setNextCursor(result.next_cursor || null);
      setHasNext(result.has_next);
    } catch (error) {
      console.error("Failed to fetch next page", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {header && <div className="mb-8">{header}</div>}
      
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
