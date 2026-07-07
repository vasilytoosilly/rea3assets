import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as listMarketplaceAssets } from "@/app/api/marketplace/assets/route";
import { GET as getMarketplaceAsset } from "@/app/api/marketplace/assets/[slug]/route";
import { GET as listMarketplaceTypes } from "@/app/api/marketplace/asset-types/route";
import {
  nextRunId,
  createTestAssetType,
  createTestAsset,
  cleanupTestData,
  nukeTestData,
} from "./helpers";

describe("Marketplace API", () => {
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
  // GET /api/marketplace/asset-types
  // -----------------------------------------------------------------------

  it("lists only public asset types", async () => {
    const publicType = await createTestAssetType(runId, {
      is_public: true,
      slug: `${marker(runId)}-public`,
      name: `${marker(runId)} Public`,
    });
    const runId2 = nextRunId();
    const privateType = await createTestAssetType(runId2, {
      is_public: false,
      slug: `${marker(runId2)}-private`,
      name: `${marker(runId2)} Private`,
    });
    createdAssetTypeIds.push(publicType.id, privateType.id);

    const res = await listMarketplaceTypes();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);

    const slugs = body.map((t: any) => t.slug);
    expect(slugs).toContain(publicType.slug);
    expect(slugs).not.toContain(privateType.slug);
  });

  // -----------------------------------------------------------------------
  // GET /api/marketplace/assets
  // -----------------------------------------------------------------------

  it("excludes draft assets from marketplace listing", async () => {
    const at = await createTestAssetType(runId, {
      is_public: true,
      slug: `${marker(runId)}-pub-type`,
      name: `${marker(runId)} Public Type`,
    });
    createdAssetTypeIds.push(at.id);

    // Draft asset — should NOT appear
    const draftAsset = await createTestAsset(runId, at.id, {
      slug: `${marker(runId)}-draft`,
      name: `${marker(runId)} Draft`,
      status: "draft",
    });
    createdAssetIds.push(draftAsset.id);

    const res = await listMarketplaceAssets(
      new NextRequest("http://localhost/api/marketplace/assets"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const slugs = body.data.map((a: any) => a.slug);
    expect(slugs).not.toContain(draftAsset.slug);
  });

  it("includes published assets from public types", async () => {
    const at = await createTestAssetType(runId, {
      is_public: true,
      slug: `${marker(runId)}-pub`,
      name: `${marker(runId)} Public`,
    });
    createdAssetTypeIds.push(at.id);

    const publishedAsset = await createTestAsset(runId, at.id, {
      slug: `${marker(runId)}-published`,
      name: `${marker(runId)} Published`,
      status: "published",
    });
    createdAssetIds.push(publishedAsset.id);

    const res = await listMarketplaceAssets(
      new NextRequest("http://localhost/api/marketplace/assets"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const slugs = body.data.map((a: any) => a.slug);
    expect(slugs).toContain(publishedAsset.slug);
  });

  it("excludes published assets from private types", async () => {
    const at = await createTestAssetType(runId, {
      is_public: false,
      slug: `${marker(runId)}-private`,
      name: `${marker(runId)} Private`,
    });
    createdAssetTypeIds.push(at.id);

    const publishedAsset = await createTestAsset(runId, at.id, {
      slug: `${marker(runId)}-hidden`,
      name: `${marker(runId)} Hidden`,
      status: "published",
    });
    createdAssetIds.push(publishedAsset.id);

    const res = await listMarketplaceAssets(
      new NextRequest("http://localhost/api/marketplace/assets"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const slugs = body.data.map((a: any) => a.slug);
    expect(slugs).not.toContain(publishedAsset.slug);
  });

  it("supports asset_type filter for marketplace", async () => {
    const at1 = await createTestAssetType(runId, {
      is_public: true,
      slug: `${marker(runId)}-ma`,
      name: `${marker(runId)} MA`,
    });
    const runId2 = nextRunId();
    const at2 = await createTestAssetType(runId2, {
      is_public: true,
      slug: `${marker(runId2)}-mb`,
      name: `${marker(runId2)} MB`,
    });
    createdAssetTypeIds.push(at1.id, at2.id);

    const asset1 = await createTestAsset(runId, at1.id, {
      slug: `${marker(runId)}-mpa`,
      name: `${marker(runId)} A`,
      status: "published",
    });
    const asset2 = await createTestAsset(runId2, at2.id, {
      slug: `${marker(runId2)}-mpb`,
      name: `${marker(runId2)} B`,
      status: "published",
    });
    createdAssetIds.push(asset1.id, asset2.id);

    const res = await listMarketplaceAssets(
      new NextRequest(`http://localhost/api/marketplace/assets?asset_type=${at1.slug}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    for (const item of body.data) {
      expect(item.asset_type.slug).toBe(at1.slug);
    }
  });

  it("returns pagination in marketplace response", async () => {
    const at = await createTestAssetType(runId, {
      is_public: true,
      slug: `${marker(runId)}-mp-pub`,
      name: `${marker(runId)} MP Pub`,
    });
    createdAssetTypeIds.push(at.id);

    for (let i = 0; i < 3; i++) {
      const a = await createTestAsset(runId, at.id, {
        slug: `${marker(runId)}-mp-${i}`,
        name: `${marker(runId)} MP ${i}`,
        status: "published",
      });
      createdAssetIds.push(a.id);
    }

    const res = await listMarketplaceAssets(
      new NextRequest("http://localhost/api/marketplace/assets?page=1&limit=2"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.total).toBeGreaterThanOrEqual(3);
    expect(body.filters).toBeDefined();
    expect(body.filters.asset_types).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // GET /api/marketplace/assets/[slug]
  // -----------------------------------------------------------------------

  it("returns a published marketplace asset by slug", async () => {
    const at = await createTestAssetType(runId, {
      is_public: true,
      slug: `${marker(runId)}-mpd`,
      name: `${marker(runId)} MPD`,
    });
    createdAssetTypeIds.push(at.id);

    const asset = await createTestAsset(runId, at.id, {
      slug: `${marker(runId)}-mpd-asset`,
      name: `${marker(runId)} MPD Asset`,
      status: "published",
    });
    createdAssetIds.push(asset.id);

    const res = await getMarketplaceAsset(
      new NextRequest(`http://localhost/api/marketplace/assets/${asset.slug}`),
      { params: Promise.resolve({ slug: asset.slug }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe(asset.slug);
    expect(body.asset_type).toBeDefined();
  });

  it("returns 404 for a draft asset via marketplace slug endpoint", async () => {
    const at = await createTestAssetType(runId, {
      is_public: true,
      slug: `${marker(runId)}-mpd2`,
      name: `${marker(runId)} MPD2`,
    });
    createdAssetTypeIds.push(at.id);

    const draftAsset = await createTestAsset(runId, at.id, {
      slug: `${marker(runId)}-mpd-draft`,
      name: `${marker(runId)} Draft`,
      status: "draft",
    });
    createdAssetIds.push(draftAsset.id);

    const res = await getMarketplaceAsset(
      new NextRequest(`http://localhost/api/marketplace/assets/${draftAsset.slug}`),
      { params: Promise.resolve({ slug: draftAsset.slug }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for asset from private type via marketplace slug endpoint", async () => {
    const at = await createTestAssetType(runId, {
      is_public: false,
      slug: `${marker(runId)}-mpd3`,
      name: `${marker(runId)} MPD3`,
    });
    createdAssetTypeIds.push(at.id);

    const pubAsset = await createTestAsset(runId, at.id, {
      slug: `${marker(runId)}-mpd-pub-private`,
      name: `${marker(runId)} Pub Private`,
      status: "published",
    });
    createdAssetIds.push(pubAsset.id);

    const res = await getMarketplaceAsset(
      new NextRequest(`http://localhost/api/marketplace/assets/${pubAsset.slug}`),
      { params: Promise.resolve({ slug: pubAsset.slug }) },
    );
    expect(res.status).toBe(404);
  });
});

function marker(runId: number): string {
  return `__test_${runId}`;
}
