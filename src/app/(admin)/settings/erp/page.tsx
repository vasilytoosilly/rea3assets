"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, CardBody, CardHeader, Button, Badge } from "@/components/ui";

// ---------------------------------------------------------------------------
// ERP Integration settings page
// ---------------------------------------------------------------------------

export default function ErpSettingsPage() {
  const [erpUrl, setErpUrl] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings/erp-config")
      .then((r) => r.json())
      .then((data) => {
        setErpUrl(data.erp_url ?? "http://localhost:3000");
        setHasApiKey(data.has_api_key ?? false);
      })
      .catch((err) => setConfigError(String(err)))
      .finally(() => setLoadingConfig(false));
  }, []);

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestMessage("");
    try {
      const res = await fetch("/api/settings/erp-test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTestStatus("success");
        setTestMessage(data.message ?? "Connected successfully");
      } else {
        setTestStatus("error");
        setTestMessage(data.error ?? "Connection failed");
      }
    } catch (err) {
      setTestStatus("error");
      setTestMessage(String(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="ERP Integration"
        subtitle="Configure connectivity with the ReA3 core ERP for SKU sync."
      />

      {configError && (
        <div className="rounded-md border p-3 text-sm"
          style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}>
          Failed to load ERP config: {configError}
        </div>
      )}

      <Card className="border-[var(--border-default)]">
        <CardHeader>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            Connection
          </h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <InfoRow label="ERP URL" value={loadingConfig ? "Loading..." : (erpUrl || "Not configured")} />
          <InfoRow label="API Key" value={loadingConfig ? "Loading..." : (hasApiKey ? "••••••••" : "Not configured")} />
          <div className="flex items-center gap-3 pt-2">
            <Button size="sm" onClick={handleTestConnection} disabled={testStatus === "testing"}>
              {testStatus === "testing" ? "Testing..." : "Test Connection"}
            </Button>
            {testStatus === "success" && <Badge variant="success">Connected</Badge>}
            {testStatus === "error" && <Badge variant="error">Failed</Badge>}
          </div>
          {testMessage && (
            <p className="text-xs" style={{ color: testStatus === "success" ? "#22c55e" : "var(--accent)" }}>
              {testMessage}
            </p>
          )}
        </CardBody>
      </Card>

      <Card className="border-[var(--border-default)]">
        <CardHeader>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            Integration Contract
          </h3>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-[var(--text-secondary)]">
          <p>
            When an asset is published, the Asset Manager calls{" "}
            <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs text-[var(--text-primary)]">
              POST /api/internal/sku-sync
            </code>{" "}
            on the ERP with the asset metadata to create or update a ProductSKU.
          </p>
          <p>
            The ERP&#39;s <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs text-[var(--text-primary)]">Asset</code> table is updated with
            the file path, version, and checksum after each publish.
          </p>
          <p>
            Configure the ERP connection using environment variables:
          </p>
          <pre className="rounded-md bg-[var(--bg-elevated)] p-3 text-xs text-[var(--text-muted)]">
{`ERP_INTERNAL_URL=http://localhost:3000
ERP_INTERNAL_API_KEY=your-api-key-here`}
          </pre>
        </CardBody>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
