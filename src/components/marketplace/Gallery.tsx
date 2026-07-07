"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";

// ---------------------------------------------------------------------------
// Gallery — image gallery for the asset detail page
// ---------------------------------------------------------------------------

interface Thumbnail {
  id: string;
  url: string;
  purpose: string;
  width: number | null;
  height: number | null;
  format: string;
}

export function Gallery({ thumbnails }: { thumbnails: Thumbnail[] }) {
  const sorted = [...thumbnails].sort(
    (a, b) => (a.purpose === "cover" ? -1 : b.purpose === "cover" ? 1 : 0)
  );

  const [selectedIdx, setSelectedIdx] = useState(0);

  const goPrev = useCallback(() => {
    setSelectedIdx((prev) => {
      if (sorted.length === 0) return prev;
      return ((prev - 1) % sorted.length + sorted.length) % sorted.length;
    });
  }, [sorted.length]);

  const goNext = useCallback(() => {
    setSelectedIdx((prev) => {
      if (sorted.length === 0) return prev;
      return ((prev + 1) % sorted.length + sorted.length) % sorted.length;
    });
  }, [sorted.length]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext]);

  if (sorted.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <div className="text-center">
          <Package className="mx-auto mb-2 h-10 w-10 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">No images available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative overflow-hidden rounded-lg bg-[var(--bg-elevated)]">
        <div className="flex aspect-video items-center justify-center">
          {sorted[selectedIdx] && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={sorted[selectedIdx].url}
              alt={`Image ${selectedIdx + 1}`}
              className="h-full w-full object-contain"
            />
          )}
        </div>

        {/* Navigation arrows */}
        {sorted.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Counter */}
        {sorted.length > 1 && (
          <div className="absolute bottom-2 right-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
            {selectedIdx + 1} / {sorted.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((thumb, idx) => (
            <button
              key={thumb.id}
              onClick={() => setSelectedIdx(idx)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                idx === selectedIdx
                  ? "border-[var(--accent)]"
                  : "border-[var(--border-default)] hover:border-[var(--border-active)]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb.url}
                alt={`Thumbnail ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
