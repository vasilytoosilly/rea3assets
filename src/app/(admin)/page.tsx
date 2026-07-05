"use client";

import { StatCard, PageHeader } from "@/components/ui";
import { Puzzle, Package, Rocket, Clock } from "lucide-react";

// ---------------------------------------------------------------------------
// Dashboard — overview page with live data
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    assetTypes: number;
    totalAssets: number;
    published: number;
    inReview: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [typesRes, assetsRes, publishedRes, reviewRes] = await Promise.all([
          fetch("/api/asset-types"),
          fetch("/api/assets?limit=1"),
          fetch("/api/assets?status=published&limit=1"),
          fetch("/api/assets?status=in_review&limit=1"),
        ]);
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
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Asset management overview for your studio."
      />

      {/* Error banner */}
      {loadError && (
        <div
          className="rounded-md border p-3 text-sm"
          style={{
            borderColor: "var(--accent)",
            backgroundColor: "var(--accent-muted)",
            color: "var(--accent)",
          }}
        >
          Failed to load live stats: {loadError}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Asset Types"
          value={stats?.assetTypes ?? "—"}
          icon={<Puzzle size={20} />}
          description="Configured categories"
        />
        <StatCard
          label="Total Assets"
          value={stats?.totalAssets ?? "—"}
          icon={<Package size={20} />}
          description="Across all types"
        />
        <StatCard
          label="Published"
          value={stats?.published ?? "—"}
          icon={<Rocket size={20} />}
          description="Live on marketplace"
        />
        <StatCard
          label="In Review"
          value={stats?.inReview ?? "—"}
          icon={<Clock size={20} />}
          description="Awaiting approval"
        />
      </div>

      {/* Quick actions */}
      <div
        className="rounded-lg border border-dashed px-8 py-12 text-center"
        style={{
          borderColor: "var(--border-default)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {stats && stats.totalAssets > 0
            ? "Dashboard is live. Use the sidebar to manage your assets."
            : "Dashboard data will populate once assets and asset types are created."}
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Start by creating an{" "}
          <a
            href="/asset-types"
            className="underline"
            style={{ color: "var(--accent)" }}
          >
            Asset Type
          </a>{" "}
          to define your first asset category.
        </p>
      </div>
    </div>
  );
}
