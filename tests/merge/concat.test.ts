/**
 * Tests for concat — pandas.concat port.
 *
 * Covers:
 * - axis=0: Series+Series → Series, DataFrame+DataFrame → DataFrame
 * - axis=1: Series+Series → DataFrame, DataFrame+DataFrame → DataFrame
 * - join="outer" (default) and join="inner"
 * - ignoreIndex=true
 * - Error cases (empty, mixed types)
 * - Property-based tests with fast-check
 */

import { describe, expect, it } from "bun:test";
import { assert, array, integer, property, string } from "fast-check";

import { DataFrame, Index, Series } from "tsb";
import { concat } from "tsb";

// ─── axis=0, Series ───────────────────────────────────────────────────────────

describe("concat — axis=0, Series", () => {
  it("concatenates two simple Series", () => {
    const s1 = new Series<number>({ data: [1, 2, 3] });
    const s2 = new Series<number>({ data: [4, 5] });
    const result = concat([s1, s2]) as Series<number>;
    expect(result).toBeInstanceOf(Series);
    expect([...result.values]).toEqual([1, 2, 3, 4, 5]);
    expect(result.length).toBe(5);
  });

  it("preserves labels from both indexes", () => {
    const s1 = new Series<number>({ data: [10, 20], index: ["a", "b"] });
    const s2 = new Series<number>({ data: [30, 40], index: ["c", "d"] });
    const result = concat([s1, s2]) as Series<number>;
    expect([...result.index.values]).toEqual(["a", "b", "c", "d"]);
    expect([...result.values]).toEqual([10, 20, 30, 40]);
  });

  it("ignoreIndex resets to RangeIndex", () => {
    const s1 = new Series<number>({ data: [1, 2], index: ["x", "y"] });
    const s2 = new Series<number>({ data: [3], index: ["z"] });
    const result = concat([s1, s2], { ignoreIndex: true }) as Series<number>;
    expect([...result.index.values]).toEqual([0, 1, 2]);
  });

  it("single-item list returns equivalent Series", () => {
    const s = new Series<number>({ data: [1, 2, 3], index: ["a", "b", "c"] });
    const result = concat([s]) as Series<number>;
    expect([...result.values]).toEqual([1, 2, 3]);
    expect([...result.index.values]).toEqual(["a", "b", "c"]);
  });

  it("handles empty Series in list", () => {
    const s1 = new Series<number>({ data: [] });
    const s2 = new Series<number>({ data: [1, 2] });
    const result = concat([s1, s2]) as Series<number>;
    expect([...result.values]).toEqual([1, 2]);
  });

  it("explicit axis='index' is same as axis=0", () => {
    const s1 = new Series<number>({ data: [1] });
    const s2 = new Series<number>({ data: [2] });
    const r = concat([s1, s2], { axis: "index" }) as Series<number>;
    expect(r.length).toBe(2);
  });
});

// ─── axis=0, DataFrame ────────────────────────────────────────────────────────

