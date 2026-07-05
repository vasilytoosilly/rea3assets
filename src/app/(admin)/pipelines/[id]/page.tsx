"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Badge,
} from "@/components/ui";

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

const KNOWN_PROCESSORS = [
  { id: "thumbnail", label: "Generate Thumbnails", description: "Auto-generate gallery/cover thumbnails." },
  { id: "validate-format", label: "Validate Format", description: "Check file format against accepted types." },
  { id: "optimize-mesh", label: "Optimize Mesh", description: "Reduce polygon count for real-time performance." },
  { id: "virus-scan", label: "Virus Scan", description: "Scan uploaded file for malware." },
  { id: "generate-description", label: "Generate Description", description: "AI-powered metadata enrichment." },
  { id: "watermark", label: "Apply Watermark", description: "Overlay preview watermark on marketplace assets." },
];

interface PipelineStep {
  id: string;
  processor: string;
  config: any;
  sort_order: number;
  on_failure: string;
  created_at: string;
}

interface PipelineDetail {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  steps: PipelineStep[];
  asset_type: { slug: string; name: string; icon: string | null };
  runs: PipelineRunSummary[];
  _count: { runs: number };
}

interface PipelineRunSummary {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  error_message: string | null;
  asset_version: { id: string; version: string; asset: { id: string; name: string; slug: string } };
  steps: Array<{ id: string; processor: string; status: string; error_message: string | null; started_at: string | null; completed_at: string | null }>;
}

