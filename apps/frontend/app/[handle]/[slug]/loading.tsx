export default function EventLoading() {
  return (
    <div className="animate-pulse bg-gray-50 dark:bg-zinc-950 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-64 mb-6 mx-auto"></div>
        <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded w-full max-w-3xl mb-4 mx-auto"></div>
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-48 mb-12 mx-auto"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-12">
          {/* Narrative placeholder */}
          <div className="space-y-4">
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6"></div>
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-4/5"></div>
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mt-8"></div>
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
          </div>
          
          {/* Evidence placeholder */}
          <div className="space-y-6">
            <div className="bg-zinc-200 dark:bg-zinc-800 rounded-xl aspect-video w-full"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-200 dark:bg-zinc-800 rounded-xl aspect-video w-full"></div>
              <div className="bg-zinc-200 dark:bg-zinc-800 rounded-xl aspect-video w-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
