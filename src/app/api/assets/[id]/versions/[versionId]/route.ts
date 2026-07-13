import { NextRequest, NextResponse } from "next/server";
import { Prisma, type VersionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { serializeBigInts } from "@/lib/serialize";

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

    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { status, changelog, file_path, file_size, file_hash, format } = body as {
      status?: string;
      changelog?: string;
      file_path?: string;
      file_size?: string;
      file_hash?: string;
      format?: string;
    };

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status as VersionStatus;
    if (changelog !== undefined) data.changelog = changelog;
    if (file_path !== undefined) data.file_path = file_path;
    if (file_size !== undefined) data.file_size = file_size ? BigInt(file_size) : null;
    if (file_hash !== undefined) data.file_hash = file_hash;
    if (format !== undefined) data.format = format;

    const updated = await prisma.assetVersion.update({
      where: { id: versionId },
      data: data as Prisma.AssetVersionUpdateInput,
    });

    logger.info("Asset version updated", { assetId: id, versionId, status: updated.status });
    return NextResponse.json(serializeBigInts(updated));
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
