import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col h-full border-none shadow-sm bg-zinc-50 dark:bg-zinc-900">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="p-4 flex flex-col flex-grow gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>

        <Skeleton className="h-6 w-full mt-1" />
        <Skeleton className="h-6 w-3/4" />

        <div className="space-y-2 mt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </div>
    </Card>
  );
}
