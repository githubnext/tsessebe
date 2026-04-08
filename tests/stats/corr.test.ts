/**
 * Tests for src/stats/corr.ts — pearsonCorr(), dataFrameCorr(), dataFrameCov()
 * and the Series.corr() / DataFrame.corr() / DataFrame.cov() methods.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series, dataFrameCorr, dataFrameCov, pearsonCorr } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a two-column DataFrame for quick tests. */
function dfAB(a: number[], b: number[]): DataFrame {
  return DataFrame.fromColumns({ a, b });
}

/** Clamp to avoid floating-point artefacts around ±1. */
function approxCorr(v: number): number {
  return Math.round(v * 1e10) / 1e10;
}

// ─── pearsonCorr() ───────────────────────────────────────────────────────────

describe("pearsonCorr", () => {
  it("perfect positive correlation", () => {
    const a = new Series({ data: [1, 2, 3, 4, 5] });
    const b = new Series({ data: [2, 4, 6, 8, 10] });
    expect(pearsonCorr(a, b)).toBeCloseTo(1.0);
  });

  it("perfect negative correlation", () => {
    const a = new Series({ data: [1, 2, 3] });
    const b = new Series({ data: [6, 4, 2] });
    expect(pearsonCorr(a, b)).toBeCloseTo(-1.0);
  });

  it("zero correlation (constant series)", () => {
    const a = new Series({ data: [2, 2, 2] });
    const b = new Series({ data: [1, 2, 3] });
    expect(Number.isNaN(pearsonCorr(a, b))).toBe(true);
  });

  it("returns NaN when fewer than minPeriods valid pairs", () => {
    const a = new Series({ data: [1, 2, 3] });
    const b = new Series({ data: [4, 5, 6] });
    expect(Number.isNaN(pearsonCorr(a, b, { minPeriods: 10 }))).toBe(true);
  });

  it("aligns on shared index labels (inner join)", () => {
    const a = new Series({ data: [1, 2, 3], index: ["x", "y", "z"] });
    const b = new Series({ data: [4, 5, 6], index: ["y", "z", "w"] });
    // shared labels: y(2,4) z(3,5) — perfect correlation
    expect(pearsonCorr(a, b)).toBeCloseTo(1.0);
  });

  it("drops null/NaN values from aligned pairs", () => {
    const a = new Series({ data: [1, null, 3] as Scalar[] });
    const b = new Series({ data: [2, 4, 6] as Scalar[] });
    // only pairs (1,2) and (3,6) remain — perfect correlation
    expect(pearsonCorr(a, b)).toBeCloseTo(1.0);
  });

  it("returns NaN when no shared index labels", () => {
    const a = new Series({ data: [1, 2], index: ["a", "b"] });
    const b = new Series({ data: [3, 4], index: ["c", "d"] });
    expect(Number.isNaN(pearsonCorr(a, b))).toBe(true);
  });

  it("returns NaN for empty series", () => {
    const a = new Series({ data: [] });
    const b = new Series({ data: [] });
    expect(Number.isNaN(pearsonCorr(a, b))).toBe(true);
  });

  it("known value: r ≈ 0.6", () => {
    const a = new Series({ data: [1, 2, 3, 4] });
    const b = new Series({ data: [2, 1, 4, 3] });
    // r = 3 / sqrt(5 * 5) = 0.6
    expect(pearsonCorr(a, b)).toBeCloseTo(0.6);
  });

  it("property: result is in [-1, 1] for non-degenerate inputs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 2,
          maxLength: 30,
        }),
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 2,
          maxLength: 30,
        }),
        (arrA, arrB) => {
          const len = Math.min(arrA.length, arrB.length);
          const a = new Series({ data: arrA.slice(0, len) });
          const b = new Series({ data: arrB.slice(0, len) });
          const r = pearsonCorr(a, b);
          // NaN is allowed (constant series), otherwise must be in [-1, 1]
          return Number.isNaN(r) || (r >= -1 - 1e-9 && r <= 1 + 1e-9);
        },
      ),
    );
  });

  it("property: corr(a, b) === corr(b, a) (symmetric)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 2,
          maxLength: 20,
        }),
        (arr) => {
          const a = new Series({ data: arr });
          const b = new Series({ data: [...arr].reverse() });
          const r1 = pearsonCorr(a, b);
          const r2 = pearsonCorr(b, a);
          if (Number.isNaN(r1) && Number.isNaN(r2)) {
            return true;
          }
          return Math.abs(r1 - r2) < 1e-9;
        },
      ),
    );
  });
});

