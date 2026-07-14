"use client";

import Link from "next/link";
import { StatCard, ErrorBanner, SkeletonCard } from "@/components/ui";
import { Puzzle, Package, Rocket, Clock, Plus, Settings2, Tag, ArrowRight } from "lucide-react";

import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    assetTypes: number;
    totalAssets: number;
    published: number;
    inReview: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [typesRes, assetsRes, publishedRes, reviewRes] = await Promise.all([
          fetch("/api/asset-types", { signal: controller.signal }),
          fetch("/api/assets?limit=1", { signal: controller.signal }),
          fetch("/api/assets?status=published&limit=1", { signal: controller.signal }),
          fetch("/api/assets?status=in_review&limit=1", { signal: controller.signal }),
        ]);

        if (typesRes.status >= 500 || assetsRes.status >= 500) {
          setLoadError("Database unavailable — ensure PostgreSQL is running and ASSET_DB_URL is configured in .env");
          return;
        }
        if (!typesRes.ok || !assetsRes.ok) throw new Error("Failed to load stats");
        const types = await typesRes.json();
        const assetsData = await assetsRes.json();
        const publishedData = await publishedRes.json();
        const reviewData = await reviewRes.json();
        setStats({
          assetTypes: types.length,
          totalAssets: assetsData.pagination.total,
          published: publishedData.pagination.total,
          inReview: reviewData.pagination.total,
        });
      } catch (err) {
        setLoadError(String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-10 sm:px-8 transition-all duration-700 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        style={{
          boxShadow: "0 0 60px rgba(255,77,77,0.03), inset 0 1px 0 rgba(255,255,255,0.02)",
        }}
      >
        {/* Glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 40% 60% at 70% 20%, rgba(255,77,77,0.04) 0%, transparent 70%)" }}
        />
        <div className="relative">
          <p className="eyebrow mb-2 text-[var(--accent)]">Asset Manager</p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Asset management overview for your studio.
          </p>
        </div>
      </div>

      {/* Error banner */}
      {loadError && (
        <ErrorBanner
          message={loadError}
          onDismiss={() => { setLoadError(null); }}
          onRetry={() => { setLoadError(null); setLoading(true); window.location.reload(); }}
        />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <StatCard label="Asset Types" value={stats?.assetTypes ?? "—"} icon={<Puzzle size={20} />} description="Configured categories" href="/asset-types" />
            <StatCard label="Total Assets" value={stats?.totalAssets ?? "—"} icon={<Package size={20} />} description="Across all types" href="/assets" />
            <StatCard label="Published" value={stats?.published ?? "—"} icon={<Rocket size={20} />} description="Live on marketplace" href="/marketplace" />
            <StatCard label="In Review" value={stats?.inReview ?? "—"} icon={<Clock size={20} />} description="Awaiting approval" href="/assets?status=in_review" />
          </>
        )}
      </div>

      {/* Accent divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
        <div className="h-1 w-1 rounded-full bg-[var(--accent)]/40" />
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickAction href="/assets/new" icon={<Plus size={20} />} label="New Asset" description="Upload a new asset to the library" />
        <QuickAction href="/asset-types" icon={<Puzzle size={20} />} label="Asset Types" description="Define custom schemas and fields" />
        <QuickAction href="/tags" icon={<Tag size={20} />} label="Tag Groups" description="Organize assets with tags" />
        <QuickAction href="/pipelines" icon={<Settings2 size={20} />} label="Pipelines" description="Automate asset processing" />
      </div>

      {/* Getting started guide */}
      {!loading && stats && stats.totalAssets === 0 && (
        <div
          className="relative overflow-hidden rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-14 text-center"
        >
          <div className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 40% 50% at 50% 50%, rgba(255,77,77,0.03) 0%, transparent 70%)" }} />
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <Rocket className="h-7 w-7" style={{ color: "var(--accent)" }} />
          </div>
          <p className="relative text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            Get Started
          </p>
          <p className="relative mt-1.5 text-sm text-[var(--text-muted)]">
            Start by creating an{" "}
            <Link href="/asset-types" className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline">
              Asset Type
            </Link>{" "}
            to define your first asset category, then add assets of that type.
          </p>
        </div>
      )}
    </div>
  );
}

function QuickAction({ href, icon, label, description }: { href: string; icon: React.ReactNode; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 transition-all duration-200 hover:border-[var(--border-active)] hover:bg-[var(--bg-elevated)] hover:shadow-[0_0_24px_rgba(255,77,77,0.04)]"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)] transition-transform duration-200 group-hover:scale-110" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="truncate text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      <ArrowRight size={16} className="text-[var(--text-muted)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]" aria-hidden="true" />
    </Link>
  );
}
