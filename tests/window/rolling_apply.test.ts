/**
 * Tests for rolling_apply — standalone rolling-window apply and multi-aggregation.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import {
  DataFrame,
  Series,
  dataFrameRollingAgg,
  dataFrameRollingApply,
  rollingAgg,
  rollingApply,
} from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function numSum(nums: readonly number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}
function numMean(nums: readonly number[]): number {
  return numSum(nums) / nums.length;
}
function numMax(nums: readonly number[]): number {
  return Math.max(...nums);
}
function numMin(nums: readonly number[]): number {
  return Math.min(...nums);
}

function s(...data: (number | null)[]): Series<number | null> {
  return new Series({ data });
}

// ─── rollingApply ─────────────────────────────────────────────────────────────

describe("rollingApply", () => {
  test("window=1 is identity sum", () => {
    const out = rollingApply(s(1, 2, 3, 4), 1, numSum);
    expect(out.toArray()).toEqual([1, 2, 3, 4]);
  });

  test("window=3 trailing mean", () => {
    const out = rollingApply(s(1, 2, 3, 4, 5), 3, numMean);
    expect(out.toArray()).toEqual([null, null, 2, 3, 4]);
  });

  test("window=3 sum", () => {
    const out = rollingApply(s(1, 2, 3, 4, 5), 3, numSum);
    expect(out.toArray()).toEqual([null, null, 6, 9, 12]);
  });

  test("window larger than series returns all nulls", () => {
    const out = rollingApply(s(1, 2, 3), 10, numMean);
    expect(out.toArray()).toEqual([null, null, null]);
  });

  test("preserves series name", () => {
    const input = new Series({ data: [1, 2, 3], name: "myCol" });
    const out = rollingApply(input, 2, numSum);
    expect(out.name).toBe("myCol");
  });

  test("minPeriods=1 fills from position 0", () => {
    const out = rollingApply(s(1, 2, 3), 3, numMean, { minPeriods: 1 });
    expect(out.toArray()).toEqual([1, 1.5, 2]);
  });

  test("minPeriods=2 with window=3", () => {
    const out = rollingApply(s(1, 2, 3, 4), 3, numSum, { minPeriods: 2 });
    expect(out.toArray()).toEqual([null, 3, 6, 9]);
  });

  test("center=true symmetric window (odd)", () => {
    // window=3, center: position 1 sees [0..2], position 2 sees [1..3]
    const out = rollingApply(s(1, 2, 3, 4, 5), 3, numSum, { center: true });
    expect(out.toArray()).toEqual([null, 6, 9, 12, null]);
  });

  test("handles null values in series", () => {
    const out = rollingApply(s(1, null, 3, 4), 2, numSum, { minPeriods: 1 });
    expect(out.toArray()).toEqual([1, 1, 3, 7]);
  });

  test("all nulls returns all nulls", () => {
    const out = rollingApply(s(null, null, null), 2, numSum, { minPeriods: 1 });
    expect(out.toArray()).toEqual([null, null, null]);
  });

  test("custom max function", () => {
    const out = rollingApply(s(3, 1, 4, 1, 5, 9), 3, numMax);
    expect(out.toArray()).toEqual([null, null, 4, 4, 5, 9]);
  });

  test("custom min function", () => {
    const out = rollingApply(s(3, 1, 4, 1, 5, 9), 3, numMin);
    // window [1,5,9] → min is 1, not 5
    expect(out.toArray()).toEqual([null, null, 1, 1, 1, 1]);
  });

  test("raw=true passes valid nums only (same as default)", () => {
    const out = rollingApply(s(1, 2, 3, 4), 2, numSum, { raw: true });
    expect(out.toArray()).toEqual([null, 3, 5, 7]);
  });

  test("window=1 with nulls and minPeriods=1", () => {
    const out = rollingApply(s(1, null, 3), 1, numSum, { minPeriods: 1 });
    expect(out.toArray()).toEqual([1, null, 3]);
  });

  test("throws on non-positive window", () => {
    expect(() => rollingApply(s(1, 2, 3), 0, numSum)).toThrow(RangeError);
    expect(() => rollingApply(s(1, 2, 3), -1, numSum)).toThrow(RangeError);
  });

  test("product function over window", () => {
    const prod = (nums: readonly number[]) => nums.reduce((a, b) => a * b, 1);
    const out = rollingApply(s(2, 3, 4, 5), 3, prod);
    expect(out.toArray()).toEqual([null, null, 24, 60]);
  });

  test("pairwise diff function", () => {
    // last - first in window
    const diff = (nums: readonly number[]): number => (nums.at(-1) ?? 0) - (nums[0] ?? 0);
    const out = rollingApply(s(1, 3, 6, 10, 15), 3, diff);
    expect(out.toArray()).toEqual([null, null, 5, 7, 9]);
  });

  test("empty series", () => {
    const out = rollingApply(s(), 3, numSum);
    expect(out.toArray()).toEqual([]);
  });

  test("single element series window=1", () => {
    const out = rollingApply(s(42), 1, numSum);
    expect(out.toArray()).toEqual([42]);
  });

  test("window=2 centered with even series length", () => {
    const out = rollingApply(s(1, 2, 3, 4), 2, numSum, { center: true });
    // center=true, window=2: half=floor(1/2)=0, half2=2-0=2
    // i=0: [0,2)=[1,2], sum=3; i=1: [1,3)=[2,3], sum=5; i=2: [2,4)=[3,4], sum=7; i=3: [3,4)=[4], sum=null(minPeriods=2)
    expect(out.toArray()).toEqual([3, 5, 7, null]);
  });

  test("count function behaves correctly", () => {
    const count = (nums: readonly number[]): number => nums.length;
    const out = rollingApply(s(1, null, 3, null, 5), 3, count, { minPeriods: 1 });
    // window at i=3: [null,3,null] → valid=[3] → count=1
    expect(out.toArray()).toEqual([1, 1, 2, 1, 2]);
  });

  test("range function over window", () => {
    const range = (nums: readonly number[]): number => Math.max(...nums) - Math.min(...nums);
    const out = rollingApply(s(1, 5, 2, 8, 3), 3, range);
    expect(out.toArray()).toEqual([null, null, 4, 6, 6]);
  });
});

// ─── rollingAgg ──────────────────────────────────────────────────────────────

describe("rollingAgg", () => {
  test("returns DataFrame with one column per function", () => {
    const out = rollingAgg(s(1, 2, 3, 4, 5), 3, { mean: numMean, sum: numSum });
    expect(out.columns.toArray()).toEqual(["mean", "sum"]);
    expect(out.shape).toEqual([5, 2]);
  });

  test("mean column matches rollingApply mean", () => {
    const agg = rollingAgg(s(1, 2, 3, 4, 5), 3, { mean: numMean });
    const apply = rollingApply(s(1, 2, 3, 4, 5), 3, numMean);
    expect(agg.col("mean").toArray()).toEqual(apply.toArray());
  });

  test("sum column matches rollingApply sum", () => {
    const agg = rollingAgg(s(1, 2, 3, 4, 5), 3, { sum: numSum });
    const apply = rollingApply(s(1, 2, 3, 4, 5), 3, numSum);
    expect(agg.col("sum").toArray()).toEqual(apply.toArray());
  });

  test("three aggregation functions", () => {
    const out = rollingAgg(s(1, 2, 3, 4), 2, { sum: numSum, min: numMin, max: numMax });
    expect(out.columns.toArray()).toEqual(["sum", "min", "max"]);
    expect(out.col("sum").toArray()).toEqual([null, 3, 5, 7]);
    expect(out.col("min").toArray()).toEqual([null, 1, 2, 3]);
    expect(out.col("max").toArray()).toEqual([null, 2, 3, 4]);
  });

  test("minPeriods option respected in all columns", () => {
    const out = rollingAgg(s(1, 2, 3, 4), 3, { sum: numSum, mean: numMean }, { minPeriods: 2 });
    expect(out.col("sum").toArray()).toEqual([null, 3, 6, 9]);
    expect(out.col("mean").toArray()).toEqual([null, 1.5, 2, 3]);
  });

  test("center option respected", () => {
    const out = rollingAgg(s(1, 2, 3, 4, 5), 3, { sum: numSum }, { center: true });
    expect(out.col("sum").toArray()).toEqual([null, 6, 9, 12, null]);
  });

  test("single function is equivalent to rollingApply", () => {
    const data = [2, 4, 6, 8, 10] as const;
    const agg = rollingAgg(s(...data), 2, { f: numMean });
    const apply = rollingApply(s(...data), 2, numMean);
    expect(agg.col("f").toArray()).toEqual(apply.toArray());
  });

  test("throws on non-positive window", () => {
    expect(() => rollingAgg(s(1, 2, 3), 0, { sum: numSum })).toThrow(RangeError);
  });

  test("empty series produces empty DataFrame", () => {
    const out = rollingAgg(s(), 2, { sum: numSum, mean: numMean });
    expect(out.shape).toEqual([0, 2]);
  });
});

// ─── dataFrameRollingApply ───────────────────────────────────────────────────

describe("dataFrameRollingApply", () => {
  test("applies function column-wise", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [5, 6, 7, 8] });
    const out = dataFrameRollingApply(df, 2, numSum);
    expect(out.columns.toArray()).toEqual(["a", "b"]);
    expect(out.col("a").toArray()).toEqual([null, 3, 5, 7]);
    expect(out.col("b").toArray()).toEqual([null, 11, 13, 15]);
  });

  test("preserves original row index", () => {
    const df = DataFrame.fromColumns({ x: [10, 20, 30] });
    const out = dataFrameRollingApply(df, 2, numMean);
    expect(out.index.toArray()).toEqual(df.index.toArray());
  });

  test("preserves column names", () => {
    const df = DataFrame.fromColumns({ alpha: [1, 2, 3], beta: [4, 5, 6] });
    const out = dataFrameRollingApply(df, 2, numSum);
    expect(out.columns.toArray()).toEqual(["alpha", "beta"]);
  });

  test("minPeriods=1 fills from first row", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const out = dataFrameRollingApply(df, 3, numMean, { minPeriods: 1 });
    expect(out.col("a").toArray()).toEqual([1, 1.5, 2]);
  });

  test("custom function applied independently per column", () => {
    const diff = (nums: readonly number[]): number => (nums.at(-1) ?? 0) - (nums[0] ?? 0);
    const df = DataFrame.fromColumns({ a: [1, 3, 6], b: [10, 15, 21] });
    const out = dataFrameRollingApply(df, 2, diff);
    expect(out.col("a").toArray()).toEqual([null, 2, 3]);
    expect(out.col("b").toArray()).toEqual([null, 5, 6]);
  });

  test("single column DataFrame", () => {
    const df = DataFrame.fromColumns({ v: [1, 2, 3, 4] });
    const out = dataFrameRollingApply(df, 2, numMax);
    expect(out.col("v").toArray()).toEqual([null, 2, 3, 4]);
  });
});

// ─── dataFrameRollingAgg ─────────────────────────────────────────────────────

describe("dataFrameRollingAgg", () => {
  test("column naming convention {col}_{aggName}", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const out = dataFrameRollingAgg(df, 2, { sum: numSum, mean: numMean });
    expect(out.columns.toArray()).toEqual(["a_sum", "a_mean", "b_sum", "b_mean"]);
  });

  test("values match column-wise rollingAgg", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [10, 20, 30, 40] });
    const out = dataFrameRollingAgg(df, 2, { sum: numSum });
    expect(out.col("a_sum").toArray()).toEqual([null, 3, 5, 7]);
    expect(out.col("b_sum").toArray()).toEqual([null, 30, 50, 70]);
  });

  test("shape is rows × (cols × fns)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] });
    const out = dataFrameRollingAgg(df, 2, { sum: numSum, max: numMax });
    expect(out.shape).toEqual([3, 6]);
  });

  test("single function single column", () => {
    const df = DataFrame.fromColumns({ x: [2, 4, 6, 8] });
    const out = dataFrameRollingAgg(df, 2, { mean: numMean });
    expect(out.columns.toArray()).toEqual(["x_mean"]);
    expect(out.col("x_mean").toArray()).toEqual([null, 3, 5, 7]);
  });

  test("minPeriods and center propagated correctly", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5] });
    const out = dataFrameRollingAgg(df, 3, { sum: numSum }, { center: true });
    expect(out.col("a_sum").toArray()).toEqual([null, 6, 9, 12, null]);
  });
});

// ─── property-based tests ────────────────────────────────────────────────────

describe("rollingApply property tests", () => {
  test("output length equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 0,
          maxLength: 20,
        }),
        fc.integer({ min: 1, max: 5 }),
        (data, window) => {
          const series = new Series({ data });
          const out = rollingApply(series, window, numSum);
          return out.length === data.length;
        },
      ),
    );
  });

  test("leading nulls count equals min(window-1, n) for standard mode", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.integer({ min: 1, max: 8 }),
        (data, window) => {
          const series = new Series({ data });
          const out = rollingApply(series, window, numSum);
          const vals = out.toArray();
          const expectedNulls = Math.min(window - 1, data.length);
          let leadingNulls = 0;
          for (const v of vals) {
            if (v === null) {
              leadingNulls++;
            } else {
              break;
            }
          }
          return leadingNulls === expectedNulls;
        },
      ),
    );
  });

  test("rollingAgg columns match individual rollingApply", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 0,
          maxLength: 15,
        }),
        fc.integer({ min: 1, max: 5 }),
        (data, window) => {
          const series = new Series({ data });
          const agg = rollingAgg(series, window, { sum: numSum, max: numMax });
          const appliedSum = rollingApply(series, window, numSum);
          const appliedMax = rollingApply(series, window, numMax);
          const sumOk =
            JSON.stringify(agg.col("sum").toArray()) === JSON.stringify(appliedSum.toArray());
          const maxOk =
            JSON.stringify(agg.col("max").toArray()) === JSON.stringify(appliedMax.toArray());
          return sumOk && maxOk;
        },
      ),
    );
  });
});
