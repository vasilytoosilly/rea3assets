// ---------------------------------------------------------------------------
// ERP Integration Client
// ---------------------------------------------------------------------------

import { logger } from "./logger";

function getConfig() {
  const baseUrl = process.env.ERP_INTERNAL_URL ?? "http://localhost:3000";
  const apiKey = process.env.ERP_INTERNAL_API_KEY;

  if (!apiKey) {
    logger.warn("ERP_INTERNAL_API_KEY not set — ERP sync calls will be skipped");
  }
  if (!process.env.ERP_INTERNAL_URL) {
    logger.warn("ERP_INTERNAL_URL not set — defaulting to http://localhost:3000");
  }

  return { baseUrl, apiKey };
}

interface ErpResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------

function getRetryConfig() {
  const maxRetries = parseInt(process.env.ERP_RETRY_MAX ?? "3", 10) || 3;
  const baseDelay = parseInt(process.env.ERP_RETRY_BASE_DELAY_MS ?? "200", 10) || 200;
  return { maxRetries, baseDelay };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status: number | undefined, err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof TypeError) return true; // network error
  if (status !== undefined && status >= 500) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Circuit breaker
// ---------------------------------------------------------------------------

interface CircuitState {
  failures: number;
  lastFailure: number;
  open: boolean;
}

const circuit: CircuitState = { failures: 0, lastFailure: 0, open: false };

function circuitBreakerConfig() {
  const threshold = parseInt(process.env.ERP_CB_THRESHOLD ?? "5", 10) || 5;
  const cooldownMs = parseInt(process.env.ERP_CB_COOLDOWN_MS ?? "30000", 10) || 30000;
  return { threshold, cooldownMs };
}

function checkCircuit(): string | null {
  const { cooldownMs } = circuitBreakerConfig();
  if (!circuit.open) return null;
  if (Date.now() - circuit.lastFailure > cooldownMs) {
    circuit.open = false;
    circuit.failures = 0;
    return null;
  }
  return "ERP circuit breaker open — too many recent failures";
}

function recordSuccess(): void {
  circuit.failures = 0;
  circuit.open = false;
}

function recordFailure(): void {
  const { threshold } = circuitBreakerConfig();
  circuit.failures++;
  circuit.lastFailure = Date.now();
  if (circuit.failures >= threshold) {
    circuit.open = true;
    logger.error("ERP circuit breaker opened", { failures: circuit.failures });
  }
}

// ---------------------------------------------------------------------------
// Core fetch with retry + circuit breaker
// ---------------------------------------------------------------------------

async function erpFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ErpResponse<T>> {
  const { baseUrl, apiKey } = getConfig();

  if (!apiKey) {
    return { success: false, error: "ERP_INTERNAL_API_KEY not configured" };
  }

  const cbError = checkCircuit();
  if (cbError) return { success: false, error: cbError };

  const timeoutMs = parseInt(process.env.ERP_REQUEST_TIMEOUT_MS ?? "10000", 10) || 10000;
  const { maxRetries, baseDelay } = getRetryConfig();

  let lastError: ErpResponse<T> = { success: false, error: "unknown" };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        lastError = {
          success: false,
          error: body?.error ?? body?.message ?? `ERP returned ${res.status}`,
        };

        if (isRetryable(res.status, null) && attempt < maxRetries) {
          const jitter = Math.random() * baseDelay;
          await delay(baseDelay * Math.pow(2, attempt) + jitter);
          continue;
        }
        recordFailure();
        return lastError;
      }

      recordSuccess();
      return { success: true, data: body as T };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = { success: false, error: `ERP request timed out after ${timeoutMs}ms` };
      } else if (err instanceof Error) {
        lastError = { success: false, error: err.message };
      } else {
        lastError = { success: false, error: String(err) };
      }

      if (isRetryable(undefined, err) && attempt < maxRetries) {
        const jitter = Math.random() * baseDelay;
        await delay(baseDelay * Math.pow(2, attempt) + jitter);
        continue;
      }
      recordFailure();
      return lastError;
    }
  }

  recordFailure();
  return lastError;
}

// ---------------------------------------------------------------------------
// Asset sync — the primary integration point
// ---------------------------------------------------------------------------

export interface SyncAssetPayload {
  sku: string;
  file_path: string;
  version: string;
  format: string;
  checksum?: string | null;
  currency?: string;
  gateway?: string;
  license_model?: string;
}

export interface AssetSyncResult {
  created: Array<{ file_path: string; version: string }>;
  updated: Array<{ file_path: string; version: string }>;
  unchanged: Array<{ file_path: string; version: string }>;
  failed: Array<{ file_path: string; error: string }>;
}

/**
 * Sync an asset file/version to the ERP's Asset table.
 * POST /api/internal/assets/sync on the ERP side.
 *
 * For multiple versions, prefer syncAssets() to batch them in one call.
 */
export async function syncAsset(
  payload: SyncAssetPayload,
): Promise<ErpResponse<AssetSyncResult>> {
  return syncAssets([payload]);
}

/**
 * Batch-sync multiple asset versions for the same SKU in one API call.
 * All payloads must share the same SKU.
 */
