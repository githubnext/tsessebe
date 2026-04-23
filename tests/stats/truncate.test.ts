/**
 * Tests for truncate — truncateSeries and truncateDataFrame.
 *
 * Covers:
 * - truncateSeries: before, after, both, none, edge cases, string index
 * - truncateDataFrame: row axis (default), column axis
 * - Property-based: all returned labels are within [before, after]
 * - Error / empty cases
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series, truncateDataFrame, truncateSeries } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── truncateSeries ───────────────────────────────────────────────────────────

describe("truncateSeries", () => {
  test("both bounds: keeps labels in [1, 3]", () => {
    const s = new Series<Scalar>({ data: [10, 20, 30, 40, 50], index: [0, 1, 2, 3, 4] });
    const result = truncateSeries(s, 1, 3);
    expect(result.values).toEqual([20, 30, 40]);
    expect(result.index.values).toEqual([1, 2, 3]);
  });

  test("only before: drops labels < before", () => {
    const s = new Series<Scalar>({ data: [10, 20, 30, 40, 50], index: [0, 1, 2, 3, 4] });
    const result = truncateSeries(s, 2);
    expect(result.values).toEqual([30, 40, 50]);
    expect(result.index.values).toEqual([2, 3, 4]);
  });

  test("only after: drops labels > after", () => {
    const s = new Series<Scalar>({ data: [10, 20, 30, 40, 50], index: [0, 1, 2, 3, 4] });
    const result = truncateSeries(s, undefined, 2);
    expect(result.values).toEqual([10, 20, 30]);
    expect(result.index.values).toEqual([0, 1, 2]);
  });

  test("no bounds: returns original data", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [10, 20, 30] });
    const result = truncateSeries(s);
    expect(result.values).toEqual([1, 2, 3]);
  });

  test("exact single label", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const result = truncateSeries(s, 1, 1);
    expect(result.values).toEqual([2]);
    expect(result.index.values).toEqual([1]);
  });

  test("empty result when no labels in range", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const result = truncateSeries(s, 10, 20);
    expect(result.values).toEqual([]);
    expect(result.index.values).toEqual([]);
  });

  test("preserves original series (pure)", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    truncateSeries(s, 1, 2);
    expect(s.values).toEqual([1, 2, 3]);
  });

  test("preserves name", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2], name: "myCol" });
    const result = truncateSeries(s, 0, 1);
    expect(result.name).toBe("myCol");
  });

  test("string index: lexicographic truncation", () => {
    const s = new Series<Scalar>({
      data: [1, 2, 3, 4, 5],
      index: ["apple", "banana", "cherry", "date", "elderberry"],
    });
    const result = truncateSeries(s, "banana", "date");
    expect(result.values).toEqual([2, 3, 4]);
    expect(result.index.values).toEqual(["banana", "cherry", "date"]);
  });

  test("non-monotonic index: keeps all in-range labels", () => {
    const s = new Series<Scalar>({ data: [10, 20, 30, 40], index: [3, 1, 4, 2] });
    const result = truncateSeries(s, 2, 3);
    expect(result.values).toEqual([10, 40]);
    expect(result.index.values).toEqual([3, 2]);
  });

  test("floating-point index", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0.5, 1.5, 2.5] });
    const result = truncateSeries(s, 1.0, 2.0);
    expect(result.values).toEqual([2]);
    expect(result.index.values).toEqual([1.5]);
  });

  test("property: all returned labels are within [before, after]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (indices, a, b) => {
          const [before, after] = a <= b ? [a, b] : [b, a];
          const s = new Series<Scalar>({ data: indices.map((_, i) => i), index: indices });
          const result = truncateSeries(s, before, after);
          return result.index.values.every(
            (v) => (v as number) >= before && (v as number) <= after,
          );
        },
      ),
    );
  });
});

// ─── truncateDataFrame ────────────────────────────────────────────────────────

describe("truncateDataFrame", () => {
  test("truncate rows with both bounds", () => {
    const df = DataFrame.fromColumns(
      { a: [10, 20, 30, 40, 50], b: [1, 2, 3, 4, 5] },
      { index: [0, 1, 2, 3, 4] },
    );
    const result = truncateDataFrame(df, 1, 3);
    expect(result.col("a").values).toEqual([20, 30, 40]);
    expect(result.col("b").values).toEqual([2, 3, 4]);
    expect(result.index.values).toEqual([1, 2, 3]);
  });

  test("truncate rows with only before", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3, 4] }, { index: [0, 1, 2, 3] });
    expect(truncateDataFrame(df, 2).col("x").values).toEqual([3, 4]);
  });

  test("truncate rows with only after", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3, 4] }, { index: [0, 1, 2, 3] });
    expect(truncateDataFrame(df, undefined, 1).col("x").values).toEqual([1, 2]);
  });

  test("truncate rows: no bounds returns all rows", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = truncateDataFrame(df);
    expect(result.col("a").values).toEqual([1, 2, 3]);
  });

  test("truncate columns (axis=1)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c: [5, 6] });
    const result = truncateDataFrame(df, "a", "b", { axis: 1 });
    expect(result.columns.values).toEqual(["a", "b"]);
    expect(result.col("a").values).toEqual([1, 2]);
  });

  test("truncate columns (axis='columns')", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2], c: [3], d: [4] });
    const result = truncateDataFrame(df, "b", "c", { axis: "columns" });
    expect(result.columns.values).toEqual(["b", "c"]);
  });

  test("empty result when no rows in range", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3] }, { index: [0, 1, 2] });
    const result = truncateDataFrame(df, 10, 20);
    expect(result.col("x").values).toEqual([]);
  });

  test("truncate is pure: original unchanged", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] }, { index: [0, 1, 2] });
    truncateDataFrame(df, 1, 2);
    expect(df.col("a").values).toEqual([1, 2, 3]);
  });

  test("string row index", () => {
    const df = DataFrame.fromColumns({ v: [10, 20, 30] }, { index: ["a", "b", "c"] });
    const result = truncateDataFrame(df, "a", "b");
    expect(result.col("v").values).toEqual([10, 20]);
    expect(result.index.values).toEqual(["a", "b"]);
  });

  test("property: result row count does not exceed original", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 0, maxLength: 15 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (indices, a, b) => {
          const [before, after] = a <= b ? [a, b] : [b, a];
          const df = DataFrame.fromColumns({ x: indices.map((_, i) => i) }, { index: indices });
          const result = truncateDataFrame(df, before, after);
          return result.col("x").values.length <= indices.length;
        },
      ),
    );
  });
});
