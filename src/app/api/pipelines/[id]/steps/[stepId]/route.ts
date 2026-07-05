import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateStepSchema, KNOWN_PROCESSORS } from "@/lib/validations/pipelines";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// PATCH  /api/pipelines/[id]/steps/[stepId]  → update a pipeline step
// DELETE /api/pipelines/[id]/steps/[stepId]  → delete a pipeline step
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string; stepId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id, stepId } = await params;

    const pipeline = await prisma.pipelineConfig.findUnique({ where: { id } });
    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    const existing = await prisma.pipelineStep.findFirst({
      where: { id: stepId, pipeline_id: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateStepSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    // If processor is being changed, validate it
    if (parsed.data.processor) {
      const known = KNOWN_PROCESSORS.find((p) => p.id === parsed.data.processor);
      if (!known) {
        return NextResponse.json(
          { error: `Unknown processor '${parsed.data.processor}'. Known: ${KNOWN_PROCESSORS.map((p) => p.id).join(", ")}` },
          { status: 400 },
        );
      }
    }

    const step = await prisma.pipelineStep.update({
      where: { id: stepId },
      data: parsed.data,
    });

    logger.info("Pipeline step updated", { pipelineId: id, stepId, processor: step.processor });
    return NextResponse.json(step);
  } catch (error) {
    logger.error("Failed to update step", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id, stepId } = await params;

    const pipeline = await prisma.pipelineConfig.findUnique({ where: { id } });
    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    const existing = await prisma.pipelineStep.findFirst({
      where: { id: stepId, pipeline_id: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    await prisma.pipelineStep.delete({ where: { id: stepId } });

    logger.info("Pipeline step deleted", { pipelineId: id, stepId, processor: existing.processor });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete step", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
