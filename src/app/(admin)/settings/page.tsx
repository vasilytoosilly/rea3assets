"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, CardBody, CardHeader, Badge, ErrorBanner, Skeleton } from "@/components/ui";

// ---------------------------------------------------------------------------
// General Settings page — fetches live status from /api/settings/status
// ---------------------------------------------------------------------------

interface SystemStatus {
  version: string;
  environment: string;
  database: "connected" | "disconnected";
  db_name: string;
  asset_types: number;
  total_assets: number;
  published_assets: number;
  tag_groups: number;
  pipelines: number;
  has_auth: boolean;
  has_erp_key: boolean;
  erp_status: "connected" | "disconnected" | "untested";
  erp_url: string;
  upload_dir: string;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch((err) => setLoadError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Application status and configuration overview."
      />

      {loadError && (
        <ErrorBanner message={`Failed to load status: ${loadError}`} onRetry={() => { setLoadError(null); window.location.reload(); }} onDismiss={() => setLoadError(null)} />
      )}

      <Card className="border-[var(--border-default)]">
        <CardHeader>
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Application
          </h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <InfoRow label="Version" value={status?.version ?? "—"} />
          <InfoRow label="Environment" value={status?.environment ?? "—"} />
          <InfoRow
            label="Database"
            value={
              status
                ? `PostgreSQL (${status.db_name}) — ${status.database}`
                : <Skeleton className="inline-block h-4 w-56" />
            }
          />
          <InfoRow
            label="DB Status"
            value={
              loading ? (
                "Checking..."
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      status?.database === "connected"
                        ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                        : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    }`}
                  />
                  {status?.database === "connected" ? "Connected" : "Disconnected"}
                </span>
              )
            }
          />
          <InfoRow
            label="Auth"
            value={
              <Badge variant={status?.has_auth ? "success" : "muted"} size="sm">
                {status?.has_auth ? "Enabled" : "Disabled (dev mode)"}
              </Badge>
            }
          />
          <InfoRow label="Upload Dir" value={status?.upload_dir ?? "—"} mono />
        </CardBody>
      </Card>

      <Card className="border-[var(--border-default)]">
        <CardHeader>
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Asset Manager
          </h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <InfoRow label="Asset Types" value={status?.asset_types ?? "—"} />
          <InfoRow label="Total Assets" value={status?.total_assets ?? "—"} />
          <InfoRow
            label="Published Assets"
            value={status?.published_assets ?? "—"}
          />
          <InfoRow
            label="Custom Fields"
            value="14 field types (text, number, select, image, file, rating, etc.)"
          />
          <InfoRow
            label="Pipelines"
            value={status ? `${status.pipelines} configured` : "—"}
          />
          <InfoRow label="Tag Groups" value={status?.tag_groups ?? "—"} />
          <InfoRow label="ERP Integration" value={status?.has_erp_key ? "Configured" : "Not configured"} />
        </CardBody>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] py-3 first:pt-0 last:border-0 last:pb-0">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <span className={`text-sm text-[var(--text-primary)] ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
