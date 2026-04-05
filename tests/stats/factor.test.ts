/**
 * Tests for PCA and factor analysis.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { factorAnalysis, pca } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeData(): number[][] {
  // 4 samples, 3 features: [x, y, z] where z ≈ x+y
  return [
    [1, 2, 3],
    [3, 4, 7],
    [5, 6, 11],
    [7, 8, 15],
  ];
}

// ─── pca ─────────────────────────────────────────────────────────────────────

describe("pca", () => {
  it("throws on empty data", () => {
    expect(() => pca([], 1)).toThrow(RangeError);
  });

  it("throws if nComponents > nFeatures", () => {
    expect(() =>
      pca(
        [
          [1, 2],
          [3, 4],
        ],
        3,
      ),
    ).toThrow(RangeError);
  });

  it("returns correct shapes", () => {
    const X = makeData();
    const result = pca(X, 2);
    expect(result.components).toHaveLength(2);
    expect(result.components[0]).toHaveLength(3);
    expect(result.explainedVariance).toHaveLength(2);
    expect(result.explainedVarianceRatio).toHaveLength(2);
    expect(result.transformed).toHaveLength(4);
    expect(result.transformed[0]).toHaveLength(2);
    expect(result.mean).toHaveLength(3);
  });

  it("explainedVarianceRatio sums to at most 1", () => {
    const X = makeData();
    const result = pca(X, 2);
    const sum = result.explainedVarianceRatio.reduce((a, b) => a + b, 0);
    expect(sum).toBeLessThanOrEqual(1 + 1e-6);
    expect(sum).toBeGreaterThan(0);
  });

  it("first component explains most variance (highly correlated data)", () => {
    const X = makeData(); // z = x+y, highly correlated
    const result = pca(X, 2);
    // First component should dominate
    expect(result.explainedVarianceRatio[0]).toBeGreaterThan(0.8);
  });

  it("components are (approximately) unit vectors", () => {
    const X = makeData();
    const result = pca(X, 2);
    for (const comp of result.components) {
      const norm2 = comp.reduce((s, v) => s + v * v, 0);
      expect(Math.sqrt(norm2)).toBeCloseTo(1, 5);
    }
  });

  it("1 component for 1D data returns explained ratio near 1", () => {
    const X = [[1], [2], [3], [4], [5]];
    const result = pca(X, 1);
    expect(result.explainedVarianceRatio[0]).toBeCloseTo(1, 5);
  });

  it("center=false preserves data mean in projections", () => {
    const X = [
      [10, 20],
      [30, 40],
      [50, 60],
    ];
    // Should not throw with center=false
    const result = pca(X, 1, { center: false });
    expect(result.components).toHaveLength(1);
  });

  it("property: all explained variance ratios are in [0, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(fc.float({ min: -10, max: 10, noNaN: true }), { minLength: 2, maxLength: 4 }),
          { minLength: 4, maxLength: 8 },
        ),
        (X) => {
          const result = pca(X, 1);
          return result.explainedVarianceRatio.every((r) => r >= -1e-10 && r <= 1 + 1e-10);
        },
      ),
    );
  });
});

// ─── factorAnalysis ───────────────────────────────────────────────────────────

describe("factorAnalysis", () => {
  it("throws on empty features", () => {
    expect(() => factorAnalysis([[], []], 1)).toThrow(RangeError);
  });

  it("returns correct shapes", () => {
    const X = makeData();
    const result = factorAnalysis(X, 2);
    // loadings: nFeatures × nFactors
    expect(result.loadings).toHaveLength(3);
    expect(result.loadings[0]).toHaveLength(2);
    expect(result.communalities).toHaveLength(3);
    expect(result.uniquenesses).toHaveLength(3);
  });

  it("communality + uniqueness = 1", () => {
    const X = makeData();
    const result = factorAnalysis(X, 1);
    for (let i = 0; i < result.communalities.length; i++) {
      const sum = (result.communalities[i] ?? 0) + (result.uniquenesses[i] ?? 0);
      expect(sum).toBeCloseTo(1, 8);
    }
  });

  it("uniquenesses are all non-negative", () => {
    const X = makeData();
    const result = factorAnalysis(X, 2);
    for (const u of result.uniquenesses) {
      expect(u).toBeGreaterThanOrEqual(-1e-10);
    }
  });
});
