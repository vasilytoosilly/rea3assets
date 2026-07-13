// ---------------------------------------------------------------------------
// Field Value Mapper
// ---------------------------------------------------------------------------
// Maps a metadata value to the correct typed column in AssetFieldValue
// based on the field_type. Used by both asset create and update routes.
// Extracted here to eliminate DRY violation.

import type { Prisma } from "@prisma/client";

export interface FieldValueColumns {
  value_text?: string;
  value_number?: number;
  value_boolean?: boolean;
  value_date?: Date;
  value_json?: Prisma.InputJsonValue;
}

/**
 * Map a field value to the correct typed columns in AssetFieldValue.
 *
 * @param fieldType - The AssetTypeField.field_type enum value.
 * @param value     - The raw metadata value.
 * @returns An object with the appropriate typed column(s) set.
 */
export function mapFieldValue(fieldType: string, value: unknown): FieldValueColumns {
  switch (fieldType) {
    case "text":
    case "textarea":
    case "url":
    case "color":
    case "select":
      return { value_text: String(value) };
    case "number":
      return { value_number: Number(value) };
    case "boolean":
      return { value_boolean: Boolean(value) };
    case "date":
      return { value_date: new Date(String(value)) };
    case "multi_select":
    case "tags":
      return { value_json: value as Prisma.InputJsonValue }; // JSON array
    case "richtext":
    case "image":
    case "file":
      return { value_json: value as Prisma.InputJsonValue };
    case "rating":
      return { value_number: Number(value) };
    default:
      return { value_text: JSON.stringify(value) };
  }
}
