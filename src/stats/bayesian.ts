/**
 * Simple Bayesian inference — conjugate priors.
 *
 * Provides closed-form posterior updates for the most common conjugate
 * prior–likelihood pairs, mirroring `scipy.stats` and `pymc` usage patterns.
 *
 * Supported models:
 * - **Beta-Binomial**: prior `Beta(α, β)` + Binomial likelihood → posterior `Beta`.
 * - **Normal-Normal**: known variance, prior `N(μ₀, σ₀²)` + N(θ, σ²) observations.
 * - **Gamma-Poisson**: prior `Gamma(α, β)` + Poisson likelihood → posterior `Gamma`.
 * - **Dirichlet-Categorical**: prior `Dir(α)` + categorical counts → posterior `Dir`.
 *
 * @example
 * ```ts
 * import { betaBinomialUpdate, betaMean, betaCredibleInterval } from "tsb";
 *
 * const posterior = betaBinomialUpdate({ alpha: 1, beta: 1 }, 7, 10);
 * // posterior: { alpha: 8, beta: 4 }
 * console.log(betaMean(posterior)); // 8/12 ≈ 0.667
 * ```
 *
 * @module
 */

// ─── types ────────────────────────────────────────────────────────────────────

/** Parameters of a Beta distribution. */
export interface BetaParams {
  /** Shape parameter α > 0. */
  readonly alpha: number;
  /** Shape parameter β > 0. */
  readonly beta: number;
}

/** Parameters of a Normal distribution. */
export interface NormalParams {
  /** Mean μ. */
  readonly mean: number;
  /** Variance σ² > 0. */
  readonly variance: number;
}

/** Parameters of a Gamma distribution (shape-rate parameterisation). */
export interface GammaParams {
  /** Shape parameter α > 0. */
  readonly alpha: number;
  /** Rate parameter β > 0. */
  readonly beta: number;
}

/** Parameters of a Dirichlet distribution. */
export interface DirichletParams {
  /** Concentration parameters α_k > 0 for each category. */
  readonly alpha: readonly number[];
}

/** A credible interval [lower, upper]. */
export interface CredibleInterval {
  /** Lower bound. */
  readonly lower: number;
  /** Upper bound. */
  readonly upper: number;
  /** Credibility level, e.g. 0.95 for a 95 % CI. */
  readonly credibility: number;
}

// ─── math helpers ─────────────────────────────────────────────────────────────

/** Log-gamma via Lanczos approximation. */
function lnGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  const zz = z - 1;
  let x = c[0] ?? 0;
  for (let i = 1; i < g + 2; i++) {
    x += (c[i] ?? 0) / (zz + i);
  }
  const t = zz + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Regularised incomplete beta via continued fraction (Lentz). */
function betaIncCF(a: number, b: number, x: number): number {
  const maxIter = 200;
  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;

  let f = 1e-30;
  let c = f;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < 1e-30) {
    d = 1e-30;
  }
  d = 1 / d;
  f = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    // even step
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) {
      d = 1e-30;
    }
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) {
      c = 1e-30;
    }
    d = 1 / d;
    f *= d * c;
    // odd step
    aa = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) {
      d = 1e-30;
    }
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) {
      c = 1e-30;
    }
    d = 1 / d;
    const del = d * c;
    f *= del;
    if (Math.abs(del - 1) < 1e-10) {
      break;
    }
  }
  return front * f;
}

/** Regularised incomplete beta Iₓ(a, b). */
function betaInc(a: number, b: number, x: number): number {
  if (x <= 0) {
    return 0;
  }
  if (x >= 1) {
    return 1;
  }
  if (x < (a + 1) / (a + b + 2)) {
    return betaIncCF(a, b, x);
  }
  return 1 - betaIncCF(b, a, 1 - x);
}

