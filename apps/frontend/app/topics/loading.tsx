import EventCardSkeleton from "@/features/feeds/components/EventCardSkeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="h-10 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-8"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
