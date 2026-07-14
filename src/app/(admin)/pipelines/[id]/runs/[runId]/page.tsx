"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, Button, Badge, Card, CardBody, CardHeader, ErrorBanner, Skeleton, PROCESSOR_ICONS as PROCESSOR_ICON_MAP } from "@/components/ui";
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
    return <div className="space-y-6">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1,2,3,4].map((i) => (
          <Card key={i} className="border-[var(--border-default)]"><CardBody className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-24" /></CardBody></Card>
        ))}
      </div>
      <div className="space-y-2">
        {[1,2].map((i) => (
          <Card key={i} className="border-[var(--border-default)]"><CardBody className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></CardBody></Card>
        ))}
      </div>
    </div>;
  }

  if (error || !run) {
    return <div className="space-y-4">
      <ErrorBanner message={error || "Run not found"} onRetry={fetchRun} />
      <div>
        <Button variant="secondary" size="sm" onClick={() => router.push(`/pipelines/${id}`)}>Back to pipeline</Button>
      </div>
    </div>;
  }

  const sortedSteps = [...run.steps].sort((a, b) => {
    const order = ["pending", "running", "completed", "failed", "skipped"];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline Run"
        subtitle={`Run ${runId.slice(0, 8)} for ${run.pipeline.name}`}
      />

      <nav className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <a href="/pipelines" className="hover:text-[var(--text-primary)]">Pipelines</a>
        <span>/</span>
        <a href={`/pipelines/${id}`} className="hover:text-[var(--text-primary)]">{run.pipeline.name}</a>
        <span>/</span>
        <span className="text-[var(--text-primary)]">Run {runId.slice(0, 8)}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <a href={`/assets/${run.asset_version.asset.id}`} className="text-sm text-[var(--text-primary)] hover:underline">
          {run.asset_version.asset.name}
        </a>
        <span className="text-sm text-[var(--text-muted)]">v{run.asset_version.version}</span>
        {run.asset_version.format && <Badge size="sm" variant="muted">{run.asset_version.format}</Badge>}
        <Badge size="sm" variant={
          run.status === "completed" ? "success" : run.status === "failed" ? "error" : run.status === "running" ? "warning" : "muted"
        }>{run.status}</Badge>
      </div>

      {run.error_message && <ErrorBanner message={run.error_message} />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Status" value={run.status} />
        <StatCard label="Created" value={new Date(run.created_at).toLocaleString()} />
        <StatCard label="Started" value={run.started_at ? new Date(run.started_at).toLocaleString() : "—"} />
        <StatCard label="Completed" value={run.completed_at ? new Date(run.completed_at).toLocaleString() : "—"} />
      </div>

      <Card className="border-[var(--border-default)]">
        <CardHeader>
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Steps ({sortedSteps.length})
          </h3>
        </CardHeader>
        <CardBody className="space-y-2">
          {sortedSteps.map((step) => (
            <div key={step.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 transition-colors hover:border-[var(--border-active)]">
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
              {step.error_message && <p className="mt-2 text-xs text-red-500">{step.error_message}</p>}
              <div className="mt-2 flex gap-4 text-xs text-[var(--text-muted)]">
                {step.started_at && <span>Started: {new Date(step.started_at).toLocaleString()}</span>}
                {step.completed_at && <span>Done: {new Date(step.completed_at).toLocaleString()}</span>}
              </div>
              {step.output != null && <pre className="mt-2 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3 text-xs text-[var(--text-secondary)]">{JSON.stringify(step.output, null, 2)}</pre>}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-[var(--border-default)]">
      <CardBody>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
        <p className="mt-1 text-sm text-[var(--text-primary)]">{value}</p>
      </CardBody>
    </Card>
  );
}
