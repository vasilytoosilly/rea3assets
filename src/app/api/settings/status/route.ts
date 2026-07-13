import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET /api/settings/status  → live application status endpoint
// ---------------------------------------------------------------------------

export async function GET() {
  const status: {
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
  } = {
    version: "0.5.0",
    environment: process.env.NODE_ENV ?? "development",
    database: "disconnected",
    db_name: "rea3_assets",
    asset_types: 0,
    total_assets: 0,
    published_assets: 0,
    tag_groups: 0,
    pipelines: 0,
    has_auth: !!process.env.ADMIN_PASSWORD,
    has_erp_key: !!process.env.ERP_INTERNAL_API_KEY,
    erp_status: "untested",
    erp_url: process.env.ERP_INTERNAL_URL ?? "http://localhost:3000",
    upload_dir: process.env.UPLOAD_DIR ?? "./uploads",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = "connected";

    const [assetTypes, totalAssets, publishedAssets, tagGroups, pipelines] =
      await Promise.all([
        prisma.assetType.count(),
        prisma.asset.count(),
        prisma.asset.count({ where: { status: "published" } }),
        prisma.tagGroup.count(),
        prisma.pipelineConfig.count(),
      ]);

    status.asset_types = assetTypes;
    status.total_assets = totalAssets;
    status.published_assets = publishedAssets;
    status.tag_groups = tagGroups;
    status.pipelines = pipelines;
  } catch (error) {
    logger.error("Status check: DB unreachable", { error: String(error) });
  }

  // Probe ERP health (fire-and-forget with short timeout)
  if (status.has_erp_key) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${status.erp_url}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      status.erp_status = res.ok ? "connected" : "disconnected";
    } catch {
      status.erp_status = "disconnected";
    }
  } else {
    status.erp_status = "untested";
  }

  return NextResponse.json(status);
}
