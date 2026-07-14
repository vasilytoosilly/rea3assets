"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Tag, Package, Calendar, Layers } from "lucide-react";
import { Badge, Skeleton } from "@/components/ui";
import { Gallery } from "@/components/marketplace/Gallery";
import { formatBytes } from "@/lib/formatters";
import { renderFieldValue } from "@/components/MetadataField";

// ---------------------------------------------------------------------------
// Asset detail page — /marketplace/[slug]
// Cyberpunk dark aesthetic matching the login page and marketplace landing.
// ---------------------------------------------------------------------------

interface FieldDef {
  slug: string;
  label: string;
  field_type: string;
  placeholder: string | null;
}

interface AssetTypeDetail {
  slug: string;
  name: string;
  icon: string | null;
  fields: FieldDef[];
}

interface AssetVersion {
  id: string;
  version: string;
  changelog: string | null;
  created_at: string;
  file_size: number | null;
  format: string | null;
}

interface AssetTag {
  tag: {
    id: string;
    name: string;
    color: string | null;
    group: { name: string };
  };
}

interface AssetDependency {
  id: string;
  dependency_type: string;
  notes: string | null;
  dependency: { id: string; name: string; slug: string };
}

interface AssetDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sku: string | null;
  division: string;
  metadata: Record<string, unknown>;
  status: string;
  published_at: string | null;
  created_at: string;
  asset_type: AssetTypeDetail;
  thumbnails: Array<{
    id: string;
    url: string;
    purpose: string;
    width: number | null;
    height: number | null;
    format: string;
  }>;
  versions: AssetVersion[];
  tags: AssetTag[];
  dependencies: AssetDependency[];
}

