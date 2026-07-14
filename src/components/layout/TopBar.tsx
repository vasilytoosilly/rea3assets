"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Top bar — dark theme, search + branding
// ---------------------------------------------------------------------------

interface TopBarProps {
  onSidebarToggle: () => void;
}

export function TopBar({ onSidebarToggle }: TopBarProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();

  // Global "/" key to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && searchValue.trim()) {
        router.push(`/assets?search=${encodeURIComponent(searchValue.trim())}`);
      }
    },
    [searchValue, router],
  );

  const pathname = usePathname();

  // Build breadcrumb from pathname — skip segments that look like IDs
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((seg, i, arr) => {
    const looksLikeId = /^[a-f0-9-]{20,}$/i.test(seg) || /^[a-zA-Z0-9]{15,}$/.test(seg);
    if (looksLikeId && i > 0) return null;
    return {
      label: seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      href: "/" + arr.slice(0, i + 1).join("/"),
      isLast: i === arr.length - 1,
    };
  }).filter(Boolean) as Array<{ label: string; href: string; isLast: boolean }>;

  return (
    <header
      className="sticky top-0 z-20 flex h-14 items-center border-b px-4 backdrop-blur-sm"
      style={{
        backgroundColor: "rgba(15,15,15,0.85)",
        borderColor: "var(--border-default)",
      }}
    >
      {/* Left: hamburger toggle */}
      <button
        onClick={onSidebarToggle}
        className="mr-4 rounded-lg p-1.5 transition-colors lg:hidden"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb (hidden on mobile, shown on lg+) */}
      <nav className="mr-4 hidden items-center gap-1.5 text-xs lg:flex" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[var(--text-muted)]">/</span>}
            {crumb.isLast ? (
              <span className="font-medium text-[var(--text-primary)]">{crumb.label}</span>
            ) : (
              <a
                href={crumb.href}
                className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                {crumb.label}
              </a>
            )}
          </span>
        ))}
      </nav>

      {/* Center: search */}
      <div className="flex flex-1 items-center">
        <div className="relative w-full max-w-xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search size={16} style={{ color: "var(--text-muted)" }} />
          </div>
          <input
            ref={searchRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search assets, types, tags... (press / to focus)"
            className="block w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] py-2 pl-10 text-sm text-[var(--text-primary)] transition-all duration-150 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            style={{
              paddingRight: searchValue ? "2.5rem" : "1rem",
            }}
            aria-label="Global search"
          />
          {/* Clear button */}
          {searchValue && (
            <button
              onClick={() => {
                setSearchValue("");
                searchRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
          {/* Keyboard shortcut hint */}
          {!searchValue && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <kbd
                className="hidden rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs font-medium sm:inline-block"
                style={{ color: "var(--text-muted)" }}
              >
                /
              </kbd>
            </div>
          )}
        </div>
      </div>

      {/* Right: environment badge */}
      <div className="ml-4 flex items-center gap-3">
        <span
          className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            color: "var(--accent)",
          }}
        >
          {process.env.NODE_ENV === "production" ? "PROD" : "DEV"}
        </span>
      </div>
    </header>
  );
}
