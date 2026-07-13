import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updatePipelineSchema } from "@/lib/validations/pipelines";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET    /api/pipelines/[id]  → get one pipeline with steps
// PATCH  /api/pipelines/[id]  → update pipeline config
// DELETE /api/pipelines/[id]  → delete pipeline and its steps
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const pipeline = await prisma.pipelineConfig.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { sort_order: "asc" } },
        asset_type: { select: { slug: true, name: true, icon: true } },
        runs: {
          orderBy: { created_at: "desc" },
          take: 20,
          include: {
            asset_version: { select: { id: true, version: true, asset: { select: { id: true, name: true, slug: true } } } },
            steps: { orderBy: { processor: "asc" }, select: { id: true, processor: true, status: true, error_message: true, started_at: true, completed_at: true } },
          },
        },
        _count: { select: { runs: true } },
      },
    });
    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }
    return NextResponse.json(pipeline);
  } catch (error) {
    logger.error("Failed to get pipeline", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const existing = await prisma.pipelineConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = updatePipelineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const updated = await prisma.pipelineConfig.update({
      where: { id },
      data: parsed.data,
    });
    logger.info("Pipeline updated", { id });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Failed to update pipeline", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const existing = await prisma.pipelineConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }
    // Cascade: delete step results for all runs, then runs, steps, and the pipeline itself
    const runs = await prisma.pipelineRun.findMany({
      where: { pipeline_id: id },
      select: { id: true },
    });
    if (runs.length > 0) {
      const runIds = runs.map((r) => r.id);
      await prisma.pipelineStepResult.deleteMany({ where: { run_id: { in: runIds } } });
      await prisma.pipelineRun.deleteMany({ where: { id: { in: runIds } } });
    }
    await prisma.pipelineStep.deleteMany({ where: { pipeline_id: id } });
    await prisma.pipelineConfig.delete({ where: { id } });
    logger.info("Pipeline deleted", { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete pipeline", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
