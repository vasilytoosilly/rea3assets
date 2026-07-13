"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Button,
  Card,
  CardBody,
  Badge,
  EmptyState,
  Input,
  DynamicIcon,
} from "@/components/ui";
import { Puzzle } from "lucide-react";

// ---------------------------------------------------------------------------
// Asset Types list page — fetches from API, creates via POST
// ---------------------------------------------------------------------------

interface AssetType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  division: string;
  is_internal: boolean;
  is_public: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  fields: Array<{ id: string; slug: string }>;
  _count: { assets: number };
}

const DIVISION_LABELS: Record<string, string> = {
  vault_product: "Vault",
  vault_service: "Vault Service",
  shop_product: "Shop",
  shop_service: "Shop Service",
  community: "Community",
};



export default function AssetTypesPage() {
  const router = useRouter();
  const [types, setTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch asset types from API
  const fetchTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/asset-types");
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setTypes(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const filteredTypes = types.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Types"
        subtitle="Define what kinds of assets exist. Each type has custom fields, validation rules, and pipeline config."
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            + New Type
          </Button>
        }
      />

      {/* Search + filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search types..."
          value={search}
          onChange={setSearch}
          className="max-w-sm flex-1"
        />
        <div className="flex items-center gap-2">
          <Badge variant="muted">{types.length} types</Badge>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div
          className="flex items-center justify-center rounded-lg border border-dashed px-8 py-16"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Loading asset types...
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-8 py-16"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--accent)" }}>
            Failed to load asset types
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {error}
          </p>
          <Button variant="secondary" size="sm" onClick={fetchTypes}>
            Retry
          </Button>
        </div>
      )}

      {/* Types grid */}
      {!loading && !error && filteredTypes.length === 0 && (
        <EmptyState
          icon={<Puzzle size={48} />}
          title={search ? "No matching types" : "No asset types yet"}
          description={
            search
              ? "Try a different search term."
              : "Create your first asset type to start defining what kinds of assets your studio manages."
          }
          action={
            !search ? (
              <Button onClick={() => setShowCreateModal(true)}>
                + Create Asset Type
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && !error && filteredTypes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTypes.map((type) => (
            <AssetTypeCard key={type.id} type={type} />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateTypeModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(slug) => {
            setShowCreateModal(false);
            fetchTypes();
            router.push(`/asset-types/${slug}`);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset Type Card
// ---------------------------------------------------------------------------

function AssetTypeCard({ type }: { type: AssetType }) {
  return (
    <Card hover href={`/asset-types/${type.slug}`} className="border-[var(--border-default)]">
      <CardBody>
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-[var(--accent)]" aria-hidden="true">
              <DynamicIcon name={type.icon} fallback={`division-${type.division}`} size={28} />
            </span>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                {type.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {type.slug}
              </p>
            </div>
          </div>
          <Badge variant="accent" size="sm">
            {DIVISION_LABELS[type.division] ?? type.division}
          </Badge>
        </div>

        {/* Description */}
        {type.description && (
          <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-2">
            {type.description}
          </p>
        )}

        {/* Stats row */}
        <div
          className="mt-4 flex items-center gap-4 border-t pt-3"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <span className="text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-secondary)]">
              {type.fields?.length ?? 0}
            </span>{" "}
            fields
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-secondary)]">
              {type._count?.assets ?? 0}
            </span>{" "}
            assets
          </span>
          <div className="flex-1" />
          {type.is_public && (
            <Badge variant="success" size="sm">
              Public
            </Badge>
          )}
          {type.is_internal && (
            <Badge variant="muted" size="sm">
              Internal
            </Badge>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create Type Modal — calls POST /api/asset-types
// ---------------------------------------------------------------------------

function CreateTypeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (slug: string) => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [division, setDivision] = useState("vault_product");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/asset-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), description: description.trim() || undefined, division }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const created = await res.json();
      onCreated(created.slug);
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg rounded-lg border p-6"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-default)",
        }}
      >
        <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-primary)]">
          Create Asset Type
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Define a new category of assets. You can add custom fields after creation.
        </p>

        {error && (
          <div
            className="mt-4 rounded-md border p-3 text-sm"
            style={{
              borderColor: "var(--accent)",
              backgroundColor: "var(--accent-muted)",
              color: "var(--accent)",
            }}
          >
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <Input
            label="Name"
            placeholder="Character Model"
            value={name}
            onChange={handleNameChange}
          />
          <Input
            label="Slug"
            placeholder="character-model"
            value={slug}
            onChange={setSlug}
            helpText="Auto-generated from name. Lowercase alphanumeric with hyphens."
          />
          <Input
            label="Description"
            placeholder="3D character models with rigging and animation support"
            value={description}
            onChange={setDescription}
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Division
            </label>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="block w-full rounded-md border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              <option value="vault_product">Vault (Developer Assets)</option>
              <option value="vault_service">Vault (Services)</option>
              <option value="shop_product">Shop (Consumer Products)</option>
              <option value="shop_service">Shop (Services)</option>
              <option value="community">Community</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || !slug.trim() || submitting}
            onClick={handleCreate}
          >
            {submitting ? "Creating..." : "Create Type"}
          </Button>
        </div>
      </div>
    </div>
  );
}
