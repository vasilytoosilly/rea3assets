"use client";

import { useEffect } from "react";

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
            className="max-w-md rounded-lg border p-8 text-center"
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
              style={{
                backgroundColor: "var(--accent-muted)",
                color: "var(--accent)",
              }}
            >
              !
            </div>
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--accent)" }}
            >
              Error
            </p>
            <h2 className="mt-2 text-lg font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
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
                className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-[var(--accent-hover)]"
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