/** Inverse regularised incomplete beta via bisection. */
function betaIncInv(a: number, b: number, p: number): number {
  if (p <= 0) {
    return 0;
  }
  if (p >= 1) {
    return 1;
  }
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (betaInc(a, b, mid) < p) {
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < 1e-12) {
      break;
    }
  }
  return (lo + hi) / 2;
}

/** Normal inverse CDF (quantile) via rational approximation. */
function normalQuantile(p: number): number {
  if (p <= 0) {
    return Number.NEGATIVE_INFINITY;
  }
  if (p >= 1) {
    return Number.POSITIVE_INFINITY;
  }
  // Rational approximation — Abramowitz & Stegun 26.2.17
  const A = [2.515517, 0.802853, 0.010328];
  const B = [1.432788, 0.189269, 0.001308];
  const q = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(q));
  const num = (A[2] ?? 0) * t * t + (A[1] ?? 0) * t + (A[0] ?? 0);
  const den = ((B[2] ?? 0) * t * t + (B[1] ?? 0)) * t + (B[0] ?? 0) * t + 1;
  const x = t - num / den;
  return p < 0.5 ? -x : x;
}

// ─── Beta-Binomial ────────────────────────────────────────────────────────────

/**
 * Bayesian update for a Beta-Binomial model.
 *
 * Given prior `Beta(α, β)` and `k` successes in `n` Bernoulli trials,
 * returns the posterior `Beta(α + k, β + n − k)`.
 *
 * @param prior - Prior Beta distribution parameters.
 * @param k     - Number of observed successes.
 * @param n     - Total number of trials.
 * @returns Posterior Beta distribution parameters.
 * @throws {RangeError} If `k > n` or parameters are non-positive.
 */
export function betaBinomialUpdate(prior: BetaParams, k: number, n: number): BetaParams {
  if (prior.alpha <= 0 || prior.beta <= 0) {
    throw new RangeError("Prior parameters must be > 0");
  }
  if (k < 0 || n < 0 || k > n) {
    throw new RangeError("Require 0 ≤ k ≤ n");
  }
  return { alpha: prior.alpha + k, beta: prior.beta + n - k };
}

/** Mean of a Beta(α, β) distribution. */
export function betaMean(p: BetaParams): number {
  return p.alpha / (p.alpha + p.beta);
}

/** Variance of a Beta(α, β) distribution. */
export function betaVariance(p: BetaParams): number {
  const s = p.alpha + p.beta;
  return (p.alpha * p.beta) / (s * s * (s + 1));
}

/** Mode of a Beta(α, β) distribution (requires α, β > 1). */
export function betaMode(p: BetaParams): number | null {
  if (p.alpha <= 1 || p.beta <= 1) {
    return null;
  }
  return (p.alpha - 1) / (p.alpha + p.beta - 2);
}

/**
 * Equal-tailed credible interval for a Beta distribution.
 *
 * @param p           - Beta distribution parameters.
 * @param credibility - Coverage level in (0, 1), default 0.95.
 * @returns `{ lower, upper, credibility }`.
 */
export function betaCredibleInterval(p: BetaParams, credibility = 0.95): CredibleInterval {
  const tail = (1 - credibility) / 2;
  return {
    lower: betaIncInv(p.alpha, p.beta, tail),
    upper: betaIncInv(p.alpha, p.beta, 1 - tail),
    credibility,
  };
}

// ─── Normal-Normal ────────────────────────────────────────────────────────────

/**
 * Bayesian update for a Normal-Normal model (known likelihood variance).
 *
 * Prior: `N(μ₀, σ₀²)`. Likelihood: `N(θ, σ²)` for `n` i.i.d. observations
 * with sample mean `xbar`.
 *
 * @param prior          - Prior Normal parameters `{ mean: μ₀, variance: σ₀² }`.
 * @param xbar           - Sample mean of observations.
 * @param n              - Number of observations.
 * @param likeVariance   - Known variance σ² of the likelihood.
 * @returns Posterior Normal parameters.
 * @throws {RangeError} If variances are non-positive or `n < 1`.
 */
