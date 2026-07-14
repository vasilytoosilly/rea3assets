"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Global error boundary for rea3assets.
 *
 * Catches errors thrown in the root layout or template.
 * Required by Next.js for production error handling — without it,
 * root-level errors show the default Next.js error overlay.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Global render error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        className="min-h-screen antialiased"
        style={{
          backgroundColor: "var(--bg-base)",
          color: "var(--text-primary)",
        }}
      >
        <div className="flex min-h-screen items-center justify-center p-8">
          <div
            className="max-w-md rounded-2xl border p-8 text-center"
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-surface)",
              boxShadow: "0 0 60px rgba(255,77,77,0.03), inset 0 1px 0 rgba(255,255,255,0.02)",
            }}
          >
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                backgroundColor: "var(--accent-muted)",
                color: "var(--accent)",
              }}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--accent)" }}
            >
              Critical Error
            </p>
            <h2
              className="mt-2 text-lg font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Something went wrong
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              A critical error occurred. Please try again.
            </p>
            {error.digest && (
              <p className="mt-3 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                Digest: {error.digest}
              </p>
            )}
            <div className="mt-6">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
