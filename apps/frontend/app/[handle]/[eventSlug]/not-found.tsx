import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { buttonVariants } from '@/shared/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
        <FileQuestion className="w-10 h-10 text-zinc-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Event not found</h1>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-8">
        This event doesn't exist, has been removed, or you don't have permission to view it.
      </p>
      
      <div className="flex gap-4">
        <Link href="/" className={buttonVariants({ variant: 'default' })}>
          Go home
        </Link>
        <Link href="/search" className={buttonVariants({ variant: 'outline' })}>
          Search events
        </Link>
      </div>
    </div>
  );
}
