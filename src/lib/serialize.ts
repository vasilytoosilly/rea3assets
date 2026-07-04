// ---------------------------------------------------------------------------
// JSON Serialization Helpers
// ---------------------------------------------------------------------------
// Prisma returns BigInt for @db.Decimal / BigInt fields, but NextResponse.json
// (which uses JSON.stringify) cannot serialize BigInt values.
// Use these helpers to convert BigInt → number before returning JSON responses.

/**
 * Deep-convert BigInt values to numbers in an object tree.
 * Modifies in-place for performance.
 */
export function serializeBigInts<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj) as any;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      (obj as any)[i] = serializeBigInts((obj as any)[i]);
    }
    return obj;
  }
  if (typeof obj === "object") {
    for (const key of Object.keys(obj as any)) {
      (obj as any)[key] = serializeBigInts((obj as any)[key]);
    }
    return obj;
  }
  return obj;
}
