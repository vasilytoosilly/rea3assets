import Link from "next/link";

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
        className="max-w-md rounded-lg border p-8 text-center"
        style={{
          borderColor: "var(--border-default)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <p
          className="text-6xl font-bold"
          style={{ color: "var(--text-muted)" }}
        >
          404
        </p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--accent)" }}>
          Page Not Found
        </p>
        <h2 className="mt-2 text-lg font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
          This page doesn&apos;t exist
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          The page you&apos;re looking for may have been moved, deleted, or
          never existed.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
