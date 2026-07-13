import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTagGroupSchema } from "@/lib/validations/tags";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET    /api/tag-groups/[slug]  → get one group with tags
// PATCH  /api/tag-groups/[slug]  → update a tag group
// DELETE /api/tag-groups/[slug]  → delete a group and its tags
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const group = await prisma.tagGroup.findUnique({
      where: { slug },
      include: { tags: { orderBy: { name: "asc" } } },
    });
    if (!group) {
      return NextResponse.json({ error: "Tag group not found" }, { status: 404 });
    }
    return NextResponse.json(group);
  } catch (error) {
    logger.error("Failed to get tag group", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    const existing = await prisma.tagGroup.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json({ error: "Tag group not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = updateTagGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }
    const group = await prisma.tagGroup.update({ where: { slug }, data: parsed.data });
    logger.info("Tag group updated", { slug });
    return NextResponse.json(group);
  } catch (error) {
    logger.error("Failed to update tag group", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const group = await prisma.tagGroup.findUnique({ where: { slug } });
    if (!group) {
      return NextResponse.json({ error: "Tag group not found" }, { status: 404 });
    }
    // Cascade: delete tag assignments, then tags, then the group
    await prisma.$transaction([
      prisma.assetTagAssignment.deleteMany({ where: { tag: { group_id: group.id } } }),
      prisma.tag.deleteMany({ where: { group_id: group.id } }),
      prisma.tagGroup.delete({ where: { slug } }),
    ]);
    logger.info("Tag group deleted", { slug });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete tag group", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
