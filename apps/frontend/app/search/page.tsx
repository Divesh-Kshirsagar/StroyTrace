'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EventSummarySchema, appsEventsRoutersSearchEvents } from '@/generated';
import EventCardGrid from '@/features/feeds/components/EventCardGrid';
import LoadMoreButton from '@/shared/components/LoadMoreButton';
import { Input } from '@/shared/components/ui/input';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [items, setItems] = useState<EventSummarySchema[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    
    // Initial fetch for the current URL params
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const result = await appsEventsRoutersSearchEvents({ query: { q } } as any);
        setItems(result.items);
        setNextCursor(result.next_cursor || null);
        setHasNext(result.has_next);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [searchParams]);

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get('q') || '';
      if (query !== currentQ) {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        router.push(`/search?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, router, searchParams]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const q = searchParams.get('q') || '';
      const result = await appsEventsRoutersSearchEvents({ query: { q, cursor: nextCursor } } as any);
      setItems(prev => [...prev, ...result.items]);
      setNextCursor(result.next_cursor || null);
      setHasNext(result.has_next);
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
