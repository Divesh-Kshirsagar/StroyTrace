import { Card } from '@/shared/components/ui/card';

export default function SkeletonCard() {
  return (
    <Card className="overflow-hidden flex flex-col h-full animate-pulse border-none shadow-sm">
      <div className="aspect-[16/9] bg-zinc-200 dark:bg-zinc-800 w-full" />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24" />
        </div>
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-4/5" />
        <div className="mt-auto pt-4 flex gap-2">
          <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-16" />
          <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-16" />
        </div>
      </div>
    </Card>
  );
}
