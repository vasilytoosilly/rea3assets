"use client";

import Link from "next/link";

// ---------------------------------------------------------------------------
// Card, CardHeader, CardBody — Container primitives
// ---------------------------------------------------------------------------

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  href?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", hover = false, href, onClick }: CardProps) {
  const base = `rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] ${
    hover
      ? "transition-all duration-200 hover:border-[var(--border-active)] hover:bg-[var(--bg-elevated)] hover:shadow-[0_0_24px_rgba(255,77,77,0.04)]"
      : ""
  } ${className}`;

  if (href) {
    return (
      <Link href={href} className={`block ${base}`}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={`block w-full text-left ${base} transition-all duration-200 active:scale-[0.99]`}>
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
