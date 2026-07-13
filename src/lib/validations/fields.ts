// ---------------------------------------------------------------------------
// Field Config Schemas
// ---------------------------------------------------------------------------
// Reserved for future use — per-field-type config validation.
// Each entry defines the Zod schema for a field_type's `config` JSON column.
// Wire into createFieldSchema when the field builder UI is built.
//
// Example usage:
//   const schema = fieldConfigSchemas[fieldType];
//   const result = schema.safeParse(config);

import { z } from "zod/v4";

export const fieldConfigSchema = z.object({
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  accept: z.string().optional(),
  multiple: z.boolean().optional(),
  max_tags: z.number().optional(),
  unit: z.string().optional(),
});

export type FieldConfig = z.infer<typeof fieldConfigSchema>;
