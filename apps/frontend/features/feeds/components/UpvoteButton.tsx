"use client";

import {
  appsFeedsRoutersCreateInteraction,
  appsFeedsRoutersRemoveInteraction,
} from "@/generated";
import { useState } from "react";

interface UpvoteButtonProps {
  eventSlug: string;
  initialCount: number;
  initiallyUpvoted: boolean;
}

export default function UpvoteButton({
  eventSlug,
  initialCount,
  initiallyUpvoted,
}: UpvoteButtonProps) {
  const [isUpvoted, setIsUpvoted] = useState(initiallyUpvoted);
  const [count, setCount] = useState(initialCount);
  const [isPending, setIsPending] = useState(false);

  const handleToggle = async () => {
    if (isPending) return;
    setIsPending(true);

    const wasUpvoted = isUpvoted;
    // Optimistic update
    setIsUpvoted(!wasUpvoted);
    setCount((c) => (wasUpvoted ? c - 1 : c + 1));

    try {
      if (wasUpvoted) {
        await appsFeedsRoutersRemoveInteraction({
          path: { slug: eventSlug },
          body: { type: "upvote" },
        });
      } else {
        await appsFeedsRoutersCreateInteraction({
          path: { slug: eventSlug },
          body: { type: "upvote" },
        });
      }
    } catch {
      // Revert on error
      setIsUpvoted(wasUpvoted);
      setCount((c) => (wasUpvoted ? c + 1 : c - 1));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      aria-label={isUpvoted ? "Remove upvote" : "Upvote this event"}
      aria-pressed={isUpvoted}
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors",
        "border border-current",
        isUpvoted
          ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
          : "text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600",
        isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span aria-hidden="true">▲</span>
      <span>{count}</span>
    </button>
  );
}
