"use client";

import Link from "next/link";

// ---------------------------------------------------------------------------
// Shared UI primitives — ReA3 Asset Manager dark theme
// ---------------------------------------------------------------------------

// --- Badge ---

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "accent" | "success" | "warning" | "error" | "muted";
  size?: "sm" | "md";
}

export function Badge({ children, variant = "default", size = "sm" }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "border-[var(--border-default)] text-[var(--text-secondary)]",
    accent: "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]",
    success: "border-[#22c55e] text-[#22c55e] bg-[rgba(34,197,94,0.15)]",
    warning: "border-[#f59e0b] text-[#f59e0b] bg-[rgba(245,158,11,0.15)]",
    error: "border-[#ef4444] text-[#ef4444] bg-[rgba(239,68,68,0.15)]",
    muted: "border-[var(--border-subtle)] text-[var(--text-muted)]",
  };

  const sizes: Record<string, string> = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium uppercase tracking-wider ${variants[variant]} ${sizes[size]}`}
    >
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

// --- Card ---

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  href?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", hover = false, href, onClick }: CardProps) {
  const base = `rounded-lg border bg-[var(--bg-surface)] ${hover ? "transition-colors hover:border-[var(--border-active)] hover:bg-[var(--bg-elevated)]" : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={`block ${base}`}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={`block w-full text-left ${base}`}>
        {children}
      </button>
    );
  }

  return <div className={base}>{children}</div>;
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`border-b border-[var(--border-default)] px-5 py-4 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

// --- Button ---

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  onClick,
  className = "",
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border-transparent",
    secondary:
      "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border-[var(--border-default)]",
    ghost:
      "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border-transparent",
    danger:
      "bg-[#ef4444] text-white hover:bg-[#dc2626] border-transparent",
  };

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md border font-medium uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

// --- Input ---

interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  className?: string;
  helpText?: string;
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  className = "",
  helpText,
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="block w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
      />
      {helpText && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{helpText}</p>
      )}
    </div>
  );
}

// --- EmptyState ---

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "📦", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-16 text-center">
      <span className="mb-4 text-4xl" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// --- PageHeader ---

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wider text-[var(--text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// --- StatCard ---

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

export function StatCard({ label, value, icon, description }: StatCardProps) {
  return (
    <Card className="border-[var(--border-default)]">
      <CardBody>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            {label}
          </h3>
          <span className="text-[var(--text-muted)]" aria-hidden="true">
            {icon}
          </span>
        </div>
        <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
          {value}
        </p>
        {description && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
        )}
      </CardBody>
    </Card>
  );
}
