import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignTagsSchema } from "@/lib/validations/tags";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET  /api/assets/[id]/tags  → list assigned tags with group info
// POST /api/assets/[id]/tags  → set tags for an asset (replaces existing)
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const assignments = await prisma.assetTagAssignment.findMany({
      where: { asset_id: id },
      include: { tag: { include: { group: true } } },
    });
    return NextResponse.json(assignments);
  } catch (error) {
    logger.error("Failed to list asset tags", { error: String(error) });
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
    const parsed = assignTagsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    // Replace all tag assignments in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.assetTagAssignment.deleteMany({ where: { asset_id: id } });
      if (parsed.data.tag_ids.length > 0) {
        await tx.assetTagAssignment.createMany({
          data: parsed.data.tag_ids.map((tag_id) => ({ asset_id: id, tag_id })),
        });
      }
    });

    logger.info("Asset tags updated", { assetId: id, count: parsed.data.tag_ids.length });
    return NextResponse.json({ success: true, tag_ids: parsed.data.tag_ids });
  } catch (error) {
    logger.error("Failed to assign tags", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
