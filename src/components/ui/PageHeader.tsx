"use client";

// ---------------------------------------------------------------------------
// PageHeader — Title + subtitle + optional action slot
// ---------------------------------------------------------------------------

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  eyebrow?: string;
  icon?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action, eyebrow, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)]">
            {icon}
          </span>
        )}
        <div>
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
