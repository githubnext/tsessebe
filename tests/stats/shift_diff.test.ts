/**
 * Tests for src/stats/shift_diff.ts — shiftSeries, diffSeries,
 * dataFrameShift, dataFrameDiff
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  dataFrameDiff,
  dataFrameShift,
  diffSeries,
  shiftSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[]): Series<Scalar> {
  return new Series({ data: [...data] });
}

function nanEq(a: Scalar, b: Scalar): boolean {
  if (typeof a === "number" && Number.isNaN(a) && typeof b === "number" && Number.isNaN(b)) {
    return true;
  }
  return a === b;
}

function arrEq(a: readonly Scalar[], b: readonly Scalar[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!nanEq(a[i] as Scalar, b[i] as Scalar)) {
      return false;
    }
  }
  return true;
}

// ─── shiftSeries ──────────────────────────────────────────────────────────────

describe("shiftSeries", () => {
  it("periods=1 (default) shifts values down by one", () => {
    const result = shiftSeries(s([1, 2, 3, 4]));
    expect(arrEq(result.values, [null, 1, 2, 3])).toBe(true);
  });

  it("periods=-1 shifts values up by one", () => {
    const result = shiftSeries(s([1, 2, 3, 4]), { periods: -1 });
    expect(arrEq(result.values, [2, 3, 4, null])).toBe(true);
  });

  it("periods=0 returns identical values", () => {
    const data = [1, 2, 3, 4] as Scalar[];
    const result = shiftSeries(s(data), { periods: 0 });
    expect(arrEq(result.values, data)).toBe(true);
  });

  it("periods larger than length → all null", () => {
    const result = shiftSeries(s([1, 2, 3]), { periods: 5 });
    expect(arrEq(result.values, [null, null, null])).toBe(true);
  });

  it("negative periods larger than length → all null", () => {
    const result = shiftSeries(s([1, 2, 3]), { periods: -5 });
    expect(arrEq(result.values, [null, null, null])).toBe(true);
  });

  it("preserves null/NaN values in the shifted region", () => {
    const result = shiftSeries(s([1, null, 3]), { periods: 1 });
    expect(arrEq(result.values, [null, 1, null])).toBe(true);
  });

  it("works on string values", () => {
    const result = shiftSeries(s(["a", "b", "c"]), { periods: 1 });
    expect(arrEq(result.values, [null, "a", "b"])).toBe(true);
  });

  it("preserves index and name", () => {
    const orig = s([10, 20, 30]);
    const result = shiftSeries(orig, { periods: 1 });
    expect(result.index.size).toBe(orig.index.size);
    expect(result.length).toBe(orig.length);
  });

  it("empty series returns empty series", () => {
    const result = shiftSeries(s([]), { periods: 2 });
    expect(result.length).toBe(0);
  });

  it("periods=2 shifts down by two positions", () => {
    const result = shiftSeries(s([10, 20, 30, 40]), { periods: 2 });
    expect(arrEq(result.values, [null, null, 10, 20])).toBe(true);
  });

  it("periods=-2 shifts up by two positions", () => {
    const result = shiftSeries(s([10, 20, 30, 40]), { periods: -2 });
    expect(arrEq(result.values, [30, 40, null, null])).toBe(true);
  });
});

// ─── diffSeries ───────────────────────────────────────────────────────────────

describe("diffSeries", () => {
  it("periods=1 computes first differences", () => {
    const result = diffSeries(s([1, 3, 6, 10]));
    expect(arrEq(result.values, [null, 2, 3, 4])).toBe(true);
  });

  it("periods=2 computes lag-2 differences", () => {
    const result = diffSeries(s([1, 3, 6, 10]), { periods: 2 });
    expect(arrEq(result.values, [null, null, 5, 7])).toBe(true);
  });

  it("periods=-1 computes forward differences", () => {
    const result = diffSeries(s([1, 3, 6, 10]), { periods: -1 });
    expect(arrEq(result.values, [-2, -3, -4, null])).toBe(true);
  });

  it("periods=0 yields all zeros (value minus itself)", () => {
    // diff with 0 lag: x[i] - x[i] = 0 for all i
    const result = diffSeries(s([1, 2, 3]), { periods: 0 });
    expect(arrEq(result.values, [0, 0, 0])).toBe(true);
  });

  it("null inputs produce null at missing positions", () => {
    const result = diffSeries(s([1, null, 3, 4]));
    // position 0: null (no prev); position 1: null (cur=null); position 2: null (prev=null); position 3: 1 (4-3)
    expect(arrEq(result.values, [null, null, null, 1])).toBe(true);
  });

  it("NaN inputs produce null at those positions", () => {
    const result = diffSeries(s([1, Number.NaN, 3]));
    expect(arrEq(result.values, [null, null, null])).toBe(true);
  });

  it("preserves index", () => {
    const orig = s([5, 10, 15]);
    const result = diffSeries(orig);
    expect(result.length).toBe(orig.length);
  });

  it("empty series returns empty", () => {
    expect(diffSeries(s([]), { periods: 1 }).length).toBe(0);
  });

  it("single element returns [null]", () => {
    const result = diffSeries(s([42]));
    expect(result.values[0]).toBe(null);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("shiftSeries — property tests", () => {
  it("length is preserved under any shift", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 20 }),
        fc.integer({ min: -10, max: 10 }),
        (data, periods) => {
          const result = shiftSeries(new Series({ data }), { periods });
          return result.length === data.length;
        },
      ),
    );
  });

  it("shift(n) then shift(-n) inner slice matches original", () => {
    // after shifting down n then up n, the middle (length - n) elements match
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 2, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }),
        (data: number[], n: number): boolean => {
          if (n >= data.length) {
            return true;
          }
          const shifted = shiftSeries(new Series<Scalar>({ data }), { periods: n });
          const back = shiftSeries(shifted, { periods: -n });
          // positions [0, length - n) should match the original
          for (let i = 0; i < data.length - n; i++) {
            if (back.values[i] !== data[i]) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("positions filled by shift are always null", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 10 }),
        (data: number[], n: number): boolean => {
          const result = shiftSeries(new Series<Scalar>({ data }), { periods: n });
          const cap = Math.min(n, data.length);
          for (let i = 0; i < cap; i++) {
            if (result.values[i] !== null) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

describe("diffSeries — property tests", () => {
  it("length is preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }),
        (data, periods) => {
          const result = diffSeries(new Series({ data }), { periods });
          return result.length === data.length;
        },
      ),
    );
  });

  it("diff(1) equals current minus previous for finite numeric sequences", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 2, maxLength: 20 }),
        (data: number[]): boolean => {
          const result = diffSeries(new Series<Scalar>({ data }));
          // position 0 must be null
          if (result.values[0] !== null) {
            return false;
          }
          // remaining positions: result[i] = data[i] - data[i-1]
          for (let i = 1; i < data.length; i++) {
            const expected = (data[i] as number) - (data[i - 1] as number);
            if (result.values[i] !== expected) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ─── dataFrameShift ──────────────────────────────────────────────────────────

describe("dataFrameShift", () => {
  const df = (): DataFrame =>
    DataFrame.fromColumns({
      a: [1, 2, 3, 4] as Scalar[],
      b: [10, 20, 30, 40] as Scalar[],
    });

  it("shifts each column down by periods (axis=0)", () => {
    const result = dataFrameShift(df(), 1);
    expect(arrEq(result.col("a").values, [null, 1, 2, 3])).toBe(true);
    expect(arrEq(result.col("b").values, [null, 10, 20, 30])).toBe(true);
  });

  it("shifts each row across columns (axis=1)", () => {
    const result = dataFrameShift(df(), 1, { axis: 1 });
    // each row is shifted: row[0] = [1,10,...], shifted right → [null,1,10,...]
    // for a 2-column df, row [1,10] → [null,1]
    expect(result.col("a").values[0]).toBe(null);
    expect(result.col("b").values[0]).toBe(1);
  });

  it("axis='columns' is equivalent to axis=1", () => {
    const r1 = dataFrameShift(df(), 1, { axis: 1 });
    const r2 = dataFrameShift(df(), 1, { axis: "columns" });
    for (const name of ["a", "b"]) {
      expect(arrEq(r1.col(name).values, r2.col(name).values)).toBe(true);
    }
  });

  it("preserves shape and column names", () => {
    const result = dataFrameShift(df(), 2);
    expect(result.shape).toEqual([4, 2]);
    expect(result.columns.values).toEqual(["a", "b"]);
  });

  it("default periods=1", () => {
    const withDefault = dataFrameShift(df());
    const explicit = dataFrameShift(df(), 1);
    expect(arrEq(withDefault.col("a").values, explicit.col("a").values)).toBe(true);
  });
});

// ─── dataFrameDiff ───────────────────────────────────────────────────────────

describe("dataFrameDiff", () => {
  const df = (): DataFrame =>
    DataFrame.fromColumns({
      a: [1, 3, 6, 10] as Scalar[],
      b: [10, 30, 60, 100] as Scalar[],
    });

  it("computes column-wise diff with periods=1 (axis=0)", () => {
    const result = dataFrameDiff(df());
    expect(arrEq(result.col("a").values, [Number.NaN, 2, 3, 4])).toBe(true);
    expect(arrEq(result.col("b").values, [Number.NaN, 20, 30, 40])).toBe(true);
  });

  it("row-wise diff across columns (axis=1)", () => {
    const result = dataFrameDiff(df(), 1, { axis: 1 });
    // each row: [1,10] → [NaN, 10-1] = [NaN, 9]
    expect(Number.isNaN(result.col("a").values[0] as number)).toBe(true);
    expect(result.col("b").values[0]).toBe(9);
  });

  it("preserves shape", () => {
    const result = dataFrameDiff(df(), 2);
    expect(result.shape).toEqual([4, 2]);
  });

  it("default periods=1", () => {
    const withDefault = dataFrameDiff(df());
    const explicit = dataFrameDiff(df(), 1);
    expect(arrEq(withDefault.col("a").values, explicit.col("a").values)).toBe(true);
  });
});
