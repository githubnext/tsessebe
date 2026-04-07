/**
 * Tests for src/stats/nlargest.ts
 * — nlargestSeries, nsmallestSeries, nlargestDataFrame, nsmallestDataFrame
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Index,
  Series,
  nlargestDataFrame,
  nlargestSeries,
  nsmallestDataFrame,
  nsmallestSeries,
} from "../../src/index.ts";
import type { Label, Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[], name?: string): Series<Scalar> {
  return new Series({ data: [...data], ...(name !== undefined ? { name } : {}) });
}

function vals(series: Series<Scalar>): Scalar[] {
  return [...series.values];
}

function idxVals(series: Series<Scalar>): Scalar[] {
  return [...series.index.values];
}

// ─── nlargestSeries ──────────────────────────────────────────────────────────

describe("nlargestSeries", () => {
  it("returns top n values in descending order", () => {
    const result = nlargestSeries(s([3, 1, 4, 1, 5, 9, 2, 6]), 3);
    expect(vals(result)).toEqual([9, 6, 5]);
  });

  it("preserves original index labels", () => {
    const series = new Series({ data: [3, 1, 4, 1, 5], index: ["a", "b", "c", "d", "e"] });
    const result = nlargestSeries(series, 3);
    expect(vals(result)).toEqual([5, 4, 3]);
    expect(idxVals(result)).toEqual(["e", "c", "a"]);
  });

  it("returns all elements when n >= length", () => {
    const result = nlargestSeries(s([3, 1, 2]), 10);
    expect(vals(result)).toEqual([3, 2, 1]);
  });

  it("returns empty series when n = 0", () => {
    const result = nlargestSeries(s([1, 2, 3]), 0);
    expect(vals(result)).toEqual([]);
  });

  it("excludes NaN values", () => {
    const result = nlargestSeries(s([3, NaN, 5, NaN, 1]), 3);
    expect(vals(result)).toEqual([5, 3, 1]);
  });

  it("excludes null values", () => {
    const result = nlargestSeries(s([3, null, 5, null, 1]), 3);
    expect(vals(result)).toEqual([5, 3, 1]);
  });

  it("keep='first' selects first occurrence on tie at boundary", () => {
    const series = new Series({ data: [5, 5, 5], index: [0, 1, 2] });
    const result = nlargestSeries(series, 2, { keep: "first" });
    expect(vals(result)).toEqual([5, 5]);
    expect(idxVals(result)).toEqual([0, 1]);
  });

  it("keep='last' selects last occurrence on tie at boundary", () => {
    const series = new Series({ data: [5, 5, 5], index: [0, 1, 2] });
    const result = nlargestSeries(series, 2, { keep: "last" });
    expect(vals(result)).toEqual([5, 5]);
    expect(idxVals(result)).toEqual([1, 2]);
  });

  it("keep='all' returns all ties at boundary", () => {
    const series = new Series({ data: [5, 5, 5], index: [0, 1, 2] });
    const result = nlargestSeries(series, 2, { keep: "all" });
    expect(vals(result)).toEqual([5, 5, 5]);
  });

  it("keep='all' includes ties at boundary when n is exact", () => {
    const series = new Series({ data: [1, 3, 3, 5], index: [0, 1, 2, 3] });
    const result = nlargestSeries(series, 2, { keep: "all" });
    // top 2 would be 5 and one of the 3s — but all 3s tie at boundary → 5, 3, 3
    expect(vals(result)).toEqual([5, 3, 3]);
  });

  it("keep='first' breaks tie at boundary to keep first occurrence", () => {
    const series = new Series({ data: [1, 3, 3, 5], index: [0, 1, 2, 3] });
    const result = nlargestSeries(series, 2, { keep: "first" });
    expect(vals(result)).toEqual([5, 3]);
    expect(idxVals(result)).toEqual([3, 1]);
  });

  it("keep='last' breaks tie at boundary to keep last occurrence", () => {
    const series = new Series({ data: [1, 3, 3, 5], index: [0, 1, 2, 3] });
    const result = nlargestSeries(series, 2, { keep: "last" });
    expect(vals(result)).toEqual([5, 3]);
    expect(idxVals(result)).toEqual([3, 2]);
  });

  it("works with string values", () => {
    const result = nlargestSeries(s(["banana", "apple", "cherry", "date"]), 2);
    expect(vals(result)).toEqual(["date", "cherry"]);
  });

  it("works with single element", () => {
    const result = nlargestSeries(s([42]), 1);
    expect(vals(result)).toEqual([42]);
  });

  it("empty series returns empty", () => {
    const result = nlargestSeries(s([]), 3);
    expect(vals(result)).toEqual([]);
  });

  it("preserves series name", () => {
    const result = nlargestSeries(s([1, 2, 3], "my_col"), 2);
    expect(result.name).toBe("my_col");
  });

  it("all NaN returns empty", () => {
    const result = nlargestSeries(s([NaN, NaN]), 2);
    expect(vals(result)).toEqual([]);
  });
});

// ─── nsmallestSeries ─────────────────────────────────────────────────────────

describe("nsmallestSeries", () => {
  it("returns top n values in ascending order", () => {
    const result = nsmallestSeries(s([3, 1, 4, 1, 5, 9, 2, 6]), 3);
    expect(vals(result)).toEqual([1, 1, 2]);
  });

  it("preserves original index labels", () => {
    const series = new Series({ data: [3, 1, 4, 1, 5], index: ["a", "b", "c", "d", "e"] });
    const result = nsmallestSeries(series, 3);
    expect(vals(result)).toEqual([1, 1, 3]);
    expect(idxVals(result)).toEqual(["b", "d", "a"]);
  });

  it("returns all when n >= length", () => {
    const result = nsmallestSeries(s([3, 1, 2]), 10);
    expect(vals(result)).toEqual([1, 2, 3]);
  });

  it("returns empty when n = 0", () => {
    const result = nsmallestSeries(s([1, 2, 3]), 0);
    expect(vals(result)).toEqual([]);
  });

  it("excludes NaN values", () => {
    const result = nsmallestSeries(s([3, NaN, 5, NaN, 1]), 2);
    expect(vals(result)).toEqual([1, 3]);
  });

  it("keep='first' selects first on tie at boundary", () => {
    const series = new Series({ data: [1, 1, 1, 5], index: [0, 1, 2, 3] });
    const result = nsmallestSeries(series, 2, { keep: "first" });
    expect(vals(result)).toEqual([1, 1]);
    expect(idxVals(result)).toEqual([0, 1]);
  });

  it("keep='last' selects last on tie at boundary", () => {
    const series = new Series({ data: [1, 1, 1, 5], index: [0, 1, 2, 3] });
    const result = nsmallestSeries(series, 2, { keep: "last" });
    expect(vals(result)).toEqual([1, 1]);
    expect(idxVals(result)).toEqual([1, 2]);
  });

  it("keep='all' returns all ties at boundary", () => {
    const series = new Series({ data: [1, 3, 1, 5], index: [0, 1, 2, 3] });
    const result = nsmallestSeries(series, 2, { keep: "all" });
    // n=2: smallest two are 1 (pos 0) and 1 (pos 2) — tie at boundary (3) → already 2 items
    expect(vals(result)).toEqual([1, 1]);
  });

  it("keep='all' expands on tie at boundary", () => {
    const series = new Series({ data: [5, 3, 3, 1], index: [0, 1, 2, 3] });
    const result = nsmallestSeries(series, 2, { keep: "all" });
    // smallest 2: pos3(1), pos1(3) — but 3 ties with pos2(3) → include all → [1, 3, 3]
    expect(vals(result)).toEqual([1, 3, 3]);
  });

  it("works with string values", () => {
    const result = nsmallestSeries(s(["banana", "apple", "cherry", "date"]), 2);
    expect(vals(result)).toEqual(["apple", "banana"]);
  });

  it("empty series returns empty", () => {
    const result = nsmallestSeries(s([]), 3);
    expect(vals(result)).toEqual([]);
  });
});

// ─── nlargestDataFrame ────────────────────────────────────────────────────────

describe("nlargestDataFrame", () => {
  it("returns n rows with largest values in a single column", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 4, 1, 5], b: [10, 20, 30, 40, 50] });
    const result = nlargestDataFrame(df, 2, { columns: "a" });
    expect([...result.col("a").values]).toEqual([5, 4]);
    expect([...result.col("b").values]).toEqual([50, 30]);
  });

  it("preserves original index labels", () => {
    const idx = new Index<Label>(["w", "x", "y", "z"]);
    const df = new DataFrame(
      new Map<string, Series<Scalar>>([
        ["a", new Series<Scalar>({ data: [3, 1, 5, 2], index: idx })],
        ["b", new Series<Scalar>({ data: [10, 20, 30, 40], index: idx })],
      ]),
      idx,
    );
    const result = nlargestDataFrame(df, 2, { columns: "a" });
    expect([...result.col("a").values]).toEqual([5, 3]);
    expect([...result.index.values]).toEqual(["y", "w"]);
  });

  it("uses multiple columns for comparison", () => {
    const df = DataFrame.fromColumns({ a: [3, 3, 1], b: [10, 20, 30] });
    const result = nlargestDataFrame(df, 2, { columns: ["a", "b"] });
    expect([...result.col("a").values]).toEqual([3, 3]);
    expect([...result.col("b").values]).toEqual([20, 10]);
  });

  it("returns all rows when n >= nrows", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 2] });
    const result = nlargestDataFrame(df, 100, { columns: "a" });
    expect(result.shape[0]).toBe(3);
  });

  it("returns empty DataFrame when n = 0", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = nlargestDataFrame(df, 0, { columns: "a" });
    expect(result.shape[0]).toBe(0);
  });

  it("keep='first' selects first tie at boundary", () => {
    const df = DataFrame.fromColumns({ a: [5, 5, 5] });
    const result = nlargestDataFrame(df, 2, { columns: "a", keep: "first" });
    expect([...result.index.values]).toEqual([0, 1]);
  });

  it("keep='last' selects last tie at boundary", () => {
    const df = DataFrame.fromColumns({ a: [5, 5, 5] });
    const result = nlargestDataFrame(df, 2, { columns: "a", keep: "last" });
    expect([...result.index.values]).toEqual([1, 2]);
  });

  it("keep='all' returns all ties at boundary", () => {
    const df = DataFrame.fromColumns({ a: [5, 5, 5] });
    const result = nlargestDataFrame(df, 2, { columns: "a", keep: "all" });
    expect(result.shape[0]).toBe(3);
  });

  it("handles empty DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [] as number[] });
    const result = nlargestDataFrame(df, 3, { columns: "a" });
    expect(result.shape[0]).toBe(0);
  });
});

// ─── nsmallestDataFrame ───────────────────────────────────────────────────────

describe("nsmallestDataFrame", () => {
  it("returns n rows with smallest values in a single column", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 4, 1, 5], b: [10, 20, 30, 40, 50] });
    const result = nsmallestDataFrame(df, 2, { columns: "a" });
    expect([...result.col("a").values]).toEqual([1, 1]);
  });

  it("uses multiple columns for comparison", () => {
    const df = DataFrame.fromColumns({ a: [1, 1, 3], b: [20, 10, 30] });
    const result = nsmallestDataFrame(df, 2, { columns: ["a", "b"] });
    expect([...result.col("a").values]).toEqual([1, 1]);
    expect([...result.col("b").values]).toEqual([10, 20]);
  });

  it("keep='all' returns all ties at boundary", () => {
    const df = DataFrame.fromColumns({ a: [1, 1, 1, 5] });
    const result = nsmallestDataFrame(df, 2, { columns: "a", keep: "all" });
    expect(result.shape[0]).toBe(3);
  });

  it("returns all rows when n >= nrows", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 2] });
    const result = nsmallestDataFrame(df, 100, { columns: "a" });
    expect(result.shape[0]).toBe(3);
  });

  it("returns empty DataFrame when n = 0", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = nsmallestDataFrame(df, 0, { columns: "a" });
    expect(result.shape[0]).toBe(0);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("nlargestSeries property tests", () => {
  it("result length is at most n (when keep != all)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (data, n) => {
          const result = nlargestSeries(s(data as Scalar[]), n, { keep: "first" });
          return result.size <= n;
        },
      ),
    );
  });

  it("result values are sorted descending", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 0, max: 10 }),
        (data, n) => {
          const result = nlargestSeries(s(data as Scalar[]), n);
          const rv = result.values as number[];
          for (let i = 1; i < rv.length; i++) {
            if ((rv[i - 1] as number) < (rv[i] as number)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("result values are a subset of input values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 15 }),
        fc.integer({ min: 1, max: 5 }),
        (data, n) => {
          const series = s(data as Scalar[]);
          const result = nlargestSeries(series, n);
          const inputSet = new Set(data);
          return (result.values as number[]).every((v) => inputSet.has(v));
        },
      ),
    );
  });

  it("nlargest + nsmallest together cover original data when n = length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 10 }),
        (data) => {
          const series = s(data as Scalar[]);
          const largest = nlargestSeries(series, data.length);
          return largest.size === data.length;
        },
      ),
    );
  });

  it("max of nlargest equals max of original (when data has non-NaN values)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }),
        (data, n) => {
          const series = s(data as Scalar[]);
          const result = nlargestSeries(series, n);
          if (result.size === 0) {
            return true;
          }
          const maxInput = Math.max(...(data as number[]));
          const maxResult = (result.values[0] ?? Number.NaN) as number;
          return maxResult === maxInput;
        },
      ),
    );
  });
});

describe("nsmallestSeries property tests", () => {
  it("result length is at most n (when keep != all)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (data, n) => {
          const result = nsmallestSeries(s(data as Scalar[]), n, { keep: "first" });
          return result.size <= n;
        },
      ),
    );
  });

  it("result values are sorted ascending", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 0, max: 10 }),
        (data, n) => {
          const result = nsmallestSeries(s(data as Scalar[]), n);
          const rv = result.values as number[];
          for (let i = 1; i < rv.length; i++) {
            if ((rv[i - 1] as number) > (rv[i] as number)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("min of nsmallest equals min of original", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }),
        (data, n) => {
          const series = s(data as Scalar[]);
          const result = nsmallestSeries(series, n);
          if (result.size === 0) {
            return true;
          }
          const minInput = Math.min(...(data as number[]));
          const minResult = (result.values[0] ?? Number.NaN) as number;
          return minResult === minInput;
        },
      ),
    );
  });
});