// ─── Series.corr() ───────────────────────────────────────────────────────────

describe("Series.corr", () => {
  it("matches standalone pearsonCorr", () => {
    const a = new Series({ data: [1, 2, 3, 4, 5] });
    const b = new Series({ data: [5, 4, 3, 2, 1] });
    expect(a.corr(b)).toBeCloseTo(pearsonCorr(a, b));
  });

  it("perfect positive correlation", () => {
    const a = new Series({ data: [10, 20, 30] });
    const b = new Series({ data: [1, 2, 3] });
    expect(a.corr(b)).toBeCloseTo(1.0);
  });

  it("respects minPeriods parameter", () => {
    const a = new Series({ data: [1, 2] });
    const b = new Series({ data: [3, 4] });
    expect(Number.isNaN(a.corr(b, 5))).toBe(true);
  });
});

// ─── dataFrameCorr() ─────────────────────────────────────────────────────────

describe("dataFrameCorr", () => {
  it("diagonal entries are 1.0", () => {
    const df = dfAB([1, 2, 3], [4, 5, 6]);
    const r = dataFrameCorr(df);
    expect(r.col("a").iat(0)).toBeCloseTo(1.0); // a corr a
    expect(r.col("b").iat(1)).toBeCloseTo(1.0); // b corr b
  });

  it("is symmetric (r[i,j] === r[j,i])", () => {
    const df = dfAB([1, 2, 3], [3, 1, 2]);
    const r = dataFrameCorr(df);
    const rAB = r.col("b").iat(0) as number; // row a, col b
    const rBA = r.col("a").iat(1) as number; // row b, col a
    expect(rAB).toBeCloseTo(rBA);
  });

  it("perfect positive correlation between a and b", () => {
    const df = dfAB([1, 2, 3], [2, 4, 6]);
    const r = dataFrameCorr(df);
    expect(approxCorr(r.col("b").iat(0) as number)).toBeCloseTo(1.0);
  });

  it("skips non-numeric columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6], c: ["x", "y", "z"] });
    const r = dataFrameCorr(df);
    // Only numeric columns a and b should appear
    expect(r.columns.values).toEqual(["a", "b"]);
  });

  it("returns empty DataFrame for all-string input", () => {
    const df = DataFrame.fromColumns({ c: ["x", "y"], d: ["a", "b"] });
    const r = dataFrameCorr(df);
    expect(r.shape).toEqual([0, 0]);
  });

  it("row index matches column names", () => {
    const df = dfAB([1, 2], [3, 4]);
    const r = dataFrameCorr(df);
    expect(r.index.at(0)).toBe("a");
    expect(r.index.at(1)).toBe("b");
  });

  it("three-column correlation matrix is 3×3", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] });
    const r = dataFrameCorr(df);
    expect(r.shape).toEqual([3, 3]);
  });

  it("respects minPeriods option", () => {
    const df = dfAB([1, 2], [3, 4]);
    const r = dataFrameCorr(df, { minPeriods: 100 });
    // All pairs have only 2 observations, so every off-diagonal entry should be NaN
    expect(Number.isNaN(r.col("b").iat(0) as number)).toBe(true); // a corr b
  });
});

// ─── DataFrame.corr() ────────────────────────────────────────────────────────