export function normalNormalUpdate(
  prior: NormalParams,
  xbar: number,
  n: number,
  likeVariance: number,
): NormalParams {
  if (prior.variance <= 0 || likeVariance <= 0) {
    throw new RangeError("Variances must be positive");
  }
  if (n < 1) {
    throw new RangeError("n must be at least 1");
  }
  const precPrior = 1 / prior.variance;
  const precLike = n / likeVariance;
  const precPost = precPrior + precLike;
  const meanPost = (precPrior * prior.mean + precLike * xbar) / precPost;
  return { mean: meanPost, variance: 1 / precPost };
}

/**
 * Equal-tailed credible interval for a Normal distribution.
 *
 * @param p           - Normal distribution parameters.
 * @param credibility - Coverage level in (0, 1), default 0.95.
 * @returns `{ lower, upper, credibility }`.
 */
export function normalCredibleInterval(p: NormalParams, credibility = 0.95): CredibleInterval {
  const tail = (1 - credibility) / 2;
  const sd = Math.sqrt(p.variance);
  return {
    lower: p.mean + normalQuantile(tail) * sd,
    upper: p.mean + normalQuantile(1 - tail) * sd,
    credibility,
  };
}

// ─── Gamma-Poisson ────────────────────────────────────────────────────────────

/**
 * Bayesian update for a Gamma-Poisson model.
 *
 * Prior: `Gamma(α, β)` (shape-rate). Likelihood: Poisson(λ) with `k` events
 * observed over exposure `t`.
 *
 * @param prior    - Prior Gamma parameters.
 * @param k        - Total observed count.
 * @param exposure - Total exposure (time, area, etc.). Default 1.
 * @returns Posterior Gamma parameters.
 * @throws {RangeError} If parameters are non-positive or `k < 0`.
 */
export function gammaPoissonUpdate(prior: GammaParams, k: number, exposure = 1): GammaParams {
  if (prior.alpha <= 0 || prior.beta <= 0) {
    throw new RangeError("Prior parameters must be > 0");
  }
  if (k < 0) {
    throw new RangeError("Count k must be ≥ 0");
  }
  if (exposure <= 0) {
    throw new RangeError("Exposure must be positive");
  }
  return { alpha: prior.alpha + k, beta: prior.beta + exposure };
}

/** Mean of a Gamma(α, β) distribution (shape-rate). */
export function gammaMean(p: GammaParams): number {
  return p.alpha / p.beta;
}

/** Variance of a Gamma(α, β) distribution. */
export function gammaVariance(p: GammaParams): number {
  return p.alpha / (p.beta * p.beta);
}

// ─── Dirichlet-Categorical ────────────────────────────────────────────────────

/**
 * Bayesian update for a Dirichlet-Categorical model.
 *
 * Prior: `Dirichlet(α)`. Likelihood: categorical counts `counts[k]`.
 * Posterior: `Dirichlet(α[k] + counts[k])`.
 *
 * @param prior  - Prior Dirichlet parameters.
 * @param counts - Observed counts for each category.
 * @returns Posterior Dirichlet parameters.
 * @throws {RangeError} If array lengths mismatch or any count is negative.
 */
export function dirichletCategoricalUpdate(
  prior: DirichletParams,
  counts: readonly number[],
): DirichletParams {
  if (prior.alpha.length !== counts.length) {
    throw new RangeError("prior.alpha and counts must have the same length");
  }
  for (const c of counts) {
    if (c < 0) {
      throw new RangeError("Counts must be non-negative");
    }
  }
  return {
    alpha: prior.alpha.map((a, i) => a + (counts[i] ?? 0)),
  };
}

/** Mean (expected category probabilities) of a Dirichlet distribution. */
export function dirichletMean(p: DirichletParams): number[] {
  const sum = p.alpha.reduce((a, b) => a + b, 0);
  return p.alpha.map((a) => a / sum);
}
