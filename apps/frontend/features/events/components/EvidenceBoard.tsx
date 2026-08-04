"use client";
/**
 * EvidenceBoard — public-facing read-only evidence grid.
 *
 * Task 8 changes:
 * - R6.1: Cards with upload_status='processing' render a spinner, no <img> or <a>
 * - R6.2: Cards with upload_status='failed' render an error state with a remove button
 *         (remove button only shown when an onRemove handler is provided — edit mode only)
 * - R6.4: Evidence not in {processed, url_based} is NOT visible on public pages
 *         (this component enforces that when rendered in public view by filtering)
 * - R6.3: Polling effect refetches evidence every 3 s while any card is 'processing',
 *         stopping when all reach a terminal state (processed | failed | url_based)
 */

import type { EvidenceSchema } from "@/generated";
import { Card } from "@/shared/components/ui/card";
import { useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 3000;

interface EvidenceBoardProps {
  evidence: EvidenceSchema[];
  /** Public view: hide non-terminal, non-url_based items. Editor view passes false. */
  publicView?: boolean;
  /** Called when polling triggers a refetch. Provide in editor context only. */
  onRefetch?: () => void;
  /** Called when user clicks Remove on a failed card. Editor context only. */
  onRemove?: (id: string) => void;
}

export default function EvidenceBoard({
  evidence,
  publicView = true,
  onRefetch,
  onRemove,
}: EvidenceBoardProps) {
  // ------------------------------------------------------------------
  // Task 8.3 — Polling: refetch every 3 s while any card is processing
  // ------------------------------------------------------------------
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const hasProcessing = evidence.some(
      (e) => e.upload_status === "processing",
    );

    if (hasProcessing && onRefetch) {
      // Start polling if not already running
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          onRefetch();
        }, POLL_INTERVAL_MS);
      }
    } else {
      // All items are in terminal state — stop polling
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [evidence, onRefetch]);

  // ------------------------------------------------------------------
  // R6.4: Public view — filter to only show url_based or processed
  // ------------------------------------------------------------------
  const visibleEvidence = publicView
    ? evidence.filter(
        (e) =>
          e.upload_status === "url_based" || e.upload_status === "processed",
      )
    : evidence;

  if (!visibleEvidence || visibleEvidence.length === 0) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-8 text-center text-zinc-500 border border-zinc-200 dark:border-zinc-800">
        <p>No evidence has been attached to this investigation yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {visibleEvidence.map((item) => {
        const status = item.upload_status ?? "url_based";

        // ------------------------------------------------------------------
        // R6.1: Processing state — spinner, no broken img/link
        // ------------------------------------------------------------------
        if (status === "processing") {
          return (
            <Card
              key={item.id}
              data-testid="evidence-card-processing"
              className="overflow-hidden bg-zinc-50 dark:bg-zinc-900 shadow-sm border-none"
            >
              <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 w-full flex flex-col items-center justify-center gap-3">
                {/* Spinner */}
                <div
                  role="status"
                  aria-label="Processing upload"
                  className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"
                />
                <span className="text-xs text-zinc-500">Processing…</span>
              </div>
              {item.caption && (
                <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm line-clamp-2 text-zinc-500">
                    {item.caption}
                  </p>
                </div>
              )}
            </Card>
          );
        }

        // ------------------------------------------------------------------
        // R6.2: Failed state — error card with optional remove button
        // ------------------------------------------------------------------
        if (status === "failed") {
          return (
            <Card
              key={item.id}
              data-testid="evidence-card-failed"
              className="overflow-hidden bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 shadow-sm"
            >
              <div className="aspect-video flex flex-col items-center justify-center gap-3 p-4">
                <span
                  role="img"
                  aria-label="Upload failed"
                  className="text-3xl"
                >
                  ⚠️
                </span>
                <p className="text-xs text-red-600 dark:text-red-400 text-center">
                  Upload failed
                </p>
                {onRemove && (
                  <button
                    id={`remove-failed-evidence-${item.id}`}
                    aria-label="Remove failed evidence"
                    onClick={() => onRemove(item.id)}
                    className="mt-1 text-xs bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 px-3 py-1 rounded-full transition-colors font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            </Card>
          );
        }

        // ------------------------------------------------------------------
        // Processed or URL-based — full media preview
        // ------------------------------------------------------------------
        return (
          <Card
            key={item.id}
            data-testid="evidence-card-ready"
            className="overflow-hidden bg-zinc-50 dark:bg-zinc-900 shadow-sm border-none"
          >
            <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 w-full relative group">
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={item.caption || "Evidence"}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-zinc-500 uppercase text-xs font-bold tracking-wider">
                  {item.media_type}
                </div>
              )}

              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100"
              >
                <span className="bg-white/90 text-black px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm shadow-lg">
                  View Source
                </span>
              </a>
            </div>

            {(item.caption || item.source_url) && (
              <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
                <p
                  className="text-sm line-clamp-2 text-zinc-700 dark:text-zinc-300"
                  title={item.caption || item.source_url}
                >
                  {item.caption || item.source_url}
                </p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
