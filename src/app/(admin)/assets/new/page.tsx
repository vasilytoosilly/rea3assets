"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Button, Card, CardBody, Input, DynamicIcon } from "@/components/ui";
import type { FieldConfig } from "@/lib/validations/fields";
import { ImageIcon, File as FileIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// New Asset form — schema-driven: fields are fetched from the selected type
// ---------------------------------------------------------------------------

interface AssetTypeSummary {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  division: string;
  fields: FieldDef[];
}

interface FieldDef {
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

export default function NewAssetPage() {
  const router = useRouter();
  const [types, setTypes] = useState<AssetTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch asset types
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/asset-types");
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();
        setTypes(data);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async () => {
    if (!selectedType || !name.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_type_slug: selectedType,
          name: name.trim(),
          description: description.trim() || undefined,
          metadata,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const asset = await res.json();
      router.push(`/assets/${asset.id}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed px-8 py-16"
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (error && types.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-8 py-16"
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
        <p className="text-sm" style={{ color: "var(--accent)" }}>{error}</p>
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const currentType = types.find((t) => t.slug === selectedType);
  const sortedFields = currentType
    ? [...currentType.fields].sort((a, b) => a.sort_order - b.sort_order)
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="New Asset"
        subtitle="Create a new asset in your library."
      />

      {/* Error banner */}
      {error && (
        <div
          className="rounded-md border p-3 text-sm"
          style={{
            borderColor: "var(--accent)",
            backgroundColor: "var(--accent-muted)",
            color: "var(--accent)",
          }}
        >
          {error}
        </div>
      )}

      {/* Asset type selector */}
      <Card className="border-[var(--border-default)]">
        <CardBody className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Asset Type <span className="text-[var(--accent)]">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {types.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedType(t.slug);
                    setMetadata({});
                  }}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    selectedType === t.slug
                      ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                      : "border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-[var(--accent)]"><DynamicIcon name={t.icon} size={22} /></span>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{t.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{t.division.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    {t.fields.length} field{t.fields.length !== 1 ? "s" : ""}
                  </p>
                </button>
              ))}
            </div>
            {types.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center" style={{ borderColor: "var(--border-default)" }}>
                <p className="text-sm text-[var(--text-muted)]">
                  No asset types yet.{" "}
                  <a href="/asset-types" className="underline" style={{ color: "var(--accent)" }}>
                    Create one first
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Basic fields */}
      <Card className="border-[var(--border-default)]">
        <CardBody className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            Basic Info
          </h3>
          <Input
            label="Name *"
            placeholder="My Awesome Asset"
            value={name}
            onChange={setName}
          />
          <Input
            label="Description"
            placeholder="A brief description of this asset"
            value={description}
            onChange={setDescription}
          />
        </CardBody>
      </Card>

      {/* Dynamic metadata fields */}
      {currentType && sortedFields.length > 0 && (
        <Card className="border-[var(--border-default)]">
          <CardBody className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              Custom Fields
            </h3>
            {sortedFields.map((field) => (
              <DynamicField
                key={field.id}
                field={field}
                value={metadata[field.slug]}
                onChange={(val) =>
                  setMetadata((prev) => ({ ...prev, [field.slug]: val }))
                }
              />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          disabled={!selectedType || !name.trim() || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Creating..." : "Create Asset"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dynamic field renderer — renders the correct input based on field_type
// ---------------------------------------------------------------------------

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  // All hooks at the top level — never conditionally
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const label = (
    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
      {field.label}
      {field.is_required && <span className="ml-1 text-[var(--accent)]">*</span>}
    </label>
  );

  const helpText = field.help_text && (
    <p className="mt-1 text-[10px] text-[var(--text-muted)]">{field.help_text}</p>
  );

  const baseInput =
    "block w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

  switch (field.field_type) {
    case "text":
    case "url":
    case "color":
      return (
        <div>
          {label}
          <input
            type={field.field_type === "color" ? "color" : "text"}
            placeholder={field.placeholder ?? ""}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value || undefined)}
            className={baseInput}
          />
          {helpText}
        </div>
      );

    case "textarea":
      return (
        <div>
          {label}
          <textarea
            placeholder={field.placeholder ?? ""}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value || undefined)}
            rows={3}
            className={baseInput}
          />
          {helpText}
        </div>
      );

    case "number":
    case "rating": {
      const cfg = field.config ?? {};
      const min = field.field_type === "rating" ? 1 : cfg.min;
      const max = field.field_type === "rating" ? cfg.max ?? 5 : cfg.max;
      return (
        <div>
          {label}
          <input
            type="number"
            min={min}
            max={max}
            step={cfg.step ?? "any"}
            placeholder={field.placeholder ?? ""}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            className={baseInput}
          />            {helpText}
        </div>
      );
    }

    case "boolean":
      return (
        <div className="flex items-center justify-between">
          <div>
            {label}
            {helpText}
          </div>
          <button
            onClick={() => onChange(!value)}
            className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-[var(--accent)]" : "bg-[var(--bg-hover)]"}`}
            role="switch"
            aria-checked={!!value}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      );

    case "select": {
      const options = field.config?.options ?? [];
      return (
        <div>
          {label}
          <select
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value || undefined)}
            className={baseInput}
          >
            <option value="">{field.placeholder ?? "Select..."}</option>
            {options.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {helpText}
        </div>
      );
    }

    case "multi_select": {
      const options = field.config?.options ?? [];
      const selected: string[] = Array.isArray(value) ? value : [];
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2">
            {options.map((opt: string) => {
              const active = selected.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() =>
                    onChange(
                      active
                        ? selected.filter((s) => s !== opt)
                        : [...selected, opt],
                    )
                  }
                  className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {helpText}
        </div>
      );
    }

    case "date":
      return (
        <div>
          {label}
          <input
            type="date"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value || undefined)}
            className={baseInput}
          />
          {helpText}
        </div>
      );

    case "tags": {
      const tags: string[] = Array.isArray(value) ? value : [];
      const maxTags = field.config?.max_tags;
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
              >
                {tag}
                <button
                  onClick={() => onChange(tags.filter((_, j) => j !== i))}
                  className="hover:text-[var(--accent)]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {(!maxTags || tags.length < maxTags) && (
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault();
                    onChange([...tags, tagInput.trim()]);
                    setTagInput("");
                  }
                }}
                placeholder="Type and press Enter"
                className={baseInput}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={!tagInput.trim()}
                onClick={() => {
                  onChange([...tags, tagInput.trim()]);
                  setTagInput("");
                }}
              >
                Add
              </Button>
            </div>
          )}
          {helpText}
        </div>
      );
    }

    case "richtext":
      return (
        <div>
          {label}
          <textarea
            placeholder={field.placeholder ?? "Markdown supported..."}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value || undefined)}
            rows={5}
            className={`${baseInput} font-mono text-xs`}
          />
          {helpText}
        </div>
      );

    case "image":
    case "file": {
      const fileValue = value as { filename?: string; url?: string; size_bytes?: number } | undefined;

      const handleFile = async (file: File) => {
        if (!file) return;
        setUploading(true);
        setUploadError(null);
        try {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.error ?? `Upload failed (${res.status})`);
          }
          const stored = await res.json();
          if (!mountedRef.current) return;
          onChange({
            filename: stored.originalName,
            url: stored.url,
            size_bytes: stored.sizeBytes,
          });
        } catch (err) {
          if (!mountedRef.current) return;
          setUploadError(String(err));
        } finally {
          if (mountedRef.current) setUploading(false);
        }
      };

      return (
        <div>
          {label}
          <input
            ref={fileInputRef}
            type="file"
            accept={field.field_type === "image" ? "image/*" : undefined}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {fileValue ? (
            <div className="flex items-center justify-between rounded-md border p-3"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg text-[var(--accent)]">{field.field_type === "image" ? <ImageIcon size={20} /> : <FileIcon size={20} />}</span>
                <div className="truncate">
                  <p className="text-sm text-[var(--text-primary)] truncate">{fileValue.filename}</p>
                  {fileValue.size_bytes && (
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatFileSize(fileValue.size_bytes)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onChange(undefined)}
                className="text-[var(--text-muted)] hover:text-[var(--accent)] text-sm"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-md border border-dashed p-4 text-center transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}
            >
              {uploading ? (
                <span className="text-xs text-[var(--text-muted)]">Uploading...</span>
              ) : (
                <>
                  <span className="mb-1 text-[var(--text-muted)]">{field.field_type === "image" ? <ImageIcon size={24} /> : <FileIcon size={24} />}</span>
                  <p className="text-xs text-[var(--text-muted)]">
                    Click to upload {field.field_type === "image" ? "an image" : "a file"}
                  </p>
                </>
              )}
            </button>
          )}
          {uploadError && (
            <p className="mt-1 text-xs" style={{ color: "var(--accent)" }}>{uploadError}</p>
          )}
          {helpText}
        </div>
      );
    }

    default:
      return null;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