describe("concat — axis=0, DataFrame", () => {
  it("stacks rows of two DataFrames with same columns", () => {
    const df1 = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const df2 = DataFrame.fromColumns({ a: [5, 6], b: [7, 8] });
    const result = concat([df1, df2]) as DataFrame;
    expect(result.shape).toEqual([4, 2]);
    expect([...result.col("a").values]).toEqual([1, 2, 5, 6]);
    expect([...result.col("b").values]).toEqual([3, 4, 7, 8]);
  });

  it("outer join fills missing columns with null", () => {
    const df1 = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const df2 = DataFrame.fromColumns({ b: [5, 6], c: [7, 8] });
    const result = concat([df1, df2]) as DataFrame;
    expect(result.shape).toEqual([4, 3]);
    // df1 rows have null for 'c'; df2 rows have null for 'a'
    expect([...result.col("a").values]).toEqual([1, 2, null, null]);
    expect([...result.col("b").values]).toEqual([3, 4, 5, 6]);
    expect([...result.col("c").values]).toEqual([null, null, 7, 8]);
  });

  it("inner join keeps only common columns", () => {
    const df1 = DataFrame.fromColumns({ a: [1], b: [2], c: [3] });
    const df2 = DataFrame.fromColumns({ b: [4], c: [5], d: [6] });
    const result = concat([df1, df2], { join: "inner" }) as DataFrame;
    expect([...result.columns.values].sort()).toEqual(["b", "c"]);
    expect(result.shape).toEqual([2, 2]);
  });

  it("preserves row index labels", () => {
    const df1 = DataFrame.fromColumns({ x: [10] }, { index: new Index<number>([100]) });
    const df2 = DataFrame.fromColumns({ x: [20] }, { index: new Index<number>([200]) });
    const result = concat([df1, df2]) as DataFrame;
    expect([...result.index.values]).toEqual([100, 200]);
  });

  it("ignoreIndex resets row index", () => {
    const df1 = DataFrame.fromColumns({ v: [1, 2] }, { index: ["a", "b"] });
    const df2 = DataFrame.fromColumns({ v: [3, 4] }, { index: ["c", "d"] });
    const result = concat([df1, df2], { ignoreIndex: true }) as DataFrame;
    expect([...result.index.values]).toEqual([0, 1, 2, 3]);
  });

  it("stacks three DataFrames", () => {
    const df1 = DataFrame.fromColumns({ n: [1] });
    const df2 = DataFrame.fromColumns({ n: [2] });
    const df3 = DataFrame.fromColumns({ n: [3] });
    const result = concat([df1, df2, df3]) as DataFrame;
    expect(result.shape[0]).toBe(3);
    expect([...result.col("n").values]).toEqual([1, 2, 3]);
  });
});

// ─── axis=1, Series ───────────────────────────────────────────────────────────

describe("concat — axis=1, Series", () => {
  it("builds DataFrame from two named Series", () => {
    const s1 = new Series<number>({ data: [1, 2, 3], name: "x" });
    const s2 = new Series<number>({ data: [4, 5, 6], name: "y" });
    const result = concat([s1, s2], { axis: 1 }) as DataFrame;
    expect(result).toBeInstanceOf(DataFrame);
    expect(result.shape).toEqual([3, 2]);
    expect([...result.col("x").values]).toEqual([1, 2, 3]);
    expect([...result.col("y").values]).toEqual([4, 5, 6]);
  });

  it("unnamed Series get integer column names", () => {
    const s1 = new Series<number>({ data: [1, 2] });
    const s2 = new Series<number>({ data: [3, 4] });
    const result = concat([s1, s2], { axis: 1 }) as DataFrame;
    expect(result.has("0")).toBe(true);
    expect(result.has("1")).toBe(true);
  });

  it("outer join aligns on row index and fills missing with null", () => {
    const s1 = new Series<number>({ data: [1, 2], index: ["a", "b"], name: "s1" });
    const s2 = new Series<number>({ data: [3, 4], index: ["b", "c"], name: "s2" });
    const result = concat([s1, s2], { axis: 1 }) as DataFrame;
    expect(result.shape).toEqual([3, 2]);
    expect([...result.col("s1").values]).toEqual([1, 2, null]);
    expect([...result.col("s2").values]).toEqual([null, 3, 4]);
  });

  it("inner join keeps only common row labels", () => {
    const s1 = new Series<number>({ data: [1, 2, 3], index: ["a", "b", "c"], name: "p" });
    const s2 = new Series<number>({ data: [10, 20], index: ["b", "c"], name: "q" });
    const result = concat([s1, s2], { axis: 1, join: "inner" }) as DataFrame;
    expect([...result.index.values]).toEqual(["b", "c"]);
    expect([...result.col("p").values]).toEqual([2, 3]);
    expect([...result.col("q").values]).toEqual([10, 20]);
  });

  it("ignoreIndex resets row index in axis=1 result", () => {
    const s1 = new Series<number>({ data: [1, 2], index: ["a", "b"], name: "c" });
    const result = concat([s1], { axis: 1, ignoreIndex: true }) as DataFrame;
    expect([...result.index.values]).toEqual([0, 1]);
  });

  it("axis='columns' is same as axis=1", () => {
    const s1 = new Series<number>({ data: [1], name: "a" });
    const s2 = new Series<number>({ data: [2], name: "b" });
    const r = concat([s1, s2], { axis: "columns" }) as DataFrame;
    expect(r).toBeInstanceOf(DataFrame);
  });
});

