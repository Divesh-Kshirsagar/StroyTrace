"use client";
import Link from "next/link";

interface CreatorBadgeProps {
  creator: { handle: string; display_name: string; avatar_url?: string | null };
  className?: string;
}

export default function CreatorBadge({
  creator,
  className = "",
}: CreatorBadgeProps) {
  return (
    <Link
      href={`/@${creator.handle}`}
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${className}`}
    >
      <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
        {creator.avatar_url ? (
          <img
            src={creator.avatar_url}
            alt={creator.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-medium text-zinc-500">
            {creator.display_name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <span className="text-sm font-medium truncate">
        {creator.display_name}
      </span>
    </Link>
  );
}
