import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Tag Group Schemas
// ---------------------------------------------------------------------------

export const createTagGroupSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  sort_order: z.number().int().default(0),
});

export const updateTagGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Tag Schemas
// ---------------------------------------------------------------------------

export const createTagSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  color: z.string().optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Tag Assignment Schema
// ---------------------------------------------------------------------------

export const assignTagsSchema = z.object({
  tag_ids: z.array(z.string()),
});
