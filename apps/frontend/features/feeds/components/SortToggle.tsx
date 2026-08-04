"use client";

import Link from "next/link";

interface SortToggleProps {
  currentSort: string;
}

export default function SortToggle({ currentSort }: SortToggleProps) {
  return (
    <nav
      aria-label="Feed sort order"
      className="inline-flex rounded-lg border border-gray-200 overflow-hidden"
    >
      <Link
        href="/?sort=trending"
        aria-current={currentSort === "trending" ? "page" : undefined}
        className={[
          "px-4 py-2 text-sm font-medium transition-colors",
          currentSort === "trending"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50",
        ].join(" ")}
      >
        🔥 Trending
      </Link>
      <Link
        href="/?sort=latest"
        aria-current={currentSort === "latest" ? "page" : undefined}
        className={[
          "px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200",
          currentSort === "latest"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50",
        ].join(" ")}
      >
        🕐 Latest
      </Link>
    </nav>
  );
}
