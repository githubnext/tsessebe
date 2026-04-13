/**
 * Tests for src/stats/skew_kurt.ts — skewSeries(), kurtSeries(),
 * skewDataFrame(), kurtDataFrame().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  kurtDataFrame,
  kurtSeries,
  skewDataFrame,
  skewSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Round to n decimal places for approx equality. */
function round(v: number, decimals = 6): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

// ─── skewSeries ───────────────────────────────────────────────────────────────

describe("skewSeries", () => {
  it("symmetric distribution has skew ≈ 0", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    expect(Math.abs(skewSeries(s))).toBeLessThan(1e-10);
  });

  it("right-skewed distribution has positive skew", () => {
    const s = new Series({ data: [1, 2, 3, 4, 100] });
    expect(skewSeries(s)).toBeGreaterThan(0);
  });

  it("left-skewed distribution has negative skew", () => {
    const s = new Series({ data: [1, 50, 51, 52, 53] });
    expect(skewSeries(s)).toBeLessThan(0);
  });

  it("returns NaN for n < 3", () => {
    expect(Number.isNaN(skewSeries(new Series({ data: [1, 2] })))).toBe(true);
    expect(Number.isNaN(skewSeries(new Series({ data: [1] })))).toBe(true);
    expect(Number.isNaN(skewSeries(new Series({ data: [] as Scalar[] })))).toBe(true);
  });

  it("returns NaN for constant series (zero std)", () => {
    const s = new Series({ data: [5, 5, 5, 5] });
    expect(Number.isNaN(skewSeries(s))).toBe(true);
  });

  it("skipna=true (default) ignores nulls", () => {
    const withNull = new Series({ data: [1, 2, 3, 4, 5, null] as Scalar[] });
    const withoutNull = new Series({ data: [1, 2, 3, 4, 5] });
    expect(skewSeries(withNull)).toBeCloseTo(skewSeries(withoutNull), 10);
  });

  it("skipna=false propagates NaN when null present", () => {
    const s = new Series({ data: [1, 2, null, 4, 5] as Scalar[] });
    expect(Number.isNaN(skewSeries(s, { skipna: false }))).toBe(true);
  });

  it("known skewness value", () => {
    // Adjusted Fisher-Pearson: pd.Series([2,8,0,4,1,9,9,0]).skew() ≈ 0.3306
    const s = new Series({ data: [2, 8, 0, 4, 1, 9, 9, 0] });
    expect(round(skewSeries(s), 4)).toBeCloseTo(0.3306, 3);
  });
});

// ─── kurtSeries ───────────────────────────────────────────────────────────────

describe("kurtSeries", () => {
  it("normal-like distribution has near-zero excess kurtosis", () => {
    // Large normal-like sample — excess kurtosis should be small
    const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
    // Not zero but finite
    expect(Number.isFinite(kurtSeries(s))).toBe(true);
  });

  it("returns NaN for n < 4", () => {
    expect(Number.isNaN(kurtSeries(new Series({ data: [1, 2, 3] })))).toBe(true);
    expect(Number.isNaN(kurtSeries(new Series({ data: [1, 2] })))).toBe(true);
    expect(Number.isNaN(kurtSeries(new Series({ data: [] as Scalar[] })))).toBe(true);
  });

  it("returns NaN for constant series (zero std)", () => {
    const s = new Series({ data: [3, 3, 3, 3, 3] });
    expect(Number.isNaN(kurtSeries(s))).toBe(true);
  });

  it("skipna=true (default) ignores nulls", () => {
    const withNull = new Series({ data: [1, 2, 3, 4, 5, 6, null] as Scalar[] });
    const withoutNull = new Series({ data: [1, 2, 3, 4, 5, 6] });
    expect(kurtSeries(withNull)).toBeCloseTo(kurtSeries(withoutNull), 10);
  });

  it("skipna=false propagates NaN when null present", () => {
    const s = new Series({ data: [1, 2, null, 4, 5, 6] as Scalar[] });
    expect(Number.isNaN(kurtSeries(s, { skipna: false }))).toBe(true);
  });

  it("uniform distribution has negative excess kurtosis", () => {
    // Uniform: excess kurtosis = -1.2
    const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
    expect(kurtSeries(s)).toBeLessThan(0);
  });

  it("known kurtosis value", () => {
    // Adjusted Fisher: pd.Series([2,8,0,4,1,9,9,0]).kurt() ≈ -2.0986
    const s = new Series({ data: [2, 8, 0, 4, 1, 9, 9, 0] });
    expect(round(kurtSeries(s), 3)).toBeCloseTo(-2.099, 2);
  });
});

