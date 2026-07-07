import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as listHandler, POST as createHandler } from "@/app/api/assets/route";
import {
  GET as getHandler,
  PATCH as updateHandler,
  DELETE as deleteHandler,
} from "@/app/api/assets/[id]/route";
import {
  nextRunId,
  createTestAssetType,
  createTestAsset,
  cleanupTestData,
  nukeTestData,
} from "./helpers";

describe("Assets API", () => {
  let runId: number;
  const createdAssetTypeIds: string[] = [];
  const createdAssetIds: string[] = [];

  beforeEach(() => {
    runId = nextRunId();
  });

  afterEach(async () => {
    await cleanupTestData({
      assetIds: [...createdAssetIds],
      assetTypeIds: [...createdAssetTypeIds],
    });
    createdAssetTypeIds.length = 0;
    createdAssetIds.length = 0;
  });

  afterAll(async () => {
    await nukeTestData();
  });

  // -----------------------------------------------------------------------
  // POST /api/assets (create)
  // -----------------------------------------------------------------------

  it("creates an asset via POST /api/assets", async () => {
    const at = await createTestAssetType(runId);
    createdAssetTypeIds.push(at.id);

    const res = await createHandler(
      new NextRequest("http://localhost/api/assets", {
        method: "POST",
        body: JSON.stringify({
          asset_type_slug: at.slug,
          name: `${marker(runId)} Test Asset`,
          metadata: { some_field: "value" },
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toContain(marker(runId));
    expect(body.asset_type_id).toBe(at.id);
    expect(body.division).toBe(at.division);
    createdAssetIds.push(body.id);
  });

  it("returns 400 when asset type slug is missing", async () => {
    const res = await createHandler(
      new NextRequest("http://localhost/api/assets", {
        method: "POST",
        body: JSON.stringify({ name: "No Type Asset" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 404 when asset type slug does not exist", async () => {
    const res = await createHandler(
      new NextRequest("http://localhost/api/assets", {
        method: "POST",
        body: JSON.stringify({
          asset_type_slug: "__test_nonexistent_type",
          name: "Ghost Type Asset",
        }),
      }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("not found");
  });

  // -----------------------------------------------------------------------
  // GET /api/assets (list)
  // -----------------------------------------------------------------------

  it("returns an empty list initially", async () => {
    const res = await listHandler(
      new NextRequest("http://localhost/api/assets"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(25);
  });

  it("returns paginated list with correct shape", async () => {
    const at = await createTestAssetType(runId);
    createdAssetTypeIds.push(at.id);

    const asset1 = await createTestAsset(runId, at.id, {
      name: `${marker(runId)} Asset 1`,
    });
    const asset2 = await createTestAsset(runId, at.id, {
      name: `${marker(runId)} Asset 2`,
    });
    createdAssetIds.push(asset1.id, asset2.id);

    const res = await listHandler(
      new NextRequest("http://localhost/api/assets"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.pagination.total).toBeGreaterThanOrEqual(2);
    expect(body.pagination.pages).toBeGreaterThanOrEqual(1);
  });

  it("filters by asset_type query param", async () => {
    const at1 = await createTestAssetType(runId, { slug: `${marker(runId)}-type-a`, name: `${marker(runId)} Type A` });
    const runId2 = nextRunId();
    const at2 = await createTestAssetType(runId2, { slug: `${marker(runId2)}-type-b`, name: `${marker(runId2)} Type B` });
    createdAssetTypeIds.push(at1.id, at2.id);

    const asset1 = await createTestAsset(runId, at1.id);
    const asset2 = await createTestAsset(runId2, at2.id);
    createdAssetIds.push(asset1.id, asset2.id);

    // Filter by first type
    const res = await listHandler(
      new NextRequest(`http://localhost/api/assets?type=${at1.slug}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    for (const item of body.data) {
      expect(item.asset_type.slug).toBe(at1.slug);
    }
  });

  it("supports pagination params", async () => {
    const at = await createTestAssetType(runId);
    createdAssetTypeIds.push(at.id);

    // Create several assets
    for (let i = 0; i < 3; i++) {
      const a = await createTestAsset(runId, at.id, {
        name: `${marker(runId)} Bulk ${i}`,
      });
      createdAssetIds.push(a.id);
    }

    const res = await listHandler(
      new NextRequest("http://localhost/api/assets?page=1&limit=2"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(2);
    expect(body.data.length).toBeLessThanOrEqual(2);
  });

  // -----------------------------------------------------------------------
  // GET /api/assets/[id] (single)
  // -----------------------------------------------------------------------

  it("returns 200 for an existing asset", async () => {
    const at = await createTestAssetType(runId);
    createdAssetTypeIds.push(at.id);

    const asset = await createTestAsset(runId, at.id);
    createdAssetIds.push(asset.id);

    const res = await getHandler(
      new NextRequest(`http://localhost/api/assets/${asset.id}`),
      { params: Promise.resolve({ id: asset.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(asset.id);
    expect(body.name).toBe(asset.name);
    expect(body.asset_type).toBeDefined();
    expect(body.versions).toBeDefined();
  });

  it("returns 404 for a nonexistent asset ID", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await getHandler(
      new NextRequest(`http://localhost/api/assets/${fakeId}`),
      { params: Promise.resolve({ id: fakeId }) },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // PATCH /api/assets/[id] (update)
  // -----------------------------------------------------------------------

  it("updates asset name and description", async () => {
    const at = await createTestAssetType(runId);
    createdAssetTypeIds.push(at.id);

    const asset = await createTestAsset(runId, at.id);
    createdAssetIds.push(asset.id);

    const newName = `${marker(runId)} Updated`;
    const res = await updateHandler(
      new NextRequest(`http://localhost/api/assets/${asset.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: newName,
          description: "Updated description",
        }),
      }),
      { params: Promise.resolve({ id: asset.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe(newName);
    expect(body.description).toBe("Updated description");
  });

  it("returns 404 when patching a nonexistent asset", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await updateHandler(
      new NextRequest(`http://localhost/api/assets/${fakeId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Nope" }),
      }),
      { params: Promise.resolve({ id: fakeId }) },
    );
    expect(res.status).toBe(404);
  });

  // -----------------------------------------------------------------------
  // DELETE /api/assets/[id]
  // -----------------------------------------------------------------------

  it("deletes an asset and returns success", async () => {
    const at = await createTestAssetType(runId);
    createdAssetTypeIds.push(at.id);

    const asset = await createTestAsset(runId, at.id);
    createdAssetIds.push(asset.id);

    const delRes = await deleteHandler(
      new NextRequest(`http://localhost/api/assets/${asset.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: asset.id }) },
    );
    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.success).toBe(true);

    // Verify it's gone
    const getRes = await getHandler(
      new NextRequest(`http://localhost/api/assets/${asset.id}`),
      { params: Promise.resolve({ id: asset.id }) },
    );
    expect(getRes.status).toBe(404);

    // Remove from cleanup list since it's already deleted
    createdAssetIds.pop();
  });

  it("returns 404 when deleting a nonexistent asset", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await deleteHandler(
      new NextRequest(`http://localhost/api/assets/${fakeId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: fakeId }) },
    );
    expect(res.status).toBe(404);
  });
});

function marker(runId: number): string {
  return `__test_${runId}`;
}
