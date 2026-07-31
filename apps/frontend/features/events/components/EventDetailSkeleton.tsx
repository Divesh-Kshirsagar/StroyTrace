import { Skeleton } from '@/shared/components/ui/skeleton';

export default function EventDetailSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="border-b bg-white dark:bg-zinc-950 px-4 py-8 md:px-8 lg:px-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-12 md:h-16 w-full max-w-3xl" />
          <Skeleton className="h-6 w-full max-w-2xl" />
          <div className="flex items-center gap-4 pt-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-12 flex flex-col lg:flex-row gap-12">
        <div className="lg:w-1/2 space-y-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <br/>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="lg:w-1/2">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
