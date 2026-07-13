"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, PROCESSOR_ICONS as PROCESSOR_ICON_MAP } from "@/components/ui";
import { Workflow } from "lucide-react";

interface StepResult {
  id: string;
  processor: string;
  status: string;
  output: unknown;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface RunDetail {
  id: string;
  status: string;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  steps: StepResult[];
  pipeline: { id: string; name: string };
  asset_version: {
    id: string;
    version: string;
    file_path: string | null;
    format: string | null;
    asset: { id: string; name: string; slug: string };
  };
}

const PROCESSOR_LABELS: Record<string, string> = {
  thumbnail: "Generate Thumbnails", "validate-format": "Validate Format",
  "optimize-mesh": "Optimize Mesh", "virus-scan": "Virus Scan",
  "generate-description": "Generate Description", watermark: "Apply Watermark",
};

export default function PipelineRunPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const runId = params?.runId as string;

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRun = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/pipelines/${id}`, { signal });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const pipeline = await res.json();
      const found = pipeline.runs?.find((r: { id: string }) => r.id === runId);
      if (!found) throw new Error("Run not found");
      setRun({ ...found, pipeline: { id: pipeline.id, name: pipeline.name } });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [id, runId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRun(controller.signal);
    return () => controller.abort();
  }, [fetchRun]);

  if (loading) {
    return <div className="rounded-lg border border-dashed px-8 py-16 text-center" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading run...</p>
    </div>;
  }

  if (error || !run) {
    return <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-8 py-16" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
      <p className="text-sm" style={{ color: "var(--accent)" }}>{error || "Run not found"}</p>
      <Button variant="secondary" size="sm" onClick={() => router.push(`/pipelines/${id}`)}>Back to pipeline</Button>
    </div>;
  }

  const sortedSteps = [...run.steps].sort((a, b) => {
    const order = ["pending", "running", "completed", "failed", "skipped"];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <a href="/pipelines" className="hover:text-[var(--text-primary)]">Pipelines</a>
        <span>/</span>
        <a href={`/pipelines/${id}`} className="hover:text-[var(--text-primary)]">{run.pipeline.name}</a>
        <span>/</span>
        <span className="text-[var(--text-primary)]">Run {runId.slice(0, 8)}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wider text-[var(--text-primary)]">
          Pipeline Run
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <a href={`/assets/${run.asset_version.asset.id}`} className="text-sm text-[var(--text-primary)] hover:underline">
            {run.asset_version.asset.name}
          </a>
          <span className="text-sm text-[var(--text-muted)]">v{run.asset_version.version}</span>
          {run.asset_version.format && <Badge size="sm" variant="muted">{run.asset_version.format}</Badge>}
          <Badge size="sm" variant={
            run.status === "completed" ? "success" : run.status === "failed" ? "error" : run.status === "running" ? "warning" : "muted"
          }>{run.status}</Badge>
        </div>
      </div>

      {run.error_message && <div className="rounded-md border p-3 text-sm" style={{ borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{run.error_message}</div>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Status" value={run.status} />
        <Stat label="Created" value={new Date(run.created_at).toLocaleString()} />
        <Stat label="Started" value={run.started_at ? new Date(run.started_at).toLocaleString() : "—"} />
        <Stat label="Completed" value={run.completed_at ? new Date(run.completed_at).toLocaleString() : "—"} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
          Steps ({sortedSteps.length})
        </h3>
        <div className="space-y-2">
          {sortedSteps.map((step) => {
            return (
              <div key={step.id} className="rounded-md border p-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg text-[var(--accent)]">{(() => { const I = PROCESSOR_ICON_MAP[step.processor] ?? Workflow; return <I size={18} />; })()}</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{PROCESSOR_LABELS[step.processor] ?? step.processor}</p>
                      <code className="text-[10px] text-[var(--text-muted)]">{step.processor}</code>
                    </div>
                  </div>
                  <Badge size="sm" variant={
                    step.status === "completed" ? "success" : step.status === "failed" ? "error" : step.status === "running" ? "warning" : "muted"
                  }>{step.status}</Badge>
                </div>
                {step.error_message && <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>{step.error_message}</p>}
                <div className="mt-2 flex gap-4 text-xs text-[var(--text-muted)]">
                  {step.started_at && <span>Started: {new Date(step.started_at).toLocaleString()}</span>}
                  {step.completed_at && <span>Done: {new Date(step.completed_at).toLocaleString()}</span>}
                </div>
                {step.output != null && <pre className="mt-2 rounded bg-[var(--bg-surface)] p-2 text-xs text-[var(--text-secondary)] overflow-auto">{JSON.stringify(step.output, null, 2)}</pre>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
