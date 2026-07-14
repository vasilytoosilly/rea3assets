"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Package } from "lucide-react";
import {
  PageHeader,
  Button,
  Badge,
  Input,
  Select,
  StatusBadge,
  EmptyState,
  ErrorBanner,
  DynamicIcon,
  Skeleton,
  SkeletonRow,
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

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "deprecated", label: "Deprecated" },
  { value: "archived", label: "Archived" },
];

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [assetTypes, setAssetTypes] = useState<Array<{ slug: string; name: string }>>([]);

  useEffect(() => {
    fetch("/api/asset-types")
      .then((r) => r.json())
      .then((data) => setAssetTypes(data.map((t: { slug: string; name: string }) => ({ slug: t.slug, name: t.name }))))
      .catch(() => {});
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", "25");
      const qs = params.toString();
      const res = await fetch(`/api/assets?${qs}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const body = await res.json();
      setAssets(body.data);
      setTotalPages(body.pagination.pages);
      setTotal(body.pagination.total);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search, page]);

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
            <Plus size={16} /> New Asset
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search assets..."
          value={search}
          onChange={(e) => { setSearch(e); setPage(1); }}
          className="max-w-sm flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e); setPage(1); }}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
        />
        <Select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e); setPage(1); }}
          options={assetTypes.map((t) => ({ value: t.slug, label: t.name }))}
          placeholder="All types"
        />
        <Badge variant="muted">{total} assets</Badge>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="overflow-hidden rounded-lg border border-[var(--border-default)]">
          <div className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
            <div className="flex gap-4" aria-hidden="true">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <ErrorBanner message={error} onRetry={fetchAssets} onDismiss={() => setError(null)} />
      )}

      {/* Empty */}
      {!loading && !error && assets.length === 0 && (
        <EmptyState
          icon={<Package size={48} />}
          title={statusFilter || search ? "No matching assets" : "No assets yet"}
          description={
            statusFilter || search
              ? "Try different filters or search terms."
              : "Create asset types first, then add assets of each type."
          }
          action={
            !statusFilter && !search ? (
              <Button onClick={() => router.push("/assets/new")}>
                <Plus size={16} /> New Asset
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Asset table */}
      {!loading && !error && assets.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[var(--border-default)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky-header">
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Asset</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] md:table-cell">Type</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] sm:table-cell">Status</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] lg:table-cell">Latest Version</th>
                  <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
                    onClick={() => router.push(`/assets/${asset.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg text-[var(--accent)]" aria-hidden="true">
                          <DynamicIcon name={asset.asset_type.icon} size={20} />
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
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-[var(--text-muted)]">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
