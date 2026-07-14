"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button, Card, CardHeader, CardBody, Badge, StatusBadge, Input, DynamicIcon,
  ErrorBanner, Skeleton, Select, showToast, type BadgeVariant,
} from "@/components/ui";
import type { FieldConfig } from "@/lib/validations/fields";
import { renderFieldValue } from "@/components/MetadataField";
import { formatBytes } from "@/lib/formatters";
import { X as XIcon, Star, Cog, Trash2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Asset detail page — cyberpunk dark aesthetic
// ---------------------------------------------------------------------------

interface FieldDef {
  id: string; slug: string; label: string; field_type: string;
  config: FieldConfig | null; is_required: boolean; is_filterable: boolean;
  is_showcase: boolean; placeholder: string | null; help_text: string | null;
  sort_order: number;
}

interface AssetTypeDetail {
  id: string; slug: string; name: string; icon: string | null; division: string;
  fields: FieldDef[];
}

interface AssetVersion {
  id: string; version: string; status: string; changelog: string | null;
  file_path: string | null; file_size: number | null; file_hash: string | null;
  format: string | null; created_at: string;
  pipeline_runs: Array<{ id: string; status: string; steps: Array<{ id: string; processor: string; status: string }> }>;
}

interface AssetDetail {
  id: string; asset_type_id: string; sku: string | null; slug: string; name: string;
  description: string | null; division: string; metadata: Record<string, unknown>;
  status: string; created_by: string | null; created_at: string; updated_at: string;
  published_at: string | null;
  asset_type: AssetTypeDetail;
  field_values: Array<{ id: string; field_id: string; value_text: string | null; value_number: string | null; value_boolean: boolean | null; value_date: string | null; value_json: unknown; field: { id: string; slug: string; label: string; field_type: string } }>;
  versions: AssetVersion[];
  thumbnails: Array<{ id: string; url: string; purpose: string; width: number | null; height: number | null; format: string }>;
  tags: Array<{ tag: { id: string; slug: string; name: string; color: string | null; group: { name: string } } }>;
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"metadata" | "versions" | "tags" | "thumbnails" | "deps" | "settings">("metadata");
  const [statusChanging, setStatusChanging] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchAsset = useCallback(async (signal?: AbortSignal) => {
    try { setLoading(true); setError(null);
      const res = await fetch(`/api/assets/${id}`, { signal });
      if (!res.ok) { if (res.status === 404) throw new Error("Asset not found"); throw new Error(`API returned ${res.status}`); }
      setAsset(await res.json());
    } catch (err) { setError(String(err)); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { const controller = new AbortController(); fetchAsset(controller.signal); return () => controller.abort(); }, [fetchAsset]);

  const handleStatusChange = async (newStatus: string) => {
    setStatusChanging(true); setStatusError(null);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      fetchAsset();
    } catch (err) { setStatusError(String(err)); } finally { setStatusChanging(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="flex gap-1 border-b border-[var(--border-default)] pb-0">
          {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-10 w-24" />))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-20 rounded-lg" />))}
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-20 text-center">
        <ErrorBanner message={error || "Asset not found"} onRetry={fetchAsset} />
        <Button variant="ghost" size="sm" onClick={() => router.push("/assets")} className="mt-3">Back to list</Button>
      </div>
    );
  }

  const transitions = statusTransitions(asset.status);

  return (
    <div className="space-y-8">
      {statusError && <ErrorBanner message={statusError} onDismiss={() => setStatusError(null)} />}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <a href="/assets" className="transition-colors hover:text-[var(--accent)]">Assets</a>
        <span className="opacity-40">/</span>
        <span className="text-[var(--text-primary)]">{asset.name}</span>
      </nav>

      {/* Hero header */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-6 sm:px-8 transition-all duration-700 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        style={{ boxShadow: "0 0 60px rgba(255,77,77,0.03), inset 0 1px 0 rgba(255,255,255,0.02)" }}
      >
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 40% 80% at 80% 20%, rgba(255,77,77,0.04) 0%, transparent 60%)" }} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)]" aria-hidden="true">
                <DynamicIcon name={asset.asset_type.icon} size={24} />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {asset.name}
                </h1>
              </div>
            </div>
            {asset.description && <p className="text-sm text-[var(--text-muted)]">{asset.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="accent">{asset.asset_type.name}</Badge>
              <StatusBadge status={asset.status} />
              <Badge variant="muted">{asset.slug}</Badge>
              <span className="text-xs text-[var(--text-muted)]">{asset.versions.length} {asset.versions.length === 1 ? "version" : "versions"}</span>
            </div>
          </div>
          {transitions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 sm:pt-0">
              {transitions.map((next) => (
                <Button key={next} size="sm"
                  variant={next === "published" ? "primary" : next === "deprecated" || next === "archived" ? "danger" : "secondary"}
                  disabled={statusChanging} onClick={() => handleStatusChange(next)}>
                  {next.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border-default)]">
        <TabButton active={activeTab === "metadata"} onClick={() => setActiveTab("metadata")} label="Metadata" />
        <TabButton active={activeTab === "versions"} onClick={() => setActiveTab("versions")} label="Versions" count={asset.versions.length} />
        <TabButton active={activeTab === "tags"} onClick={() => setActiveTab("tags")} label="Tags" count={asset.tags.length} />
        <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} label="Settings" />
        <TabButton active={activeTab === "thumbnails"} onClick={() => setActiveTab("thumbnails")} label="Thumbnails" count={asset.thumbnails.length} />
        <TabButton active={activeTab === "deps"} onClick={() => setActiveTab("deps")} label="Dependencies" />
      </div>

      {/* Tab content */}
      {activeTab === "metadata" && <MetadataTab asset={asset} />}
      {activeTab === "versions" && <VersionsTab assetId={asset.id} versions={asset.versions} onRefresh={fetchAsset} />}
      {activeTab === "tags" && <TagsTab assetId={asset.id} initialTags={asset.tags} />}
      {activeTab === "thumbnails" && <ThumbnailsTab assetId={asset.id} thumbnails={asset.thumbnails} onRefresh={fetchAsset} />}
      {activeTab === "deps" && <DependenciesTab assetId={asset.id} onRefresh={fetchAsset} />}
      {activeTab === "settings" && <SettingsTab asset={asset} onSaved={fetchAsset} />}
    </div>
  );
}

function statusTransitions(status: string): string[] {
  switch (status) {
    case "draft": return ["in_review", "archived"];
    case "in_review": return ["approved", "draft"];
    case "approved": return ["published", "draft"];
    case "published": return ["deprecated"];
    case "deprecated": return ["published"];
    default: return [];
  }
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button onClick={onClick}
      className={`relative px-4 py-3 text-sm font-medium tracking-tight transition-colors ${
        active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      }`}>
      {label}{count !== undefined && <span className="ml-2 text-xs text-[var(--text-muted)]">{count}</span>}
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />}
    </button>
  );
}

function MetadataTab({ asset }: { asset: AssetDetail }) {
  const sortedFields = [...asset.asset_type.fields].sort((a, b) => a.sort_order - b.sort_order);
  if (sortedFields.length === 0) return (
    <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-12 text-center">
      <p className="text-sm text-[var(--text-muted)]">No custom fields defined for {asset.asset_type.name}. Configure fields in the asset type settings.</p>
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {sortedFields.map((field) => {
        const value = asset.metadata[field.slug];
        return <MetadataFieldCard key={field.id} field={field} value={value} />;
      })}
    </div>
  );
}

function MetadataFieldCard({ field, value }: { field: FieldDef; value: unknown }) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 transition-colors hover:border-[var(--border-active)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {field.label}{field.is_required && <span className="ml-1 text-[var(--accent)]">*</span>}
          </p>
          <div className="mt-1 text-sm text-[var(--text-primary)]">{renderFieldValue(field.field_type, value)}</div>
        </div>
        <div className="flex items-center gap-1">
          {field.is_filterable && <Badge variant="success" size="sm">F</Badge>}
          {field.is_showcase && <Badge variant="accent" size="sm">S</Badge>}
        </div>
      </div>
      {field.help_text && <p className="mt-1 text-[10px] text-[var(--text-muted)]">{field.help_text}</p>}
    </div>
  );
}

function VersionsTab({ assetId, versions, onRefresh }: { assetId: string; versions: AssetVersion[]; onRefresh: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);
  const suggestNextVersion = (): string => {
    const latest = versions[0]?.version;
    if (!latest) return "1.0.0";
    const parts = latest.split(".");
    return `${parts[0]}.${parts[1]}.${parseInt(parts[2] ?? "0", 10) + 1}`;
  };
  const [version, setVersion] = useState(suggestNextVersion());
  const [changelog, setChangelog] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const handleUpload = async (file: File) => {
    setUploadError(null); setUploading(true);
    try {
      const formData = new FormData(); formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.error ?? `Upload failed (${res.status})`); }
      const stored = await res.json();
      const ext = file.name.split(".").pop() || "";
      const vRes = await fetch(`/api/assets/${assetId}/versions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, changelog: changelog.trim() || null, file_path: stored.url, file_size: stored.sizeBytes, format: ext }),
      });
      if (!vRes.ok) { const err = await vRes.json().catch(() => null); throw new Error(err?.error ?? `Version create failed (${vRes.status})`); }
      if (!mountedRef.current) return;
      setShowUploadForm(false); setVersion("1.0.0"); setChangelog(""); onRefresh();
    } catch (err) { if (!mountedRef.current) return; setUploadError(String(err)); }
    finally { if (mountedRef.current) setUploading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">{versions.length === 0 ? "No versions yet." : `${versions.length} version${versions.length !== 1 ? "s" : ""}`}</p>
        <Button size="sm" onClick={() => setShowUploadForm(!showUploadForm)}>{showUploadForm ? "Cancel" : "+ New Version"}</Button>
      </div>
      {showUploadForm && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-4">
          <h4 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Upload New Version</h4>
          {uploadError && <ErrorBanner message={uploadError} onDismiss={() => setUploadError(null)} />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Version (semver)" placeholder="1.0.0" value={version} onChange={setVersion} />
            <div>
              <label className="label mb-1.5 block">File</label>
              <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(file); e.target.value = ""; }} />
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? "Uploading..." : "Choose File"}</Button>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">Max 50MB. Supported: .rbxm, .rbxmx, .fbx, .blend, .glb, .zip</p>
            </div>
          </div>
          <Input label="Changelog" placeholder="What changed?" value={changelog} onChange={setChangelog} />
        </div>
      )}
      {versions.length === 0 && !showUploadForm ? (
        <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">No versions uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((v, idx) => {
            const statusVariant: BadgeVariant = v.status === "published" ? "success" : v.status === "deprecated" ? "error" : v.status === "processing" ? "warning" : "muted";
            return (
              <div key={v.id} className="rounded-xl border p-4 transition-colors hover:border-[var(--border-active)]"
                style={{ borderColor: idx === 0 ? "rgba(255,77,77,0.15)" : "var(--border-default)", backgroundColor: "var(--bg-surface)", boxShadow: idx === 0 ? "inset 0 0 0 1px rgba(255,77,77,0.04)" : undefined }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold" style={{ color: idx === 0 ? "var(--accent)" : "var(--text-primary)" }}>v{v.version}</span>
                    <Badge variant={statusVariant} size="sm">{v.status}</Badge>
                    {idx === 0 && <Badge variant="accent" size="sm">Latest</Badge>}
                    {v.format && <Badge variant="muted" size="sm">{v.format}</Badge>}
                    {v.pipeline_runs?.map((run) => (
                      <Badge key={run.id} size="sm" variant={run.status === "completed" ? "success" : run.status === "failed" ? "error" : run.status === "running" ? "warning" : "muted"}>
                        <span className="inline-flex items-center gap-1"><Cog size={10} /> {run.status}</span>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">{new Date(v.created_at).toLocaleDateString()}</span>
                    <button onClick={async (e) => { e.stopPropagation(); if (!confirm("Delete version " + v.version + "?")) return; try { const res = await fetch("/api/assets/" + assetId + "/versions/" + v.id, { method: "DELETE" }); if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || "HTTP " + res.status); } onRefresh(); } catch (err) { showToast("error", "Delete failed: " + String(err)); } }}
                      className="text-[var(--text-muted)] hover:text-[var(--status-deprecated)] transition-colors" title="Delete version"><Trash2 size={14} /></button>
                  </div>
                </div>
                {v.changelog && <p className="mt-2 text-sm text-[var(--text-secondary)]">{v.changelog}</p>}
                <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  {v.file_size && <span>Size: {formatBytes(Number(v.file_size))}</span>}
                  {v.file_hash && <span className="font-mono">SHA: {v.file_hash.slice(0, 12)}...</span>}
                  {v.file_path && <a href={v.file_path} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline">Download</a>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ asset, onSaved }: { asset: AssetDetail; onSaved: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.description ?? "");
  const [sku, setSku] = useState(asset.sku ?? "");
  const [featured, setFeatured] = useState(asset.metadata?.featured === true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), description: description.trim() || null, metadata: { ...asset.metadata, featured }, sku: sku.trim() || null }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved();
    } catch (err) { setSaveError(String(err)); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}
      <Card className="border-[var(--border-default)]">
        <CardHeader><h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">General</h3></CardHeader>
        <CardBody className="space-y-4">
          <Input label="Name" value={name} onChange={setName} />
          <Input label="Description" value={description} onChange={setDescription} />
          <Input label="SKU" placeholder="e.g. VP-CHAR-001 (matches ERP ProductSKU)" value={sku} onChange={setSku} helpText="The ERP product code. Required to publish and sync to the ERP." />
          <div><label className="label mb-1.5 block">Slug</label><p className="text-sm font-mono text-[var(--text-muted)]">{asset.slug}</p></div>
          <div><label className="label mb-1.5 block">Division</label><p className="text-sm text-[var(--text-muted)]">{asset.division.replace(/_/g, " ")}</p></div>
          <div><label className="label mb-1.5 block">Status</label><StatusBadge status={asset.status} /></div>
          <div>
            <label className="label mb-1.5 block">Featured</label>
            <button type="button" onClick={() => setFeatured(!featured)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${featured ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}>
              <Star className={`h-3 w-3 ${featured ? "fill-current" : ""}`} />{featured ? "Featured" : "Not featured"}
            </button>
          </div>
        </CardBody>
      </Card>
      <div className="flex justify-end"><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button></div>
      <Card className="border-[var(--status-deprecated)]/30">
        <CardHeader><h3 className="text-sm font-semibold tracking-tight text-[var(--status-deprecated)]">Danger Zone</h3></CardHeader>
        <CardBody className="space-y-4">
          {deleteError && <ErrorBanner message={deleteError} onDismiss={() => setDeleteError(null)} />}
          <p className="text-sm text-[var(--text-muted)]">Deleting an asset permanently removes it, all its versions, thumbnails, tags, and dependencies. This action cannot be undone.</p>
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--status-deprecated)]">Are you sure?</span>
              <Button variant="danger" size="sm" disabled={deleting} onClick={async () => { setDeleting(true); setDeleteError(null); try { const res = await fetch("/api/assets/" + asset.id, { method: "DELETE" }); if (!res.ok) { const data = await res.json().catch(() => null); throw new Error(data?.error ?? "HTTP " + res.status); } router.push("/assets"); } catch (err) { setDeleteError(String(err)); } finally { setDeleting(false); } }}>{deleting ? "Deleting..." : "Yes, Delete Permanently"}</Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          ) : (<Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>Delete Asset</Button>)}
        </CardBody>
      </Card>
    </div>
  );
}

function TagsTab({ assetId, initialTags }: { assetId: string; initialTags: Array<{ tag: { id: string; slug: string; name: string; color: string | null; group: { name: string } } }> }) {
  const [groups, setGroups] = useState<Array<{ id: string; slug: string; name: string; tags: Array<{ id: string; slug: string; name: string; color: string | null }> }>>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set(initialTags.map((t) => t.tag.id)));
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tag-groups", { signal: controller.signal }).then((r) => r.json()).then((data) => { setGroups(data); setLoaded(true); }).catch(() => setLoaded(true));
    return () => controller.abort();
  }, []);

  const toggleTag = (tagId: string) => { setAssignedIds((prev) => { const next = new Set(prev); if (next.has(tagId)) next.delete(tagId); else next.add(tagId); return next; }); };

  const handleSave = async () => {
    setSaving(true);
    try { const res = await fetch(`/api/assets/${assetId}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tag_ids: Array.from(assignedIds) }) }); if (!res.ok) throw new Error("Failed"); }
    catch (err) { showToast("error", String(err)); } finally { setSaving(false); }
  };

  if (!loaded) return <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-16 text-center"><p className="text-sm text-[var(--text-muted)]">Loading tags...</p></div>;
  if (groups.length === 0) return <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-12 text-center"><p className="text-sm text-[var(--text-muted)]">No tag groups configured. <a href="/tags" className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline">Create tag groups</a> to classify this asset.</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">Assign tags from the configured tag groups.</p>
        <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Tags"}</Button>
      </div>
      {groups.map((group) => (
        <div key={group.id}>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">{group.name}</h4>
          <div className="flex flex-wrap gap-2">
            {group.tags.map((tag) => {
              const active = assignedIds.has(tag.id);
              return (
                <button key={tag.id} onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}
                  style={active && tag.color ? { borderColor: tag.color, backgroundColor: `${tag.color}1a`, color: tag.color } : undefined}>
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ThumbnailsTab({ assetId, thumbnails, onRefresh }: { assetId: string; thumbnails: Array<{ id: string; url: string; purpose: string; width: number | null; height: number | null; format: string }>; onRefresh: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try { const formData = new FormData(); formData.append("file", file); const res = await fetch(`/api/assets/${assetId}/thumbnails`, { method: "POST", body: formData }); if (!res.ok) throw new Error("Upload failed"); if (!mountedRef.current) return; onRefresh(); }
    catch (err) { if (!mountedRef.current) return; showToast("error", `Upload failed: ${String(err)}`); } finally { if (mountedRef.current) setUploading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">{thumbnails.length === 0 ? "No thumbnails yet." : `${thumbnails.length} thumbnail${thumbnails.length !== 1 ? "s" : ""}`}</p>
        <div><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} /><Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? "Uploading..." : "+ Add Thumbnail"}</Button></div>
      </div>
      {thumbnails.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-12 text-center"><p className="text-sm text-[var(--text-muted)]">Upload images to showcase this asset.</p></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {thumbnails.map((t) => (
            <div key={t.id} className="group relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
              <img src={t.url} alt={t.purpose} className="aspect-square w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge size="sm">{t.purpose}</Badge>
                <Button size="sm" variant="danger" onClick={async () => { setDeleting(t.id); try { await fetch(`/api/assets/${assetId}/thumbnails/${t.id}`, { method: "DELETE" }); if (mountedRef.current) onRefresh(); } catch (err) { showToast("error", String(err)); } finally { if (mountedRef.current) setDeleting(null); } }} disabled={deleting === t.id}>{deleting === t.id ? "..." : <XIcon size={14} />}</Button>
              </div>
              <div className="px-2 py-1.5"><p className="text-[10px] text-[var(--text-muted)] uppercase">{t.format}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DependenciesTab({ assetId, onRefresh }: { assetId: string; onRefresh: () => void }) {
  const [deps, setDeps] = useState<Array<{ id: string; dependency_id: string; dependency_type: string; notes: string | null; dependency: { id: string; name: string; slug: string } }>>([]);
  const [assets, setAssets] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [depsError, setDepsError] = useState<string | null>(null);
  const [selectedDep, setSelectedDep] = useState("");
  const [depType, setDepType] = useState("requires");
  const [adding, setAdding] = useState(false);

  const fetchDeps = async (signal?: AbortSignal) => {
    try { setDepsError(null); const [dRes, aRes] = await Promise.all([fetch(`/api/assets/${assetId}/dependencies`, { signal }), fetch("/api/assets?limit=100", { signal })]); if (dRes.ok) setDeps(await dRes.json()); if (aRes.ok) { const body = await aRes.json(); setAssets(body.data.filter((a: { id: string }) => a.id !== assetId)); } }
    catch (err) { setDepsError(String(err)); } finally { setLoading(false); }
  };

  useEffect(() => { const controller = new AbortController(); fetchDeps(controller.signal); return () => controller.abort(); }, [assetId]);

  if (loading) return <div className="space-y-3" aria-hidden="true"><Skeleton className="h-10 rounded-md" /><Skeleton className="h-10 rounded-md" /><Skeleton className="h-10 rounded-md" /></div>;

  return (
    <div className="space-y-4">
      {depsError && <ErrorBanner message={`Failed to load: ${depsError}`} onRetry={() => fetchDeps()} />}
      <div className="flex items-end gap-3">
        <div className="flex-1"><Select label="Add Dependency" placeholder="Select asset..." value={selectedDep} onChange={setSelectedDep} options={assets.map((a) => ({ value: a.id, label: a.name }))} /></div>
        <div><Select label="Type" value={depType} onChange={setDepType} options={[{ value: "requires", label: "Requires" }, { value: "recommends", label: "Recommends" }, { value: "bundles_with", label: "Bundles with" }]} /></div>
        <Button size="sm" disabled={!selectedDep || adding} onClick={async () => { setAdding(true); try { const res = await fetch(`/api/assets/${assetId}/dependencies`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dependency_id: selectedDep, dependency_type: depType }) }); if (!res.ok) throw new Error((await res.json()).error ?? "Failed"); setSelectedDep(""); fetchDeps(); onRefresh(); } catch (err) { showToast("error", String(err)); } finally { setAdding(false); } }}>{adding ? "..." : "Add"}</Button>
      </div>
      {deps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-12 text-center"><p className="text-sm text-[var(--text-muted)]">No dependencies.</p></div>
      ) : (
        <div className="space-y-1">
          {deps.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-primary)]">{d.dependency.name}</span>
                <Badge size="sm" variant={d.dependency_type === "requires" ? "error" : d.dependency_type === "recommends" ? "warning" : "accent"}>{d.dependency_type.replace(/_/g, " ")}</Badge>
              </div>
              <button onClick={async () => { try { await fetch(`/api/assets/${assetId}/dependencies/${d.id}`, { method: "DELETE" }); fetchDeps(); onRefresh(); } catch (err) { showToast("error", String(err)); } }} className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)]">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
