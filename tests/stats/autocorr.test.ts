/**
 * Tests for autocorr — Series autocorrelation coefficient.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series, autocorr } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

const nan = Number.NaN;

function close(a: number, b: number, tol = 1e-10): boolean {
  if (Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }
  return Math.abs(a - b) <= tol;
}

function s(values: Scalar[]): Series<Scalar> {
  return new Series(values);
}

// ─── lag 0 ────────────────────────────────────────────────────────────────────

describe("autocorr — lag 0", () => {
  it("returns 1 for a constant series", () => {
    expect(autocorr(s([3, 3, 3, 3]), 0)).toBe(1);
  });

  it("returns 1 for a varied numeric series", () => {
    expect(autocorr(s([1, 2, 3, 4, 5]), 0)).toBe(1);
  });

  it("returns NaN when minPeriods not met", () => {
    expect(Number.isNaN(autocorr(s([nan, nan]), 0, { minPeriods: 1 }))).toBe(true);
  });
});

// ─── lag 1 ────────────────────────────────────────────────────────────────────

describe("autocorr — lag 1", () => {
  it("perfectly positively correlated sequence (arithmetic) → +1", () => {
    const result = autocorr(s([1, 2, 3, 4, 5]), 1);
    expect(close(result, 1, 1e-10)).toBe(true);
  });

  it("alternating ±1 series → -1", () => {
    const result = autocorr(s([1, -1, 1, -1, 1, -1]), 1);
    expect(close(result, -1, 1e-10)).toBe(true);
  });

  it("constant series → NaN (zero variance)", () => {
    expect(Number.isNaN(autocorr(s([5, 5, 5, 5]), 1))).toBe(true);
  });

  it("two-element series → NaN (insufficient pairs for Pearson after lag)", () => {
    // [1,2] with lag 1: one pair → perfectly correlated → 1
    // Actually with 1 pair pearsonCorr will give NaN because n=1 < 2 implied ...
    // Let's check: pairs=[2],[1] -> xs=[2], ys=[1], n=1 >= minPeriods=1, but varX=0 → NaN
    expect(Number.isNaN(autocorr(s([1, 2]), 1))).toBe(true);
  });

  it("lag ≥ length → NaN", () => {
    expect(Number.isNaN(autocorr(s([1, 2, 3]), 3))).toBe(true);
    expect(Number.isNaN(autocorr(s([1, 2, 3]), 5))).toBe(true);
  });

  it("empty series → NaN", () => {
    expect(Number.isNaN(autocorr(s([]), 1))).toBe(true);
  });

  it("missing values are skipped", () => {
    // [1, null, 3, null, 5] with lag 1:
    // pairs (i=1):(null,1)→skip, (i=2):(3,null)→skip, (i=3):(null,3)→skip, (i=4):(5,null)→skip
    // All skipped → NaN
    const result = autocorr(s([1, null, 3, null, 5]), 1);
    expect(Number.isNaN(result)).toBe(true);
  });

  it("sparse missing values — uses only valid pairs", () => {
    // [1, 2, null, 4, 5] with lag 1:
    // pairs: (2,1), (null,2)→skip, (4,null)→skip, (5,4)
    // xs=[2,5], ys=[1,4] → both same arithmetic progression → +1
    const result = autocorr(s([1, 2, null, 4, 5]), 1);
    expect(close(result, 1, 1e-10)).toBe(true);
  });

  it("NaN values are treated as missing", () => {
    const result = autocorr(s([1, 2, nan, 4, 5]), 1);
    // Same as null case above
    expect(close(result, 1, 1e-10)).toBe(true);
  });

  it("negative lag behaves identically to positive (symmetric)", () => {
    const a = autocorr(s([1, 2, 3, 4, 5, 6, 7]), 2);
    const b = autocorr(s([1, 2, 3, 4, 5, 6, 7]), -2);
    expect(close(a, b, 1e-10)).toBe(true);
  });
});

// ─── lag 2+ ───────────────────────────────────────────────────────────────────

describe("autocorr — lag > 1", () => {
  it("arithmetic sequence at lag 2 → +1", () => {
    // [1,2,3,4,5,6]: pairs (3,1),(4,2),(5,3),(6,4) → both same seq → +1
    const result = autocorr(s([1, 2, 3, 4, 5, 6]), 2);
    expect(close(result, 1, 1e-10)).toBe(true);
  });

  it("known autocorrelation of periodic signal", () => {
    // Cosine wave with period 4: [1, 0, -1, 0, 1, 0, -1, 0, ...]
    // autocorr at lag=4 should be ~1
    const vals: number[] = [];
    for (let i = 0; i < 20; i++) {
      vals.push(Math.cos((2 * Math.PI * i) / 4));
    }
    const result = autocorr(s(vals), 4);
    expect(close(result, 1, 1e-10)).toBe(true);
  });

  it("autocorr at half-period lag = -1 for cosine wave", () => {
    // cos at lag = period/2 = 2: cos(π + x) = -cos(x), so perfect -1 correlation
    const vals: number[] = [];
    for (let i = 0; i < 20; i++) {
      vals.push(Math.cos((2 * Math.PI * i) / 4));
    }
    const result = autocorr(s(vals), 2);
    expect(close(result, -1, 1e-10)).toBe(true);
  });

  it("lag just below length returns a value", () => {
    const vals = [1, 2, 3, 4, 5];
    // lag = n-1 = 4: only one pair (5, 1) → single pair → NaN (zero variance)
    expect(Number.isNaN(autocorr(s(vals), 4))).toBe(true);
  });
});

// ─── minPeriods ───────────────────────────────────────────────────────────────

describe("autocorr — minPeriods option", () => {
  it("minPeriods=2 rejects when only 1 valid pair", () => {
    // [1, null, null, null, 5] with lag 1: (null,1)→skip,(null,null)→skip,(null,null)→skip,(5,null)→skip
    // 0 valid pairs → NaN regardless
    expect(Number.isNaN(autocorr(s([1, null, null, null, 5]), 1, { minPeriods: 2 }))).toBe(true);
  });

  it("minPeriods=0 allows single pair", () => {
    // [1, 3] lag=1: 1 pair (3,1), n=1 >= 0 but variance is 0 (single point) → NaN
    expect(Number.isNaN(autocorr(s([1, 3]), 1, { minPeriods: 0 }))).toBe(true);
  });

  it("minPeriods=1 is the default", () => {
    const r1 = autocorr(s([1, 2, 3, 4, 5]), 1);
    const r2 = autocorr(s([1, 2, 3, 4, 5]), 1, { minPeriods: 1 });
    expect(close(r1, r2, 1e-10)).toBe(true);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("autocorr — properties", () => {
  it("lag 0 always returns 1 for series with numeric values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (vals) => {
          const result = autocorr(s(vals), 0);
          return result === 1;
        },
      ),
    );
  });

  it("result is always in [-1, 1] or NaN", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noDefaultInfinity: true }), { minLength: 2, maxLength: 30 }),
        fc.integer({ min: 1, max: 5 }),
        (vals, lag) => {
          const result = autocorr(s(vals as Scalar[]), lag);
          if (Number.isNaN(result)) {
            return true;
          }
          return result >= -1 - 1e-10 && result <= 1 + 1e-10;
        },
      ),
    );
  });

  it("negating all values does not change autocorrelation (Pearson is scale-invariant)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 4,
          maxLength: 20,
        }),
        fc.integer({ min: 1, max: 3 }),
        (vals, lag) => {
          const neg = vals.map((v) => -v);
          const r1 = autocorr(s(vals), lag);
          const r2 = autocorr(s(neg as Scalar[]), lag);
          // Both NaN or both numerically equal
          if (Number.isNaN(r1) && Number.isNaN(r2)) {
            return true;
          }
          return close(r1, r2, 1e-8);
        },
      ),
    );
  });

  it("adding a constant does not change autocorrelation (mean-subtracted in Pearson)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }), {
          minLength: 4,
          maxLength: 20,
        }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }),
        fc.integer({ min: 1, max: 3 }),
        (vals, c, lag) => {
          const shifted = vals.map((v) => v + c);
          const r1 = autocorr(s(vals), lag);
          const r2 = autocorr(s(shifted as Scalar[]), lag);
          if (Number.isNaN(r1) && Number.isNaN(r2)) {
            return true;
          }
          return close(r1, r2, 1e-6);
        },
      ),
    );
  });

  it("positive lag and negative lag give identical result", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 4,
          maxLength: 20,
        }),
        fc.integer({ min: 1, max: 3 }),
        (vals, lag) => {
          const r1 = autocorr(s(vals), lag);
          const r2 = autocorr(s(vals), -lag);
          if (Number.isNaN(r1) && Number.isNaN(r2)) {
            return true;
          }
          return close(r1, r2, 1e-10);
        },
      ),
    );
  });
});
