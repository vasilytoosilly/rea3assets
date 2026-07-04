import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// PATCH /api/assets/[id]/versions/[versionId]  → update version properties
// DELETE /api/assets/[id]/versions/[versionId]  → delete a version
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string; versionId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id, versionId } = await params;

    const version = await prisma.assetVersion.findFirst({
      where: { id: versionId, asset_id: id },
    });
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, changelog, file_path, file_size, file_hash, format } = body;

    const data: Record<string, any> = {};
    if (status !== undefined) data.status = status;
    if (changelog !== undefined) data.changelog = changelog;
    if (file_path !== undefined) data.file_path = file_path;
    if (file_size !== undefined) data.file_size = BigInt(file_size);
    if (file_hash !== undefined) data.file_hash = file_hash;
    if (format !== undefined) data.format = format;

    const updated = await prisma.assetVersion.update({
      where: { id: versionId },
      data,
    });

    logger.info("Asset version updated", { assetId: id, versionId, status: updated.status });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Failed to update version", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id, versionId } = await params;

    const version = await prisma.assetVersion.findFirst({
      where: { id: versionId, asset_id: id },
    });
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    await prisma.assetVersion.delete({ where: { id: versionId } });
    logger.info("Asset version deleted", { assetId: id, versionId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete version", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
