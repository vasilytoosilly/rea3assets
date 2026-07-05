"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  StatusBadge,
  Input,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Asset detail page — metadata rendered per field_type, versions, tags
// ---------------------------------------------------------------------------

interface FieldDef {
  id: string;
  slug: string;
  label: string;
  field_type: string;
  config: any;
  is_required: boolean;
  is_filterable: boolean;
  is_showcase: boolean;
  placeholder: string | null;
  help_text: string | null;
  sort_order: number;
}

interface AssetTypeDetail {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  division: string;
  fields: FieldDef[];
}

interface AssetVersion {
  id: string;
  version: string;
  status: string;
  changelog: string | null;
  file_path: string | null;
  file_size: number | null;
  file_hash: string | null;
  format: string | null;
  created_at: string;
  pipeline_runs: Array<{ id: string; status: string; steps: Array<{ id: string; processor: string; status: string }> }>;
}

interface FieldValue {
  id: string;
  field_id: string;
  value_text: string | null;
  value_number: string | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_json: any;
  field: { id: string; slug: string; label: string; field_type: string };
}

interface AssetDetail {
  id: string;
  asset_type_id: string;
  slug: string;
  name: string;
  description: string | null;
  division: string;
  metadata: Record<string, any>;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  asset_type: AssetTypeDetail;
  field_values: FieldValue[];
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
  const [activeTab, setActiveTab] = useState<"metadata" | "versions" | "tags" | "thumbnails" | "deps" | "settings">("metadata");
  const [statusChanging, setStatusChanging] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchAsset = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/assets/${id}`);
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
  }, [id]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  const handleStatusChange = async (newStatus: string) => {
    setStatusChanging(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      fetchAsset();
    } catch (err) {
      setStatusError(String(err));
    } finally {
      setStatusChanging(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed px-8 py-16 text-center"
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading asset...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-8 py-16"
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
        <p className="text-sm" style={{ color: "var(--accent)" }}>Failed to load</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{error}</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchAsset}>Retry</Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/assets")}>Back to list</Button>
        </div>
      </div>
    );
  }

  const transitions = statusTransitions(asset.status);

  return (
    <div className="space-y-6">
      {statusError && (
        <div className="rounded-md border p-3 text-sm"
          style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}>
          {statusError}
          <button onClick={() => setStatusError(null)} className="ml-2 text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <a href="/assets" className="hover:text-[var(--text-primary)]">Assets</a>
        <span>/</span>
        <span className="text-[var(--text-primary)]">{asset.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl" aria-hidden="true">
            {asset.asset_type.icon ?? "📦"}
          </span>
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {asset.name}
            </h1>
            {asset.description && (
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {asset.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="accent">{asset.asset_type.name}</Badge>
              <StatusBadge status={asset.status} />
              <Badge variant="muted">{asset.slug}</Badge>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {asset.versions.length} {asset.versions.length === 1 ? "version" : "versions"}
              </span>
            </div>
          </div>
        </div>

        {/* Status workflow */}
        {transitions.length > 0 && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap gap-1">
              {transitions.map((next) => (
                <Button
                  key={next}
                  size="sm"
                  variant={next === "published" ? "primary" : next === "deprecated" || next === "archived" ? "danger" : "secondary"}
                  disabled={statusChanging}
                  onClick={() => handleStatusChange(next)}
                >
                  {next.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--border-default)" }}>
        <TabButton active={activeTab === "metadata"} onClick={() => setActiveTab("metadata")} label="Metadata" />
        <TabButton
          active={activeTab === "versions"}
          onClick={() => setActiveTab("versions")}
          label="Versions"
          count={asset.versions.length}
        />
        <TabButton
          active={activeTab === "tags"}
          onClick={() => setActiveTab("tags")}
          label="Tags"
          count={asset.tags.length}
        />
        <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} label="Settings" />
        <TabButton
          active={activeTab === "thumbnails"}
          onClick={() => setActiveTab("thumbnails")}
          label="Thumbnails"
          count={asset.thumbnails.length}
        />
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

// ---------------------------------------------------------------------------
// Status transitions for the workflow buttons
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-3 text-sm font-medium uppercase tracking-wider transition-colors ${
        active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      }`}
    >
      {label}
      {count !== undefined && <span className="ml-2 text-xs text-[var(--text-muted)]">{count}</span>}
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "var(--accent)" }} />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Metadata tab — renders each field by its field_type
// ---------------------------------------------------------------------------

