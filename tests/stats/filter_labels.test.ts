/**
 * Tests for filter_labels — filterDataFrame and filterSeries.
 *
 * Covers:
 * - filterDataFrame: items, like, regex on columns (default axis)
 * - filterDataFrame: items, like, regex on rows (axis=0)
 * - filterSeries: items, like, regex
 * - Error cases: no filter / multiple filters
 * - Property-based: filtered columns are subset of original
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series, filterDataFrame, filterSeries } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

describe("filterDataFrame", () => {
  // ─── columns (default axis=1) ─────────────────────────────────────────────
  describe("columns (default)", () => {
    const df = DataFrame.fromColumns({
      apple: [1, 2],
      banana: [3, 4],
      cherry: [5, 6],
      apricot: [7, 8],
    });

    test("items: keeps specified columns in original order", () => {
      const result = filterDataFrame(df, { items: ["apple", "cherry"] });
      expect(result.columns.values).toEqual(["apple", "cherry"]);
      expect(result.col("apple").values).toEqual([1, 2]);
    });

    test("items: missing item names are silently skipped", () => {
      const result = filterDataFrame(df, { items: ["apple", "missing"] });
      expect(result.columns.values).toEqual(["apple"]);
    });

    test("items: empty items returns empty DataFrame", () => {
      const result = filterDataFrame(df, { items: [] });
      expect(result.columns.values).toEqual([]);
    });

    test("like: keeps columns containing substring", () => {
      const result = filterDataFrame(df, { like: "ap" });
      expect(result.columns.values).toEqual(["apple", "apricot"]);
    });

    test("like: no match returns empty DataFrame", () => {
      const result = filterDataFrame(df, { like: "zzz" });
      expect(result.columns.values).toEqual([]);
    });

    test("like: empty string matches all", () => {
      const result = filterDataFrame(df, { like: "" });
      expect(result.columns.values).toEqual(["apple", "banana", "cherry", "apricot"]);
    });

    test("regex: keeps columns matching pattern", () => {
      const result = filterDataFrame(df, { regex: "^a" });
      expect(result.columns.values).toEqual(["apple", "apricot"]);
    });

    test("regex: pattern with groups", () => {
      const result = filterDataFrame(df, { regex: "(cherry|banana)" });
      expect(result.columns.values).toEqual(["banana", "cherry"]);
    });

    test("explicit axis=1 same as default", () => {
      const r1 = filterDataFrame(df, { like: "an", axis: 1 });
      const r2 = filterDataFrame(df, { like: "an" });
      expect(r1.columns.values).toEqual(r2.columns.values);
    });

    test("preserves row data", () => {
      const result = filterDataFrame(df, { items: ["banana"] });
      expect(result.col("banana").values).toEqual([3, 4]);
    });
  });

  // ─── rows (axis=0) ───────────────────────────────────────────────────────────
  describe("rows (axis=0)", () => {
    const df = DataFrame.fromColumns(
      { a: [10, 20, 30, 40], b: [1, 2, 3, 4] },
      { index: ["foo", "bar", "baz", "qux"] },
    );

    test("items: keeps specified row labels", () => {
      const result = filterDataFrame(df, { items: ["foo", "baz"], axis: 0 });
      expect(result.index.values).toEqual(["foo", "baz"]);
      expect(result.col("a").values).toEqual([10, 30]);
    });

    test("like: keeps rows containing substring", () => {
      const result = filterDataFrame(df, { like: "ba", axis: 0 });
      expect(result.index.values).toEqual(["bar", "baz"]);
    });

    test("regex: row labels matching pattern", () => {
      const result = filterDataFrame(df, { regex: "^b", axis: 0 });
      expect(result.index.values).toEqual(["bar", "baz"]);
    });

    test("axis='index' is alias for axis=0", () => {
      const result = filterDataFrame(df, { like: "oo", axis: "index" });
      expect(result.index.values).toEqual(["foo"]);
    });

    test("axis='columns' is alias for axis=1", () => {
      const result = filterDataFrame(df, { like: "a", axis: "columns" });
      expect(result.columns.values).toEqual(["a"]);
    });

    test("numeric index with items", () => {
      const df2 = DataFrame.fromColumns({ x: [1, 2, 3] }, { index: [10, 20, 30] });
      const result = filterDataFrame(df2, { items: [10, 30], axis: 0 });
      expect(result.index.values).toEqual([10, 30]);
      expect(result.col("x").values).toEqual([1, 3]);
    });
  });

  // ─── error cases ─────────────────────────────────────────────────────────────
  describe("error cases", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });

    test("no filter specified throws TypeError", () => {
      expect(() => filterDataFrame(df, {})).toThrow(TypeError);
    });

    test("multiple filters specified throws TypeError", () => {
      expect(() => filterDataFrame(df, { items: ["a"], like: "a" })).toThrow(TypeError);
    });
  });

  // ─── property-based ──────────────────────────────────────────────────────────
  describe("property-based", () => {
    test("filtered columns are always a subset of original", () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.string({ minLength: 1, maxLength: 6 }), { minLength: 0, maxLength: 8 })
            .map((names) => [...new Set(names)]),
          fc.string({ minLength: 0, maxLength: 3 }),
          (colNames, pattern) => {
            const cols: Record<string, number[]> = {};
            for (const name of colNames) {
              cols[name] = [1, 2];
            }
            const df2 = DataFrame.fromColumns(cols);
            const result = filterDataFrame(df2, { like: pattern });
            const original = new Set(colNames);
            for (const c of result.columns.values as string[]) {
              if (!original.has(c)) {
                return false;
              }
            }
            return true;
          },
        ),
      );
    });
  });
});

describe("filterSeries", () => {
  const s = new Series<Scalar>({
    data: [10, 20, 30, 40],
    index: ["alpha", "beta", "gamma", "aleph"],
  });

  test("items: keeps specified labels", () => {
    const result = filterSeries(s, { items: ["alpha", "gamma"] });
    expect(result.index.values).toEqual(["alpha", "gamma"]);
    expect(result.values).toEqual([10, 30]);
  });

  test("like: keeps labels containing substring", () => {
    const result = filterSeries(s, { like: "al" });
    expect(result.index.values).toEqual(["alpha", "aleph"]);
    expect(result.values).toEqual([10, 40]);
  });

  test("regex: keeps labels matching pattern", () => {
    const result = filterSeries(s, { regex: "^b" });
    expect(result.index.values).toEqual(["beta"]);
    expect(result.values).toEqual([20]);
  });

  test("no match: returns empty series", () => {
    const result = filterSeries(s, { like: "zzz" });
    expect(result.size).toBe(0);
  });

  test("preserves name", () => {
    const named = new Series<Scalar>({ data: [1, 2], index: ["a", "b"], name: "test" });
    const result = filterSeries(named, { items: ["a"] });
    expect(result.name).toBe("test");
  });

  test("error: no filter", () => {
    expect(() => filterSeries(s, {})).toThrow(TypeError);
  });

  test("error: multiple filters", () => {
    expect(() => filterSeries(s, { items: ["alpha"], regex: "^a" })).toThrow(TypeError);
  });

  test("numeric index items", () => {
    const ns = new Series<Scalar>({ data: [1, 2, 3], index: [100, 200, 300] });
    const result = filterSeries(ns, { items: [100, 300] });
    expect(result.index.values).toEqual([100, 300]);
    expect(result.values).toEqual([1, 3]);
  });
});
