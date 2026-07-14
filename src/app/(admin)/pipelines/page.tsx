"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Button, Badge, EmptyState, ErrorBanner, Modal, Select, Input, Skeleton, showToast, PROCESSOR_ICONS as PROCESSOR_ICON_MAP } from "@/components/ui";
import { Workflow } from "lucide-react";

// ---------------------------------------------------------------------------
// Pipelines management page — premium dark aesthetic
// ---------------------------------------------------------------------------

interface AssetTypeSummary { slug: string; name: string; icon: string | null; }
interface PipelineStep { id: string; processor: string; config: Record<string, unknown> | null; sort_order: number; on_failure: string; created_at: string; }
interface Pipeline { id: string; name: string; is_default: boolean; created_at: string; steps: PipelineStep[]; asset_type: AssetTypeSummary; _count: { runs: number }; }

const PROCESSOR_LABELS: Record<string, string> = {
  thumbnail: "Generate Thumbnails", "validate-format": "Validate Format", "optimize-mesh": "Optimize Mesh",
  "virus-scan": "Virus Scan", "generate-description": "Generate Description", watermark: "Apply Watermark",
};

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    try { setLoading(true); setError(null);
      const [pRes, aRes] = await Promise.all([fetch("/api/pipelines"), fetch("/api/asset-types")]);
      if (!pRes.ok) throw new Error(`Pipelines API returned ${pRes.status}`);
      setPipelines(await pRes.json());
      if (aRes.ok) setAssetTypes(await aRes.json());
    } catch (err) { setError(String(err)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipelines"
        subtitle="Define processing pipelines per asset type — thumbnail generation, format validation, mesh optimization, and more."
        eyebrow="Automation"
        icon={<Workflow size={20} />}
        action={<Button onClick={() => setShowCreate(true)}>+ New Pipeline</Button>}
      />

      {loading && (
        <div className="space-y-4" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
              <div className="border-b border-[var(--border-default)] px-5 py-4"><Skeleton className="h-4 w-40" /><div className="mt-2 flex gap-2"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div></div>
              <div className="px-5 py-4 space-y-2">{Array.from({ length: 2 }).map((_, j) => (<div key={j} className="flex items-center gap-3 rounded-lg bg-[var(--bg-elevated)] px-3 py-2"><Skeleton className="h-5 w-5" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-5 w-16 rounded-full" /></div>))}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && <ErrorBanner message={error} onRetry={fetchData} onDismiss={() => setError(null)} />}

      {!loading && !error && pipelines.length === 0 && (
        <EmptyState icon={<Workflow size={48} />} title="No pipelines yet" description="Create pipelines to automate processing when new asset versions are uploaded."
          action={<Button onClick={() => setShowCreate(true)}>+ Create Pipeline</Button>} />
      )}

      {!loading && !error && pipelines.length > 0 && (
        <div className={`space-y-4 transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {pipelines.map((pipeline) => (
            <a key={pipeline.id} href={`/pipelines/${pipeline.id}`}
              className="group block rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] transition-all duration-200 hover:border-[var(--border-active)] hover:bg-[var(--bg-elevated)] hover:shadow-[0_0_24px_rgba(255,77,77,0.04)]"
            >
              <div className="border-b border-[var(--border-default)] px-5 py-4">
                <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">{pipeline.name}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <Badge size="sm" variant="muted">{pipeline.asset_type.name}</Badge>
                  {pipeline.is_default && <Badge variant="accent" size="sm">Default</Badge>}
                  <span className="text-xs text-[var(--text-muted)]">{pipeline.steps.length} step{pipeline.steps.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className="px-5 py-4">
                {pipeline.steps.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No steps configured.</p>
                ) : (
                  <div className="space-y-1">
                    {pipeline.steps.map((step, i) => (
                      <div key={step.id} className="flex items-center gap-3 rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
                        <span className="text-sm text-[var(--text-muted)]">{i + 1}.</span>
                        <span className="text-base text-[var(--accent)]">{(() => { const I = PROCESSOR_ICON_MAP[step.processor] ?? Workflow; return <I size={18} />; })()}</span>
                        <span className="flex-1 text-sm text-[var(--text-primary)]">{PROCESSOR_LABELS[step.processor] ?? step.processor}</span>
                        <Badge size="sm" variant={step.on_failure === "stop" ? "error" : step.on_failure === "skip" ? "warning" : "muted"}>{step.on_failure}</Badge>
                        {step.config && Object.keys(step.config).length > 0 && <code className="text-[10px] text-[var(--text-muted)]">{JSON.stringify(step.config)}</code>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      {showCreate && <CreatePipelineModal assetTypes={assetTypes} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchData(); }} />}
    </div>
  );
}

function CreatePipelineModal({ assetTypes, onClose, onCreated }: { assetTypes: AssetTypeSummary[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState(""); const [assetTypeSlug, setAssetTypeSlug] = useState("");
  const [isDefault, setIsDefault] = useState(false); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState<string | null>(null);
  const handleCreate = async () => {
    if (!name.trim() || !assetTypeSlug) return; setSubmitting(true); setError(null);
    try { const res = await fetch("/api/pipelines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), asset_type_slug: assetTypeSlug, is_default: isDefault }) }); if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? `HTTP ${res.status}`); } showToast("success", `Pipeline "${name.trim()}" created`); onCreated(); }
    catch (err) { setError(String(err)); } finally { setSubmitting(false); }
  };
  return (
    <Modal isOpen={true} onClose={onClose} title="Create Pipeline" description="Define a processing pipeline for an asset type." maxWidth="max-w-md"
      footer={<><Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button><Button disabled={!name.trim() || !assetTypeSlug || submitting} onClick={handleCreate}>{submitting ? "Creating..." : "Create Pipeline"}</Button></>}>
      {error && <div className="mb-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}
      <div className="space-y-4">
        <Input label="Name" placeholder="Default Processing" value={name} onChange={setName} />
        <Select label="Asset Type" value={assetTypeSlug} onChange={setAssetTypeSlug} placeholder="Select type..." options={assetTypes.map((t) => ({ value: t.slug, label: t.name }))} />
        <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-input)] accent-[var(--accent)]" /><span className="text-sm text-[var(--text-secondary)]">Set as default pipeline for this asset type</span></label>
      </div>
    </Modal>
  );
}
