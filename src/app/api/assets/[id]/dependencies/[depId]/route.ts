import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string; depId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id, depId } = await params;

    const existing = await prisma.assetDependency.findFirst({
      where: { id: depId, asset_id: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Dependency not found" }, { status: 404 });
    }

    await prisma.assetDependency.delete({ where: { id: depId } });
    logger.info("Asset dependency deleted", { assetId: id, depId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete dependency", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
