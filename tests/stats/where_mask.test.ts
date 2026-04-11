/**
 * Tests for where_mask — conditional replacement for Series and DataFrame.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  maskDataFrame,
  maskSeries,
  whereDataFrame,
  whereSeries,
} from "../../src/index.ts";

// ─── whereSeries ──────────────────────────────────────────────────────────────

describe("whereSeries — array condition", () => {
  it("keeps values where cond is true", () => {
    const s = new Series({ data: [1, 2, 3, 4] });
    const result = whereSeries(s, [true, true, true, true]);
    expect(result.values).toEqual([1, 2, 3, 4]);
  });

  it("replaces all values when cond is all-false (default NaN)", () => {
    const s = new Series({ data: [1, 2, 3] });
    const result = whereSeries(s, [false, false, false]);
    expect(result.values.every((v) => typeof v === "number" && Number.isNaN(v as number))).toBe(
      true,
    );
  });

  it("replaces false positions with provided other", () => {
    const s = new Series({ data: [10, 20, 30, 40] });
    const result = whereSeries(s, [true, false, true, false], { other: 0 });
    expect(result.values).toEqual([10, 0, 30, 0]);
  });

  it("preserves index and name", () => {
    const s = new Series({ data: [1, 2, 3], name: "x" });
    const result = whereSeries(s, [true, false, true]);
    expect(result.name).toBe("x");
    expect(result.index.size).toBe(3);
  });

  it("works with string other", () => {
    const s = new Series({ data: ["a", "b", "c"] });
    const result = whereSeries(s, [true, false, true], { other: "X" });
    expect(result.values).toEqual(["a", "X", "c"]);
  });

  it("works with null other", () => {
    const s = new Series({ data: [1, 2, 3] });
    const result = whereSeries(s, [false, true, false], { other: null });
    expect(result.values).toEqual([null, 2, null]);
  });
});

describe("whereSeries — Series condition", () => {
  it("accepts a boolean Series as condition", () => {
    const s = new Series({ data: [5, 6, 7] });
    const cond = new Series({ data: [true, false, true] });
    const result = whereSeries(s, cond, { other: -1 });
    expect(result.values).toEqual([5, -1, 7]);
  });
});

describe("whereSeries — callable condition", () => {
  it("accepts a function as condition", () => {
    const s = new Series({ data: [1, 2, 3, 4] });
    const result = whereSeries(s, (x) => (x.values as number[]).map((v) => v > 2), { other: 0 });
    expect(result.values).toEqual([0, 0, 3, 4]);
  });
});

// ─── maskSeries ───────────────────────────────────────────────────────────────

describe("maskSeries — array condition", () => {
  it("replaces values where cond is true (inverse of where)", () => {
    const s = new Series({ data: [10, 20, 30, 40] });
    const result = maskSeries(s, [false, true, false, true], { other: 0 });
    expect(result.values).toEqual([10, 0, 30, 0]);
  });

  it("keeps all values when cond is all-false", () => {
    const s = new Series({ data: [1, 2, 3] });
    const result = maskSeries(s, [false, false, false], { other: 99 });
    expect(result.values).toEqual([1, 2, 3]);
  });

  it("replaces all values when cond is all-true", () => {
    const s = new Series({ data: [1, 2, 3] });
    const result = maskSeries(s, [true, true, true], { other: 0 });
    expect(result.values).toEqual([0, 0, 0]);
  });
});

describe("maskSeries — callable condition", () => {
  it("masks values above a threshold", () => {
    const s = new Series({ data: [1, 5, 2, 8, 3] });
    const result = maskSeries(s, (x) => (x.values as number[]).map((v) => v > 4), { other: -1 });
    expect(result.values).toEqual([1, -1, 2, -1, 3]);
  });
});

// ─── where / mask duality ─────────────────────────────────────────────────────

describe("where / mask duality", () => {
  it("where(cond) === mask(!cond)", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const cond = [true, false, true, false, true];
    const invCond = cond.map((b) => !b);
    const w = whereSeries(s, cond, { other: 0 });
    const m = maskSeries(s, invCond, { other: 0 });
    expect(w.values).toEqual(m.values);
  });
});

// ─── whereDataFrame ───────────────────────────────────────────────────────────

describe("whereDataFrame — DataFrame condition", () => {
  it("keeps values where cond is true", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const cond = DataFrame.fromColumns({
      a: [true, true, true],
      b: [true, true, true],
    });
    const result = whereDataFrame(df, cond);
    expect(result.col("a").values).toEqual([1, 2, 3]);
    expect(result.col("b").values).toEqual([4, 5, 6]);
  });

  it("replaces false positions with other scalar", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const cond = DataFrame.fromColumns({
      a: [true, false, true],
      b: [false, true, true],
    });
    const result = whereDataFrame(df, cond, { other: 0 });
    expect(result.col("a").values).toEqual([1, 0, 3]);
    expect(result.col("b").values).toEqual([0, 5, 6]);
  });

  it("default other is NaN", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const cond = DataFrame.fromColumns({ a: [false, true] });
    const result = whereDataFrame(df, cond);
    const vals = result.col("a").values as number[];
    expect(Number.isNaN(vals[0])).toBe(true);
    expect(vals[1]).toBe(2);
  });

  it("preserves row index", () => {
    const df = DataFrame.fromColumns({ a: [10, 20] });
    const cond = DataFrame.fromColumns({ a: [true, false] });
    const result = whereDataFrame(df, cond, { other: 0 });
    expect(result.index.size).toBe(2);
  });
});

describe("whereDataFrame — callable condition", () => {
  it("accepts a function returning a boolean DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4] });
    const result = whereDataFrame(
      df,
      (x) => DataFrame.fromColumns({ a: (x.col("a").values as number[]).map((v) => v > 2) }),
      { other: 0 },
    );
    expect(result.col("a").values).toEqual([0, 0, 3, 4]);
  });
});

// ─── maskDataFrame ────────────────────────────────────────────────────────────

describe("maskDataFrame — DataFrame condition", () => {
  it("replaces true positions with other scalar", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const cond = DataFrame.fromColumns({
      a: [false, true, false],
      b: [true, false, false],
    });
    const result = maskDataFrame(df, cond, { other: 0 });
    expect(result.col("a").values).toEqual([1, 0, 3]);
    expect(result.col("b").values).toEqual([0, 5, 6]);
  });

  it("keeps all values when cond is all-false", () => {
    const df = DataFrame.fromColumns({ a: [7, 8, 9] });
    const cond = DataFrame.fromColumns({ a: [false, false, false] });
    const result = maskDataFrame(df, cond, { other: -1 });
    expect(result.col("a").values).toEqual([7, 8, 9]);
  });
});

describe("maskDataFrame — callable condition", () => {
  it("masks values below threshold", () => {
    const df = DataFrame.fromColumns({ a: [1, 5, 2, 8, 3] });
    const result = maskDataFrame(
      df,
      (x) => DataFrame.fromColumns({ a: (x.col("a").values as number[]).map((v) => v < 4) }),
      { other: -1 },
    );
    expect(result.col("a").values).toEqual([-1, 5, -1, 8, -1]);
  });
});

// ─── whereDataFrame / maskDataFrame duality ───────────────────────────────────

describe("whereDataFrame / maskDataFrame duality", () => {
  it("whereDataFrame(cond) === maskDataFrame(!cond)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const cond = DataFrame.fromColumns({
      a: [true, false, true],
      b: [false, true, false],
    });
    const invCond = DataFrame.fromColumns({
      a: [false, true, false],
      b: [true, false, true],
    });
    const w = whereDataFrame(df, cond, { other: 0 });
    const m = maskDataFrame(df, invCond, { other: 0 });
    expect(w.col("a").values).toEqual(m.col("a").values);
    expect(w.col("b").values).toEqual(m.col("b").values);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("whereSeries — property tests", () => {
  it("where(all-true) returns original values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        (nums) => {
          const s = new Series({ data: nums });
          const cond = nums.map(() => true);
          const result = whereSeries(s, cond);
          return (result.values as number[]).every((v, i) => v === nums[i]);
        },
      ),
    );
  });

  it("where(all-false, other=0) returns all zeros", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        (nums) => {
          const s = new Series({ data: nums });
          const cond = nums.map(() => false);
          const result = whereSeries(s, cond, { other: 0 });
          return (result.values as number[]).every((v) => v === 0);
        },
      ),
    );
  });

  it("mask(cond) === where(!cond) for numeric data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.boolean(),
        (nums, fillBool) => {
          const cond: boolean[] = nums.map(() => fillBool);
          const invCond: boolean[] = cond.map((b) => !b);
          const s = new Series({ data: nums });
          const w = whereSeries(s, cond, { other: -999 });
          const m = maskSeries(s, invCond, { other: -999 });
          return (w.values as number[]).every((v, i) => v === (m.values as number[])[i]);
        },
      ),
    );
  });
});
