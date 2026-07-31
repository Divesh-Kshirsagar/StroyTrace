'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { EventSummarySchema, appsEventsRoutersSearchEvents } from '@/generated';
import EventCardGrid from '@/features/feeds/components/EventCardGrid';
import LoadMoreButton from '@/shared/components/LoadMoreButton';
import { Input } from '@/shared/components/ui/input';

export default function SearchPage() {
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [items, setItems] = useState<EventSummarySchema[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Debounce the query input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Sync URL silently without triggering Next.js router re-renders
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (debouncedQuery) {
      params.set('q', debouncedQuery);
    } else {
      params.delete('q');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [debouncedQuery]);

  // Fetch results when debounced query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery) {
        setItems([]);
        setHasNext(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const { data: result } = await appsEventsRoutersSearchEvents({ query: { q: debouncedQuery } } as any);
        if (result) {
          setItems(result.items);
          setNextCursor(result.next_cursor || null);
          setHasNext(result.has_next);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [debouncedQuery]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const { data: result } = await appsEventsRoutersSearchEvents({ query: { q: debouncedQuery, cursor: nextCursor } } as any);
      if (result) {
        setItems(prev => [...prev, ...result.items]);
        setNextCursor(result.next_cursor || null);
        setHasNext(result.has_next);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold mb-6">Search Clarity</h1>
        <Input
          type="search"
          placeholder="Search for events, narratives, or topics..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="text-lg p-6 rounded-xl shadow-sm"
        />
      </div>

      <EventCardGrid 
        events={items} 
        isLoading={isLoading}
        emptyTitle="No results found"
        emptyDescription={query ? `No events matched "${query}". Try different keywords.` : "Type above to start searching."}
      />
      
      {!isLoading && (
        <LoadMoreButton 
          hasNext={hasNext} 
          isLoading={isLoadingMore} 
          onClick={handleLoadMore} 
        />
      )}
    </div>
  );
}
