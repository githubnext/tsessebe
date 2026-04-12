/**
 * Tests for stats/diff_shift.ts
 *
 * Covers:
 *  - diffSeries: default (periods=1), custom periods, negative periods, non-numeric passthrough
 *  - shiftSeries: forward, backward, custom fillValue
 *  - diffDataFrame: axis=0 (col-wise), axis=1 (row-wise)
 *  - shiftDataFrame: axis=0 (col-wise), axis=1 (row-wise)
 *  - Property-based tests with fast-check
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  diffDataFrame,
  diffSeries,
  shiftDataFrame,
  shiftSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeSeries(data: Scalar[], name?: string): Series<Scalar> {
  return new Series<Scalar>({ data, name: name ?? "s" });
}

// ─── diffSeries ───────────────────────────────────────────────────────────────

describe("diffSeries", () => {
  test("default periods=1", () => {
    const s = makeSeries([1, 3, 6, 10, 15]);
    const result = diffSeries(s);
    expect(result.values).toEqual([null, 2, 3, 4, 5]);
  });

  test("periods=2", () => {
    const s = makeSeries([1, 3, 6, 10, 15]);
    const result = diffSeries(s, { periods: 2 });
    expect(result.values).toEqual([null, null, 5, 7, 9]);
  });

  test("periods=-1 (backward)", () => {
    const s = makeSeries([1, 3, 6, 10, 15]);
    const result = diffSeries(s, { periods: -1 });
    expect(result.values).toEqual([-2, -3, -4, -5, null]);
  });

  test("preserves index and name", () => {
    const s = makeSeries([10, 20, 30], "myname");
    const result = diffSeries(s);
    expect(result.name).toBe("myname");
    expect(result.index.size).toBe(3);
  });

  test("non-numeric values produce null", () => {
    const s = makeSeries([1, null, 3, "x", 5]);
    const result = diffSeries(s);
    // [null, null(1-null=null), null(null-null=null), null("x"-null), null(5-"x")]
    expect(result.values[0]).toBe(null);
    expect(result.values[1]).toBe(null);
    expect(result.values[2]).toBe(null);
    expect(result.values[3]).toBe(null);
    expect(result.values[4]).toBe(null);
  });

  test("single element → [null]", () => {
    const s = makeSeries([42]);
    expect(diffSeries(s).values).toEqual([null]);
  });

  test("empty series", () => {
    const s = makeSeries([]);
    expect(diffSeries(s).values).toEqual([]);
  });

  test("periods larger than length → all null", () => {
    const s = makeSeries([1, 2, 3]);
    const result = diffSeries(s, { periods: 5 });
    expect(result.values).toEqual([null, null, null]);
  });

  test("NaN values produce null", () => {
    const s = makeSeries([1, Number.NaN, 3]);
    const result = diffSeries(s);
    expect(result.values[1]).toBe(null);
    expect(result.values[2]).toBe(null);
  });
});

// ─── shiftSeries ──────────────────────────────────────────────────────────────

describe("shiftSeries", () => {
  test("default periods=1, fills null", () => {
    const s = makeSeries([1, 2, 3, 4, 5]);
    expect(shiftSeries(s).values).toEqual([null, 1, 2, 3, 4]);
  });

  test("periods=2", () => {
    const s = makeSeries([1, 2, 3, 4, 5]);
    expect(shiftSeries(s, { periods: 2 }).values).toEqual([null, null, 1, 2, 3]);
  });

  test("periods=-1 (backward)", () => {
    const s = makeSeries([1, 2, 3, 4, 5]);
    expect(shiftSeries(s, { periods: -1 }).values).toEqual([2, 3, 4, 5, null]);
  });

  test("periods=-2", () => {
    const s = makeSeries([1, 2, 3, 4, 5]);
    expect(shiftSeries(s, { periods: -2 }).values).toEqual([3, 4, 5, null, null]);
  });

  test("custom fillValue", () => {
    const s = makeSeries([1, 2, 3]);
    expect(shiftSeries(s, { periods: 1, fillValue: 0 }).values).toEqual([0, 1, 2]);
  });

  test("periods=0 → same values", () => {
    const s = makeSeries([10, 20, 30]);
    expect(shiftSeries(s, { periods: 0 }).values).toEqual([10, 20, 30]);
  });

  test("preserves index and name", () => {
    const s = makeSeries([1, 2, 3], "col");
    const result = shiftSeries(s);
    expect(result.name).toBe("col");
    expect(result.index.size).toBe(3);
  });

  test("periods >= length → all fillValue", () => {
    const s = makeSeries([1, 2, 3]);
    expect(shiftSeries(s, { periods: 5, fillValue: -1 }).values).toEqual([-1, -1, -1]);
  });

  test("empty series", () => {
    const s = makeSeries([]);
    expect(shiftSeries(s).values).toEqual([]);
  });
});

// ─── diffDataFrame (axis=0) ───────────────────────────────────────────────────

describe("diffDataFrame axis=0 (column-wise)", () => {
  test("default periods=1 each column independently", () => {
    const df = DataFrame.fromColumns({ a: [1, 3, 6], b: [10, 20, 35] });
    const result = diffDataFrame(df);
    expect(result.col("a").values).toEqual([null, 2, 3]);
    expect(result.col("b").values).toEqual([null, 10, 15]);
  });

  test("periods=2", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 4, 8] });
    const result = diffDataFrame(df, { periods: 2 });
    expect(result.col("a").values).toEqual([null, null, 3, 6]);
  });

  test("preserves index", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = diffDataFrame(df);
    expect(result.index.size).toBe(3);
  });
});

// ─── diffDataFrame (axis=1) ───────────────────────────────────────────────────

describe("diffDataFrame axis=1 (row-wise)", () => {
  test("default periods=1 across columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 10], b: [4, 16], c: [9, 25] });
    const result = diffDataFrame(df, { axis: 1 });
    // col a: always null (no prior column)
    expect(result.col("a").values).toEqual([null, null]);
    // col b: b - a = [3, 6]
    expect(result.col("b").values).toEqual([3, 6]);
    // col c: c - b = [5, 9]
    expect(result.col("c").values).toEqual([5, 9]);
  });
});

// ─── shiftDataFrame (axis=0) ─────────────────────────────────────────────────

describe("shiftDataFrame axis=0 (column-wise)", () => {
  test("default periods=1", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = shiftDataFrame(df);
    expect(result.col("a").values).toEqual([null, 1, 2]);
    expect(result.col("b").values).toEqual([null, 4, 5]);
  });

  test("periods=-1", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    expect(shiftDataFrame(df, { periods: -1 }).col("a").values).toEqual([2, 3, null]);
  });

  test("custom fillValue", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = shiftDataFrame(df, { periods: 2, fillValue: 0 });
    expect(result.col("a").values).toEqual([0, 0, 1]);
  });

  test("preserves column structure", () => {
    const df = DataFrame.fromColumns({ x: [1, 2], y: [3, 4] });
    const result = shiftDataFrame(df);
    expect(result.columns.values).toEqual(["x", "y"]);
  });
});

// ─── shiftDataFrame (axis=1) ─────────────────────────────────────────────────

describe("shiftDataFrame axis=1 (row-wise)", () => {
  test("periods=1 shifts columns right", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c: [5, 6] });
    const result = shiftDataFrame(df, { axis: 1, periods: 1, fillValue: 0 });
    // col a gets fillValue (no prior col)
    expect(result.col("a").values).toEqual([0, 0]);
    // col b gets values from col a
    expect(result.col("b").values).toEqual([1, 2]);
    // col c gets values from col b
    expect(result.col("c").values).toEqual([3, 4]);
  });

  test("periods=-1 shifts columns left", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c: [5, 6] });
    const result = shiftDataFrame(df, { axis: 1, periods: -1, fillValue: 0 });
    // col a gets values from col b
    expect(result.col("a").values).toEqual([3, 4]);
    // col b gets values from col c
    expect(result.col("b").values).toEqual([5, 6]);
    // col c gets fillValue
    expect(result.col("c").values).toEqual([0, 0]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property-based: diffSeries", () => {
  test("diff(periods=1) length equals input length", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 50 }), (arr) => {
        const s = makeSeries(arr);
        const result = diffSeries(s);
        expect(result.size).toBe(s.size);
      }),
    );
  });

  test("diff[0] is always null for periods >= 1", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 30 }), (arr) => {
        const s = makeSeries(arr);
        const result = diffSeries(s, { periods: 1 });
        expect(result.values[0]).toBe(null);
      }),
    );
  });

  test("shift+diff reconstructs original for numeric arrays (first element is null)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 2, maxLength: 20 }), (arr) => {
        const data = arr as Scalar[];
        const s = makeSeries(data);
        const shifted = shiftSeries(s, { periods: 1, fillValue: 0 });
        const d = diffSeries(s);
        // sum of diffs [1..n] + first value ≈ last value (numeric check)
        // More directly: diff[i] + shifted[i] = s[i] for i >= 1
        for (let i = 1; i < arr.length; i++) {
          const diffVal = d.values[i] as number;
          const shiftedVal = shifted.values[i] as number;
          expect(diffVal + shiftedVal).toBeCloseTo(arr[i] as number, 10);
        }
      }),
    );
  });
});

describe("property-based: shiftSeries", () => {
  test("shift preserves length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 0, maxLength: 50 }),
        fc.integer({ min: -20, max: 20 }),
        (arr, periods) => {
          const s = makeSeries(arr as Scalar[]);
          const result = shiftSeries(s, { periods });
          expect(result.size).toBe(s.size);
        },
      ),
    );
  });

  test("shift(0) is identity", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 0, maxLength: 30 }), (arr) => {
        const s = makeSeries(arr as Scalar[]);
        const result = shiftSeries(s, { periods: 0 });
        for (let i = 0; i < arr.length; i++) {
          expect(result.values[i]).toBe(arr[i]);
        }
      }),
    );
  });

  test("shift(n) then shift(-n) recovers original in the middle region", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 4, maxLength: 30 }),
        fc.integer({ min: 1, max: 5 }),
        (arr, n) => {
          const s = makeSeries(arr as Scalar[]);
          const shifted = shiftSeries(s, { periods: n, fillValue: null });
          const recovered = shiftSeries(shifted, { periods: -n, fillValue: null });
          // middle region (indices n..len-n) should match original
          for (let i = n; i < arr.length - n; i++) {
            expect(recovered.values[i]).toBe(arr[i]);
          }
        },
      ),
    );
  });
});
