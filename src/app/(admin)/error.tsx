"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console -- error boundaries must log to console; server logger isn't available in client components
    console.error("Admin page render error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div
        className="max-w-md rounded-lg border p-8 text-center"
        style={{
          borderColor: "var(--border-default)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
          style={{ backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}
        >
          !
        </div>
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--accent)" }}>
          Error
        </p>
        <h2 className="mt-2 text-lg font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
          Something went wrong
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          An unexpected error occurred while loading this page.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
            Digest: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-[var(--border-default)] bg-transparent px-4 py-2 text-sm font-medium uppercase tracking-wider transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-primary)" }}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
