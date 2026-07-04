import { describe, it, expect } from "vitest";
import {
  createAssetTypeSchema,
  createFieldSchema,
} from "../src/lib/validations/asset-types";

describe("createAssetTypeSchema", () => {
  it("accepts valid input", () => {
    const result = createAssetTypeSchema.safeParse({
      slug: "character-model",
      name: "Character Model",
      division: "vault_product",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid slug", () => {
    const result = createAssetTypeSchema.safeParse({
      slug: "UPPERCASE",
      name: "Test",
      division: "vault_product",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createAssetTypeSchema.safeParse({
      slug: "test",
      name: "",
      division: "vault_product",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid division", () => {
    const result = createAssetTypeSchema.safeParse({
      slug: "test",
      name: "Test",
      division: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("applies defaults", () => {
    const result = createAssetTypeSchema.safeParse({
      slug: "test",
      name: "Test",
      division: "vault_product",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_internal).toBe(true);
      expect(result.data.is_public).toBe(false);
      expect(result.data.sort_order).toBe(0);
    }
  });
});

describe("createFieldSchema", () => {
  it("accepts valid text field", () => {
    const result = createFieldSchema.safeParse({
      slug: "polygon_count",
      label: "Polygon Count",
      field_type: "number",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid field_type", () => {
    const result = createFieldSchema.safeParse({
      slug: "bad",
      label: "Bad",
      field_type: "invalid_type",
    });
    expect(result.success).toBe(false);
  });

  it("applies defaults", () => {
    const result = createFieldSchema.safeParse({
      slug: "test_field",
      label: "Test",
      field_type: "text",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_required).toBe(false);
      expect(result.data.is_filterable).toBe(false);
      expect(result.data.sort_order).toBe(0);
    }
  });
});
