/**
 * Tests for rolling cross-correlation (src/stats/rolling_cross_corr.ts).
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame } from "../../src/core/index.ts";
import { Series } from "../../src/core/index.ts";
import { crossCorr, rollingCrossCorr } from "../../src/stats/rolling_cross_corr.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function s(data: (number | null | undefined)[], name?: string): Series<unknown> {
  return new Series({ data, name: name ?? null });
}

function approx(a: unknown, b: number, eps = 1e-9): boolean {
  if (typeof a !== "number") return false;
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  return Math.abs(a - b) < eps;
}

// ─── crossCorr ────────────────────────────────────────────────────────────────

describe("crossCorr", () => {
  it("lag 0 of identical series is 1", () => {
    const x = s([1, 2, 3, 4, 5]);
    const result = crossCorr(x, x, { lags: [0] });
    expect(approx(result.values[0], 1)).toBe(true);
  });

  it("lag 0 of perfectly anti-correlated series is -1", () => {
    const x = s([1, 2, 3, 4, 5]);
    const y = s([5, 4, 3, 2, 1]);
    const result = crossCorr(x, y, { lags: [0] });
    expect(approx(result.values[0], -1)).toBe(true);
  });

  it("positive lag — y is x shifted by 1 → perfect corr at lag 1", () => {
    // y[i] = x[i-1] ⟹ pair (x[i], y[i-lag]) = (x[i], x[i-1]) at lag=1
    // i.e. both point to consecutive identical values → perfect corr
    const x = s([1, 2, 3, 4, 5]);
    const y = s([0, 1, 2, 3, 4]); // y[i] = x[i] - 1  → perfectly corr anyway
    const result = crossCorr(x, y, { lags: [1] });
    // At lag 1: pairs (x[1],y[0]),...,(x[4],y[3]) = (2,0),(3,1),(4,2),(5,3)
    // corr([2,3,4,5],[0,1,2,3]) = 1
    expect(approx(result.values[0], 1)).toBe(true);
  });

  it("returns null when fewer than minPeriods valid pairs", () => {
    const x = s([1, 2]);
    const y = s([3, 4]);
    // lag=2 → only valid pair would need y[i-2] which is out of bounds for i=0,1
    const result = crossCorr(x, y, { lags: [2], minPeriods: 2 });
    expect(result.values[0]).toBeNull();
  });

  it("returns NaN for constant series (zero variance)", () => {
    const x = s([1, 1, 1, 1, 1]);
    const y = s([2, 3, 4, 5, 6]);
    const result = crossCorr(x, y, { lags: [0] });
    expect(Number.isNaN(result.values[0])).toBe(true);
  });

  it("index is labeled by lag", () => {
    const x = s([1, 2, 3, 4]);
    const result = crossCorr(x, x, { lags: [-1, 0, 1] });
    const labels = result.index.values;
    expect(labels[0]).toBe("lag_neg1");
    expect(labels[1]).toBe("lag_0");
    expect(labels[2]).toBe("lag_1");
  });

  it("throws when x and y have different lengths", () => {
    const x = s([1, 2, 3]);
    const y = s([1, 2]);
    expect(() => crossCorr(x, y)).toThrow();
  });

  it("uses maxLag option to generate symmetric range", () => {
    const x = s([1, 2, 3, 4, 5]);
    const result = crossCorr(x, x, { maxLag: 2 });
    expect(result.values.length).toBe(5); // -2,-1,0,1,2
  });

  it("deduplicates lags passed as options", () => {
    const x = s([1, 2, 3, 4, 5]);
    const result = crossCorr(x, x, { lags: [0, 0, 1, 1] });
    expect(result.values.length).toBe(2);
  });

  it("skips missing values in paired extraction", () => {
    const x = s([1, null, 3, 4, 5]);
    const y = s([1, 2, null, 4, 5]);
    // lag 0: valid pairs at positions 0,3,4 → corr([1,4,5],[1,4,5]) = 1
    const result = crossCorr(x, y, { lags: [0] });
    expect(approx(result.values[0], 1)).toBe(true);
  });

  it("symmetry: crossCorr(x,y,lag=l) == crossCorr(y,x,lag=-l)", () => {
    const x = s([1, 3, 2, 5, 4]);
    const y = s([2, 1, 4, 3, 6]);
    const fwd = crossCorr(x, y, { lags: [1] });
    const bwd = crossCorr(y, x, { lags: [-1] });
    const a = fwd.values[0];
    const b = bwd.values[0];
    if (typeof a === "number" && typeof b === "number" && !Number.isNaN(a) && !Number.isNaN(b)) {
      expect(approx(a, b)).toBe(true);
    }
  });

  // ── property tests ──────────────────────────────────────────────────────────

  it("[property] lag-0 cross-corr of x with itself is 1 or NaN", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -1000, max: 1000 }), { minLength: 5, maxLength: 30 }),
        (arr) => {
          const x = new Series<unknown>({ data: arr });
          const result = crossCorr(x, x, { lags: [0] });
          const v = result.values[0];
          if (typeof v === "number") return v === 1 || Number.isNaN(v);
          return v === null;
        },
      ),
    );
  });

  it("[property] result values are in [-1,1] or NaN or null", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -100, max: 100 }), { minLength: 5, maxLength: 20 }),
        fc.array(fc.double({ noNaN: true, min: -100, max: 100 }), { minLength: 5, maxLength: 5 }),
        (arr1, arr2) => {
          // ensure same length
          const n = Math.min(arr1.length, arr2.length, 5);
          const x = new Series<unknown>({ data: arr1.slice(0, n) });
          const y = new Series<unknown>({ data: arr2.slice(0, n) });
          const result = crossCorr(x, y, { maxLag: 1 });
          for (const v of result.values) {
            if (typeof v === "number" && !Number.isNaN(v)) {
              if (v < -1 - 1e-9 || v > 1 + 1e-9) return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ─── rollingCrossCorr ─────────────────────────────────────────────────────────

describe("rollingCrossCorr", () => {
  it("returns null for early positions (insufficient window)", () => {
    const x = s([1, 2, 3, 4, 5]);
    const y = s([5, 4, 3, 2, 1]);
    const df = rollingCrossCorr(x, y, 3, { lags: [0] });
    expect(df.col("lag_0").values[0]).toBeNull();
    expect(df.col("lag_0").values[1]).toBeNull();
  });

  it("lag 0 of perfectly correlated data gives 1 once window is full", () => {
    const x = s([1, 2, 3, 4, 5]);
    const y = s([2, 4, 6, 8, 10]);
    const df = rollingCrossCorr(x, y, 3, { lags: [0] });
    const col = df.col("lag_0").values;
    expect(approx(col[2], 1)).toBe(true);
    expect(approx(col[3], 1)).toBe(true);
    expect(approx(col[4], 1)).toBe(true);
  });

  it("lag 0 anti-correlated gives -1 once window is full", () => {
    const x = s([1, 2, 3, 4, 5]);
    const y = s([5, 4, 3, 2, 1]);
    const df = rollingCrossCorr(x, y, 3, { lags: [0] });
    const col = df.col("lag_0").values;
    expect(approx(col[2], -1)).toBe(true);
  });

  it("correct column names for positive, zero, and negative lags", () => {
    const x = s([1, 2, 3, 4, 5]);
    const df = rollingCrossCorr(x, x, 3, { lags: [-1, 0, 1] });
    const cols = df.columns.values as string[];
    expect(cols).toContain("lag_neg1");
    expect(cols).toContain("lag_0");
    expect(cols).toContain("lag_1");
  });

  it("number of rows equals series length", () => {
    const x = s([1, 2, 3, 4, 5, 6, 7]);
    const df = rollingCrossCorr(x, x, 3, { lags: [0, 1] });
    expect(df.nrows).toBe(7);
  });

  it("number of columns equals number of lags", () => {
    const x = s([1, 2, 3, 4, 5]);
    const df = rollingCrossCorr(x, x, 3, { lags: [-2, -1, 0, 1, 2] });
    expect(df.ncols).toBe(5);
  });

  it("throws when window < 1", () => {
    const x = s([1, 2, 3]);
    expect(() => rollingCrossCorr(x, x, 0)).toThrow();
  });

  it("throws when x and y have different lengths", () => {
    const x = s([1, 2, 3]);
    const y = s([1, 2]);
    expect(() => rollingCrossCorr(x, y, 2)).toThrow();
  });

  it("skips NaN/null values within windows", () => {
    const x = s([1, 2, null, 4, 5]);
    const y = s([1, 2, 3, 4, 5]);
    // lag 0, window 3: at i=2 window is [1,2,null] vs [1,2,3] → 2 valid pairs → corr([1,2],[1,2])=1
    const df = rollingCrossCorr(x, y, 3, { lags: [0] });
    const col = df.col("lag_0").values;
    expect(approx(col[2], 1)).toBe(true);
  });

  it("large positive lag gives null when y values are out of bounds in window", () => {
    const x = s([1, 2, 3, 4, 5]);
    const y = s([1, 2, 3, 4, 5]);
    // lag=10 means y[i-10] which is always out of bounds for n=5
    const df = rollingCrossCorr(x, y, 3, { lags: [10], minPeriods: 1 });
    const col = df.col("lag_10").values;
    for (const v of col) {
      expect(v).toBeNull();
    }
  });

  it("uses maxLag to create symmetric columns", () => {
    const x = s([1, 2, 3, 4, 5, 6]);
    const df = rollingCrossCorr(x, x, 3, { maxLag: 2 });
    expect(df.ncols).toBe(5); // -2,-1,0,1,2
  });

  // ── property tests ──────────────────────────────────────────────────────────

  it("[property] lag-0 diagonal is in [-1,1] or NaN or null once window full", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -100, max: 100 }), { minLength: 6, maxLength: 20 }),
        fc.integer({ min: 2, max: 5 }),
        (arr, w) => {
          const x = new Series<unknown>({ data: arr });
          const df = rollingCrossCorr(x, x, w, { lags: [0] });
          const col = df.col("lag_0").values;
          for (let i = w - 1; i < arr.length; i++) {
            const v = col[i];
            if (typeof v === "number" && !Number.isNaN(v)) {
              if (v < -1 - 1e-9 || v > 1 + 1e-9) return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("[property] rolling lag-0 with x==y produces 1 or NaN in filled windows", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -1000, max: 1000 }), { minLength: 5, maxLength: 20 }),
        fc.integer({ min: 2, max: 4 }),
        (arr, w) => {
          const x = new Series<unknown>({ data: arr });
          const df = rollingCrossCorr(x, x, w, { lags: [0] });
          const col = df.col("lag_0").values;
          for (let i = w - 1; i < arr.length; i++) {
            const v = col[i];
            if (v !== null) {
              if (typeof v !== "number") return false;
              if (!Number.isNaN(v) && Math.abs(v - 1) > 1e-9) return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("[property] number of rows always equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true }), { minLength: 3, maxLength: 15 }),
        fc.integer({ min: 1, max: 4 }),
        (arr, w) => {
          const x = new Series<unknown>({ data: arr });
          const df = rollingCrossCorr(x, x, w, { lags: [0, 1] });
          return df.nrows === arr.length;
        },
      ),
    );
  });
});

// ─── interaction: crossCorr vs rollingCrossCorr ───────────────────────────────

describe("crossCorr and rollingCrossCorr consistency", () => {
  it("crossCorr lag-0 matches rollingCrossCorr lag-0 over the full window", () => {
    const data = [1, 2, 3, 4, 5, 6, 7];
    const x = new Series<unknown>({ data });
    const n = data.length;
    const overall = crossCorr(x, x, { lags: [0] });
    const rolling = rollingCrossCorr(x, x, n, { lags: [0] });
    // At the last position the full-length window should match overall corr
    const rv = rolling.col("lag_0").values[n - 1];
    const ov = overall.values[0];
    if (typeof rv === "number" && typeof ov === "number") {
      expect(approx(rv, ov as number)).toBe(true);
    }
  });
});
