import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET as listHandler, POST as createHandler } from "@/app/api/asset-types/route";
import {
  GET as getHandler,
  PATCH as updateHandler,
  DELETE as deleteHandler,
} from "@/app/api/asset-types/[slug]/route";
import {
  nextRunId,
  createTestAssetType,
  cleanupTestData,
  nukeTestData,
} from "./helpers";

describe("Asset Types API", () => {
  let runId: number;
  let assetTypeId: string;

  beforeEach(() => {
    runId = nextRunId();
  });

  afterEach(async () => {
    await cleanupTestData({
      assetTypeIds: assetTypeId ? [assetTypeId] : [],
    });
    assetTypeId = "";
  });

  afterAll(async () => {
    await nukeTestData();
  });

  // -----------------------------------------------------------------------
  // GET /api/asset-types (list)
  // -----------------------------------------------------------------------

  it("lists asset types (initially empty)", async () => {
    const res = await listHandler();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("includes a created asset type in the list", async () => {
    const at = await createTestAssetType(runId);
    assetTypeId = at.id;

    const res = await listHandler();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.some((t: any) => t.slug === at.slug)).toBe(true);
  });

  // -----------------------------------------------------------------------
  // GET /api/asset-types/[slug] (single)
  // -----------------------------------------------------------------------

  it("returns 200 for an existing asset type slug", async () => {
    const at = await createTestAssetType(runId);
    assetTypeId = at.id;

    const res = await getHandler(
      new NextRequest(`http://localhost/api/asset-types/${at.slug}`),
      { params: Promise.resolve({ slug: at.slug }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe(at.slug);
    expect(body.name).toBe(at.name);
  });

  it("returns 404 for a nonexistent asset type slug", async () => {
    const res = await getHandler(
      new NextRequest("http://localhost/api/asset-types/nonexistent"),
      { params: Promise.resolve({ slug: "nonexistent" }) },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // POST /api/asset-types (create)
  // -----------------------------------------------------------------------

  it("creates an asset type with valid data", async () => {
    // Slug must match /^[a-z0-9-]+$/ — underscores are rejected by Zod validation.
    // Use hyphens only; keep the test marker in the name for nukeTestData cleanup.
    const slug = `test-${runId}-post-test`;
    const res = await createHandler(
      new NextRequest("http://localhost/api/asset-types", {
        method: "POST",
        body: JSON.stringify({
          slug,
          name: `${marker(runId)} POST Test`,
          division: "vault_product",
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toBe(slug);
    expect(body.division).toBe("vault_product");
    assetTypeId = body.id;

    // Verify it exists in DB
    const found = await prisma.assetType.findUnique({ where: { slug } });
    expect(found).not.toBeNull();
  });

  it("returns 400 for an invalid slug", async () => {
    const res = await createHandler(
      new NextRequest("http://localhost/api/asset-types", {
        method: "POST",
        body: JSON.stringify({
          slug: "UPPERCASE_INVALID",
          name: "Bad Slug",
          division: "vault_product",
        }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for an invalid division", async () => {
    const res = await createHandler(
      new NextRequest("http://localhost/api/asset-types", {
        method: "POST",
        body: JSON.stringify({
          slug: `__test_${runId}-bad-div`,
          name: "Bad Division",
          division: "invalid",
        }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // PATCH /api/asset-types/[slug] (update)
  // -----------------------------------------------------------------------

  it("updates an asset type name", async () => {
    const at = await createTestAssetType(runId);
    assetTypeId = at.id;

    const newName = `${marker(runId)} Updated Name`;
    const res = await updateHandler(
      new NextRequest(`http://localhost/api/asset-types/${at.slug}`, {
        method: "PATCH",
        body: JSON.stringify({ name: newName }),
      }),
      { params: Promise.resolve({ slug: at.slug }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe(newName);
  });

  it("returns 404 when patching a nonexistent asset type", async () => {
    const res = await updateHandler(
      new NextRequest("http://localhost/api/asset-types/nonexistent", {
        method: "PATCH",
        body: JSON.stringify({ name: "Nope" }),
      }),
      { params: Promise.resolve({ slug: "nonexistent" }) },
    );
    expect(res.status).toBe(404);
  });

  // -----------------------------------------------------------------------
  // DELETE /api/asset-types/[slug]
  // -----------------------------------------------------------------------

  it("deletes an asset type", async () => {
    const at = await createTestAssetType(runId);
    assetTypeId = at.id;

    const delRes = await deleteHandler(
      new NextRequest(`http://localhost/api/asset-types/${at.slug}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ slug: at.slug }) },
    );
    expect(delRes.status).toBe(200);

    // Verify it's gone
    const getRes = await getHandler(
      new NextRequest(`http://localhost/api/asset-types/${at.slug}`),
      { params: Promise.resolve({ slug: at.slug }) },
    );
    expect(getRes.status).toBe(404);

    // Reset so afterEach doesn't try to delete again
    assetTypeId = "";
  });

  it("returns 404 when deleting a nonexistent asset type", async () => {
    const res = await deleteHandler(
      new NextRequest("http://localhost/api/asset-types/nonexistent", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ slug: "nonexistent" }) },
    );
    expect(res.status).toBe(404);
  });
});

function marker(runId: number): string {
  return `__test_${runId}`;
}
