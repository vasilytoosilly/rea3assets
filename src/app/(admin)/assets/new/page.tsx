"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Button, Input, DynamicIcon, ErrorBanner, Select, Skeleton, Toggle } from "@/components/ui";
import type { FieldConfig } from "@/lib/validations/fields";
import { ImageIcon, File as FileIcon, Package } from "lucide-react";

// ---------------------------------------------------------------------------
// New Asset form — schema-driven with premium dark aesthetic
// ---------------------------------------------------------------------------

interface AssetTypeSummary {
  id: string; slug: string; name: string; icon: string | null; division: string; fields: FieldDef[];
}

interface FieldDef {
  id: string; slug: string; label: string; field_type: string; config: FieldConfig | null;
  is_required: boolean; is_filterable: boolean; is_showcase: boolean;
  placeholder: string | null; help_text: string | null; sort_order: number;
}

export default function NewAssetPage() {
  const router = useRouter();
  const [types, setTypes] = useState<AssetTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [selectedType, setSelectedType] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try { setLoading(true); const res = await fetch("/api/asset-types"); if (!res.ok) throw new Error(`API returned ${res.status}`); setTypes(await res.json()); }
      catch (err) { setError(String(err)); } finally { setLoading(false); }
    }
    load();
  }, []);

  const handleSubmit = async () => {
    if (!selectedType || !name.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ asset_type_slug: selectedType, name: name.trim(), description: description.trim() || undefined, metadata }) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? `HTTP ${res.status}`); }
      router.push(`/assets/${(await res.json()).id}`);
    } catch (err) { setError(String(err)); } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="mx-auto max-w-2xl space-y-6" aria-hidden="true">
      <Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" />
      <Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-20 rounded-xl" />
      <div className="flex items-center justify-end gap-3"><Skeleton className="h-10 w-24 rounded-lg" /><Skeleton className="h-10 w-32 rounded-lg" /></div>
    </div>
  );

  if (error && types.length === 0) return (
    <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-16 text-center">
      <ErrorBanner message={error} onRetry={() => window.location.reload()} />
    </div>
  );

  const currentType = types.find((t) => t.slug === selectedType);
  const sortedFields = currentType ? [...currentType.fields].sort((a, b) => a.sort_order - b.sort_order) : [];

  return (
    <div className={`mx-auto max-w-2xl space-y-6 transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
      <PageHeader title="New Asset" subtitle="Create a new asset in your library." eyebrow="Create" icon={<Package size={20} />} />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Type selector */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
        <label className="label block">Asset Type <span className="text-[var(--accent)]">*</span></label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {types.map((t) => (
            <button key={t.id} onClick={() => { setSelectedType(t.slug); setMetadata({}); }}
              className={`rounded-xl border p-3.5 text-left transition-all duration-200 ${
                selectedType === t.slug ? "border-[var(--accent)] bg-[var(--accent-muted)] shadow-[0_0_16px_rgba(255,77,77,0.06)]" : "border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-active)]"
              }`}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)]"><DynamicIcon name={t.icon} size={20} /></span>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{t.division.replace(/_/g, " ")}</p>
                </div>
              </div>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">{t.fields.length} field{t.fields.length !== 1 ? "s" : ""}</p>
            </button>
          ))}
        </div>
        {types.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border-default)] p-6 text-center">
            <p className="text-sm text-[var(--text-muted)]">No asset types yet. <a href="/asset-types" className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline">Create one first</a>.</p>
          </div>
        )}
      </div>

      {/* Basic info */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
        <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Basic Info</h3>
        <Input label="Name *" placeholder="My Awesome Asset" value={name} onChange={setName} />
        <Input label="Description" placeholder="A brief description of this asset" value={description} onChange={setDescription} />
      </div>

      {/* Dynamic fields */}
      {currentType && sortedFields.length > 0 && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Custom Fields</h3>
          {sortedFields.map((field) => (
            <DynamicField key={field.id} field={field} value={metadata[field.slug]} onChange={(val) => setMetadata((prev) => ({ ...prev, [field.slug]: val }))} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
        <Button disabled={!selectedType || !name.trim() || submitting} onClick={handleSubmit}>{submitting ? "Creating..." : "Create Asset"}</Button>
      </div>
    </div>
  );
}

function DynamicField({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const label = <label className="label mb-1.5 block">{field.label}{field.is_required && <span className="ml-1 text-[var(--accent)]">*</span>}</label>;
  const helpText = field.help_text && <p className="mt-1 text-[10px] text-[var(--text-muted)]">{field.help_text}</p>;
  const baseInput = "block w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-150 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

  switch (field.field_type) {
    case "text": case "url": case "color":
      return <div>{label}<input type={field.field_type === "color" ? "color" : "text"} placeholder={field.placeholder ?? ""} value={String(value ?? "")} onChange={(e) => onChange(e.target.value || undefined)} className={baseInput} />{helpText}</div>;
    case "textarea":
      return <div>{label}<textarea placeholder={field.placeholder ?? ""} value={String(value ?? "")} onChange={(e) => onChange(e.target.value || undefined)} rows={3} className={baseInput} />{helpText}</div>;
    case "number": case "rating": {
      const cfg = field.config ?? {};
      return <div>{label}<input type="number" min={field.field_type === "rating" ? 1 : cfg.min} max={field.field_type === "rating" ? cfg.max ?? 5 : cfg.max} step={cfg.step ?? "any"} placeholder={field.placeholder ?? ""} value={String(value ?? "")} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)} className={baseInput} />{helpText}</div>;
    }
    case "boolean": return <div>{label}<Toggle checked={!!value} onChange={(checked) => onChange(checked)} />{helpText}</div>;
    case "select": {
      const options = field.config?.options ?? [];
      return <div><Select label={field.label} placeholder={field.placeholder ?? "Select..."} value={String(value ?? "")} onChange={(v) => onChange(v || undefined)} options={options.map((opt: string) => ({ value: opt, label: opt }))} required={field.is_required} helpText={field.help_text ?? undefined} /></div>;
    }
    case "multi_select": {
      const options = field.config?.options ?? [];
      const selected: string[] = Array.isArray(value) ? value : [];
      return <div>{label}<div className="flex flex-wrap gap-2">{options.map((opt: string) => { const active = selected.includes(opt); return <button key={opt} onClick={() => onChange(active ? selected.filter((s) => s !== opt) : [...selected, opt])} className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}>{opt}</button>; })}</div>{helpText}</div>;
    }
    case "date": return <div>{label}<input type="date" value={String(value ?? "")} onChange={(e) => onChange(e.target.value || undefined)} className={baseInput} />{helpText}</div>;
    case "tags": {
      const tags: string[] = Array.isArray(value) ? value : [];
      const maxTags = field.config?.max_tags;
      return <div>{label}<div className="flex flex-wrap gap-1 mb-2">{tags.map((tag, i) => (<span key={i} className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">{tag}<button onClick={() => onChange(tags.filter((_, j) => j !== i))} className="hover:text-[var(--accent)]">×</button></span>))}</div>{(!maxTags || tags.length < maxTags) && (<div className="flex gap-2"><input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); onChange([...tags, tagInput.trim()]); setTagInput(""); } }} placeholder="Type and press Enter" className={baseInput} /><Button size="sm" variant="secondary" disabled={!tagInput.trim()} onClick={() => { onChange([...tags, tagInput.trim()]); setTagInput(""); }}>Add</Button></div>)}{helpText}</div>;
    }
    case "richtext": return <div>{label}<textarea placeholder={field.placeholder ?? "Markdown supported..."} value={String(value ?? "")} onChange={(e) => onChange(e.target.value || undefined)} rows={5} className={`${baseInput} font-mono text-xs`} />{helpText}</div>;
    case "image": case "file": {
      const fileValue = value as { filename?: string; url?: string; size_bytes?: number } | undefined;
      const handleFile = async (file: File) => {
        if (!file) return; setUploading(true); setUploadError(null);
        try { const formData = new FormData(); formData.append("file", file); const res = await fetch("/api/upload", { method: "POST", body: formData }); if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.error ?? `Upload failed`); } const stored = await res.json(); if (!mountedRef.current) return; onChange({ filename: stored.originalName, url: stored.url, size_bytes: stored.sizeBytes }); }
        catch (err) { if (!mountedRef.current) return; setUploadError(String(err)); } finally { if (mountedRef.current) setUploading(false); }
      };
      return <div>{label}<input ref={fileInputRef} type="file" accept={field.field_type === "image" ? "image/*" : undefined} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = ""; }} />{fileValue ? (<div className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3"><div className="flex items-center gap-2 min-w-0"><span className="text-lg text-[var(--accent)]">{field.field_type === "image" ? <ImageIcon size={20} /> : <FileIcon size={20} />}</span><div className="truncate"><p className="text-sm text-[var(--text-primary)] truncate">{fileValue.filename}</p>{fileValue.size_bytes && <p className="text-xs text-[var(--text-muted)]">{formatFileSize(fileValue.size_bytes)}</p>}</div></div><button onClick={() => onChange(undefined)} className="text-[var(--text-muted)] hover:text-[var(--accent)] text-sm">✕</button></div>) : (<button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 text-center transition-colors hover:bg-[var(--bg-hover)]">{uploading ? <span className="text-xs text-[var(--text-muted)]">Uploading...</span> : <><span className="text-[var(--text-muted)]">{field.field_type === "image" ? <ImageIcon size={24} /> : <FileIcon size={24} />}</span><p className="text-xs text-[var(--text-muted)]">Click to upload</p></>}</button>)}{uploadError && <div className="mt-1"><ErrorBanner message={uploadError} onDismiss={() => setUploadError(null)} /></div>}{helpText}</div>;
    }
    default: return null;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024; const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
