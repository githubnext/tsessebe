/**
 * Tests for hashBijectArray and hashBijectInverse.
 *
 * Mirrors `pandas.util.hash_biject_array` semantics:
 * - identical values → same code
 * - distinct values → distinct codes
 * - codes are zero-based, contiguous, first-occurrence order
 * - type-sensitive: number 1 ≠ string "1"
 */

import { describe, expect, it } from "bun:test";
import { hashBijectArray, hashBijectInverse } from "../../src/index.ts";

describe("hashBijectArray", () => {
  it("assigns 0-based codes in first-occurrence order", () => {
    expect(hashBijectArray(["a", "b", "a", "c", "b"])).toEqual([0, 1, 0, 2, 1]);
  });

  it("returns empty array for empty input", () => {
    expect(hashBijectArray([])).toEqual([]);
  });

  it("single element maps to code 0", () => {
    expect(hashBijectArray(["x"])).toEqual([0]);
  });

  it("all identical elements map to code 0", () => {
    expect(hashBijectArray([5, 5, 5])).toEqual([0, 0, 0]);
  });

  it("all distinct elements map to 0,1,2,...", () => {
    expect(hashBijectArray([10, 20, 30])).toEqual([0, 1, 2]);
  });

  it("handles null / undefined", () => {
    const result = hashBijectArray([1, null, 1, null]);
    expect(result[0]).toBe(result[2]); // both 1s same
    expect(result[1]).toBe(result[3]); // both nulls same
    expect(result[0]).not.toBe(result[1]); // 1 ≠ null
  });

  it("handles booleans", () => {
    const result = hashBijectArray([true, false, true]);
    expect(result).toEqual([0, 1, 0]);
  });

  it("is type-sensitive: number 1 ≠ string '1'", () => {
    const result = hashBijectArray([1, "1", 1, "1"]);
    expect(result[0]).toBe(result[2]); // same numbers
    expect(result[1]).toBe(result[3]); // same strings
    expect(result[0]).not.toBe(result[1]); // different types
  });

  it("handles NaN as a distinct value", () => {
    const result = hashBijectArray([Number.NaN, 1, Number.NaN]);
    expect(result[0]).toBe(result[2]); // NaN === NaN in bijection
    expect(result[0]).not.toBe(result[1]);
  });

  it("handles Date objects by time value", () => {
    const d1 = new Date("2024-01-01");
    const d2 = new Date("2024-01-02");
    const d1b = new Date("2024-01-01");
    const result = hashBijectArray([d1, d2, d1b]);
    expect(result[0]).toBe(result[2]);
    expect(result[0]).not.toBe(result[1]);
  });

  it("handles bigint values", () => {
    const result = hashBijectArray([BigInt(1), BigInt(2), BigInt(1)]);
    expect(result).toEqual([0, 1, 0]);
  });

  it("codes are contiguous (no gaps)", () => {
    const arr = ["x", "y", "z", "x", "y"];
    const codes = hashBijectArray(arr);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(3);
    const maxCode = Math.max(...codes);
    expect(maxCode).toBe(uniqueCodes.size - 1);
  });

  it("mixed scalar types all get distinct codes", () => {
    const arr = [1, "1", null, true, 1n];
    const codes = hashBijectArray(arr);
    expect(new Set(codes).size).toBe(5);
  });
});

describe("hashBijectInverse", () => {
  it("returns unique values in first-occurrence order", () => {
    expect(hashBijectInverse(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty input", () => {
    expect(hashBijectInverse([])).toEqual([]);
  });

  it("single element returns single-element array", () => {
    expect(hashBijectInverse(["x"])).toEqual(["x"]);
  });

  it("handles nulls", () => {
    expect(hashBijectInverse([null, 1, null])).toEqual([null, 1]);
  });

  it("type-sensitive: number 1 and string '1' are distinct", () => {
    const result = hashBijectInverse([1, "1"]);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe("1");
  });

  it("inverse maps code back to original value", () => {
    const arr = ["cat", "dog", "cat", "bird"];
    const codes = hashBijectArray(arr);
    const inverse = hashBijectInverse(arr);
    for (let i = 0; i < arr.length; i++) {
      expect(inverse[codes[i] as number]).toBe(arr[i]);
    }
  });

  it("inverse length equals number of unique values", () => {
    const arr = [1, 2, 1, 3, 2, 4];
    expect(hashBijectInverse(arr)).toHaveLength(4);
  });
});
