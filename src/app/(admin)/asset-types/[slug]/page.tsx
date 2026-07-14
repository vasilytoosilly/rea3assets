"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Input,
  DynamicIcon,
  ErrorBanner,
  Modal,
  Select,
  Skeleton,
  Toggle,
  FIELD_TYPE_ICONS as FIELD_ICON_MAP,
} from "@/components/ui";
import type { FieldConfig } from "@/lib/validations/fields";
import { Package, Trash2, GripVertical, ChevronDown, ChevronUp, Database } from "lucide-react";

// ---------------------------------------------------------------------------
// Asset Type detail page — fetch from API, manage fields
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
  fields: Field[];
  _count: { assets: number };
}

interface Field {
  id: string;
  slug: string;
  label: string;
  field_type: string;
  config: FieldConfig | null;
  is_required: boolean;
  is_filterable: boolean;
  is_showcase: boolean;
  placeholder: string | null;
  help_text: string | null;
  sort_order: number;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  textarea: "Textarea",
  number: "Number",
  boolean: "Boolean",
  select: "Select",
  multi_select: "Multi-Select",
  date: "Date",
  url: "URL",
  image: "Image",
  file: "File",
  richtext: "Rich Text",
  tags: "Tags",
  color: "Color",
  rating: "Rating",
};

export default function AssetTypeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [type, setType] = useState<AssetType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"fields" | "settings">("fields");
  const [showAddField, setShowAddField] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteType, setConfirmDeleteType] = useState(false);

  // Fetch asset type from API
  const fetchType = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/asset-types/${slug}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Asset type not found");
        throw new Error(`API returned ${res.status}`);
      }
      const data = await res.json();
      setType(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchType();
  }, [fetchType]);

  // Delete a field
  const handleDeleteField = async (fieldSlug: string) => {
    try {
      const res = await fetch(`/api/asset-types/${slug}/fields/${fieldSlug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Failed to delete field: ${res.status}`);
      setDeleteConfirm(null);
      fetchType();
    } catch (err) {
      setActionError(String(err));
    }
  };

  // Delete the entire type (accessible confirmation)
  const handleDeleteType = async () => {
    try {
      const res = await fetch(`/api/asset-types/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      router.push("/asset-types");
    } catch (err) {
      setActionError(String(err));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded" />
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-5 w-32 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex gap-1 border-b border-[var(--border-default)] pb-0">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !type) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-16">
        <ErrorBanner message={error || "Asset type not found"} onRetry={fetchType} />
        <Button variant="ghost" size="sm" onClick={() => router.push("/asset-types")}>Back to list</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionError && (
        <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
      )}
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <a href="/asset-types" className="hover:text-[var(--text-primary)]">Asset Types</a>
        <span>/</span>
        <span className="text-[var(--text-primary)]">{type.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl text-[var(--accent)]" aria-hidden="true">
            <DynamicIcon name={type.icon} size={36} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {type.name}
            </h1>
            {type.description && (
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {type.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="accent">{type.division.replace(/_/g, " ")}</Badge>
              {type.is_public && <Badge variant="success">Public</Badge>}
              {type.is_internal && <Badge variant="muted">Internal</Badge>}
              <Badge variant="muted" size="sm">{type.slug}</Badge>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {type._count?.assets ?? 0} assets
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {confirmDeleteType ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Delete this type and all its fields?</span>
              <Button variant="danger" size="sm" onClick={handleDeleteType}>Yes</Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteType(false)}>No</Button>
            </div>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirmDeleteType(true)}>
              Delete Type
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border-default)]">
        <TabButton active={activeTab === "fields"} onClick={() => setActiveTab("fields")} label="Custom Fields" count={type.fields?.length ?? 0} />
        <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} label="Settings" />
      </div>

      {/* Tab content */}
      {activeTab === "fields" && (
        <FieldsTab fields={type.fields} onAddField={() => setShowAddField(true)} onDeleteField={handleDeleteField} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} onRefresh={fetchType} />
      )}
      {activeTab === "settings" && <SettingsTab type={type} />}

      {/* Add field modal */}
      {showAddField && (
        <AddFieldModal
          slug={slug}
          onClose={() => setShowAddField(false)}
          onCreated={() => {
            setShowAddField(false);
            fetchType();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-3 text-sm font-medium tracking-tight transition-colors ${
        active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      }`}
    >
      {label}
      {count !== undefined && <span className="ml-2 text-xs text-[var(--text-muted)]">{count}</span>}
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Fields tab — show + delete fields
// ---------------------------------------------------------------------------

function FieldsTab({
  fields,
  onAddField,
  onDeleteField,
  deleteConfirm,
  setDeleteConfirm,
  onRefresh,
}: {
  fields: Field[];
  onAddField: () => void;
  onDeleteField: (fieldSlug: string) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: (v: string | null) => void;
  onRefresh: () => void;
}) {
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Define what metadata each asset of this type carries. Fields determine the upload form, validation rules, and marketplace display.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onRefresh}>Refresh</Button>
          <Button size="sm" onClick={onAddField}>+ Add Field</Button>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((field) => (
          <FieldRow
            key={field.id}
            field={field}
            confirming={deleteConfirm === field.slug}
            onDeleteClick={() =>
              deleteConfirm === field.slug ? onDeleteField(field.slug) : setDeleteConfirm(field.slug)
            }
            onCancelDelete={() => setDeleteConfirm(null)}
          />
        ))}
      </div>

      {fields.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent)]">
            <Database className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No custom fields yet
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Add fields to define what metadata this asset type carries.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field row — shows field info + delete button
// ---------------------------------------------------------------------------

