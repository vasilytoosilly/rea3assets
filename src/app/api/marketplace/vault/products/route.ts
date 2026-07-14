import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { toWebsiteProductItem, type Rea3Asset } from "@/lib/marketplace-adapter";

// ---------------------------------------------------------------------------
// GET /api/marketplace/vault/products
// ---------------------------------------------------------------------------
// BFF proxy: calls rea3assets marketplace API internally, maps to the
// website's ProductItem shape, and merges ERP pricing (placeholder for now).
//
// Query params (passthrough to rea3assets):
//   division    — vault_product (default), vault_service
//   asset_type  — category filter
//   search      — text search
//   page, limit — pagination
//   sort        — newest, oldest, name_asc, name_desc
//   tags        — comma-separated tag slugs
// ---------------------------------------------------------------------------

// TODO: Replace HTTP self-call with direct function import from the marketplace
// route handler for better efficiency (avoid intra-process round-trip).
function getBaseUrl(): string {
  return process.env.SITE_URL ?? (process.env.NODE_ENV === "production" ? "http://localhost:3003" : "http://localhost:3000");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Build rea3assets marketplace URL
    const division = searchParams.get("division") ?? "vault_product";
    const params = new URLSearchParams();
    params.set("division", division);
    params.set("limit", searchParams.get("limit") ?? "50");

    const assetType = searchParams.get("asset_type");
    if (assetType) params.set("asset_type", assetType);

    const search = searchParams.get("search");
    if (search) params.set("search", search);

    const page = searchParams.get("page");
    if (page) params.set("page", page);

    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);

    const tags = searchParams.get("tags");
    if (tags) params.set("tags", tags);

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/marketplace/assets?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
      logger.error("BFF marketplace proxy failed", {
        status: res.status,
        url,
      });
      return NextResponse.json(
        { error: "Failed to fetch assets" },
        { status: 502 },
      );
    }

    const body = await res.json();

    // Map each asset to the website's ProductItem shape
    // Pricing defaults to 0 — ERP integration pending
    const products: ReturnType<typeof toWebsiteProductItem>[] = (body.data ?? []).map(
      (asset: Rea3Asset) => toWebsiteProductItem(asset, 0),
    );

    return NextResponse.json({
      products,
      total: body.pagination?.total ?? products.length,
      page: body.pagination?.page ?? 1,
      pages: body.pagination?.pages ?? 1,
      filters: body.filters ?? { asset_types: [], divisions: [], tags: [] },
    });
  } catch (error) {
    logger.error("BFF vault products failed", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
