import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { serializeBigInts } from "@/lib/serialize";

// ---------------------------------------------------------------------------
// GET  /api/assets/[id]/versions  → list versions for an asset
// POST /api/assets/[id]/versions  → create a new version
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const versions = await prisma.assetVersion.findMany({
      where: { asset_id: id },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(serializeBigInts(versions));
  } catch (error) {
    logger.error("Failed to list versions", { error: String(error), assetId: (await params).id });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const { version, changelog, file_path, file_size, file_hash, format } = body;

    if (!version || typeof version !== "string") {
      return NextResponse.json({ error: "Version string is required" }, { status: 400 });
    }

    const created = await prisma.assetVersion.create({
      data: {
        asset_id: id,
        version,
        changelog: changelog ?? null,
        file_path: file_path ?? null,
        file_size: file_size ? BigInt(file_size) : null,
        file_hash: file_hash ?? null,
        format: format ?? null,
        status: file_path ? "uploaded" : "draft",
      },
    });

    // Auto-trigger default pipeline if a file was uploaded
    if (file_path) {
      try {
        const pipeline = await prisma.pipelineConfig.findFirst({
          where: { asset_type_id: asset.asset_type_id, is_default: true },
          include: { steps: { orderBy: { sort_order: "asc" } } },
        });

        if (pipeline && pipeline.steps.length > 0) {
          const run = await prisma.pipelineRun.create({
            data: {
              asset_version_id: created.id,
              pipeline_id: pipeline.id,
              status: "pending",
              steps: {
                create: pipeline.steps.map((step) => ({
                  processor: step.processor,
                  status: "pending",
                })),
              },
            },
          });
          logger.info("Pipeline run created for version", { versionId: created.id, runId: run.id, pipeline: pipeline.name });
        }
      } catch (pipelineErr) {
        logger.warn("Failed to trigger pipeline", { error: String(pipelineErr), versionId: created.id });
      }
    }

    logger.info("Asset version created", { assetId: id, version });
    return NextResponse.json(serializeBigInts(created), { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "This version already exists for this asset" },
        { status: 409 },
      );
    }
    logger.error("Failed to create version", { error: String(error), assetId: (await params).id });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