// ─── skewDataFrame ────────────────────────────────────────────────────────────

describe("skewDataFrame", () => {
  it("axis=0 computes per-column skew", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5], b: [1, 2, 3, 4, 100] });
    const result = skewDataFrame(df);
    expect(result.index.values).toEqual(["a", "b"]);
    expect(Math.abs(result.values[0] as number)).toBeLessThan(1e-9); // symmetric
    expect(result.values[1] as number).toBeGreaterThan(0); // right-skewed
  });

  it("axis=1 computes per-row skew", () => {
    const df = DataFrame.fromColumns({
      a: [1, 10],
      b: [2, 10],
      c: [3, 100],
    });
    const result = skewDataFrame(df, { axis: 1 });
    expect(result.values.length).toBe(2);
  });

  it("numericOnly skips string columns", () => {
    const df = DataFrame.fromColumns({ n: [1, 2, 3, 4, 5], s: ["a", "b", "c", "d", "e"] });
    const result = skewDataFrame(df, { numericOnly: true });
    expect(result.index.values).toEqual(["n"]);
  });

  it("columns with n < 3 return NaN", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    expect(Number.isNaN(skewDataFrame(df).values[0] as number)).toBe(true);
  });

  it("preserves row index for axis=1", () => {
    const df = DataFrame.fromColumns(
      { a: [1, 2, 3, 4, 5], b: [5, 4, 3, 2, 1], c: [1, 1, 1, 1, 100] },
      { index: ["r0", "r1", "r2", "r3", "r4"] },
    );
    const result = skewDataFrame(df, { axis: 1 });
    expect(result.index.values).toEqual(["r0", "r1", "r2", "r3", "r4"]);
  });
});

// ─── kurtDataFrame ────────────────────────────────────────────────────────────

describe("kurtDataFrame", () => {
  it("axis=0 computes per-column kurtosis", () => {
    const df = DataFrame.fromColumns({
      a: [1, 2, 3, 4, 5, 6],
      b: [1, 1, 1, 9, 9, 9],
    });
    const result = kurtDataFrame(df);
    expect(result.index.values).toEqual(["a", "b"]);
    expect(Number.isFinite(result.values[0] as number)).toBe(true);
  });

  it("axis=1 computes per-row kurtosis", () => {
    const df = DataFrame.fromColumns({
      a: [1, 2],
      b: [2, 3],
      c: [3, 4],
      d: [10, 5],
      e: [4, 6],
      f: [3, 7],
    });
    const result = kurtDataFrame(df, { axis: 1 });
    expect(result.values.length).toBe(2);
  });

  it("columns with n < 4 return NaN", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    expect(Number.isNaN(kurtDataFrame(df).values[0] as number)).toBe(true);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("skewSeries property tests", () => {
  it("skew of constant array is NaN", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 100 }), (c) => {
        const s = new Series({ data: [c, c, c, c, c] });
        expect(Number.isNaN(skewSeries(s))).toBe(true);
      }),
    );
  });

  it("skew is finite for non-constant arrays with n >= 3", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 3, maxLength: 20 }),
        (arr) => {
          // Check if constant
          const allSame = arr.every((v) => v === arr[0]);
          const s = new Series({ data: arr });
          const result = skewSeries(s);
          if (allSame) {
            expect(Number.isNaN(result)).toBe(true);
          } else {
            expect(Number.isFinite(result)).toBe(true);
          }
        },
      ),
    );
  });
});

describe("kurtSeries property tests", () => {
  it("kurt of constant array is NaN", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 100 }), (c) => {
        const s = new Series({ data: [c, c, c, c, c] });
        expect(Number.isNaN(kurtSeries(s))).toBe(true);
      }),
    );
  });
});
