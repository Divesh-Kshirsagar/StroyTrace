'use client';

import { useEffect, useState } from 'react';
import { appsFeedsRoutersGetEventTransparency } from '@/generated';
import type { EventTransparencyResponse } from '@/generated';

interface TrendingBreakdownProps {
  eventSlug: string;
}

const STATUS_ICON: Record<string, string> = {
  positive: '✓',
  neutral: '–',
  warning: '⚠',
};

const STATUS_CLASS: Record<string, string> = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  neutral: 'text-zinc-500',
  warning: 'text-amber-600 dark:text-amber-400',
};

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-2 min-w-[60px]">
      <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{value}</span>
      <span className="text-[11px] text-zinc-500 mt-0.5">{label}</span>
    </div>
  );
}

export default function TrendingBreakdown({ eventSlug }: TrendingBreakdownProps) {
  const [data, setData] = useState<EventTransparencyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    appsFeedsRoutersGetEventTransparency({ path: { slug: eventSlug } })
      .then(r => setData(r.data ?? null))
      .catch(() => {/* non-critical */})
      .finally(() => setIsLoading(false));
  }, [eventSlug]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <section aria-labelledby="trending-breakdown-title" className="space-y-5">
      {/* Engagement counts */}
      <div className="flex gap-2 flex-wrap">
        <StatPill label="upvotes" value={data.upvote_count} />
        <StatPill label="comments" value={data.comment_count} />
        <StatPill label="shares" value={data.share_count} />
      </div>

      {/* Event-level factors */}
      {data.event_factors.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
            Why it&apos;s trending
          </h3>
          <ul className="space-y-1.5">
            {data.event_factors.map(f => (
              <li
                key={f.factor}
                className={`flex items-start gap-2 text-sm ${STATUS_CLASS[f.status] ?? 'text-zinc-600'}`}
              >
                <span className="mt-0.5 font-bold shrink-0" aria-hidden="true">
                  {STATUS_ICON[f.status] ?? '·'}
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Viewer-specific factors (only shown when authenticated) */}
      {data.viewer_factors.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
            Your engagement quality
          </h3>
          <ul className="space-y-1.5">
            {data.viewer_factors.map(f => (
              <li
                key={f.factor}
                className={`flex items-start gap-2 text-sm ${STATUS_CLASS[f.status] ?? 'text-zinc-600'}`}
              >
                <span className="mt-0.5 font-bold shrink-0" aria-hidden="true">
                  {STATUS_ICON[f.status] ?? '·'}
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <a
        href="https://github.com/your-org/clarity#ranking"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-xs text-blue-500 hover:underline"
      >
        How ranking works →
      </a>
    </section>
  );
}