export async function syncAssets(
  payloads: SyncAssetPayload[],
): Promise<ErpResponse<AssetSyncResult>> {
  if (payloads.length === 0) {
    return { success: false, error: "No assets to sync" };
  }

  const sku = payloads[0]!.sku;
  const first = payloads[0]!;
  const requestBody: Record<string, unknown> = {
    sku,
    assets: payloads.map((p) => ({
      file_path: p.file_path,
      version: p.version,
      format: p.format,
      checksum: p.checksum ?? null,
    })),
  };
  if (first.currency) requestBody.currency = first.currency;
  if (first.gateway) requestBody.gateway = first.gateway;
  if (first.license_model) requestBody.license_model = first.license_model;

  const result = await erpFetch<AssetSyncResult>("/api/internal/assets/sync", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  if (result.success) {
    logger.info("Assets synced to ERP", {
      sku,
      count: payloads.length,
    });
  } else {
    logger.warn("Asset sync to ERP failed", {
      sku,
      count: payloads.length,
      error: result.error,
    });
  }

  return result;
}

/**
 * Query ERP for existing assets by SKU.
 * GET /api/internal/assets?sku=X on the ERP side.
 */
export async function getErpAssets(sku: string): Promise<ErpResponse<{
  data: Array<{ id: string; sku: string; file_path: string; version: string; format: string; checksum?: string | null }>;
  meta: { page: number; limit: number; total: number };
}>> {
  return erpFetch(`/api/internal/assets?sku=${encodeURIComponent(sku)}`);
}

/**
 * Delete an asset record from the ERP.
 * DELETE /api/internal/assets/{id} on the ERP side.
 */
export async function deleteErpAsset(assetId: string): Promise<ErpResponse<{ deleted: boolean; id: string }>> {
  const result = await erpFetch<{ deleted: boolean; id: string }>(
    `/api/internal/assets/${encodeURIComponent(assetId)}`,
    { method: "DELETE" },
  );

  if (result.success) {
    logger.info("ERP asset deleted", { assetId });
  } else {
    logger.warn("ERP asset delete failed", { assetId, error: result.error });
  }

  return result;
}

/**
 * Discover a SKU from the ERP by its code.
 * GET /api/internal/skus/{sku} on the ERP side.
 */
export async function getErpSku(sku: string): Promise<ErpResponse<{
  sku: string;
  name: string;
  division: string;
  family: string;
  pillar: string;
  license_model: string;
  currency: string;
  gateway: string;
  lifecycle_status: string;
  assets: Array<{ id: string; file_path: string; version: string }>;
}>> {
  return erpFetch(`/api/internal/skus/${encodeURIComponent(sku)}`);
}

// ---------------------------------------------------------------------------
// Legacy SKU sync — use with caution
// ---------------------------------------------------------------------------
// SKU management (pricing, licensing, gateway config) is handled directly in
// the ERP admin UI. This function exists for automated workflows but requires
// full commercial data the asset manager may not have.

export interface SyncSkuPayload {
  sku: string;
  name: string;
  division: string;
  family: string;
  pillar: string;
  license_model: string;
  gateway: string;
  currency: string;
  description?: string | null;
  price_personal?: number | null;
  price_commercial?: number | null;
  cost_basis_hours?: number | null;
  cost_basis_type?: string | null;
  account_category?: string | null;
  lifecycle_status?: string;
  version?: number;
  asset_type_name?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Bulk-upsert SKU metadata into the ERP's ProductSKU table.
 * POST /api/internal/sku-sync on the ERP side.
 *
 * The ERP expects: { skus: [{ sku, name, division, family, pillar,
 *   license_model, gateway, currency, ... }] }
 *
 * Prefer managing SKUs via the ERP product-master admin UI.
 */
export async function syncSku(payload: SyncSkuPayload): Promise<ErpResponse> {
  const skuEntry: Record<string, unknown> = {
    sku: payload.sku,
    name: payload.name,
    division: payload.division,
    family: payload.family,
    pillar: payload.pillar,
    license_model: payload.license_model,
    gateway: payload.gateway,
    currency: payload.currency,
  };
  if (payload.price_personal !== undefined) skuEntry.price_personal = payload.price_personal;
  if (payload.price_commercial !== undefined) skuEntry.price_commercial = payload.price_commercial;
  if (payload.cost_basis_hours !== undefined) skuEntry.cost_basis_hours = payload.cost_basis_hours;
  if (payload.cost_basis_type !== undefined) skuEntry.cost_basis_type = payload.cost_basis_type;
  if (payload.account_category !== undefined) skuEntry.account_category = payload.account_category;
  if (payload.lifecycle_status !== undefined) skuEntry.lifecycle_status = payload.lifecycle_status;
  if (payload.version !== undefined) skuEntry.version = payload.version;

  const requestBody = { skus: [skuEntry] };

  const result = await erpFetch("/api/internal/sku-sync", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  if (result.success) {
    logger.info("SKU synced to ERP", { sku: payload.sku });
  } else {
    logger.error("SKU sync failed", { sku: payload.sku, error: result.error });
  }

  return result;
}

