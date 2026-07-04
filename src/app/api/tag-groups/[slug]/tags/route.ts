import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTagSchema } from "@/lib/validations/tags";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// POST /api/tag-groups/[slug]/tags  → create a tag inside a group
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    const group = await prisma.tagGroup.findUnique({ where: { slug } });
    if (!group) {
      return NextResponse.json({ error: "Tag group not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const tag = await prisma.tag.create({
      data: { ...parsed.data, group_id: group.id },
    });

    logger.info("Tag created", { group: slug, tag: tag.slug });
    return NextResponse.json(tag, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A tag with this slug already exists in this group" },
        { status: 409 },
      );
    }
    logger.error("Failed to create tag", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
