/**
 * Tests for hypothesis testing functions.
 */
import { describe, expect, it } from "bun:test";
import { chi2test, kstest, ttest1samp, ttestInd, ttestRel, ztest } from "../../src/index.ts";

describe("ttest1samp", () => {
  it("returns near-zero t for mean matching popmean", () => {
    const result = ttest1samp([1, 2, 3, 4, 5], 3);
    expect(Math.abs(result.statistic)).toBeLessThan(1e-10);
    expect(result.pValue).toBeGreaterThan(0.9);
  });

  it("returns significant result for clear deviation", () => {
    const result = ttest1samp([100, 101, 102, 103, 104], 0);
    expect(Math.abs(result.statistic)).toBeGreaterThan(100);
    expect(result.pValue).toBeLessThan(0.001);
  });

  it("df equals n - 1", () => {
    const result = ttest1samp([1, 2, 3, 4, 5], 3);
    expect(result.df).toBe(4);
  });

  it("throws for fewer than 2 observations", () => {
    expect(() => ttest1samp([1], 0)).toThrow();
  });
});

describe("ttestInd", () => {
  it("detects difference between groups", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [10, 11, 12, 13, 14];
    const result = ttestInd(a, b);
    expect(result.pValue).toBeLessThan(0.001);
    expect(result.statistic).toBeLessThan(0); // group A < group B
  });

  it("no difference for equal groups", () => {
    const result = ttestInd([1, 2, 3], [1, 2, 3]);
    expect(Math.abs(result.statistic)).toBeLessThan(1e-10);
  });

  it("throws for fewer than 2 per group", () => {
    expect(() => ttestInd([1], [2, 3])).toThrow();
  });
});

describe("ttestRel", () => {
  it("throws for unequal length arrays", () => {
    expect(() => ttestRel([1, 2], [1, 2, 3])).toThrow();
  });

  it("zero statistic for identical arrays", () => {
    const result = ttestRel([1, 2, 3], [1, 2, 3]);
    expect(result.statistic).toBe(0);
    expect(result.pValue).toBe(1);
  });

  it("detects paired difference", () => {
    const before = [5, 7, 9, 11, 13];
    const after = [8, 10, 12, 14, 16];
    const result = ttestRel(before, after);
    expect(result.pValue).toBeLessThan(0.001);
  });
});

describe("chi2test", () => {
  it("equal observed = expected gives low statistic", () => {
    const result = chi2test([20, 20, 20], [20, 20, 20]);
    expect(result.statistic).toBeCloseTo(0, 5);
    expect(result.pValue).toBeGreaterThan(0.9);
  });

  it("large deviation gives small p-value", () => {
    const result = chi2test([100, 0, 0], [33, 33, 34]);
    expect(result.pValue).toBeLessThan(0.001);
  });

  it("df equals k - 1", () => {
    const result = chi2test([10, 20, 30]);
    expect(result.df).toBe(2);
  });

  it("throws for fewer than 2 categories", () => {
    expect(() => chi2test([10])).toThrow();
  });
});

describe("kstest", () => {
  it("uniform sample yields high p-value", () => {
    // Generate 100 uniform [0,1] values
    const n = 100;
    const sample: number[] = [];
    for (let i = 0; i < n; i++) {
      sample.push((i + 0.5) / n);
    }
    const result = kstest(sample);
    expect(result.pValue).toBeGreaterThan(0.1);
  });

  it("non-uniform sample yields low p-value", () => {
    // All values near 0 — clearly not uniform
    const sample = new Array(50).fill(0.01) as number[];
    const result = kstest(sample);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it("throws for empty sample", () => {
    expect(() => kstest([])).toThrow();
  });
});

describe("ztest", () => {
  it("mean equals popmean gives high p-value", () => {
    const result = ztest([1, 2, 3, 4, 5], 3, 1.58);
    expect(result.pValue).toBeGreaterThan(0.5);
  });

  it("large deviation gives low p-value", () => {
    const result = ztest([100, 101, 102], 0, 1);
    expect(result.pValue).toBeLessThan(0.001);
  });

  it("throws for non-positive popstd", () => {
    expect(() => ztest([1, 2, 3], 2, 0)).toThrow();
  });

  it("df is Infinity", () => {
    const result = ztest([1, 2, 3], 2, 1);
    expect(result.df).toBe(Number.POSITIVE_INFINITY);
  });
});