export default function AssetDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAsset = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/marketplace/assets/${slug}`, { signal });
        if (!res.ok) {
          if (res.status === 404) throw new Error("Asset not found");
          throw new Error(`API returned ${res.status}`);
        }
        const data = await res.json();
        setAsset(data);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchAsset(controller.signal);
    return () => controller.abort();
  }, [fetchAsset]);

  // ─── Loading skeleton ───
  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-80 w-full rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-16 w-16 rounded-md" />
              <Skeleton className="h-16 w-16 rounded-md" />
              <Skeleton className="h-16 w-16 rounded-md" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-40 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error / 404 state ───
  if (error || !asset) {
    return (
      <div
        className="rounded-xl border border-dashed px-8 py-20 text-center"
        style={{
          borderColor: "var(--border-default)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
          style={{
            backgroundColor: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <Package className="h-7 w-7" style={{ color: "var(--text-muted)" }} />
        </div>
        <p
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: "var(--text-primary)" }}
        >
          {error || "Asset not found"}
        </p>
        <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
          This asset may have been removed or the link is invalid.
        </p>
        <Link
          href="/marketplace"
          className="mt-5 inline-flex items-center justify-center rounded-lg border px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200"
          style={{
            borderColor: "var(--accent)",
            color: "var(--accent)",
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--accent-muted)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          Back to marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ─── Breadcrumb ─── */}
      <nav
        className="flex items-center gap-1.5 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <Link
          href="/marketplace"
          className="transition-colors hover:text-[var(--accent)]"
        >
          Marketplace
        </Link>
        <span className="opacity-40">/</span>
        <span style={{ color: "var(--text-secondary)" }}>
          {asset.asset_type.name}
        </span>
        <span className="opacity-40">/</span>
        <span style={{ color: "var(--text-primary)" }}>{asset.name}</span>
      </nav>

      {/* ─── Hero header ─── */}
      <div
        className={`relative overflow-hidden rounded-2xl border px-6 py-8 sm:px-8 transition-all duration-700 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-default)",
          boxShadow:
            "0 0 60px rgba(255,77,77,0.03), inset 0 1px 0 rgba(255,255,255,0.02)",
        }}
      >
        {/* Hero glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 80% at 80% 20%, rgba(255,77,77,0.05) 0%, transparent 60%)",
          }}
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            {/* Asset type icon + name */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{
                  backgroundColor: "var(--accent-muted)",
                  borderColor: "rgba(255,77,77,0.15)",
                }}
              >
                <Package className="h-5 w-5" style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <Badge variant="accent" size="sm">
                  {asset.asset_type.name}
                </Badge>
              </div>
            </div>

            {/* Name */}
            <h1
              className="text-2xl font-black uppercase tracking-wider sm:text-3xl"
              style={{
                color: "var(--text-primary)",
                textShadow: "0 0 40px rgba(255,77,77,0.08)",
              }}
            >
              {asset.name}
            </h1>

            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              {asset.published_at && (
                <Badge variant="success">Published</Badge>
              )}
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                <Calendar className="h-3 w-3" />
                {new Date(asset.published_at ?? asset.created_at).toLocaleDateString()}
              </span>
            </div>

            {/* Description */}
            {asset.description && (
              <p
                className="max-w-2xl text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {asset.description}
              </p>
            )}
          </div>

          {/* Buy button — desktop right-aligned */}
          <div className="flex-shrink-0 sm:pt-1">
            {asset.sku ? (
              <a
                href={
                  process.env.NEXT_PUBLIC_ERP_URL
                    ? `${process.env.NEXT_PUBLIC_ERP_URL}/checkout?sku=${asset.sku}`
                    : `#checkout-${asset.sku}`
                }
                onClick={
                  !process.env.NEXT_PUBLIC_ERP_URL
                    ? (e) => {
                        e.preventDefault();
                      }
                    : undefined
                }
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all duration-200"
                style={{ backgroundColor: "var(--accent)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--accent)";
                }}
              >
                {/* Shimmer */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                <ShoppingCart className="relative z-10 h-4 w-4" />
                <span className="relative z-10">Get This Asset</span>
              </a>
            ) : (
              <span
                className="inline-flex items-center justify-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium uppercase tracking-wider"
                style={{
                  borderColor: "var(--border-default)",
                  color: "var(--text-muted)",
                }}
              >
                Contact for pricing
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Gallery + Info ─── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <Gallery thumbnails={asset.thumbnails} />

        {/* Quick info sidebar */}
        <div className="space-y-5">
          {/* Tags */}
          {asset.tags.length > 0 && (
            <div>
              <h3
                className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-secondary)" }}
              >
                <Tag className="mr-1.5 inline-block h-3 w-3" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {asset.tags.map((t) => (
                  <span
                    key={t.tag.id}
                    className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors"
                    style={{
                      borderColor: t.tag.color ?? "var(--border-default)",
                      backgroundColor: t.tag.color
                        ? `${t.tag.color}1a`
                        : "var(--bg-elevated)",
                      color: t.tag.color ?? "var(--text-secondary)",
                    }}
                  >
                    {t.tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick meta */}
          <div
            className="rounded-xl border p-5"
            style={{
              borderColor: "var(--border-subtle)",
              backgroundColor: "var(--bg-elevated)",
            }}
          >
            <h3
              className="mb-3 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-secondary)" }}
            >
              <Layers className="mr-1.5 inline-block h-3 w-3" />
              Details
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span
                  className="font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Division
                </span>
                <span style={{ color: "var(--text-primary)" }}>
                  {asset.division.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span
                  className="font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Slug
                </span>
                <span
                  className="font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {asset.slug}
                </span>
              </div>
              {asset.published_at && (
                <div className="flex justify-between">
                  <span
                    className="font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Published
                  </span>
                  <span style={{ color: "var(--text-primary)" }}>
                    {new Date(asset.published_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {asset.versions.length > 0 && (
                <div className="flex justify-between">
                  <span
                    className="font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Latest version
                  </span>
                  <span
                    className="font-mono font-semibold"
                    style={{ color: "var(--accent)" }}
                  >
                    v{asset.versions[0]!.version}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CTA — mobile (below gallery on small screens, hidden on lg+) */}
          <div className="lg:hidden">
            {asset.sku ? (
              <a
                href={
                  process.env.NEXT_PUBLIC_ERP_URL
                    ? `${process.env.NEXT_PUBLIC_ERP_URL}/checkout?sku=${asset.sku}`
                    : `#checkout-${asset.sku}`
                }
                onClick={
                  !process.env.NEXT_PUBLIC_ERP_URL
                    ? (e) => {
                        e.preventDefault();
                      }
                    : undefined
                }
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg py-3 text-sm font-bold uppercase tracking-wider text-white transition-all duration-200"
                style={{ backgroundColor: "var(--accent)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--accent)";
                }}
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                <ShoppingCart className="relative z-10 h-4 w-4" />
                <span className="relative z-10">Get This Asset</span>
              </a>
            ) : (
              <span
                className="flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium uppercase tracking-wider"
                style={{
                  borderColor: "var(--border-default)",
                  color: "var(--text-muted)",
                }}
              >
                Contact for pricing
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Accent divider ─── */}
      <div className="flex items-center gap-3">
        <div
          className="h-px flex-1"
          style={{ background: "var(--border-subtle)" }}
        />
        <div
          className="h-1 w-1 rounded-full"
          style={{ backgroundColor: "var(--accent)", opacity: 0.4 }}
        />
        <div
          className="h-px flex-1"
          style={{ background: "var(--border-subtle)" }}
        />
      </div>

      {/* ─── Metadata section ─── */}
      {asset.asset_type.fields.length > 0 && (
        <section>
          <h2
            className="mb-4 text-sm font-bold uppercase tracking-wider"
            style={{
              color: "var(--text-primary)",
              textShadow: "0 0 24px rgba(255,77,77,0.06)",
            }}
          >
            Specifications
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {asset.asset_type.fields.map((field) => {
              const value = asset.metadata[field.slug];
              return (
                <div
                  key={field.slug}
                  className="rounded-xl border p-4 transition-colors hover:border-[var(--border-active)]"
                  style={{
                    borderColor: "var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                  }}
                >
                  <p
                    className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {field.label}
                  </p>
                  <div className="text-sm">
                    {renderFieldValue(field.field_type, value)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Versions section ─── */}
      {asset.versions.length > 0 && (
        <section>
          <h2
            className="mb-4 text-sm font-bold uppercase tracking-wider"
            style={{
              color: "var(--text-primary)",
              textShadow: "0 0 24px rgba(255,77,77,0.06)",
            }}
          >
            Versions
          </h2>
          <div className="space-y-2">
            {asset.versions.map((v, idx) => (
              <div
                key={v.id}
                className="rounded-xl border p-4 transition-colors hover:border-[var(--border-active)]"
                style={{
                  borderColor:
                    idx === 0 ? "rgba(255,77,77,0.15)" : "var(--border-default)",
                  backgroundColor: "var(--bg-surface)",
                  boxShadow:
                    idx === 0
                      ? "inset 0 0 0 1px rgba(255,77,77,0.04)"
                      : undefined,
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="font-mono text-sm font-bold"
                      style={{
                        color:
                          idx === 0
                            ? "var(--accent)"
                            : "var(--text-primary)",
                      }}
                    >
                      v{v.version}
                    </span>
                    {idx === 0 && (
                      <Badge variant="accent" size="sm">
                        Latest
                      </Badge>
                    )}
                    {v.format && (
                      <Badge variant="muted" size="sm">
                        {v.format}
                      </Badge>
                    )}
                  </div>
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {new Date(v.created_at).toLocaleDateString()}
                  </span>
                </div>
                {v.changelog && (
                  <p
                    className="mt-2 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {v.changelog}
                  </p>
                )}
                {v.file_size && (
                  <p
                    className="mt-1.5 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Size: {formatBytes(Number(v.file_size))}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Dependencies section ─── */}
      {asset.dependencies.length > 0 && (
        <section>
          <h2
            className="mb-4 text-sm font-bold uppercase tracking-wider"
            style={{
              color: "var(--text-primary)",
              textShadow: "0 0 24px rgba(255,77,77,0.06)",
            }}
          >
            Dependencies
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {asset.dependencies.map((dep) => (
              <div
                key={dep.id}
                className="rounded-xl border p-4 transition-colors hover:border-[var(--border-active)]"
                style={{
                  borderColor: "var(--border-default)",
                  backgroundColor: "var(--bg-surface)",
                }}
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/marketplace/${dep.dependency.slug}`}
                    className="text-sm font-semibold transition-colors hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    {dep.dependency.name}
                  </Link>
                  <Badge variant="muted" size="sm">
                    {dep.dependency_type.replace(/_/g, " ")}
                  </Badge>
                </div>
                {dep.notes && (
                  <p
                    className="mt-1.5 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {dep.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Accent divider ─── */}
      <div className="flex items-center gap-3">
        <div
          className="h-px flex-1"
          style={{ background: "var(--border-subtle)" }}
        />
        <div
          className="h-1 w-1 rounded-full"
          style={{ backgroundColor: "var(--accent)", opacity: 0.4 }}
        />
        <div
          className="h-px flex-1"
          style={{ background: "var(--border-subtle)" }}
        />
      </div>

      {/* ─── Back link ─── */}
      <div className="pb-4">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <ArrowLeft className="h-3 w-3" />
          Back to marketplace
        </Link>
      </div>
    </div>
  );
}
