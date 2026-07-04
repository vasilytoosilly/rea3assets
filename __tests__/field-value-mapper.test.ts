import { describe, it, expect } from "vitest";
import { mapFieldValue } from "../src/lib/field-value-mapper";

describe("mapFieldValue", () => {
  it("maps text field to value_text", () => {
    expect(mapFieldValue("text", "hello")).toEqual({ value_text: "hello" });
  });

  it("maps textarea to value_text", () => {
    expect(mapFieldValue("textarea", "long content")).toEqual({ value_text: "long content" });
  });

  it("maps url to value_text", () => {
    expect(mapFieldValue("url", "https://example.com")).toEqual({ value_text: "https://example.com" });
  });

  it("maps color to value_text", () => {
    expect(mapFieldValue("color", "#ff4d4d")).toEqual({ value_text: "#ff4d4d" });
  });

  it("maps select to value_text", () => {
    expect(mapFieldValue("select", "R15")).toEqual({ value_text: "R15" });
  });

  it("maps number to value_number", () => {
    expect(mapFieldValue("number", 42)).toEqual({ value_number: 42 });
  });

  it("maps number string to value_number", () => {
    expect(mapFieldValue("number", "42")).toEqual({ value_number: 42 });
  });

  it("maps boolean true to value_boolean", () => {
    expect(mapFieldValue("boolean", true)).toEqual({ value_boolean: true });
  });

  it("maps boolean false to value_boolean", () => {
    expect(mapFieldValue("boolean", false)).toEqual({ value_boolean: false });
  });

  it("maps date string to value_date", () => {
    const result = mapFieldValue("date", "2024-06-01");
    expect(result.value_date).toBeInstanceOf(Date);
    expect(result.value_date!.toISOString()).toContain("2024-06-01");
  });

  it("maps multi_select to value_json", () => {
    expect(mapFieldValue("multi_select", ["a", "b"])).toEqual({ value_json: ["a", "b"] });
  });

  it("maps tags to value_json", () => {
    expect(mapFieldValue("tags", ["fantasy", "medieval"])).toEqual({ value_json: ["fantasy", "medieval"] });
  });

  it("maps richtext to value_json", () => {
    expect(mapFieldValue("richtext", "# Hello")).toEqual({ value_json: "# Hello" });
  });

  it("maps image object to value_json", () => {
    const obj = { filename: "test.png", size_bytes: 1024 };
    expect(mapFieldValue("image", obj)).toEqual({ value_json: obj });
  });

  it("maps file object to value_json", () => {
    const obj = { filename: "model.fbx", size_bytes: 2048 };
    expect(mapFieldValue("file", obj)).toEqual({ value_json: obj });
  });

  it("maps rating to value_number", () => {
    expect(mapFieldValue("rating", 4)).toEqual({ value_number: 4 });
  });

  it("maps unknown type to JSON string in value_text", () => {
    expect(mapFieldValue("unknown_type", { foo: "bar" })).toEqual({ value_text: '{"foo":"bar"}' });
  });

  it("coerces number string for rating", () => {
    expect(mapFieldValue("rating", "3")).toEqual({ value_number: 3 });
  });
});
