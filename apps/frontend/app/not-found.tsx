import { buttonVariants } from "@/shared/components/ui/button";
import { Search } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
        <Search className="w-10 h-10 text-zinc-400" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Page not found</h1>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-8 text-lg">
        The page you're looking for doesn't exist or has been moved.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm mx-auto">
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          Go to home page
        </Link>
        <Link href="/topics" className={buttonVariants({ variant: "outline" })}>
          Browse topics
        </Link>
      </div>
    </div>
  );
}
