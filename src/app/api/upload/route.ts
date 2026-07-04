import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// POST /api/upload
//
// Accepts multipart/form-data with a single file field.
// Returns storage metadata: { url, originalName, mimeType, sizeBytes }.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileField = formData.get("file");

    if (!fileField || !(fileField instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Send a multipart form with a 'file' field." },
        { status: 400 },
      );
    }

    // Validate file size (default 50MB)
    const maxBytes = 50 * 1024 * 1024;
    if (fileField.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxBytes / 1024 / 1024}MB.` },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await fileField.arrayBuffer());
    const storage = getStorage();

    const result = await storage.store(
      fileField.name,
      buffer,
      fileField.type || "application/octet-stream",
    );

    logger.info("File uploaded", {
      originalName: fileField.name,
      mimeType: fileField.type,
      size: fileField.size,
      key: result.key,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("Upload failed", { error: String(error) });
    return NextResponse.json(
      { error: "Upload failed. Ensure UPLOAD_DIR is writable." },
      { status: 500 },
    );
  }
}
