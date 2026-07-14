"use client";

import React from "react";

// ---------------------------------------------------------------------------
// Button — Action trigger primitive
// ---------------------------------------------------------------------------

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
  title?: string;
  asChild?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  onClick,
  className = "",
  title,
  asChild = false,
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] border-transparent shadow-lg shadow-[rgba(255,77,77,0.16)] hover:shadow-[rgba(255,77,77,0.24)]",
    secondary:
      "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border-[var(--border-default)] hover:border-[var(--border-active)]",
    ghost:
      "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border-transparent",
    danger:
      "bg-[var(--status-deprecated)] text-white hover:opacity-90 border-transparent",
  };

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };

  const classes = `inline-flex items-center justify-center gap-2 rounded-lg border font-semibold uppercase tracking-wider transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${className}`;

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
      className: `${classes} ${(children.props as { className?: string }).className ?? ""}`.trim(),
    });
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={classes}
    >
      {children}
    </button>
  );
}