// ─── axis=1, DataFrame ────────────────────────────────────────────────────────

describe("concat — axis=1, DataFrame", () => {
  it("merges two DataFrames side by side with same index", () => {
    const df1 = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const df2 = DataFrame.fromColumns({ c: [5, 6], d: [7, 8] });
    const result = concat([df1, df2], { axis: 1 }) as DataFrame;
    expect(result.shape).toEqual([2, 4]);
    expect([...result.col("a").values]).toEqual([1, 2]);
    expect([...result.col("d").values]).toEqual([7, 8]);
  });

  it("outer join fills missing rows with null", () => {
    const df1 = DataFrame.fromColumns({ a: [1, 2] }, { index: ["x", "y"] });
    const df2 = DataFrame.fromColumns({ b: [10] }, { index: ["y"] });
    const result = concat([df1, df2], { axis: 1 }) as DataFrame;
    expect(result.shape[0]).toBe(2);
    expect([...result.col("b").values]).toEqual([null, 10]);
  });

  it("inner join keeps only shared rows", () => {
    const df1 = DataFrame.fromColumns({ a: [1, 2, 3] }, { index: ["x", "y", "z"] });
    const df2 = DataFrame.fromColumns({ b: [10, 20] }, { index: ["y", "z"] });
    const result = concat([df1, df2], { axis: 1, join: "inner" }) as DataFrame;
    expect([...result.index.values]).toEqual(["y", "z"]);
    expect([...result.col("a").values]).toEqual([2, 3]);
    expect([...result.col("b").values]).toEqual([10, 20]);
  });
});

// ─── error cases ──────────────────────────────────────────────────────────────

describe("concat — error cases", () => {
  it("throws on empty array", () => {
    expect(() => concat([])).toThrow(TypeError);
  });

  it("throws on mixed Series and DataFrame", () => {
    const s = new Series<number>({ data: [1] });
    const df = DataFrame.fromColumns({ a: [1] });
    expect(() => concat([s, df])).toThrow(TypeError);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("concat — property-based", () => {
  it("axis=0 Series: total length equals sum of individual lengths", () => {
    assert(
      property(
        array(array(integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 10 }), {
          minLength: 1,
          maxLength: 5,
        }),
        (arrays) => {
          const series = arrays.map((arr) => new Series<number>({ data: arr }));
          const result = concat(series, { ignoreIndex: true }) as Series<number>;
          const expectedLen = arrays.reduce((sum, a) => sum + a.length, 0);
          return result.length === expectedLen;
        },
      ),
    );
  });

  it("axis=0 DataFrame: total rows equals sum of individual row counts", () => {
    assert(
      property(
        array(array(integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 8 }), {
          minLength: 1,
          maxLength: 4,
        }),
        (arrays) => {
          const frames = arrays.map((arr) => DataFrame.fromColumns({ v: arr }));
          const result = concat(frames, { ignoreIndex: true }) as DataFrame;
          const expectedRows = arrays.reduce((sum, a) => sum + a.length, 0);
          return result.shape[0] === expectedRows;
        },
      ),
    );
  });

  it("axis=1 Series: result DataFrame has correct column count (unique names)", () => {
    assert(
      property(
        array(string({ minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 6 }),
        (names) => {
          const uniqueNames = [...new Set(names)];
          if (uniqueNames.length === 0) {
            return true;
          }
          const series = uniqueNames.map((n) => new Series<number>({ data: [1, 2, 3], name: n }));
          const result = concat(series, { axis: 1 }) as DataFrame;
          return result.shape[1] === uniqueNames.length;
        },
      ),
    );
  });

  it("concat then check values preserved for non-overlapping axis=0", () => {
    assert(
      property(
        array(integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 10 }),
        array(integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 10 }),
        (a, b) => {
          const s1 = new Series<number>({ data: a });
          const s2 = new Series<number>({ data: b });
          const r = concat([s1, s2], { ignoreIndex: true }) as Series<number>;
          const vals = [...r.values];
          const combined = [...a, ...b];
          return vals.every((v, i) => v === combined[i]);
        },
      ),
    );
  });
});