function MetadataTab({ asset }: { asset: AssetDetail }) {
  const sortedFields = [...asset.asset_type.fields].sort((a, b) => a.sort_order - b.sort_order);

  if (sortedFields.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-8 py-12 text-center"
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No custom fields defined for {asset.asset_type.name}. Configure fields in the asset type settings.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {sortedFields.map((field) => {
        const value = asset.metadata[field.slug];
        return (
          <MetadataField
            key={field.id}
            field={field}
            value={value}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Render a single metadata field by its field_type
// ---------------------------------------------------------------------------

function MetadataField({ field, value }: { field: FieldDef; value: any }) {
  return (
    <Card className="border-[var(--border-default)]">
      <CardBody className="py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {field.label}
              {field.is_required && (
                <span className="ml-1 text-[var(--accent)]">*</span>
              )}
            </p>
            <div className="mt-1">
              {renderFieldValue(field.field_type, value)}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {field.is_filterable && <Badge variant="success" size="sm">F</Badge>}
            {field.is_showcase && <Badge variant="accent" size="sm">S</Badge>}
          </div>
        </div>
        {field.help_text && (
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">{field.help_text}</p>
        )}
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Render a value based on its field_type
// ---------------------------------------------------------------------------

function renderFieldValue(fieldType: string, value: any): React.ReactNode {
  if (value === undefined || value === null) {
    return <span className="text-sm italic text-[var(--text-muted)]">Not set</span>;
  }

  switch (fieldType) {
    case "text":
    case "textarea":
      return <span className="text-sm text-[var(--text-primary)]">{String(value)}</span>;

    case "number":
      return <span className="text-lg font-mono font-semibold text-[var(--text-primary)]">{Number(value).toLocaleString()}</span>;

    case "boolean":
      return (
        <span
          className={`inline-flex items-center gap-1 text-sm ${
            value ? "text-[#22c55e]" : "text-[var(--text-muted)]"
          }`}
        >
          {value ? "✅ Yes" : "⬜ No"}
        </span>
      );

    case "select":
      return <Badge>{String(value)}</Badge>;

    case "multi_select":
      return (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(value) ? value : []).map((v: string, i: number) => (
            <Badge key={i}>{v}</Badge>
          ))}
        </div>
      );

    case "date":
      try {
        const d = new Date(String(value));
        return <span className="text-sm text-[var(--text-primary)]">{d.toLocaleDateString()}</span>;
      } catch {
        return <span className="text-sm text-[var(--text-muted)]">{String(value)}</span>;
      }

    case "url":
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline"
          style={{ color: "var(--accent)" }}
        >
          {String(value)}
        </a>
      );

    case "color":
      return (
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded border"
            style={{
              backgroundColor: String(value),
              borderColor: "var(--border-default)",
            }}
          />
          <code className="text-xs text-[var(--text-muted)]">{String(value)}</code>
        </span>
      );

    case "tags":
      return (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(value) ? value : []).map((v: string, i: number) => (
            <Badge key={i} variant="default">{v}</Badge>
          ))}
        </div>
      );

    case "rating":
      const stars = Number(value);
      return (
        <span className="text-lg">
          {"⭐".repeat(Math.min(stars, 5))}
          <span className="text-[var(--text-muted)]">{"⭐".repeat(Math.max(0, 5 - stars))}</span>
        </span>
      );

    case "richtext":
      return <span className="text-sm text-[var(--text-primary)]">{String(value).slice(0, 200)}{String(value).length > 200 ? "..." : ""}</span>;

    case "image":
    case "file":
      if (typeof value === "object" && value?.filename) {
        return (
          <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            📎 {value.filename}
            {value.size_bytes && (
              <span className="text-xs text-[var(--text-muted)]">
                ({formatBytes(value.size_bytes)})
              </span>
            )}
          </span>
        );
      }
      return <span className="text-sm text-[var(--text-muted)]">{JSON.stringify(value)}</span>;

    default:
      return <span className="text-sm text-[var(--text-muted)]">{JSON.stringify(value)}</span>;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ---------------------------------------------------------------------------
// Versions tab — list + upload form
// ---------------------------------------------------------------------------

function VersionsTab({ assetId, versions, onRefresh }: { assetId: string; versions: AssetVersion[]; onRefresh: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestNextVersion = (): string => {
    const latest = versions[0]?.version;
    if (!latest) return "1.0.0";
    const parts = latest.split(".");
    const patch = parseInt(parts[2] ?? "0", 10);
    return `${parts[0]}.${parts[1]}.${patch + 1}`;
  };

  const [version, setVersion] = useState(suggestNextVersion());
  const [changelog, setChangelog] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `Upload failed (${res.status})`);
      }
      const stored = await res.json();
      const ext = file.name.split(".").pop() || "";

      const vRes = await fetch(`/api/assets/${assetId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version,
          changelog: changelog.trim() || null,
          file_path: stored.url,
          file_size: stored.sizeBytes,
          format: ext,
        }),
      });

      if (!vRes.ok) {
        const err = await vRes.json().catch(() => null);
        throw new Error(err?.error ?? `Version create failed (${vRes.status})`);
      }

      setShowUploadForm(false);
      setVersion("1.0.0");
      setChangelog("");
      onRefresh();
    } catch (err) {
      setUploadError(String(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {versions.length === 0
            ? "No versions yet. Upload a file to create the first version."
            : `${versions.length} version${versions.length !== 1 ? "s" : ""}`}
        </p>
        <Button size="sm" onClick={() => setShowUploadForm(!showUploadForm)}>
          {showUploadForm ? "Cancel" : "+ New Version"}
        </Button>
      </div>

      {showUploadForm && (
        <Card className="border-[var(--border-default)]">
          <CardBody className="space-y-4 py-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">Upload New Version</h4>

            {uploadError && (
              <div className="rounded-md border p-3 text-sm"
                style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}>
                {uploadError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Version (semver)" placeholder="1.0.0" value={version} onChange={setVersion} />
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                    e.target.value = "";
                  }}
                />
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? "Uploading..." : "Choose File"}
                </Button>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">Max 50MB. Supported: .rbxm, .rbxmx, .fbx, .blend, .glb, .zip</p>
              </div>
            </div>

            <Input label="Changelog" placeholder="What changed in this version?" value={changelog} onChange={setChangelog} />
          </CardBody>
        </Card>
      )}

      {versions.length === 0 && !showUploadForm ? (
        <div className="rounded-lg border border-dashed px-8 py-12 text-center"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No versions uploaded yet. Upload a file to create the first version.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => {
            const statusVariant =
              v.status === "published" ? "success" :
              v.status === "deprecated" ? "error" :
              v.status === "processing" ? "warning" :
              "muted";

            return (
              <Card key={v.id} className="border-[var(--border-default)]">
                <CardBody className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                        v{v.version}
                      </span>
                      <Badge variant={statusVariant as any} size="sm">{v.status}</Badge>
                      {v.format && (
                        <Badge variant="muted" size="sm">{v.format}</Badge>
                      )}
                      {v.pipeline_runs?.map((run) => (
                        <Badge key={run.id} size="sm" variant={
                          run.status === "completed" ? "success" :
                          run.status === "failed" ? "error" :
                          run.status === "running" ? "warning" : "muted"
                        }>⚙ {run.status}</Badge>
                      ))}
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {v.changelog && (
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{v.changelog}</p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    {v.file_size && <span>Size: {formatBytes(Number(v.file_size))}</span>}
                    {v.file_hash && <span className="font-mono">SHA: {v.file_hash.slice(0, 12)}...</span>}
                    {v.file_path && (
                      <a href={v.file_path} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>Download</a>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------

function SettingsTab({ asset, onSaved }: { asset: AssetDetail; onSaved: () => void }) {
  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved();
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {saveError && (
        <div className="rounded-md border p-3 text-sm"
          style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}>
          {saveError}
          <button onClick={() => setSaveError(null)} className="ml-2 text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
      <Card className="border-[var(--border-default)]">
        <CardHeader>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">General</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input label="Name" value={name} onChange={setName} />
          <Input label="Description" value={description} onChange={setDescription} />
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Slug
            </label>
            <p className="text-sm font-mono text-[var(--text-muted)]">{asset.slug}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Division
            </label>
            <p className="text-sm text-[var(--text-muted)]">{asset.division.replace(/_/g, " ")}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Status
            </label>
            <StatusBadge status={asset.status} />
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tags tab — view and manage tag assignments
// ---------------------------------------------------------------------------

function TagsTab({
  assetId,
  initialTags,
}: {
  assetId: string;
  initialTags: Array<{
    tag: { id: string; slug: string; name: string; color: string | null; group: { name: string } };
  }>;
}) {
  const [groups, setGroups] = useState<Array<{ id: string; slug: string; name: string; tags: Array<{ id: string; slug: string; name: string; color: string | null }> }>>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set(initialTags.map((t) => t.tag.id)));
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/tag-groups")
      .then((r) => r.json())
      .then((data) => {
        setGroups(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const toggleTag = (tagId: string) => {
    setAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_ids: Array.from(assignedIds) }),
      });
      if (!res.ok) throw new Error("Failed to save tags");
    } catch (err) {
      alert(String(err));
    } finally {
      setSaving(false);
    }
  };

  // Group tags by their group for display
  if (!loaded) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed px-8 py-16"
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading tags...</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-8 py-12 text-center"
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No tag groups configured.{" "}
          <a href="/tags" className="underline" style={{ color: "var(--accent)" }}>Create tag groups</a>{" "}
          to classify this asset.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Assign tags from the configured tag groups. Changes are saved immediately.
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Tags"}
        </Button>
      </div>

      {groups.map((group) => (
        <div key={group.id}>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            {group.name}
          </h4>
          <div className="flex flex-wrap gap-2">
            {group.tags.map((tag) => {
              const active = assignedIds.has(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                  style={active && tag.color ? { borderColor: tag.color, backgroundColor: `${tag.color}1a`, color: tag.color } : undefined}
                >
                  {tag.name}
                </button>
              );
            })}
            {group.tags.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No tags in this group.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ThumbnailsTab({ assetId, thumbnails, onRefresh }: { assetId: string; thumbnails: Array<{ id: string; url: string; purpose: string; width: number | null; height: number | null; format: string }>; onRefresh: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/assets/${assetId}/thumbnails`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      onRefresh();
    } catch (err) {
      alert(String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (thumbId: string) => {
    setDeleting(thumbId);
    try {
      await fetch(`/api/assets/${assetId}/thumbnails/${thumbId}`, { method: "DELETE" });
      onRefresh();
    } catch (err) {
      alert(String(err));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {thumbnails.length === 0 ? "No thumbnails yet." : `${thumbnails.length} thumbnail${thumbnails.length !== 1 ? "s" : ""}`}
        </p>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading..." : "+ Add Thumbnail"}
          </Button>
        </div>
      </div>
      {thumbnails.length === 0 ? (
        <div className="rounded-lg border border-dashed px-8 py-12 text-center"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
          <p className="text-sm text-[var(--text-muted)]">Upload images to showcase this asset in the library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {thumbnails.map((t) => (
            <div key={t.id} className="group relative rounded-lg border overflow-hidden"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
              <img src={t.url} alt={t.purpose} className="w-full aspect-square object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge size="sm">{t.purpose}</Badge>
                <Button size="sm" variant="danger" onClick={() => handleDelete(t.id)} disabled={deleting === t.id}>
                  {deleting === t.id ? "..." : "✕"}
                </Button>
              </div>
              <div className="px-2 py-1.5">
                <p className="text-[10px] text-[var(--text-muted)] uppercase">{t.format}</p>
              </div>
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
  const [selectedDep, setSelectedDep] = useState("");
  const [depType, setDepType] = useState("requires");
  const [adding, setAdding] = useState(false);

  const fetchDeps = async () => {
    try {
      const [dRes, aRes] = await Promise.all([
        fetch(`/api/assets/${assetId}/dependencies`),
        fetch("/api/assets?limit=100"),
      ]);
      if (dRes.ok) setDeps(await dRes.json());
      if (aRes.ok) {
        const body = await aRes.json();
        setAssets(body.data.filter((a: any) => a.id !== assetId));
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDeps(); }, [assetId]);

  const handleAdd = async () => {
    if (!selectedDep) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependency_id: selectedDep, dependency_type: depType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      setSelectedDep("");
      fetchDeps();
      onRefresh();
    } catch (err) {
      alert(String(err));
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (depId: string) => {
    try {
      await fetch(`/api/assets/${assetId}/dependencies/${depId}`, { method: "DELETE" });
      fetchDeps();
      onRefresh();
    } catch (err) {
      alert(String(err));
    }
  };

  if (loading) {
    return <div className="rounded-lg border border-dashed px-8 py-16 text-center" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
      <p className="text-sm text-[var(--text-muted)]">Loading...</p>
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Add Dependency</label>
          <select value={selectedDep} onChange={(e) => setSelectedDep(e.target.value)}
            className="block w-full rounded-md border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}>
            <option value="">Select asset...</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Type</label>
          <select value={depType} onChange={(e) => setDepType(e.target.value)}
            className="block w-full rounded-md border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}>
            <option value="requires">Requires</option>
            <option value="recommends">Recommends</option>
            <option value="bundles_with">Bundles with</option>
          </select>
        </div>
        <Button size="sm" disabled={!selectedDep || adding} onClick={handleAdd}>
          {adding ? "..." : "Add"}
        </Button>
      </div>

      {deps.length === 0 ? (
        <div className="rounded-lg border border-dashed px-8 py-12 text-center"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
          <p className="text-sm text-[var(--text-muted)]">No dependencies. Link assets that this asset requires or recommends.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {deps.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-md px-3 py-2"
              style={{ backgroundColor: "var(--bg-elevated)" }}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-primary)]">{d.dependency.name}</span>
                <Badge size="sm" variant={d.dependency_type === "requires" ? "error" : d.dependency_type === "recommends" ? "warning" : "accent"}>
                  {d.dependency_type.replace(/_/g, " ")}
                </Badge>
              </div>
              <button onClick={() => handleRemove(d.id)} className="text-[var(--text-muted)] hover:text-[var(--accent)] text-sm">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
