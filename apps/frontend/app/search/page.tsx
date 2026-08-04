"use client";
import EventCardGrid from "@/features/feeds/components/EventCardGrid";
import {
  type EventSummarySchema,
  appsEventsRoutersSearchEvents,
} from "@/generated";
import LoadMoreButton from "@/shared/components/LoadMoreButton";
import { Input } from "@/shared/components/ui/input";
import { useEffect, useRef, useState } from "react";

// Read initial query from URL without subscribing to Next.js searchParams
// (which would cause re-renders on every history.replaceState call)
function getInitialQuery(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") || "";
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<EventSummarySchema[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const didMount = useRef(false);

  // On first client mount, read query from URL
  useEffect(() => {
    const initial = getInitialQuery();
    setQuery(initial);
    setDebouncedQuery(initial);
    didMount.current = true;
  }, []);

  // Debounce query changes after mount
  useEffect(() => {
    if (!didMount.current) return;
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Sync URL silently — does NOT trigger Next.js router re-render
  useEffect(() => {
    if (!didMount.current) return;
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [debouncedQuery]);

  // Fetch only when debouncedQuery changes (and only after mount)
  useEffect(() => {
    if (!didMount.current) return;
    let cancelled = false;

    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setItems([]);
        setNextCursor(null);
        setHasNext(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data: result } = await appsEventsRoutersSearchEvents({
          query: { q: debouncedQuery },
        } as any);
        if (!cancelled && result) {
          setItems(result.items ?? []);
          setNextCursor(result.next_cursor || null);
          setHasNext(result.has_next ?? false);
        }
      } catch (e) {
        if (!cancelled) console.error("[Search] fetch error:", e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchResults();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const { data: result } = await appsEventsRoutersSearchEvents({
        query: { q: debouncedQuery, cursor: nextCursor },
      } as any);
      if (result) {
        setItems((prev) => [...prev, ...(result.items ?? [])]);
        setNextCursor(result.next_cursor || null);
        setHasNext(result.has_next ?? false);
      }
    } catch (e) {
      console.error("[Search] load more error:", e);
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
          autoFocus
        />
      </div>

      <EventCardGrid
        events={items}
        isLoading={isLoading}
        emptyTitle="No results found"
        emptyDescription={
          debouncedQuery
            ? `No events matched "${debouncedQuery}". Try different keywords.`
            : "Type above to start searching."
        }
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