function FieldRow({ field, confirming, onDeleteClick, onCancelDelete }: { field: Field; confirming: boolean; onDeleteClick: () => void; onCancelDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-[var(--border-default)]">
      <CardBody className="py-4">
        <div className="flex items-center gap-4">
          <span className="cursor-grab text-[var(--text-muted)]" aria-hidden="true"><GripVertical size={16} /></span>
          <span className="text-lg text-[var(--accent)]" aria-hidden="true">{(() => { const I = FIELD_ICON_MAP[field.field_type] ?? Package; return <I size={20} />; })()}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">{field.label}</span>
              <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">{field.slug}</code>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <Badge variant="default" size="sm">{FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}</Badge>
              {field.is_required && <Badge variant="warning" size="sm">Required</Badge>}
              {field.is_filterable && <Badge variant="success" size="sm">Filterable</Badge>}
              {field.is_showcase && <Badge variant="accent" size="sm">Showcase</Badge>}
            </div>
          </div>
          <div className="hidden text-right md:block">
            {field.config && <ConfigSummary field={field} />}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(!expanded)} className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]" aria-label={expanded ? "Collapse" : "Expand"}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {confirming ? (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-xs text-[var(--accent)]">Delete?</span>
                <button onClick={onDeleteClick} className="rounded px-2 py-0.5 text-xs font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)]">Yes</button>
                <button onClick={onCancelDelete} className="rounded px-2 py-0.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">No</button>
              </div>
            ) : (
              <button onClick={onDeleteClick} className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]" aria-label="Delete field"><Trash2 size={16} /></button>
            )}
          </div>
        </div>
        {expanded && field.config && (
          <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Configuration</h4>
            <pre className="mt-1 overflow-auto rounded-md bg-[var(--bg-base)] p-2 text-xs text-[var(--text-secondary)]">{JSON.stringify(field.config, null, 2)}</pre>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Config summary
// ---------------------------------------------------------------------------

function ConfigSummary({ field }: { field: Field }) {
  if (!field.config) return null;
  switch (field.field_type) {
    case "number":
      return <span className="text-xs text-[var(--text-muted)]">{field.config.min !== undefined && `min: ${field.config.min}`}{field.config.min !== undefined && field.config.max !== undefined && " · "}{field.config.max !== undefined && `max: ${field.config.max}`}{field.config.unit && ` ${field.config.unit}`}</span>;
    case "select":
    case "multi_select":
      return <span className="text-xs text-[var(--text-muted)]">{field.config.options?.length ?? 0} options</span>;
    case "rating":
      return <span className="text-xs text-[var(--text-muted)]">1–{field.config.max ?? 5} stars</span>;
    case "tags":
      return <span className="text-xs text-[var(--text-muted)]">{field.config.max_tags ? `max ${field.config.max_tags} tags` : "unlimited"}</span>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Settings tab — edit type properties
// ---------------------------------------------------------------------------

function SettingsTab({ type }: { type: AssetType }) {
  const [name, setName] = useState(type.name);
  const [description, setDescription] = useState(type.description ?? "");
  const [division, setDivision] = useState(type.division);
  const [isInternal, setIsInternal] = useState(type.is_internal);
  const [isPublic, setIsPublic] = useState(type.is_public);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/asset-types/${type.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          division,
          is_internal: isInternal,
          is_public: isPublic,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {saveError && (
        <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />
      )}
      <Card className="border-[var(--border-default)]">
        <CardHeader>
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">General</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input label="Name" value={name} onChange={setName} />
          <Input label="Slug" value={type.slug} onChange={() => {}} helpText="Cannot be changed after creation." />
          <Input label="Description" value={description} onChange={setDescription} />
          <Select
            label="Division"
            value={division}
            onChange={setDivision}
            options={[
              { value: "vault_product", label: "Vault (Developer Assets)" },
              { value: "vault_service", label: "Vault (Services)" },
              { value: "shop_product", label: "Shop (Consumer Products)" },
              { value: "shop_service", label: "Shop (Services)" },
              { value: "community", label: "Community" },
            ]}
          />
        </CardBody>
      </Card>

      <Card className="border-[var(--border-default)]">
        <CardHeader>
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Visibility</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <Toggle label="Internal Library" description="Show this asset type in the studio's internal asset library." checked={isInternal} onChange={setIsInternal} />
          <Toggle label="Public Marketplace" description="List assets of this type on the public marketplace storefront." checked={isPublic} onChange={setIsPublic} />
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Field Modal — calls POST /api/asset-types/[slug]/fields
// ---------------------------------------------------------------------------

function AddFieldModal({ slug, onClose, onCreated }: { slug: string; onClose: () => void; onCreated: () => void }) {
  const [label, setLabel] = useState("");
  const [fieldSlug, setFieldSlug] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [isRequired, setIsRequired] = useState(false);
  const [isFilterable, setIsFilterable] = useState(false);
  const [isShowcase, setIsShowcase] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLabelChange = (value: string) => {
    setLabel(value);
    setFieldSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  };

  const handleCreate = async () => {
    if (!label.trim() || !fieldSlug.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/asset-types/${slug}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: fieldSlug.trim(),
          label: label.trim(),
          field_type: fieldType,
          is_required: isRequired,
          is_filterable: isFilterable,
          is_showcase: isShowcase,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      onCreated();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Field"
      description="Define a custom metadata field for this asset type."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button disabled={!label.trim() || !fieldSlug.trim() || submitting} onClick={handleCreate}>
            {submitting ? "Adding..." : "Add Field"}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}
      <div className="space-y-4">
        <Input label="Label" placeholder="Polygon Count" value={label} onChange={handleLabelChange} />
        <Input label="Slug" placeholder="polygon_count" value={fieldSlug} onChange={setFieldSlug} helpText="Auto-generated from label. Lowercase with underscores." />
        <Select
          label="Field Type"
          value={fieldType}
          onChange={setFieldType}
          options={Object.entries(FIELD_TYPE_LABELS).map(([val, lab]) => ({ value: val, label: lab }))}
        />
        <div className="space-y-3">
          <Toggle label="Required" description="Must be filled before an asset can be saved." checked={isRequired} onChange={setIsRequired} />
          <Toggle label="Filterable" description="Show as a filter in the library and marketplace." checked={isFilterable} onChange={setIsFilterable} />
          <Toggle label="Showcase" description="Display on the marketplace product card." checked={isShowcase} onChange={setIsShowcase} />
        </div>
      </div>
    </Modal>
  );
}
