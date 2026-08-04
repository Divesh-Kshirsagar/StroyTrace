import { buttonVariants } from "@/shared/components/ui/button";
import { UserX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
        <UserX className="w-10 h-10 text-zinc-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Channel not found
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-8">
        This creator doesn't exist or their channel has been removed.
      </p>

      <div className="flex gap-4">
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          Go home
        </Link>
        <Link href="/search" className={buttonVariants({ variant: "outline" })}>
          Discover creators
        </Link>
      </div>
    </div>
  );
}
