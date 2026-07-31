export default function ChannelLoading() {
  return (
    <div className="animate-pulse">
      <div className="bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 py-8 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0"></div>
            <div className="flex flex-col gap-2 flex-grow">
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-48"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full max-w-2xl mt-2"></div>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-20"></div>
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white dark:bg-zinc-950 rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800 h-64">
            <div className="h-32 bg-zinc-200 dark:bg-zinc-800"></div>
            <div className="p-4 flex flex-col gap-2">
              <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
