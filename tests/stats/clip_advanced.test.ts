/**
 * Tests for stats/clip_advanced.ts
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import { clipAdvancedDataFrame, clipAdvancedSeries } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── clipAdvancedSeries ────────────────────────────────────────────────────────

describe("clipAdvancedSeries", () => {
  test("scalar lower bound", () => {
    const s = new Series({ data: [-3, 0, 5] });
    expect(clipAdvancedSeries(s, { lower: 0 }).values).toEqual([0, 0, 5]);
  });

  test("scalar upper bound", () => {
    const s = new Series({ data: [1, 5, 10] });
    expect(clipAdvancedSeries(s, { upper: 6 }).values).toEqual([1, 5, 6]);
  });

  test("scalar lower and upper bounds", () => {
    const s = new Series({ data: [-3, 1, 5, 10] });
    expect(clipAdvancedSeries(s, { lower: 0, upper: 6 }).values).toEqual([0, 1, 5, 6]);
  });

  test("array lower bounds", () => {
    const s = new Series({ data: [-1, 0, 5] });
    expect(clipAdvancedSeries(s, { lower: [2, -1, 6] }).values).toEqual([2, 0, 6]);
  });

  test("array upper bounds", () => {
    const s = new Series({ data: [10, 5, 1] });
    expect(clipAdvancedSeries(s, { upper: [8, 4, 3] }).values).toEqual([8, 4, 1]);
  });

  test("Series lower bounds — positional", () => {
    const s = new Series({ data: [-1, 0, 5, 10] });
    const lo = new Series({ data: [0, 1, 2, 3] });
    expect(clipAdvancedSeries(s, { lower: lo }).values).toEqual([0, 1, 5, 10]);
  });

  test("Series upper bounds — positional", () => {
    const s = new Series({ data: [0, 5, 10, 15] });
    const hi = new Series({ data: [2, 4, 12, 14] });
    expect(clipAdvancedSeries(s, { upper: hi }).values).toEqual([0, 4, 10, 14]);
  });

  test("no bounds returns original values", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(clipAdvancedSeries(s).values).toEqual([1, 2, 3]);
  });

  test("null values pass through", () => {
    const s = new Series<Scalar>({ data: [null, 5, null] });
    const result = clipAdvancedSeries(s, { lower: 0, upper: 4 });
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBe(4);
    expect(result.values[2]).toBeNull();
  });

  test("preserves Series name", () => {
    const s = new Series({ data: [1, 2, 3], name: "vals" });
    expect(clipAdvancedSeries(s, { lower: 0 }).name).toBe("vals");
  });

  test("preserves index", () => {
    const s = new Series({ data: [1, 2, 3], index: ["a", "b", "c"] });
    const result = clipAdvancedSeries(s, { lower: 0 });
    expect(result.index.at(0)).toBe("a");
    expect(result.index.at(2)).toBe("c");
  });

  // property: clipped value always >= lower and <= upper (for numeric values)
  test("property: clipped value is within bounds (scalar)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.float({ noNaN: true, noDefaultInfinity: true }),
        fc.float({ noNaN: true, noDefaultInfinity: true }),
        (data, a, b) => {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          const s = new Series({ data: data as Scalar[] });
          const result = clipAdvancedSeries(s, { lower: lo, upper: hi });
          return (result.values as number[]).every((v) => v >= lo && v <= hi);
        },
      ),
    );
  });

  // property: clipped values are >= per-element lower bound
  test("property: array lower bound respected element-wise", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.integer({ min: -50, max: 50 }), { minLength: 1, maxLength: 10 }),
        (data, lower) => {
          const len = Math.min(data.length, lower.length);
          const s = new Series({ data: data.slice(0, len) as Scalar[] });
          const loBound = lower.slice(0, len);
          const result = clipAdvancedSeries(s, { lower: loBound });
          return (result.values as number[]).every((v, i) => {
            const lo = loBound[i];
            return lo === undefined || v >= lo;
          });
        },
      ),
    );
  });
});

// ─── clipAdvancedDataFrame ─────────────────────────────────────────────────────

describe("clipAdvancedDataFrame", () => {
  test("scalar lower bound clips all cells", () => {
    const df = DataFrame.fromColumns({ a: [-1, 2, 5], b: [0, 3, 8] });
    const result = clipAdvancedDataFrame(df, { lower: 1 });
    expect(result.col("a").values).toEqual([1, 2, 5]);
    expect(result.col("b").values).toEqual([1, 3, 8]);
  });

  test("scalar upper bound clips all cells", () => {
    const df = DataFrame.fromColumns({ a: [1, 5, 9], b: [2, 6, 10] });
    const result = clipAdvancedDataFrame(df, { upper: 6 });
    expect(result.col("a").values).toEqual([1, 5, 6]);
    expect(result.col("b").values).toEqual([2, 6, 6]);
  });

  test("DataFrame lower bound — element-wise", () => {
    const df = DataFrame.fromColumns({ a: [1, 5, 9], b: [2, 6, 10] });
    const loBound = DataFrame.fromColumns({ a: [2, 3, 4], b: [1, 4, 8] });
    const result = clipAdvancedDataFrame(df, { lower: loBound });
    expect(result.col("a").values).toEqual([2, 5, 9]);
    expect(result.col("b").values).toEqual([2, 6, 10]);
  });

  test("DataFrame upper bound — element-wise", () => {
    const df = DataFrame.fromColumns({ a: [10, 5, 9], b: [2, 6, 10] });
    const hiBound = DataFrame.fromColumns({ a: [8, 6, 7], b: [3, 5, 9] });
    const result = clipAdvancedDataFrame(df, { upper: hiBound });
    expect(result.col("a").values).toEqual([8, 5, 7]);
    expect(result.col("b").values).toEqual([2, 5, 9]);
  });

  test("Series lower bound axis=0 (broadcast over columns)", () => {
    // axis=0: Series index maps to column positions
    // Series has 2 elements for 2 columns [a, b]
    const df = DataFrame.fromColumns({ a: [1, 5], b: [2, 6] });
    const lo = new Series({ data: [3, 4] }); // col a: lo=3, col b: lo=4
    const result = clipAdvancedDataFrame(df, { lower: lo, axis: 0 });
    expect(result.col("a").values).toEqual([3, 5]);
    expect(result.col("b").values).toEqual([4, 6]);
  });

  test("Series lower bound axis=1 (broadcast over rows)", () => {
    // axis=1: Series has one element per row
    const df = DataFrame.fromColumns({ a: [1, 5, 9], b: [2, 6, 10] });
    const lo = new Series({ data: [0, 4, 10] }); // row 0: lo=0, row 1: lo=4, row 2: lo=10
    const result = clipAdvancedDataFrame(df, { lower: lo, axis: 1 });
    expect(result.col("a").values).toEqual([1, 5, 10]);
    expect(result.col("b").values).toEqual([2, 6, 10]);
  });

  test("null values pass through unchanged", () => {
    const df = DataFrame.fromColumns({ a: [null, 5], b: [3, null] });
    const result = clipAdvancedDataFrame(df, { lower: 0, upper: 4 });
    expect(result.col("a").values[0]).toBeNull();
    expect(result.col("a").values[1]).toBe(4);
    expect(result.col("b").values[0]).toBe(3);
    expect(result.col("b").values[1]).toBeNull();
  });

  test("no bounds returns same values", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = clipAdvancedDataFrame(df);
    expect(result.col("a").values).toEqual([1, 2, 3]);
    expect(result.col("b").values).toEqual([4, 5, 6]);
  });

  test("preserves index", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    expect(clipAdvancedDataFrame(df, { lower: 0 }).index.size).toBe(2);
  });

  // property: scalar bounds — all cells within [lo, hi]
  test("property: scalar bounds respected for all cells", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 2, maxLength: 6 }),
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 2, maxLength: 6 }),
        fc.integer({ min: -50, max: 0 }),
        fc.integer({ min: 1, max: 50 }),
        (col1, col2, lo, hi) => {
          const len = Math.min(col1.length, col2.length);
          const df = DataFrame.fromColumns({
            a: col1.slice(0, len) as Scalar[],
            b: col2.slice(0, len) as Scalar[],
          });
          const result = clipAdvancedDataFrame(df, { lower: lo, upper: hi });
          const vals = [
            ...(result.col("a").values as number[]),
            ...(result.col("b").values as number[]),
          ];
          return vals.every((v) => v >= lo && v <= hi);
        },
      ),
    );
  });
});
