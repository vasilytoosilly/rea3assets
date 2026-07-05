"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  EmptyState,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Pipelines management page
// ---------------------------------------------------------------------------

interface AssetTypeSummary {
  slug: string;
  name: string;
  icon: string | null;
}

interface PipelineStep {
  id: string;
  processor: string;
  config: any;
  sort_order: number;
  on_failure: string;
  created_at: string;
}

interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  steps: PipelineStep[];
  asset_type: AssetTypeSummary;
  _count: { runs: number };
}

const PROCESSOR_ICONS: Record<string, string> = {
  thumbnail: "🖼️",
  "validate-format": "✅",
  "optimize-mesh": "🔧",
  "virus-scan": "🛡️",
  "generate-description": "🤖",
  watermark: "💧",
};

const PROCESSOR_LABELS: Record<string, string> = {
  thumbnail: "Generate Thumbnails",
  "validate-format": "Validate Format",
  "optimize-mesh": "Optimize Mesh",
  "virus-scan": "Virus Scan",
  "generate-description": "Generate Description",
  watermark: "Apply Watermark",
};

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [pRes, aRes] = await Promise.all([
        fetch("/api/pipelines"),
        fetch("/api/asset-types"),
      ]);
      if (!pRes.ok) throw new Error(`Pipelines API returned ${pRes.status}`);
      setPipelines(await pRes.json());
      if (aRes.ok) setAssetTypes(await aRes.json());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipelines"
        subtitle="Define processing pipelines per asset type — thumbnail generation, format validation, mesh optimization, and more."
        action={
          <Button onClick={() => setShowCreate(true)}>+ New Pipeline</Button>
        }
      />

      {loading && (
        <div className="flex items-center justify-center rounded-lg border border-dashed px-8 py-16"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading pipelines...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-8 py-16"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
          <p className="text-sm" style={{ color: "var(--accent)" }}>Failed to load</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchData}>Retry</Button>
        </div>
      )}

      {!loading && !error && pipelines.length === 0 && (
        <EmptyState
          icon="⚙️"
          title="No pipelines yet"
          description="Create pipelines to automate processing when new asset versions are uploaded."
          action={
            <Button onClick={() => setShowCreate(true)}>+ Create Pipeline</Button>
          }
        />
      )}

      {!loading && !error && pipelines.length > 0 && (
        <div className="space-y-4">
          {pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="border-[var(--border-default)]" href={`/pipelines/${pipeline.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                        {pipeline.name}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge size="sm">{pipeline.asset_type.name}</Badge>
                        {pipeline.is_default && <Badge variant="accent" size="sm">Default</Badge>}
                        <span className="text-xs text-[var(--text-muted)]">
                          {pipeline.steps.length} step{pipeline.steps.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                {pipeline.steps.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No steps configured. Add steps to define what this pipeline does.</p>
                ) : (
                  <div className="space-y-1">
                    {pipeline.steps.map((step, i) => (
                      <div key={step.id} className="flex items-center gap-3 rounded-md px-3 py-2"
                        style={{ backgroundColor: "var(--bg-elevated)" }}>
                        <span className="text-sm text-[var(--text-muted)]">{i + 1}.</span>
                        <span className="text-base">{PROCESSOR_ICONS[step.processor] ?? "⚙️"}</span>
                        <span className="flex-1 text-sm text-[var(--text-primary)]">
                          {PROCESSOR_LABELS[step.processor] ?? step.processor}
                        </span>
                        <Badge size="sm" variant={step.on_failure === "stop" ? "error" : step.on_failure === "skip" ? "warning" : "muted"}>
                          {step.on_failure}
                        </Badge>
                        {step.config && Object.keys(step.config).length > 0 && (
                          <code className="text-[10px] text-[var(--text-muted)]">{JSON.stringify(step.config)}</code>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <CreatePipelineModal
          assetTypes={assetTypes}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchData(); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Pipeline Modal
// ---------------------------------------------------------------------------

function CreatePipelineModal({
  assetTypes,
  onClose,
  onCreated,
}: {
  assetTypes: AssetTypeSummary[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [assetTypeSlug, setAssetTypeSlug] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !assetTypeSlug) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), asset_type_slug: assetTypeSlug, is_default: isDefault }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-lg border p-6"
        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
        <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-primary)]">Create Pipeline</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Define a processing pipeline for an asset type.</p>

        {error && (
          <div className="mt-4 rounded-md border p-3 text-sm"
            style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}>
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Default Processing"
              className="block w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Asset Type</label>
            <select value={assetTypeSlug} onChange={(e) => setAssetTypeSlug(e.target.value)}
              className="block w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]">
              <option value="">Select type...</option>
              {assetTypes.map((t) => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-default)]" />
            <span className="text-sm text-[var(--text-secondary)]">Set as default pipeline for this asset type</span>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button disabled={!name.trim() || !assetTypeSlug || submitting} onClick={handleCreate}>
            {submitting ? "Creating..." : "Create Pipeline"}
          </Button>
        </div>
      </div>
    </div>
  );
}
