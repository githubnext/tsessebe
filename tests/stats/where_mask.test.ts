/**
 * Tests for stats/where_mask.ts
 *
 * Covers:
 * - whereSeries / maskSeries with: boolean[], Series<boolean>, callable
 * - whereDataFrame / maskDataFrame with: 2-D array, DataFrame, 1-D Series (axis 0 & 1), callable
 * - edge cases: empty, all-true, all-false, null/NaN in cond, custom `other` value
 * - property-based tests with fast-check
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import { maskDataFrame, maskSeries, whereDataFrame, whereSeries } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function s(data: (number | null)[], name = "x"): Series<number | null> {
  return new Series({ data, name }) as Series<number | null>;
}

// ─── whereSeries ──────────────────────────────────────────────────────────────

describe("whereSeries", () => {
  it("keeps values where cond=true, replaces with null by default", () => {
    const result = whereSeries(s([1, 2, 3, 4, 5]), [true, false, true, false, true]);
    expect(result.values).toEqual([1, null, 3, null, 5]);
  });

  it("uses custom other value", () => {
    const result = whereSeries(s([1, 2, 3]), [false, true, false], { other: 0 });
    expect(result.values).toEqual([0, 2, 0]);
  });

  it("works with all-true cond (identity)", () => {
    const result = whereSeries(s([1, 2, 3]), [true, true, true]);
    expect(result.values).toEqual([1, 2, 3]);
  });

  it("works with all-false cond (replace all)", () => {
    const result = whereSeries(s([1, 2, 3]), [false, false, false], { other: -1 });
    expect(result.values).toEqual([-1, -1, -1]);
  });

  it("accepts callable condition", () => {
    const result = whereSeries(s([1, 2, 3, 4, 5]), (v) => (v as number) > 2);
    expect(result.values).toEqual([null, null, 3, 4, 5]);
  });

  it("accepts callable with label argument", () => {
    const data = new Series({ data: [10, 20, 30], index: ["a", "b", "c"], name: "t" });
    const result = whereSeries(data, (_v, label) => label === "a" || label === "c");
    expect(result.values).toEqual([10, null, 30]);
  });

  it("accepts Series<boolean> condition (label alignment)", () => {
    const data = new Series({ data: [1, 2, 3], index: ["a", "b", "c"], name: "d" });
    const cond = new Series({ data: [true, false, true], index: ["a", "b", "c"], name: "c" });
    const result = whereSeries(data, cond as Series<boolean>);
    expect(result.values).toEqual([1, null, 3]);
  });

  it("handles empty Series", () => {
    const result = whereSeries(s([]), []);
    expect(result.values).toEqual([]);
  });

  it("preserves index and name", () => {
    const data = new Series({ data: [1, 2], index: ["x", "y"], name: "myname" });
    const result = whereSeries(data, [true, false]);
    expect(result.name).toBe("myname");
    expect(result.index.values).toEqual(["x", "y"]);
  });

  it("handles null values in input", () => {
    const result = whereSeries(s([1, null, 3]), [true, true, false], { other: -1 });
    expect(result.values).toEqual([1, null, -1]);
  });
});

// ─── maskSeries ───────────────────────────────────────────────────────────────

describe("maskSeries", () => {
  it("replaces values where cond=true with null by default", () => {
    const result = maskSeries(s([1, 2, 3, 4, 5]), [true, false, true, false, true]);
    expect(result.values).toEqual([null, 2, null, 4, null]);
  });

  it("uses custom other value", () => {
    const result = maskSeries(s([1, 2, 3]), [true, false, true], { other: 0 });
    expect(result.values).toEqual([0, 2, 0]);
  });

  it("accepts callable condition", () => {
    const result = maskSeries(s([1, 2, 3, 4, 5]), (v) => (v as number) > 3, { other: -1 });
    expect(result.values).toEqual([1, 2, 3, -1, -1]);
  });

  it("all-true cond replaces all values", () => {
    const result = maskSeries(s([1, 2, 3]), [true, true, true], { other: 0 });
    expect(result.values).toEqual([0, 0, 0]);
  });

  it("all-false cond is identity", () => {
    const result = maskSeries(s([1, 2, 3]), [false, false, false]);
    expect(result.values).toEqual([1, 2, 3]);
  });

  it("accepts Series<boolean> condition", () => {
    const data = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });
    const cond = new Series({ data: [false, true, false], index: ["a", "b", "c"] });
    const result = maskSeries(data, cond as Series<boolean>);
    expect(result.values).toEqual([10, null, 30]);
  });

  it("mask is complement of where with same cond", () => {
    const data = s([1, 2, 3, 4]);
    const cond = [true, false, true, false];
    const w = whereSeries(data, cond, { other: 99 });
    const m = maskSeries(data, cond, { other: 99 });
    // where keeps trues, mask keeps falses — opposite patterns
    for (let i = 0; i < 4; i++) {
      if (cond[i]) {
        expect(w.iat(i)).toBe(data.iat(i));
        expect(m.iat(i)).toBe(99);
      } else {
        expect(w.iat(i)).toBe(99);
        expect(m.iat(i)).toBe(data.iat(i));
      }
    }
  });
});

// ─── whereDataFrame ───────────────────────────────────────────────────────────

describe("whereDataFrame", () => {
  it("works with 2-D boolean array", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const cond = [
      [true, false],
      [false, true],
      [true, true],
    ];
    const result = whereDataFrame(df, cond);
    expect(result.col("a").values).toEqual([1, null, 3]);
    expect(result.col("b").values).toEqual([null, 5, 6]);
  });

  it("uses custom other value", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const cond = [
      [false, false],
      [true, true],
    ];
    const result = whereDataFrame(df, cond, { other: -1 });
    expect(result.col("a").values).toEqual([-1, 2]);
    expect(result.col("b").values).toEqual([-1, 4]);
  });

  it("works with DataFrame condition", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const condDf = DataFrame.fromColumns({ a: [true, false, true], b: [false, true, true] });
    const result = whereDataFrame(df, condDf);
    expect(result.col("a").values).toEqual([1, null, 3]);
    expect(result.col("b").values).toEqual([null, 5, 6]);
  });

  it("works with 1-D Series condition on axis=0 (broadcast across columns)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const cond = new Series({ data: [true, false, true], index: [0, 1, 2] });
    const result = whereDataFrame(df, cond as Series<boolean>, { axis: 0 });
    expect(result.col("a").values).toEqual([1, null, 3]);
    expect(result.col("b").values).toEqual([4, null, 6]);
  });

  it("works with 1-D boolean array on axis=0", () => {
    const df = DataFrame.fromColumns({ a: [10, 20], b: [30, 40] });
    const result = whereDataFrame(df, [false, true], { axis: 0, other: 0 });
    expect(result.col("a").values).toEqual([0, 20]);
    expect(result.col("b").values).toEqual([0, 40]);
  });

  it("works with 1-D Series condition on axis=1 (broadcast across rows)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const cond = new Series({ data: [true, false], index: ["a", "b"] });
    const result = whereDataFrame(df, cond as Series<boolean>, { axis: 1 });
    // column "a" cond=true → keep; column "b" cond=false → replace
    expect(result.col("a").values).toEqual([1, 2, 3]);
    expect(result.col("b").values).toEqual([null, null, null]);
  });

  it("works with callable condition (element-wise)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = whereDataFrame(df, (v) => (v as number) >= 3);
    expect(result.col("a").values).toEqual([null, null, 3]);
    expect(result.col("b").values).toEqual([4, 5, 6]);
  });

  it("preserves index and column names", () => {
    const df = DataFrame.fromColumns({ x: [1, 2], y: [3, 4] });
    const result = whereDataFrame(df, [
      [true, false],
      [false, true],
    ]);
    expect(result.columns.values).toEqual(["x", "y"]);
    expect(result.index.values).toEqual([0, 1]);
  });
});

// ─── maskDataFrame ────────────────────────────────────────────────────────────

describe("maskDataFrame", () => {
  it("works with 2-D boolean array", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const cond = [
      [true, false],
      [false, true],
      [true, true],
    ];
    const result = maskDataFrame(df, cond);
    expect(result.col("a").values).toEqual([null, 2, null]);
    expect(result.col("b").values).toEqual([4, null, null]);
  });

  it("mask and where are complements with same DataFrame cond", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const cond = [
      [true, false],
      [false, true],
      [true, false],
    ];
    const w = whereDataFrame(df, cond, { other: 99 });
    const m = maskDataFrame(df, cond, { other: 99 });
    for (const colName of ["a", "b"]) {
      for (let r = 0; r < 3; r++) {
        const wVal = w.col(colName).iat(r);
        const mVal = m.col(colName).iat(r);
        const orig = df.col(colName).iat(r);
        // One must be orig, other must be 99
        expect([wVal, mVal].sort()).toEqual([99, orig].sort());
      }
    }
  });

  it("works with DataFrame condition", () => {
    const df = DataFrame.fromColumns({ a: [10, 20], b: [30, 40] });
    const condDf = DataFrame.fromColumns({ a: [false, true], b: [true, false] });
    const result = maskDataFrame(df, condDf, { other: 0 });
    expect(result.col("a").values).toEqual([10, 0]);
    expect(result.col("b").values).toEqual([0, 40]);
  });

  it("works with callable condition", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = maskDataFrame(df, (v) => (v as number) > 4, { other: -1 });
    expect(result.col("a").values).toEqual([1, 2, 3]);
    expect(result.col("b").values).toEqual([4, -1, -1]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("whereSeries property tests", () => {
  it("where + mask with same cond never produce the same output when values differ and other differs from values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        (arr, bools) => {
          const len = Math.min(arr.length, bools.length);
          const data = arr.slice(0, len);
          const cond = bools.slice(0, len);
          const series = new Series({ data });
          const w = whereSeries(series, cond, { other: -999 });
          const m = maskSeries(series, cond, { other: -999 });
          for (let i = 0; i < len; i++) {
            if (cond[i]) {
              // where keeps, mask replaces
              expect(w.iat(i)).toBe(data[i]);
              expect(m.iat(i)).toBe(-999);
            } else {
              // where replaces, mask keeps
              expect(w.iat(i)).toBe(-999);
              expect(m.iat(i)).toBe(data[i]);
            }
          }
        },
      ),
    );
  });

  it("where with all-true cond is identity", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 0, maxLength: 20 }), (arr) => {
        const series = new Series({ data: arr });
        const cond = arr.map(() => true);
        const result = whereSeries(series, cond);
        for (let i = 0; i < arr.length; i++) {
          expect(result.iat(i)).toBe(arr[i]);
        }
      }),
    );
  });

  it("mask with all-false cond is identity", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 0, maxLength: 20 }), (arr) => {
        const series = new Series({ data: arr });
        const cond = arr.map(() => false);
        const result = maskSeries(series, cond);
        for (let i = 0; i < arr.length; i++) {
          expect(result.iat(i)).toBe(arr[i]);
        }
      }),
    );
  });

  it("size is preserved after where/mask", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 0, maxLength: 20 }), (arr) => {
        const series = new Series({ data: arr });
        const cond = arr.map((_, i) => i % 2 === 0);
        expect(whereSeries(series, cond).size).toBe(arr.length);
        expect(maskSeries(series, cond).size).toBe(arr.length);
      }),
    );
  });
});
