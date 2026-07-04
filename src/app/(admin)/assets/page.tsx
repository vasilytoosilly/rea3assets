"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Button,
  Badge,
  Input,
  StatusBadge,
  EmptyState,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Assets list page — browse, filter, search across all assets
// ---------------------------------------------------------------------------

interface AssetTypeSummary {
  slug: string;
  name: string;
  icon: string | null;
}

interface AssetVersionSummary {
  id: string;
  version: string;
  status: string;
}

interface AssetSummary {
  id: string;
  asset_type_id: string;
  slug: string;
  name: string;
  description: string | null;
  division: string;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  asset_type: AssetTypeSummary;
  versions: AssetVersionSummary[];
  _count: { versions: number; thumbnails: number };
}

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const qs = params.toString();
      const res = await fetch(`/api/assets${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        subtitle="Browse and manage all game-development assets across every type."
        action={
          <Button onClick={() => router.push("/assets/new")}>
            + New Asset
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search assets..."
          value={search}
          onChange={setSearch}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--bg-elevated)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
          <option value="deprecated">Deprecated</option>
          <option value="archived">Archived</option>
        </select>
        <Badge variant="muted">{assets.length} assets</Badge>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-lg border border-dashed px-8 py-16 text-center"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading assets...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-8 py-16"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
          <p className="text-sm" style={{ color: "var(--accent)" }}>Failed to load</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchAssets}>Retry</Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && assets.length === 0 && (
        <EmptyState
          icon="📦"
          title={statusFilter || search ? "No matching assets" : "No assets yet"}
          description={
            statusFilter || search
              ? "Try different filters or search terms."
              : "Create asset types first, then add assets of each type."
          }
        />
      )}

      {/* Asset table */}
      {!loading && !error && assets.length > 0 && (
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)" }}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: "var(--bg-surface)" }}>
              <tr className="border-b" style={{ borderColor: "var(--border-default)" }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Asset</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider md:table-cell" style={{ color: "var(--text-muted)" }}>Type</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider sm:table-cell" style={{ color: "var(--text-muted)" }}>Status</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider lg:table-cell" style={{ color: "var(--text-muted)" }}>Latest Version</th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider lg:table-cell" style={{ color: "var(--text-muted)" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr
                  key={asset.id}
                  className="border-b transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <td className="px-4 py-3">
                    <a href={`/assets/${asset.id}`} className="block">
                      <div className="flex items-center gap-3">
                        <span className="text-lg" aria-hidden="true">
                          {asset.asset_type.icon ?? "📦"}
                        </span>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{asset.name}</p>
                          {asset.description && (
                            <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-1">
                              {asset.description}
                            </p>
                          )}
                          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{asset.slug}</p>
                        </div>
                      </div>
                    </a>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <Badge size="sm">{asset.asset_type.name}</Badge>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusBadge status={asset.status} />
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {asset.versions[0] ? (
                      <span className="text-xs text-[var(--text-secondary)]">
                        v{asset.versions[0].version}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-right lg:table-cell">
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(asset.created_at).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