export default function PipelineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [pipeline, setPipeline] = useState<PipelineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeletePipeline, setConfirmDeletePipeline] = useState(false);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchPipeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/pipelines/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Pipeline not found");
        throw new Error(`API returned ${res.status}`);
      }
      setPipeline(await res.json());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const handleDeletePipeline = async () => {
    try {
      setDeleteError(null);
      const res = await fetch(`/api/pipelines/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      router.push("/pipelines");
    } catch (err) {
      setDeleteError(String(err));
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed px-8 py-16 text-center"
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading pipeline...</p>
      </div>
    );
  }

  if (error || !pipeline) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-8 py-16"
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
        <p className="text-sm" style={{ color: "var(--accent)" }}>{error || "Pipeline not found"}</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchPipeline}>Retry</Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/pipelines")}>Back</Button>
        </div>
      </div>
    );
  }

  const sortedSteps = [...pipeline.steps].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <a href="/pipelines" className="hover:text-[var(--text-primary)]">Pipelines</a>
        <span>/</span>
        <span className="text-[var(--text-primary)]">{pipeline.name}</span>
      </nav>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wider text-[var(--text-primary)]">
            {pipeline.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{pipeline.asset_type.name}</Badge>
            {pipeline.is_default && <Badge variant="accent">Default</Badge>}
            <span className="text-xs text-[var(--text-muted)]">
              {sortedSteps.length} step{sortedSteps.length !== 1 ? "s" : ""}
              {" · "}{pipeline._count.runs} run{pipeline._count.runs !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {confirmDeletePipeline ? (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--accent)" }}>Delete this pipeline?</span>
              <Button size="sm" variant="danger" onClick={handleDeletePipeline}>Yes</Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDeletePipeline(false)}>No</Button>
            </div>
          ) : (
            <Button size="sm" variant="danger" onClick={() => setConfirmDeletePipeline(true)}>Delete</Button>
          )}
        </div>
      </div>

      {deleteError && (
        <div className="rounded-md border p-3 text-sm"
          style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}>
          {deleteError}
          <button onClick={() => setDeleteError(null)} className="ml-2 text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          Steps execute in order when a new asset version is uploaded. Each step transforms or validates the file before the next runs.
        </p>
        <Button size="sm" onClick={() => setShowAddStep(true)}>+ Add Step</Button>
      </div>

      {sortedSteps.length === 0 ? (
        <div className="rounded-lg border border-dashed px-8 py-16 text-center"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
          <p className="text-sm text-[var(--text-muted)]">No steps configured.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Add steps to define what this pipeline does when an asset version is uploaded.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {sortedSteps.map((step, i) => (
            <StepRow
              key={step.id}
              step={step}
              index={i}
              pipelineId={id}
              onUpdated={fetchPipeline}
              onDelete={() => {
                setConfirmDeleteId(step.id);
              }}
              confirming={confirmDeleteId === step.id}
              onCancelDelete={() => setConfirmDeleteId(null)}
            />
          ))}
        </div>
      )}

      {pipeline.runs && pipeline.runs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            Recent Runs ({pipeline._count.runs})
          </h3>
          <div className="space-y-2">
            {pipeline.runs.map((run) => (
              <div key={run.id} className="rounded-md border p-3 transition-colors hover:border-[var(--border-active)]" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
                <div className="flex items-center justify-between mb-2">
                  <a href={`/pipelines/${id}/runs/${run.id}`} className="text-sm font-medium text-[var(--text-primary)] hover:underline">
                    Run {run.id.slice(0, 8)} — {run.asset_version.asset.name} v{run.asset_version.version}
                  </a>
                  <Badge size="sm" variant={run.status === "completed" ? "success" : run.status === "failed" ? "error" : run.status === "running" ? "warning" : "muted"}>
                    {run.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {run.steps.map((s) => (
                    <span key={s.id} className="rounded px-1.5 py-0.5 text-[10px]"
                      style={{
                        backgroundColor: s.status === "completed" ? "rgba(34,197,94,0.15)" : s.status === "failed" ? "rgba(239,68,68,0.15)" : "rgba(115,115,115,0.15)",
                        color: s.status === "completed" ? "#22c55e" : s.status === "failed" ? "#ef4444" : "var(--text-muted)",
                        border: s.status === "running" ? "1px solid var(--accent)" : "1px solid transparent",
                      }}>
                      {s.processor}:{s.status}
                    </span>
                  ))}
                </div>
                {run.error_message && (
                  <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>{run.error_message}</p>
                )}
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  {new Date(run.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddStep && (
        <AddStepModal
          pipelineId={id}
          onClose={() => setShowAddStep(false)}
          onCreated={() => { setShowAddStep(false); fetchPipeline(); }}
        />
      )}
    </div>
  );
}

function StepRow({
  step,
  index,
  pipelineId,
  onUpdated,
  onDelete,
  confirming,
  onCancelDelete,
}: {
  step: PipelineStep;
  index: number;
  pipelineId: string;
  onUpdated: () => void;
  onDelete: () => void;
  confirming: boolean;
  onCancelDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [onFailure, setOnFailure] = useState(step.on_failure);
  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setStepError(null);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on_failure: onFailure }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditing(false);
      onUpdated();
    } catch (err) {
      setStepError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setStepError(null);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/steps/${step.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onUpdated();
    } catch (err) {
      setStepError(String(err));
    }
  };

  return (
    <div>
      {stepError && (
        <div className="mb-1 rounded-md border p-2 text-sm"
          style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}>
          {stepError}
          <button onClick={() => setStepError(null)} className="ml-2 text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
      <div className="flex items-center gap-3 rounded-md px-3 py-2.5"
        style={{ backgroundColor: "var(--bg-elevated)" }}>
      <span className="w-6 text-center text-sm text-[var(--text-muted)]">{index + 1}</span>
      <span className="text-lg">{PROCESSOR_ICONS[step.processor] ?? "⚙️"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {PROCESSOR_LABELS[step.processor] ?? step.processor}
          </span>
          <code className="text-[10px] text-[var(--text-muted)]">{step.processor}</code>
        </div>
        {step.config && Object.keys(step.config).length > 0 && (
          <code className="text-[10px] text-[var(--text-muted)]">{JSON.stringify(step.config)}</code>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <select
            value={onFailure}
            onChange={(e) => setOnFailure(e.target.value)}
            className="rounded border px-2 py-1 text-xs"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
          >
            <option value="stop">Stop pipeline</option>
            <option value="skip">Skip step</option>
            <option value="warn">Warn & continue</option>
          </select>
          <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "..." : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setOnFailure(step.on_failure); }}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Badge
            size="sm"
            variant={step.on_failure === "stop" ? "error" : step.on_failure === "skip" ? "warning" : "muted"}
          >
            {step.on_failure}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
          {confirming ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="danger" onClick={handleConfirmDelete}>Remove</Button>
              <Button size="sm" variant="ghost" onClick={onCancelDelete}>Keep</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={onDelete}>✕</Button>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

function AddStepModal({
  pipelineId,
  onClose,
  onCreated,
}: {
  pipelineId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [processor, setProcessor] = useState("");
  const [onFailure, setOnFailure] = useState("stop");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!processor) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processor, on_failure: onFailure }),
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
        <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-primary)]">Add Step</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Choose a processor to add to this pipeline.</p>

        {error && (
          <div className="mt-4 rounded-md border p-3 text-sm"
            style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}>
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Processor</label>
            <div className="space-y-1">
              {KNOWN_PROCESSORS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProcessor(p.id)}
                  className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                    processor === p.id
                      ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                      : "border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{PROCESSOR_ICONS[p.id] ?? "⚙️"}</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{p.label}</p>
                      <p className="text-xs text-[var(--text-muted)]">{p.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">On Failure</label>
            <select
              value={onFailure}
              onChange={(e) => setOnFailure(e.target.value)}
              className="block w-full rounded-md border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
            >
              <option value="stop">Stop pipeline</option>
              <option value="skip">Skip step & continue</option>
              <option value="warn">Warn & continue</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button disabled={!processor || submitting} onClick={handleCreate}>
            {submitting ? "Adding..." : "Add Step"}
          </Button>
        </div>
      </div>
    </div>
  );
}
