"use client";

import { appsFeedsRoutersGetEventTransparency } from "@/generated";
import type { EventTransparencyResponse } from "@/generated";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TransparencyTooltipProps {
  eventSlug: string;
}

const STATUS_ICON: Record<string, string> = {
  positive: "✓",
  neutral: "–",
  warning: "⚠",
};

const STATUS_CLASS: Record<string, string> = {
  positive: "text-green-600",
  neutral: "text-gray-500",
  warning: "text-yellow-600",
};

export default function TransparencyTooltip({
  eventSlug,
}: TransparencyTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<EventTransparencyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Position of the popover, computed from the trigger button's rect
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleOpen = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    // Compute position before showing so the popover lands correctly
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverStyle({
        position: "fixed",
        // Sit just above the trigger button
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width: 288, // w-72
        zIndex: 9999,
      });
    }

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
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Reposition on scroll/resize so the popover doesn't drift
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPopoverStyle({
          position: "fixed",
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left,
          width: 288,
          zIndex: 9999,
        });
      }
    };
    window.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen]);

  const popover = isOpen ? (
    <div
      role="tooltip"
      style={popoverStyle}
      className="rounded-lg shadow-xl bg-white border border-gray-200 p-4 text-sm"
    >
      {isLoading && <p className="text-gray-400 text-center py-2">Loading…</p>}

      {!isLoading && data && (
        <>
          <h4 className="font-semibold text-gray-800 mb-1">
            Why is this trending?
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            Clarity is open source. Our ranking prioritises sustained,
            high-quality engagement over viral outrage.
          </p>

          {data.event_factors.length > 0 && (
            <>
              <h5 className="font-medium text-gray-700 mb-1">
                This event has:
              </h5>
              <ul className="space-y-1 mb-3">
                {data.event_factors.map((f) => (
                  <li
                    key={f.factor}
                    className={`flex items-center gap-1.5 ${STATUS_CLASS[f.status] ?? "text-gray-600"}`}
                  >
                    <span aria-hidden="true">
                      {STATUS_ICON[f.status] ?? "·"}
                    </span>
                    {f.label}
                  </li>
                ))}
              </ul>
            </>
          )}

          {data.viewer_factors.length > 0 && (
            <>
              <h5 className="font-medium text-gray-700 mb-1">
                Your engagement quality:
              </h5>
              <ul className="space-y-1 mb-3">
                {data.viewer_factors.map((f) => (
                  <li
                    key={f.factor}
                    className={`flex items-center gap-1.5 ${STATUS_CLASS[f.status] ?? "text-gray-600"}`}
                  >
                    <span aria-hidden="true">
                      {STATUS_ICON[f.status] ?? "·"}
                    </span>
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
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleOpen}
        aria-label="Why is this trending?"
        aria-expanded={isOpen}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
      >
        Why trending?
      </button>

      {/* Render the popover outside all overflow:hidden ancestors */}
      {typeof document !== "undefined" && popover
        ? createPortal(popover, document.body)
        : null}
    </>
  );
}
