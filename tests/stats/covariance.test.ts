/**
 * Tests for rolling covariance and correlation (src/stats/covariance.ts).
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame } from "../../src/core/index.ts";
import { Series } from "../../src/core/index.ts";
import {
  rollingCorr,
  rollingCorrDataFrame,
  rollingCov,
  rollingCovDataFrame,
} from "../../src/stats/covariance.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function s(data: (number | null | undefined)[], name?: string): Series<unknown> {
  return new Series({ data, name: name ?? null });
}

function approx(a: number | null | undefined, b: number, eps = 1e-9): boolean {
  if (a === null || a === undefined) return false;
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  return Math.abs(a - b) < eps;
}

// ─── rollingCov ───────────────────────────────────────────────────────────────

describe("rollingCov", () => {
  it("returns nulls for window positions with insufficient data", () => {
    const x = s([1, 2, 3, 4, 5]);
    const y = s([2, 4, 6, 8, 10]);
    const result = rollingCov(x, y, 3);
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBeNull();
  });

  it("computes sample covariance in a window of 3", () => {
    // x=[1,2,3], y=[2,4,6]: cov = Σ(xi-2)(yi-4)/2 = ((-1)(-2)+(0)(0)+(1)(2))/2 = 4/2 = 2
    const x = s([1, 2, 3, 4, 5]);
    const y = s([2, 4, 6, 8, 10]);
    const result = rollingCov(x, y, 3);
    expect(approx(result.values[2] as number, 2)).toBe(true);
    expect(approx(result.values[3] as number, 2)).toBe(true);
    expect(approx(result.values[4] as number, 2)).toBe(true);
  });

  it("returns negative covariance for negatively-correlated series", () => {
    const x = s([1, 2, 3, 4, 5]);
    const y = s([5, 4, 3, 2, 1]);
    const result = rollingCov(x, y, 3);
    // window [1,2,3] vs [5,4,3]: cov = ((-1)(2)+(0)(1)+(1)(0))/2 = -2/2 = -1
    expect(approx(result.values[2] as number, -1)).toBe(true);
  });

  it("handles window=2", () => {
    const x = s([1, 3, 5]);
    const y = s([2, 6, 10]);
    // window of 2: cov([1,3],[2,6]) = ((-1)(-2)+(1)(2))/1 = 4
    const result = rollingCov(x, y, 2);
    expect(result.values[0]).toBeNull();
    expect(approx(result.values[1] as number, 4)).toBe(true);
    expect(approx(result.values[2] as number, 4)).toBe(true);
  });

  it("with ddof=0 produces population covariance", () => {
    const x = s([1, 2, 3]);
    const y = s([2, 4, 6]);
    // population cov of [1,2,3] vs [2,4,6]: = 2*(1/3)*((1+2+3)/3=2) → 4/3
    // Σ(xi-2)(yi-4) = (-1)(-2)+(0)(0)+(1)(2)=4;  pop: 4/3
    const result = rollingCov(x, y, 3, { ddof: 0 });
    expect(approx(result.values[2] as number, 4 / 3)).toBe(true);
  });

  it("skips missing values in paired positions", () => {
    const x = s([1, null, 3, 4, 5]);
    const y = s([2, 4, 6, 8, 10]);
    const result = rollingCov(x, y, 3);
    // window [1,null,3] vs [2,4,6]: only valid pairs (1,2),(3,6) → n=2
    // cov sample: mean_x=2, mean_y=4; sum=(-1)(-2)+(1)(2)=4; cov=4/1=4
    expect(approx(result.values[2] as number, 4)).toBe(true);
  });

  it("returns null when window has fewer valid pairs than minPeriods", () => {
    const x = s([1, null, null, 4]);
    const y = s([1, 2, 3, 4]);
    const result = rollingCov(x, y, 3, { minPeriods: 3 });
    // window [1,null,null] has only 1 valid pair < minPeriods=3
    expect(result.values[2]).toBeNull();
  });

  it("preserves index and name from x", () => {
    const x = new Series({ data: [1, 2, 3], name: "x" });
    const y = new Series({ data: [2, 4, 6] });
    const result = rollingCov(x, y, 2);
    expect(result.name).toBe("x");
  });

  it("throws when window < 1", () => {
    const x = s([1, 2, 3]);
    const y = s([1, 2, 3]);
    expect(() => rollingCov(x, y, 0)).toThrow();
  });

  it("throws when series have different lengths", () => {
    const x = s([1, 2, 3]);
    const y = s([1, 2]);
    expect(() => rollingCov(x, y, 2)).toThrow();
  });

  it("identical series → cov equals var", () => {
    const x = s([2, 4, 6, 8, 10]);
    const result = rollingCov(x, x, 3);
    // cov(x, x) = var(x) with ddof=1
    // window [2,4,6]: var = ((4+0+4)/2) = 4
    expect(approx(result.values[2] as number, 4)).toBe(true);
  });

  it("constant series → cov = 0", () => {
    const x = s([3, 3, 3, 3]);
    const y = s([1, 2, 3, 4]);
    const result = rollingCov(x, y, 3);
    expect(approx(result.values[2] as number, 0, 1e-12)).toBe(true);
  });

  it("all nulls in window → null result", () => {
    const x = s([null, null, null, 1, 2]);
    const y = s([null, null, null, 2, 4]);
    const result = rollingCov(x, y, 3);
    expect(result.values[2]).toBeNull();
  });

  it("large window exceeding series length → minPeriods=2 governs", () => {
    const x = s([1, 2, 3]);
    const y = s([2, 4, 6]);
    const result = rollingCov(x, y, 10, { minPeriods: 2 });
    // position 1: pairs (1,2),(2,4) → cov = 4
    expect(result.values[0]).toBeNull();
    expect(approx(result.values[1] as number, 4)).toBe(true);
  });

  it("single element windows with minPeriods=1 → null (need 2 for ddof=1)", () => {
    const x = s([1, 2, 3]);
    const y = s([2, 4, 6]);
    const result = rollingCov(x, y, 1, { minPeriods: 1 });
    // sampleCov with n=1, ddof=1 → n <= ddof → null
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBeNull();
  });
});

// ─── rollingCorr ──────────────────────────────────────────────────────────────

describe("rollingCorr", () => {
  it("returns nulls for window positions with insufficient data", () => {
    const x = s([1, 2, 3, 4]);
    const y = s([2, 4, 6, 8]);
    const result = rollingCorr(x, y, 3);
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBeNull();
  });

  it("perfectly correlated series → corr = 1", () => {
    const x = s([1, 2, 3, 4, 5]);
    const y = s([2, 4, 6, 8, 10]);
    const result = rollingCorr(x, y, 3);
    for (let i = 2; i < 5; i++) {
      expect(approx(result.values[i] as number, 1)).toBe(true);
    }
  });

  it("perfectly anti-correlated series → corr = -1", () => {
    const x = s([1, 2, 3, 4, 5]);
    const y = s([5, 4, 3, 2, 1]);
    const result = rollingCorr(x, y, 3);
    for (let i = 2; i < 5; i++) {
      expect(approx(result.values[i] as number, -1)).toBe(true);
    }
  });

  it("returns NaN for zero-variance window", () => {
    const x = s([3, 3, 3, 4, 5]);
    const y = s([1, 2, 3, 4, 5]);
    const result = rollingCorr(x, y, 3);
    // window [3,3,3] has zero variance → NaN
    expect(Number.isNaN(result.values[2])).toBe(true);
  });

  it("uncorrelated series → corr near 0", () => {
    // Arithmetic sequences at 90° phase offset
    const x = s([1, 0, -1, 0, 1, 0, -1]);
    const y = s([0, 1, 0, -1, 0, 1, 0]);
    const result = rollingCorr(x, y, 4);
    // Exact 0 for perfectly orthogonal windows
    for (let i = 3; i < 7; i++) {
      const v = result.values[i] as number;
      if (v !== null && !Number.isNaN(v)) {
        expect(Math.abs(v)).toBeLessThan(0.1);
      }
    }
  });

  it("handles missing values in window", () => {
    const x = s([1, null, 3, 4, 5]);
    const y = s([2, 4, 6, 8, 10]);
    // window [1,null,3] vs [2,4,6]: valid pairs (1,2),(3,6) → corr=1
    const result = rollingCorr(x, y, 3);
    expect(approx(result.values[2] as number, 1)).toBe(true);
  });

  it("corr result is in [-1, 1]", () => {
    const x = s([3, 1, 4, 1, 5, 9, 2, 6]);
    const y = s([2, 7, 1, 8, 2, 8, 1, 8]);
    const result = rollingCorr(x, y, 4);
    for (const v of result.values) {
      if (v !== null && !Number.isNaN(v)) {
        expect(v as number).toBeGreaterThanOrEqual(-1 - 1e-9);
        expect(v as number).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it("preserves index and name from x", () => {
    const x = new Series({ data: [1, 2, 3], name: "signal" });
    const y = new Series({ data: [2, 4, 6] });
    const result = rollingCorr(x, y, 2);
    expect(result.name).toBe("signal");
  });

  it("throws when window < 1", () => {
    const x = s([1, 2, 3]);
    const y = s([1, 2, 3]);
    expect(() => rollingCorr(x, y, 0)).toThrow();
  });

  it("throws when series have different lengths", () => {
    const x = s([1, 2, 3]);
    const y = s([1, 2]);
    expect(() => rollingCorr(x, y, 2)).toThrow();
  });

  it("self-correlation → 1 everywhere (with enough data)", () => {
    const x = s([1, 2, 3, 4, 5, 6]);
    const result = rollingCorr(x, x, 3);
    for (let i = 2; i < 6; i++) {
      expect(approx(result.values[i] as number, 1)).toBe(true);
    }
  });

  it("window=2 uses only two observations", () => {
    const x = s([1, 3, 5]);
    const y = s([2, 4, 8]);
    // window of 2: ([1,3],[2,4]) → perfectly correlated → 1
    const result = rollingCorr(x, y, 2);
    expect(result.values[0]).toBeNull();
    expect(approx(result.values[1] as number, 1)).toBe(true);
  });
});

// ─── rollingCovDataFrame ──────────────────────────────────────────────────────

describe("rollingCovDataFrame", () => {
  it("computes column-wise rolling covariance between two DataFrames", () => {
    const df1 = new DataFrame({ a: [1, 2, 3, 4, 5], b: [5, 4, 3, 2, 1] });
    const df2 = new DataFrame({ a: [2, 4, 6, 8, 10], b: [10, 8, 6, 4, 2] });
    const result = rollingCovDataFrame(df1, df2, 3);
    const colA = result.col("a").values;
    const colB = result.col("b").values;
    // column a: cov([1,2,3],[2,4,6]) = 2
    expect(approx(colA[2] as number, 2)).toBe(true);
    // column b: cov([5,4,3],[10,8,6]) = -2 (negatively co-varying pairs)
    expect(approx(colB[2] as number, -2)).toBe(true);
  });

  it("first window-1 rows are null", () => {
    const df1 = new DataFrame({ a: [1, 2, 3, 4] });
    const df2 = new DataFrame({ a: [2, 4, 6, 8] });
    const result = rollingCovDataFrame(df1, df2, 3);
    expect(result.col("a").values[0]).toBeNull();
    expect(result.col("a").values[1]).toBeNull();
  });

  it("accepts options.columns to restrict columns", () => {
    const df1 = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] });
    const df2 = new DataFrame({ a: [2, 4, 6], b: [8, 10, 12], c: [14, 16, 18] });
    const result = rollingCovDataFrame(df1, df2, 2, { columns: ["a", "c"] });
    expect(result.columns.values).toContain("a");
    expect(result.columns.values).toContain("c");
    expect(result.columns.values).not.toContain("b");
  });
});

// ─── rollingCorrDataFrame ─────────────────────────────────────────────────────

describe("rollingCorrDataFrame", () => {
  it("computes column-wise rolling correlation between two DataFrames", () => {
    const df1 = new DataFrame({ a: [1, 2, 3, 4], b: [4, 3, 2, 1] });
    const df2 = new DataFrame({ a: [2, 4, 6, 8], b: [8, 6, 4, 2] });
    const result = rollingCorrDataFrame(df1, df2, 3);
    // column a: perfectly positively correlated → 1
    expect(approx(result.col("a").values[2] as number, 1)).toBe(true);
    // column b: perfectly positively correlated (both decrease) → 1
    expect(approx(result.col("b").values[2] as number, 1)).toBe(true);
  });

  it("first window-1 rows are null", () => {
    const df1 = new DataFrame({ x: [1, 2, 3, 4] });
    const df2 = new DataFrame({ x: [4, 3, 2, 1] });
    const result = rollingCorrDataFrame(df1, df2, 3);
    expect(result.col("x").values[0]).toBeNull();
    expect(result.col("x").values[1]).toBeNull();
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("rollingCov property-based", () => {
  it("cov(x, y, w) == cov(y, x, w) (commutativity)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.integer({ min: 2, max: 5 }),
        (xArr, yArr, win) => {
          const n = Math.min(xArr.length, yArr.length);
          const x = new Series<unknown>({ data: xArr.slice(0, n) });
          const y = new Series<unknown>({ data: yArr.slice(0, n) });
          const r1 = rollingCov(x, y, win);
          const r2 = rollingCov(y, x, win);
          for (let i = 0; i < n; i++) {
            const a = r1.values[i];
            const b = r2.values[i];
            if (a === null && b === null) continue;
            if (
              typeof a === "number" &&
              typeof b === "number" &&
              !Number.isNaN(a) &&
              !Number.isNaN(b)
            ) {
              expect(Math.abs(a - b)).toBeLessThan(1e-9);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("cov(x, x, w) ≥ 0 (variance is non-negative)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.integer({ min: 2, max: 5 }),
        (xArr, win) => {
          const x = new Series<unknown>({ data: xArr });
          const result = rollingCov(x, x, win);
          for (const v of result.values) {
            if (v !== null && typeof v === "number" && !Number.isNaN(v)) {
              expect(v).toBeGreaterThanOrEqual(-1e-12);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("rollingCorr property-based", () => {
  it("corr(x, y, w) is in [-1, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.integer({ min: 2, max: 5 }),
        (xArr, yArr, win) => {
          const n = Math.min(xArr.length, yArr.length);
          const x = new Series<unknown>({ data: xArr.slice(0, n) });
          const y = new Series<unknown>({ data: yArr.slice(0, n) });
          const result = rollingCorr(x, y, win);
          for (const v of result.values) {
            if (v !== null && typeof v === "number" && !Number.isNaN(v)) {
              expect(v).toBeGreaterThanOrEqual(-1 - 1e-9);
              expect(v).toBeLessThanOrEqual(1 + 1e-9);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("corr(x, y, w) == corr(y, x, w) (commutativity)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.integer({ min: 2, max: 5 }),
        (xArr, yArr, win) => {
          const n = Math.min(xArr.length, yArr.length);
          const x = new Series<unknown>({ data: xArr.slice(0, n) });
          const y = new Series<unknown>({ data: yArr.slice(0, n) });
          const r1 = rollingCorr(x, y, win);
          const r2 = rollingCorr(y, x, win);
          for (let i = 0; i < n; i++) {
            const a = r1.values[i];
            const b = r2.values[i];
            if (a === null && b === null) continue;
            if (
              typeof a === "number" &&
              typeof b === "number" &&
              !Number.isNaN(a) &&
              !Number.isNaN(b)
            ) {
              expect(Math.abs(a - b)).toBeLessThan(1e-9);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("scale-invariant: corr(a*x, b*y, w) == corr(x, y, w) for a,b ≠ 0", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }), {
          minLength: 4,
          maxLength: 15,
        }),
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }), {
          minLength: 4,
          maxLength: 15,
        }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 0.1, max: 10 }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 0.1, max: 10 }),
        fc.integer({ min: 2, max: 4 }),
        (xArr, yArr, a, b, win) => {
          const n = Math.min(xArr.length, yArr.length);
          const x = new Series<unknown>({ data: xArr.slice(0, n) });
          const y = new Series<unknown>({ data: yArr.slice(0, n) });
          const xa = new Series<unknown>({ data: (xArr.slice(0, n) as number[]).map((v) => v * a) });
          const yb = new Series<unknown>({ data: (yArr.slice(0, n) as number[]).map((v) => v * b) });
          const r1 = rollingCorr(x, y, win);
          const r2 = rollingCorr(xa, yb, win);
          for (let i = 0; i < n; i++) {
            const v1 = r1.values[i];
            const v2 = r2.values[i];
            if (
              typeof v1 === "number" &&
              typeof v2 === "number" &&
              !Number.isNaN(v1) &&
              !Number.isNaN(v2)
            ) {
              expect(Math.abs(v1 - v2)).toBeLessThan(1e-7);
            }
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
