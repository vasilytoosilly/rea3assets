import { NextRequest, NextResponse } from "next/server";
import { syncSku } from "@/lib/erp-client";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// POST /api/internal/sku-sync  → forward SKU data to the ERP
// ---------------------------------------------------------------------------
// This endpoint is called when rea3assets needs to sync an asset's SKU
// to the core ERP. It delegates to erp-client.ts which handles the
// actual HTTP call to the ERP's internal API.
//
// Also serves as an inbound endpoint if the ERP calls US to sync back,
// but the primary direction is rea3assets → ERP for SKU creation/update.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.sku || !body.name) {
      return NextResponse.json(
        { error: "sku and name are required" },
        { status: 400 },
      );
    }

    const result = await syncSku({
      sku: body.sku,
      name: body.name,
      division: body.division ?? "vault_product",
      family: body.family ?? "default",
      pillar: body.pillar ?? "I",
      license_model: body.license_model ?? "na",
      gateway: body.gateway ?? "manual",
      currency: body.currency ?? "USD",
      description: body.description ?? null,
      asset_type_name: body.asset_type_name ?? "Unknown",
      metadata: body.metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, sku: body.sku });
  } catch (error) {
    logger.error("Internal SKU sync failed", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
