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

  return { baseUrl, apiKey };
}

interface ErpResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function erpFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ErpResponse<T>> {
  const { baseUrl, apiKey } = getConfig();

  if (!apiKey) {
    return { success: false, error: "ERP_INTERNAL_API_KEY not configured" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

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
      return {
        success: false,
        error: body?.error ?? body?.message ?? `ERP returned ${res.status}`,
      };
    }

    return { success: true, data: body as T };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { success: false, error: "ERP request timed out after 10s" };
    }
    return { success: false, error: err?.message ?? String(err) };
  }
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
 * The ERP expects: { sku, assets: [{ file_path, version, format, checksum }] }
 * The SKU must already exist in the ERP (created via admin UI or ingest script).
 */
export async function syncAsset(
  payload: SyncAssetPayload,
): Promise<ErpResponse<AssetSyncResult>> {
  const requestBody = {
    sku: payload.sku,
    assets: [{
      file_path: payload.file_path,
      version: payload.version,
      format: payload.format,
      checksum: payload.checksum ?? null,
    }],
  };

  const result = await erpFetch<AssetSyncResult>("/api/internal/assets/sync", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  if (result.success) {
    logger.info("Asset synced to ERP", {
      sku: payload.sku,
      version: payload.version,
    });
  } else {
    logger.warn("Asset sync to ERP failed", {
      sku: payload.sku,
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
  pagination: { page: number; limit: number; total: number; pages: number };
}>> {
  return erpFetch(`/api/internal/assets?sku=${encodeURIComponent(sku)}`);
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
  const requestBody = {
    skus: [{
      sku: payload.sku,
      name: payload.name,
      division: payload.division,
      family: payload.family,
      pillar: payload.pillar,
      license_model: payload.license_model,
      gateway: payload.gateway,
      currency: payload.currency,
    }],
  };

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

