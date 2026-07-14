import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { toWebsiteProductDetail, type Rea3Asset } from "@/lib/marketplace-adapter";

// ---------------------------------------------------------------------------
// GET /api/marketplace/vault/products/[slug]
// ---------------------------------------------------------------------------
// BFF proxy: calls rea3assets marketplace detail API, maps to the website's
// ProductDetail shape. Pricing placeholder for ERP integration.
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ slug: string }>;
}

// TODO: Replace HTTP self-call with direct function import from the marketplace
// route handler for better efficiency (avoid intra-process round-trip).
function getBaseUrl(): string {
  return process.env.SITE_URL ?? (process.env.NODE_ENV === "production" ? "http://localhost:3003" : "http://localhost:3000");
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/marketplace/assets/${slug}`;

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 },
        );
      }
      logger.error("BFF marketplace detail proxy failed", {
        status: res.status,
        slug,
      });
      return NextResponse.json(
        { error: "Failed to fetch product" },
        { status: 502 },
      );
    }

    const asset = await res.json();

    // Map to the website's ProductDetail shape
    // Pricing defaults to 0 — ERP integration pending
    const product = toWebsiteProductDetail(asset as Rea3Asset, 0);

    return NextResponse.json({ product });
  } catch (error) {
    logger.error("BFF vault product detail failed", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
