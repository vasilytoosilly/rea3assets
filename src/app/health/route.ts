import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET /health  → lightweight health check + asset counts for parity monitoring
// ---------------------------------------------------------------------------
// Returns 200 when the service is alive. Used by:
//   - the ERP connection test (src/app/api/settings/erp-test)
//   - the ERP status probe (src/app/api/settings/status)
//   - the ERP sync status dashboard (SKU parity comparison)
//   - external monitoring / load balancers
//
// This endpoint is listed as PUBLIC in proxy.ts so it requires no auth.

export async function GET() {
  try {
    const [assetCount, assetTypeCount, versionCount] = await Promise.all([
      prisma.asset.count(),
      prisma.assetType.count(),
      prisma.assetVersion.count(),
    ]);

    return NextResponse.json({
      status: "ok",
      service: "rea3-assets",
      timestamp: new Date().toISOString(),
      counts: {
        assets: assetCount,
        asset_types: assetTypeCount,
        versions: versionCount,
      },
    });
  } catch (error) {
    logger.error("Health check failed", { error: String(error) });
    return NextResponse.json(
      { status: "error", error: "Internal server error" },
      { status: 500 },
    );
  }
}
