import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Global 404 page for rea3assets.
 *
 * Rendered within the root layout when a route doesn't match any page or
 * API handler. Matches the dark admin design system (DESIGN.md).
 *
 * Note: the root layout provides <html> and <body> — this component only
 * renders content inside the body.
 */
export default function NotFound() {
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
          <FileQuestion className="h-6 w-6" />
        </div>
        <p
          className="text-6xl font-black tracking-tighter"
          style={{ color: "var(--text-muted)" }}
        >
          404
        </p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--accent)" }}>
          Page Not Found
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          This page doesn&apos;t exist
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          The page you&apos;re looking for may have been moved, deleted, or
          never existed.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
