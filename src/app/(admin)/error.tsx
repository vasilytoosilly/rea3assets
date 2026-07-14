"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

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
        className="max-w-md rounded-2xl border p-8 text-center"
        style={{
          borderColor: "var(--border-default)",
          backgroundColor: "var(--bg-surface)",
          boxShadow: "0 0 60px rgba(255,77,77,0.03), inset 0 1px 0 rgba(255,255,255,0.02)",
        }}
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}
        >
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--accent)" }}>
          Error
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
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
          <Button onClick={reset}>Try again</Button>
          <Button variant="secondary" asChild>
            <Link href="/">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
