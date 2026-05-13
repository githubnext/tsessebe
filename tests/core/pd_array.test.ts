/**
 * Tests for pdArray — the pd.array() factory function.
 */

import { describe, expect, test } from "bun:test";
import { pdArray, PandasArray } from "../../src/index.ts";

describe("pdArray", () => {
  test("creates an int64 array when all values are integers", () => {
    const a = pdArray([1, 2, 3]);
    expect(a).toBeInstanceOf(PandasArray);
    expect(a.dtype).toBe("int64");
    expect(a.length).toBe(3);
    expect(a.toArray()).toEqual([1, 2, 3]);
  });

  test("creates a float64 array when any value is non-integer", () => {
    const a = pdArray([1, 2.5, 3]);
    expect(a.dtype).toBe("float64");
    expect(a.toArray()).toEqual([1, 2.5, 3]);
  });

  test("creates a bool array when all non-null values are booleans", () => {
    const a = pdArray([true, false, true]);
    expect(a.dtype).toBe("bool");
    expect(a.toArray()).toEqual([true, false, true]);
  });

  test("creates a string array when values are strings", () => {
    const a = pdArray(["a", "b", "c"]);
    expect(a.dtype).toBe("string");
    expect(a.toArray()).toEqual(["a", "b", "c"]);
  });

  test("creates a string array with nulls", () => {
    const a = pdArray(["a", null, "c"]);
    expect(a.dtype).toBe("string");
    expect(a.at(1)).toBeNull();
  });

  test("respects explicit dtype override", () => {
    const a = pdArray([1, 2, 3], "float32");
    expect(a.dtype).toBe("float32");
  });

  test("explicit string dtype overrides inferred int", () => {
    const a = pdArray([1, 2, 3], "string");
    expect(a.dtype).toBe("string");
    expect(a.toArray()).toEqual([1, 2, 3]);
  });

  test("handles empty array", () => {
    const a = pdArray([]);
    expect(a.length).toBe(0);
    expect(a.toArray()).toEqual([]);
    expect(a.dtype).toBe("object");
  });

  test("handles all-null array", () => {
    const a = pdArray([null, null, null]);
    expect(a.dtype).toBe("object");
    expect(a.length).toBe(3);
  });

  test("at() returns element at position", () => {
    const a = pdArray([10, 20, 30]);
    expect(a.at(0)).toBe(10);
    expect(a.at(2)).toBe(30);
  });

  test("at() returns null for out-of-bounds", () => {
    const a = pdArray([1, 2]);
    expect(a.at(99)).toBeNull();
  });

  test("is iterable", () => {
    const a = pdArray([1, 2, 3]);
    expect([...a]).toEqual([1, 2, 3]);
  });

  test("accepts an iterable (Set)", () => {
    const a = pdArray(new Set([1, 2, 3]));
    expect(a.length).toBe(3);
    expect(a.dtype).toBe("int64");
  });

  test("infers datetime dtype from Date values", () => {
    const d = new Date("2024-01-01");
    const a = pdArray([d]);
    expect(a.dtype).toBe("datetime");
  });

  test("toString contains dtype and values", () => {
    const a = pdArray([1, 2]);
    const s = a.toString();
    expect(s).toContain("int64");
    expect(s).toContain("1");
  });
});
