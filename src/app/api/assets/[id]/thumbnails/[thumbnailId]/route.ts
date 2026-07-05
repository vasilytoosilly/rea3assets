import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string; thumbnailId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id, thumbnailId } = await params;

    const existing = await prisma.assetThumbnail.findFirst({
      where: { id: thumbnailId, asset_id: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
    }

    await prisma.assetThumbnail.delete({ where: { id: thumbnailId } });
    logger.info("Thumbnail deleted", { assetId: id, thumbId: thumbnailId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete thumbnail", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
