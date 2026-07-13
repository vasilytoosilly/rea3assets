import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, isPrismaConflict } from "@/lib/prisma";
import { updateAssetSchema } from "@/lib/validations/assets";
import { validateMetadata } from "@/lib/metadata-validator";
import { mapFieldValue } from "@/lib/field-value-mapper";
import { serializeBigInts } from "@/lib/serialize";
import { logger } from "@/lib/logger";
import { syncAssets, getErpAssets, deleteErpAsset } from "@/lib/erp-client";

function statusTransitions(status: string): string[] {
  switch (status) {
    case "draft": return ["in_review", "archived"];
    case "in_review": return ["approved", "draft"];
    case "approved": return ["published", "draft"];
    case "published": return ["deprecated"];
    case "deprecated": return ["published"];
    default:   return [];
  }
}

function divisionDefaults(division: string): { currency: string; gateway: string } {
  switch (division) {
    case "vault_product":
    case "vault_service":
    case "shop_product":
    case "shop_service":
      return { currency: "USD", gateway: "lemon_squeezy" };
    case "community":
      return { currency: "USD", gateway: "manual" };
    default:
      return { currency: "USD", gateway: "manual" };
  }
}

// ---------------------------------------------------------------------------
// GET   /api/assets/[id]  → get one asset with all relations
// PATCH /api/assets/[id]  → update asset (metadata re-validated)
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        asset_type: {
          include: { fields: { orderBy: { sort_order: "asc" } } },
        },
        field_values: { include: { field: true } },
        versions: {
          orderBy: { created_at: "desc" },
          include: { pipeline_runs: { include: { steps: true } } },
        },
        thumbnails: { orderBy: { sort_order: "asc" } },
        tags: { include: { tag: { include: { group: true } } } },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(serializeBigInts(asset));
  } catch (error) {
    logger.error("Failed to get asset", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const existing = await prisma.asset.findUnique({
      where: { id },
      include: { asset_type: { include: { fields: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = updateAssetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    // Enforce valid status transitions (same rules as the UI)
    if (parsed.data.status !== undefined) {
      const valid = statusTransitions(existing.status);
      if (!valid.includes(parsed.data.status)) {
        return NextResponse.json(
          { error: `Invalid status transition from '${existing.status}' to '${parsed.data.status}'. Valid: ${valid.join(", ")}` },
          { status: 400 },
        );
      }
    }

    // If metadata changed, re-validate against the type's field definitions
    let validatedMetadata: Record<string, unknown> | undefined;
    if (parsed.data.metadata !== undefined) {
      const metadataResult = validateMetadata(
        parsed.data.metadata,
        existing.asset_type.fields,
      );
      if (!metadataResult.success) {
        return NextResponse.json(
          { error: "Metadata validation failed", issues: metadataResult.error.issues },
          { status: 400 },
        );
      }
      validatedMetadata = metadataResult.data;
    }

    // Update the asset
    const updated = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id },
        data: {
          ...(parsed.data.name !== undefined && { name: parsed.data.name }),
          ...(parsed.data.description !== undefined && { description: parsed.data.description }),
          ...(validatedMetadata !== undefined && { metadata: validatedMetadata as Prisma.InputJsonValue }),
          ...(parsed.data.status !== undefined && {
            status: parsed.data.status,
            ...(parsed.data.status === "published" && !existing.published_at
              ? { published_at: new Date() }
              : {}),
          }),
        },
      });

      // Refresh denormalized field values if metadata changed
      if (validatedMetadata !== undefined) {
        await tx.assetFieldValue.deleteMany({ where: { asset_id: id } });

        const metadata = validatedMetadata as Record<string, unknown>;
        const filterableFields = existing.asset_type.fields.filter((f) => f.is_filterable);

        if (filterableFields.length > 0) {
          const values = filterableFields
            .filter((f) => metadata[f.slug] !== undefined)
            .map((f) => {
              const raw = metadata[f.slug];
              return {
                asset_id: id,
                field_id: f.id,
                ...mapFieldValue(f.field_type, raw),
              };
            });

          if (values.length > 0) {
            await tx.assetFieldValue.createMany({ data: values });
          }
        }
      }

      return asset;
    });

    logger.info("Asset updated", { id, status: updated.status });

    // ERP sync on publish — validates SKU, picks latest version by semver,
    // and awaits the ERP call so failures are surfaced to the caller.
    let erpSyncWarning: string | null = null;
    if (parsed.data.status === "published" && existing.status !== "published") {
      if (!updated.sku) {
        return NextResponse.json(
          { error: "Cannot publish asset without a SKU. Configure a SKU before publishing." },
          { status: 400 },
        );
      }

      const allVersions = await prisma.assetVersion.findMany({
        where: { asset_id: id, file_path: { not: null } },
        select: { file_path: true, version: true, format: true, file_hash: true },
      });

      if (allVersions.length > 0) {
        // Query ERP for existing versions — skip those already synced
        const existingErp = await getErpAssets(updated.sku!);
        const erpVersions = new Set(
          existingErp.success && existingErp.data
            ? existingErp.data.data.map((a) => a.version)
            : [],
        );

        const newVersions = allVersions.filter((v) => !erpVersions.has(v.version));

        if (newVersions.length === 0) {
          logger.info("All versions already synced to ERP — skipping", {
            assetId: id,
            sku: updated.sku,
          });
        } else {
          const defaults = divisionDefaults(updated.division);
          const syncResult = await syncAssets(
            newVersions.map((v) => ({
              sku: updated.sku!,
              file_path: v.file_path!,
              version: v.version,
              format: v.format ?? "",
              checksum: v.file_hash,
              currency: defaults.currency,
              gateway: defaults.gateway,
              license_model: "na",
            })),
          );

          if (!syncResult.success) {
            logger.error("ERP sync failed on publish", {
              assetId: id,
              sku: updated.sku,
              error: syncResult.error,
            });
            erpSyncWarning = `ERP sync failed: ${syncResult.error}. The ERP may not reflect this publish until the sync succeeds.`;
          } else {
            logger.info("ERP sync succeeded on publish", {
              assetId: id,
              sku: updated.sku,
              versions: newVersions.length,
            });
          }
        }
      }
    }

    const response = serializeBigInts(updated);
    if (erpSyncWarning) {
      return NextResponse.json({ ...response, erp_sync_warning: erpSyncWarning });
    }
    return NextResponse.json(response);
  } catch (error) {
    if (isPrismaConflict(error)) {
      return NextResponse.json(
        { error: "An asset with this slug already exists" },
        { status: 409 },
      );
    }
    logger.error("Failed to update asset", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.assetTagAssignment.deleteMany({ where: { asset_id: id } }),
      prisma.assetFieldValue.deleteMany({ where: { asset_id: id } }),
      prisma.assetDependency.deleteMany({ where: { asset_id: id } }),
      prisma.assetDependency.deleteMany({ where: { dependency_id: id } }),
      prisma.assetThumbnail.deleteMany({ where: { asset_id: id } }),
      prisma.assetVersion.deleteMany({ where: { asset_id: id } }),
      prisma.asset.delete({ where: { id } }),
    ]);

    logger.info("Asset deleted", { id, name: existing.name });

    // Clean up ERP assets by SKU if this asset was published
    if (existing.sku) {
      try {
        const erpAssets = await getErpAssets(existing.sku);
        if (erpAssets.success && erpAssets.data?.data) {
          for (const erpAsset of erpAssets.data.data) {
            await deleteErpAsset(erpAsset.id);
          }
        }
      } catch {
        logger.warn("ERP cleanup failed during asset delete", { id, sku: existing.sku });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete asset", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
