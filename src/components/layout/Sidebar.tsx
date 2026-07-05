"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import {
  LayoutDashboard,
  Puzzle,
  Package,
  Tag,
  Settings2,
  Settings,
  LogOut,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Sidebar navigation — dark theme, matches rea3.studio aesthetic
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard size={18} /> },
  { label: "Asset Types", href: "/asset-types", icon: <Puzzle size={18} /> },
  { label: "Assets", href: "/assets", icon: <Package size={18} /> },
  { label: "Tags", href: "/tags", icon: <Tag size={18} /> },
  { label: "Pipelines", href: "/pipelines", icon: <Settings2 size={18} /> },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings size={18} />,
    children: [
      { label: "General", href: "/settings", icon: <Settings size={18} /> },
      { label: "ERP Integration", href: "/settings/erp", icon: <Settings size={18} /> },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  /** Check if a nav item is active based on current pathname */
  const isActive = useCallback(
    (item: NavItem): boolean => {
      if (item.href === "/") {
        return pathname === "/";
      }
      return pathname.startsWith(item.href);
    },
    [pathname],
  );

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onToggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onToggle]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col transition-all duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-auto`}
        style={{ backgroundColor: "var(--bg-surface)", borderRight: "1px solid var(--border-default)" }}
        aria-label="Main navigation"
      >
        {/* Logo / Brand */}
        <div className="flex h-14 items-center border-b px-4" style={{ borderColor: "var(--border-default)" }}>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight" style={{ color: "var(--accent)" }}>
              REA3
            </span>
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Assets
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                isActive={isActive(item)}
                pathname={pathname}
              />
            ))}
          </ul>
        </nav>

        {/* Footer — version indicator + logout */}
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--border-default)" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="font-medium" style={{ color: "var(--text-secondary)" }}>v0.2.0</span>
              {" · "}Schema-driven CMS
            </p>
            <button
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                  router.push("/login");
                  router.refresh();
                } catch {
                  setLoggingOut(false);
                }
              }}
              disabled={loggingOut}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
            >
              {loggingOut ? "..." : <span className="flex items-center gap-1"><LogOut size={12} />Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Individual sidebar item (with optional children)
// ---------------------------------------------------------------------------

interface SidebarItemProps {
  item: NavItem;
  isActive: boolean;
  pathname: string;
}

function SidebarItem({ item, isActive, pathname }: SidebarItemProps) {
  const [isExpanded, setIsExpanded] = useState(isActive);
  const hasChildren = item.children && item.children.length > 0;

  // Auto-expand if a child is active
  useEffect(() => {
    if (item.children?.some((child) => pathname.startsWith(child.href))) {
      setIsExpanded(true);
    }
  }, [item.children, pathname]);

  if (!hasChildren) {
    // Simple link
    return (
      <li>
        <Link
          href={item.href}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? "text-white"
              : "hover:text-white"
          }`}
          style={{
            backgroundColor: isActive ? "var(--bg-elevated)" : "transparent",
            color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            if (!isActive) e.currentTarget.style.backgroundColor = "var(--bg-hover)";
          }}
          onMouseLeave={(e) => {
            if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <span className="text-base" aria-hidden="true">{item.icon}</span>
          {item.label}
        </Link>
      </li>
    );
  }

  // Section with children
  return (
    <li>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? "text-white" : "hover:text-white"
        }`}
        style={{
          backgroundColor: isActive ? "var(--bg-elevated)" : "transparent",
          color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
        }}
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-3">
          <span className="text-base" aria-hidden="true">{item.icon}</span>
          {item.label}
        </span>
        <span
          className={`text-[var(--text-muted)] transition-transform duration-200 ${
            isExpanded ? "rotate-90" : ""
          }`}
          aria-hidden="true"
        >
          ▸
        </span>
      </button>

      {isExpanded && item.children && item.children.length > 0 && (
        <ul className="mt-1 ml-3 space-y-0.5 border-l pl-3" style={{ borderColor: "var(--border-default)" }}>
          {item.children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                  pathname === child.href || pathname.startsWith(child.href)
                    ? "text-white"
                    : "hover:text-white"
                }`}
                style={{
                  backgroundColor:
                    pathname === child.href || pathname.startsWith(child.href)
                      ? "var(--bg-elevated)"
                      : "transparent",
                  color:
                    pathname === child.href || pathname.startsWith(child.href)
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                }}
                onMouseEnter={(e) => {
                  if (!(pathname === child.href || pathname.startsWith(child.href)))
                    e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!(pathname === child.href || pathname.startsWith(child.href)))
                    e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
