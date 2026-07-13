import { NextRequest, NextResponse } from "next/server";
import { Prisma, type AssetStatus, type Asset } from "@prisma/client";
import { prisma, isPrismaConflict } from "@/lib/prisma";
import { createAssetSchema } from "@/lib/validations/assets";
import { validateMetadata } from "@/lib/metadata-validator";
import { logger } from "@/lib/logger";
import { mapFieldValue } from "@/lib/field-value-mapper";

// ---------------------------------------------------------------------------
// GET  /api/assets  → list assets with filters
// POST /api/assets  → create an asset with metadata validation
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const division = searchParams.get("division");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));

    const where: Prisma.AssetWhereInput = {};

    if (type) {
      const assetType = await prisma.assetType.findUnique({ where: { slug: type } });
      if (assetType) where.asset_type_id = assetType.id;
    }
    if (division) where.division = division;
    if (status) where.status = status as AssetStatus;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          asset_type: { select: { slug: true, name: true, icon: true } },
          versions: { select: { id: true, version: true, status: true }, orderBy: { created_at: "desc" }, take: 1 },
          _count: { select: { versions: true, thumbnails: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    return NextResponse.json({
      data: assets,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error("Failed to list assets", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = createAssetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    // Look up the AssetType with its fields
    const assetType = await prisma.assetType.findUnique({
      where: { slug: parsed.data.asset_type_slug },
      include: { fields: { orderBy: { sort_order: "asc" } } },
    });

    if (!assetType) {
      return NextResponse.json(
        { error: `Asset type '${parsed.data.asset_type_slug}' not found` },
        { status: 404 },
      );
    }

    // Validate metadata against the type's field definitions
    const metadataResult = validateMetadata(parsed.data.metadata, assetType.fields);
    if (!metadataResult.success) {
      return NextResponse.json(
        { error: "Metadata validation failed", issues: metadataResult.error.issues },
        { status: 400 },
      );
    }
    const validatedMetadata = metadataResult.success ? metadataResult.data : parsed.data.metadata;

    // Auto-generate slug from name with retry on collision
    const generateSlug = () =>
      parsed.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      + "-" + Math.random().toString(36).slice(2, 8);

    let slug = generateSlug();
    let created: Asset | undefined;
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const asset = await tx.asset.create({
            data: {
              asset_type_id: assetType.id,
              name: parsed.data.name,
              slug,
              description: parsed.data.description ?? null,
              division: assetType.division,
              metadata: validatedMetadata,
            },
          });

          const metadata = validatedMetadata as Record<string, unknown>;
          const filterableFields = assetType.fields.filter((f) => f.is_filterable);

          if (filterableFields.length > 0) {
            const values = filterableFields
              .filter((f) => metadata[f.slug] !== undefined)
              .map((f) => ({
                asset_id: asset.id,
                field_id: f.id,
                ...mapFieldValue(f.field_type, metadata[f.slug]),
              }));

            if (values.length > 0) {
              await tx.assetFieldValue.createMany({ data: values });
            }
          }

          return asset;
        });
        break; // Success
      } catch (error) {
        if (isPrismaConflict(error) && attempt < MAX_RETRIES - 1) {
          slug = generateSlug(); // Retry with new random suffix
          continue;
        }
        throw error;
      }
    }

    if (!created) {
      return NextResponse.json(
        { error: "Could not create asset after retries — slug collision" },
        { status: 409 },
      );
    }

    logger.info("Asset created", { slug: created.slug, type: assetType.slug, name: created.name });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (isPrismaConflict(error)) {
      return NextResponse.json(
        { error: "An asset with this slug already exists" },
        { status: 409 },
      );
    }
    logger.error("Failed to create asset", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
