import { describe, it, expect } from "vitest";
import { buildMetadataSchema, validateMetadata } from "../src/lib/metadata-validator";

// Mock AssetTypeField — we only need the properties the validator uses
function field(overrides: Record<string, any> = {}) {
  return {
    id: "f1",
    asset_type_id: "at1",
    slug: "test_field",
    label: "Test Field",
    field_type: "text",
    config: null,
    is_required: false,
    is_filterable: false,
    is_showcase: false,
    placeholder: null,
    help_text: null,
    sort_order: 0,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as any;
}

describe("buildMetadataSchema", () => {
  it("returns an empty object for no fields", () => {
    const schema = buildMetadataSchema([]);
    expect(schema._def).toBeDefined();
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid text field", () => {
    const schema = buildMetadataSchema([field({ slug: "name", field_type: "text" })]);
    const result = schema.safeParse({ name: "hello" });
    expect(result.success).toBe(true);
  });

  it("rejects number field with non-number", () => {
    const schema = buildMetadataSchema([field({ slug: "count", field_type: "number" })]);
    const result = schema.safeParse({ count: "not-a-number" });
    expect(result.success).toBe(false);
  });

  it("enforces number min constraint", () => {
    const schema = buildMetadataSchema([
      field({ slug: "count", field_type: "number", config: { min: 5 } }),
    ]);
    expect(schema.safeParse({ count: 10 }).success).toBe(true);
    expect(schema.safeParse({ count: 2 }).success).toBe(false);
  });

  it("enforces number max constraint", () => {
    const schema = buildMetadataSchema([
      field({ slug: "count", field_type: "number", config: { max: 100 } }),
    ]);
    expect(schema.safeParse({ count: 50 }).success).toBe(true);
    expect(schema.safeParse({ count: 200 }).success).toBe(false);
  });

  it("validates select against options", () => {
    const schema = buildMetadataSchema([
      field({ slug: "style", field_type: "select", config: { options: ["R15", "Rthro"] } }),
    ]);
    expect(schema.safeParse({ style: "R15" }).success).toBe(true);
    expect(schema.safeParse({ style: "R6" }).success).toBe(false);
  });

  it("accepts multi_select as array of strings", () => {
    const schema = buildMetadataSchema([
      field({ slug: "tags", field_type: "multi_select" }),
    ]);
    expect(schema.safeParse({ tags: ["a", "b"] }).success).toBe(true);
    expect(schema.safeParse({ tags: "not-array" }).success).toBe(false);
  });

  it("marks field as required when is_required is true", () => {
    const schema = buildMetadataSchema([
      field({ slug: "name", field_type: "text", is_required: true }),
    ]);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ name: "hello" }).success).toBe(true);
  });

  it("makes optional field not required", () => {
    const schema = buildMetadataSchema([
      field({ slug: "name", field_type: "text", is_required: false }),
    ]);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ name: "hello" }).success).toBe(true);
  });

  it("validates boolean field", () => {
    const schema = buildMetadataSchema([
      field({ slug: "flag", field_type: "boolean" }),
    ]);
    expect(schema.safeParse({ flag: true }).success).toBe(true);
    expect(schema.safeParse({ flag: "yes" }).success).toBe(false);
  });

  it("validates date as ISO string", () => {
    const schema = buildMetadataSchema([
      field({ slug: "released", field_type: "date" }),
    ]);
    expect(schema.safeParse({ released: "2024-06-01" }).success).toBe(true);
  });

  it("accepts rating 1-5", () => {
    const schema = buildMetadataSchema([
      field({ slug: "quality", field_type: "rating", config: { max: 5 } }),
    ]);
    expect(schema.safeParse({ quality: 3 }).success).toBe(true);
    expect(schema.safeParse({ quality: 6 }).success).toBe(false);
    expect(schema.safeParse({ quality: 0 }).success).toBe(false);
  });

  it("handles multiple fields", () => {
    const schema = buildMetadataSchema([
      field({ slug: "name", field_type: "text", is_required: true }),
      field({ slug: "count", field_type: "number" }),
      field({ slug: "flag", field_type: "boolean", is_required: true }),
    ]);
    expect(schema.safeParse({ name: "test", flag: true }).success).toBe(true);
    expect(schema.safeParse({ name: "test" }).success).toBe(false); // missing flag
    expect(schema.safeParse({ flag: true }).success).toBe(false); // missing name
  });
});

describe("validateMetadata", () => {
  it("returns success with data on valid input", () => {
    const result = validateMetadata({ name: "hello" }, [
      field({ slug: "name", field_type: "text" }),
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("hello");
    }
  });

  it("returns error with ZodError on invalid input", () => {
    const result = validateMetadata({ count: "nope" }, [
      field({ slug: "count", field_type: "number" }),
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.error.issues).toBeDefined();
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
