import { NextRequest, NextResponse } from "next/server";
import { prisma, isPrismaConflict } from "@/lib/prisma";
import { createPipelineSchema } from "@/lib/validations/pipelines";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET  /api/pipelines  → list all pipeline configs with steps + asset type
// POST /api/pipelines  → create a new pipeline config
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const pipelines = await prisma.pipelineConfig.findMany({
      include: {
        steps: { orderBy: { sort_order: "asc" } },
        asset_type: { select: { slug: true, name: true, icon: true } },
        _count: { select: { runs: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(pipelines);
  } catch (error) {
    logger.error("Failed to list pipelines", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { asset_type_slug, ...rest } = body as { asset_type_slug: string; [key: string]: unknown };

    if (!asset_type_slug) {
      return NextResponse.json({ error: "asset_type_slug is required" }, { status: 400 });
    }

    const assetType = await prisma.assetType.findUnique({ where: { slug: asset_type_slug } });
    if (!assetType) {
      return NextResponse.json({ error: "Asset type not found" }, { status: 404 });
    }

    const parsed = createPipelineSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const pipeline = await prisma.pipelineConfig.create({
      data: {
        ...parsed.data,
        asset_type_id: assetType.id,
      },
    });

    logger.info("Pipeline created", { name: pipeline.name, assetType: asset_type_slug });
    return NextResponse.json(pipeline, { status: 201 });
  } catch (error) {
    if (isPrismaConflict(error)) {
      return NextResponse.json(
        { error: "A pipeline with this name already exists for this asset type" },
        { status: 409 },
      );
    }
    logger.error("Failed to create pipeline", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