describe("DataFrame.corr", () => {
  it("matches standalone dataFrameCorr", () => {
    const df = dfAB([1, 2, 3], [3, 6, 9]);
    const r1 = df.corr();
    const r2 = dataFrameCorr(df);
    expect(r1.col("a").iat(0) as number).toBeCloseTo(r2.col("a").iat(0) as number);
    expect(r1.col("b").iat(0) as number).toBeCloseTo(r2.col("b").iat(0) as number);
  });

  it("diagonal is 1 for normal columns", () => {
    const df = dfAB([1, 2, 3, 4], [5, 3, 2, 1]);
    const r = df.corr();
    expect(r.col("a").iat(0)).toBeCloseTo(1.0);
    expect(r.col("b").iat(1)).toBeCloseTo(1.0);
  });
});

// ─── dataFrameCov() ──────────────────────────────────────────────────────────

describe("dataFrameCov", () => {
  it("diagonal entries are variances", () => {
    // var([1,2,3]) = 1 (sample)
    const df = dfAB([1, 2, 3], [10, 20, 30]);
    const cov = dataFrameCov(df);
    expect(cov.col("a").iat(0)).toBeCloseTo(1.0); // var(a)
    expect(cov.col("b").iat(1)).toBeCloseTo(100.0); // var(b)
  });

  it("is symmetric", () => {
    const df = dfAB([1, 2, 3], [3, 1, 2]);
    const cov = dataFrameCov(df);
    const covAB = cov.col("b").iat(0) as number;
    const covBA = cov.col("a").iat(1) as number;
    expect(covAB).toBeCloseTo(covBA);
  });

  it("covariance of identical series equals variance", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [1, 2, 3] });
    const cov = dataFrameCov(df);
    expect(cov.col("b").iat(0)).toBeCloseTo(1.0); // cov(a,b) = var(a) = 1
  });

  it("ddof=0 gives population covariance", () => {
    // population var([1,2,3]) = 2/3
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const cov = dataFrameCov(df, { ddof: 0 });
    expect(cov.col("a").iat(0)).toBeCloseTo(2 / 3);
  });

  it("returns NaN when minPeriods not met", () => {
    const df = dfAB([1, 2], [3, 4]);
    const cov = dataFrameCov(df, { minPeriods: 10 });
    expect(Number.isNaN(cov.col("b").iat(0) as number)).toBe(true);
  });

  it("three-column cov matrix is 3×3", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] });
    const cov = dataFrameCov(df);
    expect(cov.shape).toEqual([3, 3]);
  });

  it("skips non-numeric columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], lbl: ["x", "y", "z"] });
    const cov = dataFrameCov(df);
    expect(cov.columns.values).toEqual(["a"]);
  });

  it("property: cov(a, a) >= 0", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: -1000, max: 1000 }), {
          minLength: 2,
          maxLength: 30,
        }),
        (arr) => {
          const df = DataFrame.fromColumns({ a: arr });
          const cov = dataFrameCov(df);
          const v = cov.col("a").iat(0) as number;
          return Number.isNaN(v) || v >= -1e-9;
        },
      ),
    );
  });
});

// ─── DataFrame.cov() ─────────────────────────────────────────────────────────

describe("DataFrame.cov", () => {
  it("matches standalone dataFrameCov", () => {
    const df = dfAB([1, 2, 3], [4, 5, 6]);
    const cov1 = df.cov();
    const cov2 = dataFrameCov(df);
    expect(cov1.col("a").iat(0) as number).toBeCloseTo(cov2.col("a").iat(0) as number);
    expect(cov1.col("b").iat(0) as number).toBeCloseTo(cov2.col("b").iat(0) as number);
  });

  it("diagonal entries are sample variances", () => {
    const df = dfAB([2, 4, 6], [1, 3, 5]);
    const cov = df.cov();
    expect(cov.col("a").iat(0)).toBeCloseTo(4.0); // var([2,4,6]) = 4
    expect(cov.col("b").iat(1)).toBeCloseTo(4.0); // var([1,3,5]) = 4
  });
});
