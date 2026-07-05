import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const thumbnails = await prisma.assetThumbnail.findMany({
      where: { asset_id: id },
      orderBy: { sort_order: "asc" },
    });
    return NextResponse.json(thumbnails);
  } catch (error) {
    logger.error("Failed to list thumbnails", { error: String(error) });
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

    const formData = await request.formData();
    const fileField = formData.get("file");
    const purpose = (formData.get("purpose") as string) ?? "gallery";

    if (!fileField || !(fileField instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Send multipart with a 'file' field." },
        { status: 400 },
      );
    }

    const maxBytes = 10 * 1024 * 1024;
    if (fileField.size > maxBytes) {
      return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await fileField.arrayBuffer());
    const storage = getStorage();
    const stored = await storage.store(fileField.name, buffer, fileField.type || "image/png");
    const fmt = fileField.name.split(".").pop()?.toLowerCase() ?? "png";

    const thumbnail = await prisma.assetThumbnail.create({
      data: {
        asset_id: id,
        url: stored.url,
        width: null,
        height: null,
        size_bytes: stored.sizeBytes,
        format: fmt,
        purpose,
        sort_order: 0,
      },
    });

    logger.info("Thumbnail created", { assetId: id, thumbId: thumbnail.id, format: fmt });
    return NextResponse.json(thumbnail, { status: 201 });
  } catch (error) {
    logger.error("Failed to create thumbnail", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
