import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Asset Validation Schemas
// ---------------------------------------------------------------------------

export const createAssetSchema = z.object({
  asset_type_slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  metadata: z.record(z.string(), z.any()).default({}),
});

export const updateAssetSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  status: z
    .enum(["draft", "in_review", "approved", "published", "deprecated", "archived"])
    .optional(),
  sku: z.string().trim().min(1).max(100).nullable().optional(),
});
