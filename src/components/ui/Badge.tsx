"use client";

// ---------------------------------------------------------------------------
// Badge + StatusBadge — Visual label primitives
// ---------------------------------------------------------------------------

export type BadgeVariant = "default" | "accent" | "success" | "warning" | "error" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({ children, variant = "default", size = "sm", dot }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "border-[var(--border-default)] text-[var(--text-secondary)] bg-transparent",
    accent: "border-[var(--accent-border)] text-[var(--accent)] bg-[var(--accent-muted)]",
    success: "border-[var(--status-approved)]/30 text-[var(--status-approved)] bg-[var(--status-approved)]/10",
    warning: "border-[var(--status-review)]/30 text-[var(--status-review)] bg-[var(--status-review)]/10",
    error: "border-[var(--status-deprecated)]/30 text-[var(--status-deprecated)] bg-[var(--status-deprecated)]/10",
    muted: "border-[var(--border-subtle)] text-[var(--text-muted)] bg-transparent",
  };

  const sizes: Record<string, string> = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wider ${variants[variant]} ${sizes[size]}`}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor:
              variant === "success"
                ? "var(--status-approved)"
                : variant === "warning"
                ? "var(--status-review)"
                : variant === "error"
                ? "var(--status-deprecated)"
                : "var(--accent)",
          }}
        />
      )}
      {children}
    </span>
  );
}

// --- Status Badge ---

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  draft: { label: "Draft", variant: "muted" },
  in_review: { label: "In Review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  published: { label: "Published", variant: "accent" },
  deprecated: { label: "Deprecated", variant: "error" },
  archived: { label: "Archived", variant: "muted" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
