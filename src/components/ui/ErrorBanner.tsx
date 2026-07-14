"use client";

import { X, AlertCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// ErrorBanner — Inline error display with optional retry/dismiss
// ---------------------------------------------------------------------------

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-[var(--status-deprecated)]/30 bg-[var(--status-deprecated)]/10 p-3 text-sm"
      style={{ color: "var(--status-deprecated)" }}
      role="alert"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 text-xs font-semibold uppercase tracking-wider underline hover:no-underline"
        >
          Retry
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
          aria-label="Dismiss error"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
