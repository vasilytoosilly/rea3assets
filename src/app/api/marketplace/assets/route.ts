import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET  /api/marketplace/assets  → list public published assets
// ---------------------------------------------------------------------------

interface FilterResult {
  asset_types: { slug: string; name: string; count: number }[];
  divisions: string[];
  tags: { id: string; slug: string; name: string; color: string | null; group: string }[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const assetTypeSlug = searchParams.get("asset_type");
    const division = searchParams.get("division");
    const tagsParam = searchParams.get("tags");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));
    const sort = searchParams.get("sort") ?? "newest";

    // Build the asset-type filter (always restrict to public types)
    const assetTypeFilter: Prisma.AssetTypeWhereInput = { is_public: true };
    if (assetTypeSlug) {
      assetTypeFilter.slug = assetTypeSlug;
    }

    // Base filter: only published assets with public asset types
    const where: Prisma.AssetWhereInput = {
      status: "published",
      asset_type: assetTypeFilter,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (division) {
      where.division = division;
    }

    if (tagsParam) {
      const tagSlugs = tagsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (tagSlugs.length > 0) {
        where.tags = {
          some: {
            tag: {
              slug: { in: tagSlugs },
            },
          },
        };
      }
    }

    // Sort order
    let orderBy: Prisma.AssetOrderByWithRelationInput;
    switch (sort) {
      case "oldest":
        orderBy = { created_at: "asc" };
        break;
      case "name_asc":
        orderBy = { name: "asc" };
        break;
      case "name_desc":
        orderBy = { name: "desc" };
        break;
      case "newest":
      default:
        orderBy = { created_at: "desc" };
        break;
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          asset_type: { select: { slug: true, name: true, icon: true } },
          thumbnails: {
            orderBy: { sort_order: "asc" },
            take: 3,
            select: { url: true, purpose: true, width: true, height: true, format: true },
          },
          tags: {
            select: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
          versions: {
            select: { version: true, created_at: true },
            orderBy: { created_at: "desc" },
            take: 1,
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    // Compute available filter options from the matching result set
    const filters = await computeFilters(where);

    logger.info("Marketplace assets listed", {
      page,
      limit,
      total,
      sort,
      ...(search && { search }),
      ...(assetTypeSlug && { asset_type: assetTypeSlug }),
      ...(division && { division }),
      ...(tagsParam && { tags: tagsParam }),
    });

    return NextResponse.json({
      data: assets,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      filters,
    });
  } catch (error) {
    logger.error("Failed to list marketplace assets", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Compute available filter options (asset types, divisions, tags) from the
 * matching result set after all active filters have been applied.
 */
async function computeFilters(where: Prisma.AssetWhereInput): Promise<FilterResult> {
  // Get all matching asset IDs without pagination
  const matchingAssets = await prisma.asset.findMany({
    where,
    select: { id: true, division: true },
  });

  const ids = matchingAssets.map((a) => a.id);
  if (ids.length === 0) {
    return { asset_types: [], divisions: [], tags: [] };
  }

  // Asset type distribution
  const [assetTypeCounts, assetTypes] = await Promise.all([
    prisma.asset.groupBy({
      by: ["asset_type_id"],
      where: { id: { in: ids } },
      _count: true,
    }),
    prisma.assetType.findMany({
      where: { is_public: true },
      select: { id: true, slug: true, name: true },
    }),
  ]);

  const assetTypeMap = new Map(assetTypes.map((at) => [at.id, at]));

  // Divisions
  const divisions = [...new Set(matchingAssets.map((a) => a.division))].sort();

  // Tag distribution
  const tagCounts = await prisma.assetTagAssignment.groupBy({
    by: ["tag_id"],
    where: { asset_id: { in: ids } },
    _count: true,
  });

  const tagIds = tagCounts.map((tc) => tc.tag_id);
  const tags = tagIds.length > 0
    ? await prisma.tag.findMany({
        where: { id: { in: tagIds } },
        include: { group: { select: { name: true } } },
      })
    : [];

  const tagMap = new Map(tags.map((t) => [t.id, t]));

  return {
    asset_types: assetTypeCounts
      .map((ac) => {
        const at = assetTypeMap.get(ac.asset_type_id);
        return at ? { slug: at.slug, name: at.name, count: ac._count } : null;
      })
      .filter((at): at is NonNullable<typeof at> => at !== null),
    divisions,
    tags: tagCounts
      .map((tc) => {
        const t = tagMap.get(tc.tag_id);
        return t
          ? { id: t.id, slug: t.slug, name: t.name, color: t.color, group: t.group.name }
          : null;
      })
      .filter((t): t is NonNullable<typeof t> => t !== null),
  };
}
