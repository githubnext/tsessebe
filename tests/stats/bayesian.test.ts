/**
 * Tests for Bayesian inference — Beta-Binomial, Normal-Normal,
 * Gamma-Poisson, and Dirichlet-Categorical conjugate updates.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  betaBinomialUpdate,
  betaCredibleInterval,
  betaMean,
  betaMode,
  betaVariance,
  dirichletCategoricalUpdate,
  dirichletMean,
  gammaMean,
  gammaPoissonUpdate,
  gammaVariance,
  normalCredibleInterval,
  normalNormalUpdate,
} from "../../src/index.ts";

// ─── Beta-Binomial ────────────────────────────────────────────────────────────

describe("betaBinomialUpdate", () => {
  it("uniform prior, 0 successes, 0 trials → unchanged", () => {
    const post = betaBinomialUpdate({ alpha: 1, beta: 1 }, 0, 0);
    expect(post.alpha).toBe(1);
    expect(post.beta).toBe(1);
  });

  it("adds k to alpha and n-k to beta", () => {
    const post = betaBinomialUpdate({ alpha: 2, beta: 3 }, 7, 10);
    expect(post.alpha).toBe(9);
    expect(post.beta).toBe(6);
  });

  it("throws for k > n", () => {
    expect(() => betaBinomialUpdate({ alpha: 1, beta: 1 }, 5, 3)).toThrow(RangeError);
  });

  it("throws for non-positive prior", () => {
    expect(() => betaBinomialUpdate({ alpha: 0, beta: 1 }, 0, 1)).toThrow(RangeError);
  });

  it("property: posterior mean is between prior mean and k/n", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.1, max: 10, noNaN: true }),
        fc.float({ min: 0.1, max: 10, noNaN: true }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (a, b, k, extra) => {
          const n = k + extra;
          const prior = { alpha: a, beta: b };
          const post = betaBinomialUpdate(prior, k, n);
          const priorMean = betaMean(prior);
          const postMean = betaMean(post);
          const dataMean = n > 0 ? k / n : priorMean;
          const lo = Math.min(priorMean, dataMean) - 1e-10;
          const hi = Math.max(priorMean, dataMean) + 1e-10;
          return postMean >= lo && postMean <= hi;
        },
      ),
    );
  });
});

describe("betaMean", () => {
  it("uniform prior has mean 0.5", () => {
    expect(betaMean({ alpha: 1, beta: 1 })).toBeCloseTo(0.5, 10);
  });

  it("beta(2,1) has mean 2/3", () => {
    expect(betaMean({ alpha: 2, beta: 1 })).toBeCloseTo(2 / 3, 10);
  });
});

describe("betaVariance", () => {
  it("beta(1,1) variance is 1/12", () => {
    expect(betaVariance({ alpha: 1, beta: 1 })).toBeCloseTo(1 / 12, 10);
  });
});

describe("betaMode", () => {
  it("returns null when alpha <= 1", () => {
    expect(betaMode({ alpha: 1, beta: 2 })).toBeNull();
  });

  it("beta(2,2) mode is 0.5", () => {
    expect(betaMode({ alpha: 2, beta: 2 })).toBeCloseTo(0.5, 10);
  });
});

describe("betaCredibleInterval", () => {
  it("95% CI covers the mean", () => {
    const p = { alpha: 5, beta: 5 };
    const ci = betaCredibleInterval(p);
    expect(ci.lower).toBeLessThan(betaMean(p));
    expect(ci.upper).toBeGreaterThan(betaMean(p));
    expect(ci.credibility).toBe(0.95);
  });

  it("wider prior → wider CI", () => {
    const narrow = betaCredibleInterval({ alpha: 50, beta: 50 });
    const wide = betaCredibleInterval({ alpha: 1, beta: 1 });
    expect(wide.upper - wide.lower).toBeGreaterThan(narrow.upper - narrow.lower);
  });
});

// ─── Normal-Normal ────────────────────────────────────────────────────────────

describe("normalNormalUpdate", () => {
  it("throws for non-positive variance", () => {
    expect(() => normalNormalUpdate({ mean: 0, variance: 0 }, 1, 10, 1)).toThrow(RangeError);
  });

  it("throws for n < 1", () => {
    expect(() => normalNormalUpdate({ mean: 0, variance: 1 }, 1, 0, 1)).toThrow(RangeError);
  });

  it("posterior mean is between prior mean and data mean", () => {
    const prior = { mean: 0, variance: 10 };
    const post = normalNormalUpdate(prior, 5, 20, 1);
    expect(post.mean).toBeGreaterThan(0);
    expect(post.mean).toBeLessThan(5);
  });

  it("more data pulls posterior closer to data", () => {
    const prior = { mean: 0, variance: 1 };
    const post1 = normalNormalUpdate(prior, 10, 1, 1);
    const post2 = normalNormalUpdate(prior, 10, 100, 1);
    // post2 should be closer to 10
    expect(Math.abs(post2.mean - 10)).toBeLessThan(Math.abs(post1.mean - 10));
  });

  it("posterior variance < prior variance", () => {
    const prior = { mean: 0, variance: 5 };
    const post = normalNormalUpdate(prior, 1, 10, 2);
    expect(post.variance).toBeLessThan(prior.variance);
  });
});

describe("normalCredibleInterval", () => {
  it("95% CI is symmetric around the mean", () => {
    const p = { mean: 3, variance: 1 };
    const ci = normalCredibleInterval(p);
    const halfWidth1 = p.mean - ci.lower;
    const halfWidth2 = ci.upper - p.mean;
    expect(halfWidth1).toBeCloseTo(halfWidth2, 8);
  });
});

// ─── Gamma-Poisson ────────────────────────────────────────────────────────────

describe("gammaPoissonUpdate", () => {
  it("posterior alpha = prior alpha + k", () => {
    const post = gammaPoissonUpdate({ alpha: 2, beta: 1 }, 5);
    expect(post.alpha).toBe(7);
    expect(post.beta).toBe(2);
  });

  it("throws for non-positive parameters", () => {
    expect(() => gammaPoissonUpdate({ alpha: 0, beta: 1 }, 0)).toThrow(RangeError);
    expect(() => gammaPoissonUpdate({ alpha: 1, beta: 1 }, -1)).toThrow(RangeError);
  });

  it("gammaMean is alpha/beta", () => {
    expect(gammaMean({ alpha: 4, beta: 2 })).toBeCloseTo(2, 10);
  });

  it("gammaVariance is alpha/beta^2", () => {
    expect(gammaVariance({ alpha: 4, beta: 2 })).toBeCloseTo(1, 10);
  });
});

// ─── Dirichlet-Categorical ────────────────────────────────────────────────────

describe("dirichletCategoricalUpdate", () => {
  it("uniform prior + counts = expected posterior", () => {
    const prior = { alpha: [1, 1, 1] };
    const post = dirichletCategoricalUpdate(prior, [3, 5, 2]);
    expect(post.alpha).toEqual([4, 6, 3]);
  });

  it("throws for length mismatch", () => {
    expect(() => dirichletCategoricalUpdate({ alpha: [1, 1] }, [1, 2, 3])).toThrow(RangeError);
  });

  it("throws for negative counts", () => {
    expect(() => dirichletCategoricalUpdate({ alpha: [1, 1] }, [1, -1])).toThrow(RangeError);
  });

  it("dirichletMean sums to 1", () => {
    const post = dirichletCategoricalUpdate({ alpha: [1, 2, 3] }, [4, 0, 2]);
    const means = dirichletMean(post);
    const sum = means.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("property: posterior alphas >= prior alphas", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0.1, max: 10, noNaN: true }), { minLength: 2, maxLength: 6 }),
        fc.array(fc.integer({ min: 0, max: 20 }), { minLength: 2, maxLength: 2 }),
        (alphaInit, countsShort) => {
          const k = alphaInit.length;
          const counts = Array.from(
            { length: k },
            (_, i) => countsShort[i % countsShort.length] ?? 0,
          );
          const post = dirichletCategoricalUpdate({ alpha: alphaInit }, counts);
          return post.alpha.every((a, i) => a >= (alphaInit[i] ?? 0) - 1e-10);
        },
      ),
    );
  });
});
