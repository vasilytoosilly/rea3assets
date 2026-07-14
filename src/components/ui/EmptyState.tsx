"use client";

// ---------------------------------------------------------------------------
// EmptyState — Centered placeholder with icon, message, and optional action
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-16 text-center">
      {/* Subtle glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 40% 50% at 50% 50%, rgba(255,77,77,0.03) 0%, transparent 70%)",
        }}
      />
      {icon && (
        <span className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--accent)]" aria-hidden="true">
          {icon}
        </span>
      )}
      <h3 className="relative text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="relative mt-1.5 max-w-sm text-sm text-[var(--text-muted)]">
        {description}
      </p>
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}
