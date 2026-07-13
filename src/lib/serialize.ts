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
  if (typeof obj === "bigint") return Number(obj) as unknown as T;
  if (Array.isArray(obj)) {
    const arr = obj as unknown as unknown[];
    for (let i = 0; i < arr.length; i++) {
      arr[i] = serializeBigInts(arr[i]);
    }
    return obj;
  }
  if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      record[key] = serializeBigInts(record[key]);
    }
    return obj;
  }
  return obj;
}
