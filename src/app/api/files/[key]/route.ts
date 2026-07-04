import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// GET /api/files/[key]  → serve an uploaded file
// ---------------------------------------------------------------------------

function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

// Minimal MIME map for common extensions
const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".rbxm": "application/octet-stream",
  ".rbxmx": "application/octet-stream",
  ".fbx": "application/octet-stream",
  ".blend": "application/octet-stream",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
};

interface RouteContext {
  params: Promise<{ key: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { key } = await params;

    // Prevent path traversal — only allow single-level paths like "ab/uuid.ext"
    if (!/^[a-f0-9]{2}\/[a-f0-9-]+\.[a-zA-Z0-9]+$/.test(key)) {
      return NextResponse.json({ error: "Invalid file key" }, { status: 400 });
    }

    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, key);
    const buffer = await readFile(filePath);

    const ext = path.extname(key).toLowerCase();
    const contentType = MIME_MAP[ext] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
