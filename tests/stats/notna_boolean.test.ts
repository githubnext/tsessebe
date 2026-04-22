/**
 * Tests for notna_boolean — keepTrue, keepFalse, filterBy.
 *
 * Covers:
 * - keepTrue: basic truthy filtering, Series mask, all true/false, empty
 * - keepFalse: complement of keepTrue
 * - filterBy: DataFrame row filtering by boolean mask, Series mask
 * - Index preservation after filtering
 * - Property-based: keepTrue + keepFalse cover all elements
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series, filterBy, keepFalse, keepTrue } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

describe("keepTrue", () => {
  test("keeps elements where mask is true", () => {
    const s = new Series<Scalar>({ data: [10, 20, 30, 40], index: [0, 1, 2, 3] });
    const result = keepTrue(s, [true, false, true, false]);
    expect([...result.values]).toEqual([10, 30]);
  });

  test("preserves original index labels", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: ["a", "b", "c"] });
    const result = keepTrue(s, [true, false, true]);
    expect([...result.index.values]).toEqual(["a", "c"]);
  });

  test("all true — returns same values", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const result = keepTrue(s, [true, true, true]);
    expect([...result.values]).toEqual([1, 2, 3]);
  });

  test("all false — returns empty", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const result = keepTrue(s, [false, false, false]);
    expect(result.index.size).toBe(0);
  });

  test("empty series", () => {
    const s = new Series<Scalar>({ data: [], index: [] });
    const result = keepTrue(s, []);
    expect(result.index.size).toBe(0);
  });

  test("mask as Series", () => {
    const s = new Series<Scalar>({ data: [100, 200, 300], index: [0, 1, 2] });
    const mask = new Series<Scalar>({ data: [true, false, true], index: [0, 1, 2] });
    const result = keepTrue(s, mask);
    expect([...result.values]).toEqual([100, 300]);
  });

  test("null mask values treated as false", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const mask = new Series<Scalar>({ data: [true, null, true], index: [0, 1, 2] });
    const result = keepTrue(s, mask);
    expect([...result.values]).toEqual([1, 3]);
  });

  test("preserves series name", () => {
    const s = new Series<Scalar>({ data: [1, 2], index: [0, 1], name: "testname" });
    const result = keepTrue(s, [true, false]);
    expect(result.name).toBe("testname");
  });

  test("single element — true", () => {
    const s = new Series<Scalar>({ data: [42], index: ["x"] });
    const result = keepTrue(s, [true]);
    expect([...result.values]).toEqual([42]);
  });

  test("single element — false", () => {
    const s = new Series<Scalar>({ data: [42], index: ["x"] });
    const result = keepTrue(s, [false]);
    expect(result.index.size).toBe(0);
  });
});

describe("keepFalse", () => {
  test("keeps elements where mask is false", () => {
    const s = new Series<Scalar>({ data: [10, 20, 30, 40], index: [0, 1, 2, 3] });
    const result = keepFalse(s, [true, false, true, false]);
    expect([...result.values]).toEqual([20, 40]);
  });

  test("preserves index labels", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: ["a", "b", "c"] });
    const result = keepFalse(s, [true, false, true]);
    expect([...result.index.values]).toEqual(["b"]);
  });

  test("all true — returns empty", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const result = keepFalse(s, [true, true, true]);
    expect(result.index.size).toBe(0);
  });

  test("all false — returns all values", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const result = keepFalse(s, [false, false, false]);
    expect([...result.values]).toEqual([1, 2, 3]);
  });

  test("mask as Series", () => {
    const s = new Series<Scalar>({ data: [10, 20, 30], index: [0, 1, 2] });
    const mask = new Series<Scalar>({ data: [false, true, false], index: [0, 1, 2] });
    const result = keepFalse(s, mask);
    expect([...result.values]).toEqual([10, 30]);
  });

  // property: keepTrue + keepFalse = full series (same values, disjoint positions)
  test("property: keepTrue ∪ keepFalse = original values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 0, maxLength: 10 }),
        fc.array(fc.boolean(), { minLength: 0, maxLength: 10 }),
        (vals, bools) => {
          const len = Math.min(vals.length, bools.length);
          const s = new Series<Scalar>({
            data: vals.slice(0, len),
            index: Array.from({ length: len }, (_, i) => i),
          });
          const mask = bools.slice(0, len);
          const trueVals = [...keepTrue(s, mask).values] as number[];
          const falseVals = [...keepFalse(s, mask).values] as number[];
          const combined = [...trueVals, ...falseVals].sort((a, b) => a - b);
          const original = vals.slice(0, len).sort((a, b) => a - b);
          return combined.length === original.length && combined.every((v, i) => v === original[i]);
        },
      ),
    );
  });
});

describe("filterBy", () => {
  test("keep rows where mask is true", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = filterBy(df, [true, false, true]);
    expect([...result.col("a").values]).toEqual([1, 3]);
    expect([...result.col("b").values]).toEqual([4, 6]);
  });

  test("keeps all rows when all true", () => {
    const df = DataFrame.fromColumns({ x: [10, 20, 30] });
    const result = filterBy(df, [true, true, true]);
    expect(result.index.size).toBe(3);
  });

  test("returns empty DataFrame when all false", () => {
    const df = DataFrame.fromColumns({ x: [10, 20, 30] });
    const result = filterBy(df, [false, false, false]);
    expect(result.index.size).toBe(0);
  });

  test("mask as Series", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const mask = new Series<Scalar>({ data: [false, true, false], index: [0, 1, 2] });
    const result = filterBy(df, mask);
    expect([...result.col("a").values]).toEqual([2]);
  });

  test("preserves original row index labels", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] }, { index: ["x", "y", "z"] });
    const result = filterBy(df, [true, false, true]);
    expect([...result.index.values]).toEqual(["x", "z"]);
  });

  test("empty DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [] as number[] });
    const result = filterBy(df, []);
    expect(result.index.size).toBe(0);
  });

  test("single-row DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [42] });
    const result = filterBy(df, [true]);
    expect([...result.col("a").values]).toEqual([42]);
  });

  test("preserves column structure", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] });
    const result = filterBy(df, [true, false, true]);
    expect(result.columns.values).toEqual(["a", "b", "c"]);
  });

  // property: filterBy result row count equals number of truthy mask values
  test("property: result rows = count of truthy mask values", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 0, maxLength: 10 }), (mask) => {
        const df = DataFrame.fromColumns({
          v: Array.from({ length: mask.length }, (_, i) => i),
        });
        const result = filterBy(df, mask);
        const expected = mask.filter(Boolean).length;
        return result.index.size === expected;
      }),
    );
  });
});
