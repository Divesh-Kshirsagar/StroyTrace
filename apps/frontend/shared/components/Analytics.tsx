"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    // In the future, send 'url' to Plausible, PostHog, or Google Analytics here
  }, [pathname, searchParams]);

  return null;
}
