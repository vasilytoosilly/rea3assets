import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTagSchema } from "@/lib/validations/tags";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// PATCH  /api/tag-groups/[slug]/tags/[tagSlug]  → update a tag
// DELETE /api/tag-groups/[slug]/tags/[tagSlug]  → delete a tag
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ slug: string; tagSlug: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug, tagSlug } = await params;

    const group = await prisma.tagGroup.findUnique({ where: { slug } });
    if (!group) {
      return NextResponse.json({ error: "Tag group not found" }, { status: 404 });
    }

    const tag = await prisma.tag.findFirst({
      where: { group_id: group.id, slug: tagSlug },
    });
    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const updated = await prisma.tag.update({
      where: { id: tag.id },
      data: parsed.data,
    });

    logger.info("Tag updated", { group: slug, tag: tagSlug });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Failed to update tag", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { slug, tagSlug } = await params;

    const group = await prisma.tagGroup.findUnique({ where: { slug } });
    if (!group) {
      return NextResponse.json({ error: "Tag group not found" }, { status: 404 });
    }

    const tag = await prisma.tag.findFirst({
      where: { group_id: group.id, slug: tagSlug },
    });
    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await prisma.tag.delete({ where: { id: tag.id } });
    logger.info("Tag deleted", { group: slug, tag: tagSlug });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete tag", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
