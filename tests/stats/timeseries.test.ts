/**
 * Tests for time series analysis — ACF, PACF, ARMA, Ljung-Box.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { acf, fitArma, ljungBox, pacf } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeAR1(n: number, phi: number, seed = 0): number[] {
  const xs: number[] = [seed];
  for (let i = 1; i < n; i++) {
    xs.push(phi * (xs[i - 1] ?? 0) + Math.sin(i * 1.618) * 0.1);
  }
  return xs;
}

// ─── acf ─────────────────────────────────────────────────────────────────────

describe("acf", () => {
  it("throws for series with fewer than 2 values", () => {
    expect(() => acf([1])).toThrow(RangeError);
  });

  it("lag-0 autocorrelation is 1", () => {
    const result = acf([1, 2, 3, 4, 5], 3);
    expect(result.values[0]).toBeCloseTo(1, 10);
    expect(result.lags[0]).toBe(0);
  });

  it("constant series: acf is undefined (returns 1 at lag 0, 0 elsewhere)", () => {
    const result = acf([5, 5, 5, 5, 5], 2);
    expect(result.values[0]).toBe(1);
    expect(result.values[1]).toBe(0);
  });

  it("returns nlags + 1 values", () => {
    const result = acf([1, 2, 3, 4, 5, 6, 7, 8], 4);
    expect(result.values).toHaveLength(5);
    expect(result.lags).toHaveLength(5);
    expect(result.confInt).toHaveLength(5);
  });

  it("AR(1) with phi=0.8 has large lag-1 ACF", () => {
    const xs = makeAR1(200, 0.8);
    const result = acf(xs, 5);
    // lag-1 ACF should be near 0.8
    expect(result.values[1]).toBeGreaterThan(0.5);
  });

  it("autocorrelations are in [-1, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -10, max: 10, noNaN: true }), { minLength: 10, maxLength: 50 }),
        (xs) => {
          const result = acf(xs, 3);
          return result.values.every((v) => v >= -1 - 1e-10 && v <= 1 + 1e-10);
        },
      ),
    );
  });
});

// ─── pacf ─────────────────────────────────────────────────────────────────────

describe("pacf", () => {
  it("throws for series with fewer than 2 values", () => {
    expect(() => pacf([1])).toThrow(RangeError);
  });

  it("lag-0 PACF is 1", () => {
    const result = pacf([1, 2, 3, 4, 5], 2);
    expect(result.values[0]).toBeCloseTo(1, 10);
  });

  it("returns nlags + 1 values", () => {
    const result = pacf([1, 2, 3, 4, 5, 6, 7, 8], 3);
    expect(result.values).toHaveLength(4);
  });

  it("AR(1): PACF cuts off after lag 1", () => {
    const xs = makeAR1(300, 0.7);
    const result = pacf(xs, 4);
    // PACF at lag 1 should be large (close to 0.7)
    expect(Math.abs(result.values[1] ?? 0)).toBeGreaterThan(0.4);
    // PACF at lag 2+ should be near zero (smaller than lag 1)
    expect(Math.abs(result.values[2] ?? 0)).toBeLessThan(Math.abs(result.values[1] ?? 1));
  });
});

// ─── fitArma ─────────────────────────────────────────────────────────────────

describe("fitArma", () => {
  it("throws if too few observations", () => {
    expect(() => fitArma([1, 2], 3, 0)).toThrow(RangeError);
  });

  it("AR(0) returns empty arCoefs and zero noiseVar for constant series", () => {
    const xs = [3, 3, 3, 3, 3];
    const result = fitArma(xs, 0, 0);
    expect(result.arCoefs).toHaveLength(0);
    expect(result.maCoefs).toHaveLength(0);
    expect(result.noiseVar).toBeCloseTo(0, 8);
  });

  it("AR(1) coef is near phi for simple AR(1) process", () => {
    const xs = makeAR1(500, 0.8);
    const result = fitArma(xs, 1, 0);
    expect(result.arCoefs[0]).toBeGreaterThan(0.5);
    expect(result.arCoefs[0]).toBeLessThan(0.99);
  });

  it("MA stub: maCoefs all zero for q > 0", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = fitArma(xs, 1, 2);
    expect(result.maCoefs).toHaveLength(2);
    expect(result.maCoefs.every((v) => v === 0)).toBe(true);
  });

  it("noiseVar is non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -5, max: 5, noNaN: true }), { minLength: 5, maxLength: 30 }),
        (xs) => {
          const result = fitArma(xs, 1, 0);
          return result.noiseVar >= 0;
        },
      ),
    );
  });
});

// ─── ljungBox ─────────────────────────────────────────────────────────────────

describe("ljungBox", () => {
  it("throws if too few observations", () => {
    expect(() => ljungBox([1, 2, 3], 5)).toThrow(RangeError);
  });

  it("white noise has large p-value", () => {
    // Deterministic sequence with low autocorrelation
    const xs = Array.from({ length: 50 }, (_, i) => (Math.sin(i * Math.E) > 0 ? 1 : -1));
    const result = ljungBox(xs, 5);
    expect(result.statistic).toBeGreaterThanOrEqual(0);
    expect(result.df).toBe(5);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });

  it("highly autocorrelated series has small p-value", () => {
    const xs = makeAR1(100, 0.95);
    const result = ljungBox(xs, 5);
    expect(result.pValue).toBeLessThan(0.05);
  });
});
