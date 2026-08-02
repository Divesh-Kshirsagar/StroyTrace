'use client';

import { useState, useRef, useEffect } from 'react';
import { appsFeedsRoutersGetEventTransparency } from '@/generated';
import type { EventTransparencyResponse } from '@/generated';

interface TransparencyTooltipProps {
  eventSlug: string;
}

const STATUS_ICON: Record<string, string> = {
  positive: '✓',
  neutral: '–',
  warning: '⚠',
};

const STATUS_CLASS: Record<string, string> = {
  positive: 'text-green-600',
  neutral: 'text-gray-500',
  warning: 'text-yellow-600',
};

export default function TransparencyTooltip({ eventSlug }: TransparencyTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<EventTransparencyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleOpen = async () => {
    setIsOpen(true);
    if (data) return; // already fetched
    setIsLoading(true);
    try {
      const result = await appsFeedsRoutersGetEventTransparency({
        path: { slug: eventSlug },
      });
      setData(result.data ?? null);
    } catch {
      // Silently fail — tooltip is non-critical
    } finally {
      setIsLoading(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={handleOpen}
        aria-label="Why is this trending?"
        aria-expanded={isOpen}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
      >
        Why trending?
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={[
            'absolute z-50 bottom-full left-0 mb-2 w-72 rounded-lg shadow-lg',
            'bg-white border border-gray-200 p-4 text-sm',
          ].join(' ')}
        >
          {isLoading && (
            <p className="text-gray-400 text-center py-2">Loading…</p>
          )}

          {!isLoading && data && (
            <>
              <h4 className="font-semibold text-gray-800 mb-1">Why is this trending?</h4>
              <p className="text-xs text-gray-500 mb-3">
                Clarity is open source. Our ranking prioritises sustained,
                high-quality engagement over viral outrage.
              </p>

              {data.event_factors.length > 0 && (
                <>
                  <h5 className="font-medium text-gray-700 mb-1">This event has:</h5>
                  <ul className="space-y-1 mb-3">
                    {data.event_factors.map((f) => (
                      <li key={f.factor} className={`flex items-center gap-1.5 ${STATUS_CLASS[f.status] ?? 'text-gray-600'}`}>
                        <span aria-hidden="true">{STATUS_ICON[f.status] ?? '·'}</span>
                        {f.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {data.viewer_factors.length > 0 && (
                <>
                  <h5 className="font-medium text-gray-700 mb-1">Your engagement quality:</h5>
                  <ul className="space-y-1 mb-3">
                    {data.viewer_factors.map((f) => (
                      <li key={f.factor} className={`flex items-center gap-1.5 ${STATUS_CLASS[f.status] ?? 'text-gray-600'}`}>
                        <span aria-hidden="true">{STATUS_ICON[f.status] ?? '·'}</span>
                        {f.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <a
                href="https://github.com/your-org/clarity#ranking"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View the ranking logic on GitHub →
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
