"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader, Button, Badge, EmptyState, Input, DynamicIcon,
  ErrorBanner, Modal, Select, Skeleton, showToast,
} from "@/components/ui";
import { Puzzle } from "lucide-react";

// ---------------------------------------------------------------------------
// Asset Types list page — define what kinds of assets exist
// ---------------------------------------------------------------------------

interface AssetType {
  id: string; slug: string; name: string; description: string | null;
  icon: string | null; division: string; is_internal: boolean; is_public: boolean;
  sort_order: number; created_at: string; updated_at: string;
  fields: Array<{ id: string; slug: string }>;
  _count: { assets: number };
}

const DIVISION_LABELS: Record<string, string> = {
  vault_product: "Vault", vault_service: "Vault Service",
  shop_product: "Shop", shop_service: "Shop Service", community: "Community",
};

export default function AssetTypesPage() {
  const router = useRouter();
  const [types, setTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const fetchTypes = useCallback(async () => {
    try { setLoading(true); setError(null);
      const res = await fetch("/api/asset-types");
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      setTypes(await res.json());
    } catch (err) { setError(String(err)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  const filteredTypes = types.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Types"
        subtitle="Define what kinds of assets exist. Each type has custom fields, validation rules, and pipeline config."
        eyebrow="Schemas"
        icon={<Puzzle size={20} />}
        action={<Button onClick={() => setShowCreateModal(true)}>+ New Type</Button>}
      />

      <div className="flex items-center gap-4">
        <Input placeholder="Search types..." value={search} onChange={setSearch} className="max-w-sm flex-1" />
        <Badge variant="muted" size="md">{types.length} types</Badge>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3"><Skeleton className="h-7 w-7 rounded" /><div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div></div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-3 w-full" /><Skeleton className="mt-1 h-3 w-2/3" />
              <div className="mt-4 flex gap-4 border-t border-[var(--border-subtle)] pt-3"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-16" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && <ErrorBanner message={`Failed to load: ${error}`} onRetry={fetchTypes} onDismiss={() => setError(null)} />}

      {!loading && !error && filteredTypes.length === 0 && (
        <EmptyState icon={<Puzzle size={48} />}
          title={search ? "No matching types" : "No asset types yet"}
          description={search ? "Try a different search term." : "Create your first asset type to start defining what kinds of assets your studio manages."}
          action={!search ? <Button onClick={() => setShowCreateModal(true)}>+ Create Asset Type</Button> : undefined} />
      )}

      {!loading && !error && filteredTypes.length > 0 && (
        <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {filteredTypes.map((type) => (
            <AssetTypeCard key={type.id} type={type} />
          ))}
        </div>
      )}

      {showCreateModal && <CreateTypeModal onClose={() => setShowCreateModal(false)} onCreated={(slug) => { setShowCreateModal(false); fetchTypes(); router.push(`/asset-types/${slug}`); }} />}
    </div>
  );
}

function AssetTypeCard({ type }: { type: AssetType }) {
  return (
    <a href={`/asset-types/${type.slug}`}
      className="group block rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 transition-all duration-200 hover:border-[var(--border-active)] hover:bg-[var(--bg-elevated)] hover:shadow-[0_0_24px_rgba(255,77,77,0.04)]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)]" aria-hidden="true">
            <DynamicIcon name={type.icon} fallback={`division-${type.division}`} size={22} />
          </span>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">{type.name}</h3>
            <p className="text-xs text-[var(--text-muted)]">{type.slug}</p>
          </div>
        </div>
        <Badge variant="accent" size="sm">{DIVISION_LABELS[type.division] ?? type.division}</Badge>
      </div>
      {type.description && <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-2">{type.description}</p>}
      <div className="mt-4 flex items-center gap-4 border-t border-[var(--border-subtle)] pt-3">
        <span className="text-xs text-[var(--text-muted)]"><span className="font-medium text-[var(--text-secondary)]">{type.fields?.length ?? 0}</span> fields</span>
        <span className="text-xs text-[var(--text-muted)]"><span className="font-medium text-[var(--text-secondary)]">{type._count?.assets ?? 0}</span> assets</span>
        <div className="flex-1" />
        {type.is_public && <Badge variant="success" size="sm">Public</Badge>}
        {type.is_internal && <Badge variant="muted" size="sm">Internal</Badge>}
      </div>
    </a>
  );
}

function CreateTypeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (slug: string) => void }) {
  const [name, setName] = useState(""); const [slug, setSlug] = useState("");
  const [description, setDescription] = useState(""); const [division, setDivision] = useState("vault_product");
  const [submitting, setSubmitting] = useState(false); const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => { setName(value); setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); };

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/asset-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), slug: slug.trim(), description: description.trim() || undefined, division }) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? `HTTP ${res.status}`); }
      const created = await res.json();
      showToast("success", `Asset type "${name.trim()}" created`);
      onCreated(created.slug);
    } catch (err) { setError(String(err)); } finally { setSubmitting(false); }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Asset Type" description="Define a new category of assets. You can add custom fields after creation."
      footer={<><Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button><Button disabled={!name.trim() || !slug.trim() || submitting} onClick={handleCreate}>{submitting ? "Creating..." : "Create Type"}</Button></>}>
      {error && <div className="mb-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}
      <div className="space-y-4">
        <Input label="Name" placeholder="Character Model" value={name} onChange={handleNameChange} />
        <Input label="Slug" placeholder="character-model" value={slug} onChange={setSlug} helpText="Auto-generated from name." />
        <Input label="Description" placeholder="3D character models with rigging and animation support" value={description} onChange={setDescription} />
        <Select label="Division" value={division} onChange={setDivision}
          options={[{ value: "vault_product", label: "Vault (Developer Assets)" }, { value: "vault_service", label: "Vault (Services)" }, { value: "shop_product", label: "Shop (Consumer Products)" }, { value: "shop_service", label: "Shop (Services)" }, { value: "community", label: "Community" }]} />
      </div>
    </Modal>
  );
}
