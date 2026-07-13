import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { runPipeline, recoverStaleRuns } from "@/lib/pipeline/runner";

// ---------------------------------------------------------------------------
// POST /api/pipelines/[id]/run  → trigger a pipeline run for a specific asset version
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string }>;
}

const runPipelineSchema = z.object({
  asset_version_id: z.string().uuid(),
});

// Recover stale runs on first pipeline invocation (idempotent, no-op if none)
let staleRecoveryDone = false;

export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!staleRecoveryDone) {
    staleRecoveryDone = true;
    try {
      const recovered = await recoverStaleRuns();
      if (recovered > 0) {
        logger.warn("Recovered stale pipeline runs before starting new run", { count: recovered });
      }
    } catch (err) {
      logger.warn("Failed to recover stale runs", { error: String(err) });
    }
  }

  try {
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = runPipelineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { asset_version_id } = parsed.data;

    // Verify pipeline exists
    const pipeline = await prisma.pipelineConfig.findUnique({
      where: { id },
      include: { steps: { orderBy: { sort_order: "asc" } } },
    });

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    if (pipeline.steps.length === 0) {
      return NextResponse.json(
        { error: "Pipeline has no steps configured" },
        { status: 400 },
      );
    }

    // Verify asset version exists
    const assetVersion = await prisma.assetVersion.findUnique({
      where: { id: asset_version_id },
    });

    if (!assetVersion) {
      return NextResponse.json({ error: "Asset version not found" }, { status: 404 });
    }

    // Prevent duplicate runs on the same version
    const existingRun = await prisma.pipelineRun.findFirst({
      where: {
        asset_version_id,
        pipeline_id: id,
        status: { in: ["pending", "running"] },
      },
    });
    if (existingRun) {
      return NextResponse.json(
        { error: "A pipeline run is already pending or in progress for this version", run_id: existingRun.id },
        { status: 409 },
      );
    }

    // Create PipelineRun record
    const run = await prisma.pipelineRun.create({
      data: {
        asset_version_id,
        pipeline_id: id,
        status: "pending",
      },
    });

    // Create PipelineStepResult for each step
    await prisma.pipelineStepResult.createMany({
      data: pipeline.steps.map((step) => ({
        run_id: run.id,
        processor: step.processor,
        status: "pending",
      })),
    });

    logger.info("Pipeline run created, starting background execution", {
      runId: run.id,
      pipelineId: id,
      assetVersionId: asset_version_id,
      stepCount: pipeline.steps.length,
    });

    // Fire-and-forget — do NOT await
    runPipeline(run.id).catch((err) => {
      logger.error("Background pipeline run failed fatally", {
        runId: run.id,
        error: String(err),
      });
    });

    return NextResponse.json({ run_id: run.id }, { status: 202 });
  } catch (error) {
    logger.error("Failed to create pipeline run", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
