// ---------------------------------------------------------------------------
// Storage Abstraction
// ---------------------------------------------------------------------------
// Interface for storing and retrieving uploaded files.
// Default implementation writes to the local filesystem under uploads/.
// Swap implementations without changing callers.

import { randomUUID } from "node:crypto";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredFile {
  /** Unique storage key (e.g. "ab/cd/ef-uuid-v1.png") */
  key: string;
  /** Original filename from the upload */
  originalName: string;
  /** MIME type */
  mimeType: string;
  /** Size in bytes */
  sizeBytes: number;
  /** Public URL for the file (file:// or http://) */
  url: string;
}

export interface StorageBackend {
  /** Store a file buffer and return storage metadata. */
  store(filename: string, buffer: Buffer, mimeType: string): Promise<StoredFile>;
  /** Delete a file by key. No-op if not found. */
  delete(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Local Filesystem Storage
// ---------------------------------------------------------------------------

function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

function keyFromFilename(filename: string): string {
  const ext = path.extname(filename) || "";
  const dir = randomUUID().slice(0, 2);
  const uuid = randomUUID();
  return `${dir}/${uuid}${ext}`;
}

export const localStorage: StorageBackend = {
  async store(filename, buffer, _mimeType) {
    const key = keyFromFilename(filename);
    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, key);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);

    const url = `/api/files/${key}`;
    logger.info("File stored", { key, size: buffer.length });

    return {
      key,
      originalName: filename,
      mimeType: _mimeType,
      sizeBytes: buffer.length,
      url,
    };
  },

  async delete(key) {
    try {
      const uploadDir = getUploadDir();
      const filePath = path.join(uploadDir, key);
      await unlink(filePath);
      logger.info("File deleted", { key });
    } catch {
      // no-op if doesn't exist
    }
  },
};

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

let _backend: StorageBackend = localStorage;

export function setStorageBackend(backend: StorageBackend): void {
  _backend = backend;
  logger.info("Storage backend replaced");
}

export function getStorage(): StorageBackend {
  return _backend;
}
