/**
 * Hypothesis testing — basic statistical tests.
 *
 * Mirrors key functions from `scipy.stats` that pandas users typically combine
 * with Series/DataFrame data:
 *
 * - `ttest1samp`  — one-sample t-test
 * - `ttestInd`    — independent-samples t-test (Welch's)
 * - `ttestRel`    — paired t-test
 * - `chi2test`    — chi-squared goodness-of-fit
 * - `kstest`      — Kolmogorov-Smirnov test against a uniform CDF
 * - `ztest`       — one-sample z-test (known population variance)
 *
 * @example
 * ```ts
 * const { statistic, pValue } = ttest1samp([2, 3, 5, 7, 11], 4);
 * console.log(pValue); // > 0.05 → fail to reject H0
 * ```
 */

// ─── result type ──────────────────────────────────────────────────────────────

/** Result of a hypothesis test. */
export interface TestResult {
  /** Test statistic. */
  statistic: number;
  /** Two-tailed p-value. */
  pValue: number;
  /** Degrees of freedom (may be non-integer for Welch's). */
  df: number;
}

// ─── one-sample t-test ────────────────────────────────────────────────────────

/**
 * One-sample t-test: tests whether the population mean equals `popmean`.
 *
 * H₀: μ = popmean
 *
 * @example
 * ```ts
 * ttest1samp([1, 2, 3, 4, 5], 3); // t ≈ 0, p ≈ 1
 * ```
 */
export function ttest1samp(sample: readonly number[], popmean: number): TestResult {
  const n = sample.length;
  if (n < 2) {
    throw new Error("ttest1samp requires at least 2 observations");
  }
  const mean = sampleMean(sample);
  const sd = sampleStd(sample, mean);
  const df = n - 1;
  if (sd === 0) {
    // Degenerate case: all values equal
    const t = mean === popmean ? 0 : Number.POSITIVE_INFINITY;
    return { statistic: t, pValue: t === 0 ? 1 : 0, df };
  }
  const se = sd / Math.sqrt(n);
  const t = (mean - popmean) / se;
  const p = twoTailP(t, df);
  return { statistic: t, pValue: p, df };
}

// ─── independent two-sample t-test (Welch's) ─────────────────────────────────

/**
 * Independent-samples t-test (Welch's) for two groups with potentially
 * unequal variances.
 *
 * H₀: μ₁ = μ₂
 *
 * @example
 * ```ts
 * ttestInd([1, 2, 3], [4, 5, 6]); // t ≈ -3.67, p ≈ 0.01
 * ```
 */
export function ttestInd(a: readonly number[], b: readonly number[]): TestResult {
  if (a.length < 2 || b.length < 2) {
    throw new Error("ttestInd requires at least 2 observations per group");
  }
  const n1 = a.length;
  const n2 = b.length;
  const m1 = sampleMean(a);
  const m2 = sampleMean(b);
  const v1 = sampleVar(a, m1);
  const v2 = sampleVar(b, m2);
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = (m1 - m2) / se;
  // Welch-Satterthwaite degrees of freedom
  const num = (v1 / n1 + v2 / n2) ** 2;
  const den = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1);
  const df = num / den;
  const p = twoTailP(t, df);
  return { statistic: t, pValue: p, df };
}

// ─── paired t-test ────────────────────────────────────────────────────────────

/**
 * Paired (dependent) t-test: compares differences within matched pairs.
 *
 * H₀: μ_diff = 0
 */
export function ttestRel(a: readonly number[], b: readonly number[]): TestResult {
  if (a.length !== b.length) {
    throw new Error("ttestRel requires equal-length arrays");
  }
  const diffs: number[] = a.map((v, i) => v - (b[i] ?? 0));
  return ttest1samp(diffs, 0);
}

// ─── chi-squared test ─────────────────────────────────────────────────────────

/**
 * Chi-squared goodness-of-fit test.
 *
 * H₀: observed counts follow the expected distribution.
 *
 * @param observed  Observed frequencies (non-negative integers).
 * @param expected  Expected frequencies (defaults to equal proportions).
 *
 * @example
 * ```ts
 * chi2test([10, 20, 30], [20, 20, 20]); // some statistic and p-value
 * ```
 */
export function chi2test(observed: readonly number[], expected?: readonly number[]): TestResult {
  const n = observed.length;
  if (n < 2) {
    throw new Error("chi2test requires at least 2 categories");
  }
  const totalObs = observed.reduce((a, b) => a + b, 0);
  const exp = expected ?? observed.map(() => totalObs / n);
  if (exp.length !== n) {
    throw new Error("observed and expected must have the same length");
  }
  let stat = 0;
  for (let i = 0; i < n; i++) {
    const e = exp[i] ?? 0;
    const o = observed[i] ?? 0;
    if (e <= 0) {
      throw new Error("Expected frequencies must be positive");
    }
    stat += (o - e) ** 2 / e;
  }
  const df = n - 1;
  const p = chi2SurvivalFunction(stat, df);
  return { statistic: stat, pValue: p, df };
}

// ─── Kolmogorov-Smirnov test ──────────────────────────────────────────────────

/**
 * One-sample Kolmogorov-Smirnov test against the uniform [0, 1] CDF.
 *
 * H₀: sample comes from the Uniform(0, 1) distribution.
 */
export function kstest(sample: readonly number[]): TestResult {
  const n = sample.length;
  if (n < 1) {
    throw new Error("kstest requires at least 1 observation");
  }
  const sorted = [...sample].sort((a, b) => a - b);
  let dPlus = 0;
  let dMinus = 0;
  for (let i = 0; i < n; i++) {
    const x = sorted[i] ?? 0;
    const empUpper = (i + 1) / n;
    const empLower = i / n;
    dPlus = Math.max(dPlus, empUpper - x);
    dMinus = Math.max(dMinus, x - empLower);
  }
  const d = Math.max(dPlus, dMinus);
  const p = ksSurvivalFunction(d, n);
  return { statistic: d, pValue: p, df: n };
}

// ─── z-test ───────────────────────────────────────────────────────────────────

/**
 * One-sample z-test with known population standard deviation.
 *
 * H₀: μ = popmean
 *
 * @param sample   Observations.
 * @param popmean  Null-hypothesis mean.
 * @param popstd   Known population standard deviation.
 */
export function ztest(sample: readonly number[], popmean: number, popstd: number): TestResult {
  if (popstd <= 0) {
    throw new Error("popstd must be positive");
  }
  const n = sample.length;
  if (n < 1) {
    throw new Error("ztest requires at least 1 observation");
  }
  const mean = sampleMean(sample);
  const se = popstd / Math.sqrt(n);
  const z = (mean - popmean) / se;
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  return { statistic: z, pValue: p, df: Number.POSITIVE_INFINITY };
}

// ─── distribution helpers ─────────────────────────────────────────────────────

/** Sample mean. */
function sampleMean(xs: readonly number[]): number {
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

/** Sample variance (Bessel-corrected). */
function sampleVar(xs: readonly number[], mean: number): number {
  const s = xs.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  return s / (xs.length - 1);
}

/** Sample standard deviation (Bessel-corrected). */
function sampleStd(xs: readonly number[], mean: number): number {
  return Math.sqrt(sampleVar(xs, mean));
}

/** Normal CDF via Abramowitz & Stegun rational approximation. */
function normalCDF(z: number): number {
  if (z < 0) {
    return 1 - normalCDF(-z);
  }
  const t = 1 / (1 + 0.2316419 * z);
  const poly =
    t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
}

/** Two-tailed p-value from t-distribution with df degrees of freedom. */
function twoTailP(t: number, df: number): number {
  const x = df / (df + t * t);
  const ib = incompleteBeta(df / 2, 0.5, x);
  return Math.min(1, ib);
}

/**
 * Chi-squared survival function (p-value for upper tail).
 * Approximated via the incomplete gamma function.
 */
function chi2SurvivalFunction(x: number, df: number): number {
  if (x <= 0) {
    return 1;
  }
  return upperIncompleteGamma(df / 2, x / 2) / gamma(df / 2);
}

/** Kolmogorov-Smirnov survival function (Marsaglia approximation). */
function ksSurvivalFunction(d: number, n: number): number {
  const z = d * Math.sqrt(n);
  if (z < 0.27) {
    return 1;
  }
  if (z > 3.1) {
    return 0;
  }
  let sum = 0;
  for (let k = 1; k <= 100; k++) {
    sum += Math.exp(-2 * k * k * z * z) * (k % 2 === 0 ? -1 : 1);
  }
  return Math.max(0, Math.min(1, 2 * sum));
}

/** Lanczos approximation for Γ(z). */
function gamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  const zz = z - 1;
  let x = c[0] ?? 0;
  for (let i = 1; i < g + 2; i++) {
    x += (c[i] ?? 0) / (zz + i);
  }
  const t = zz + g + 0.5;
  return Math.sqrt(2 * Math.PI) * t ** (zz + 0.5) * Math.exp(-t) * x;
}

/** Upper incomplete gamma Γ(a, x) via continued fraction (Lentz). */
function upperIncompleteGamma(a: number, x: number): number {
  if (x < 0) {
    return gamma(a);
  }
  if (x < a + 1) {
    return gamma(a) - lowerIncompleteGammaSeries(a, x);
  }
  return upperIncompleteGammaCF(a, x);
}

function lowerIncompleteGammaSeries(a: number, x: number): number {
  let term = 1 / a;
  let sum = term;
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-12 * Math.abs(sum)) {
      break;
    }
  }
  return Math.exp(-x + a * Math.log(x) - Math.log(gamma(a))) * sum;
}

function upperIncompleteGammaCF(a: number, x: number): number {
  const maxIter = 200;
  let f = 1e-30;
  let c = f;
  let d = 1 - (a - 1) / x;
  if (Math.abs(d) < 1e-30) {
    d = 1e-30;
  }
  d = 1 / d;
  f = d;
  for (let i = 1; i <= maxIter; i++) {
    const an = (i * (a - i)) / ((x + 2 * i - a - 1) * (x + 2 * i - a + 1));
    d = 1 + an * d;
    if (Math.abs(d) < 1e-30) {
      d = 1e-30;
    }
    c = 1 + an / c;
    if (Math.abs(c) < 1e-30) {
      c = 1e-30;
    }
    d = 1 / d;
    f *= d * c;
    if (Math.abs(d * c - 1) < 1e-12) {
      break;
    }
  }
  return Math.exp(-x + a * Math.log(x)) * f;
}

/** Regularized incomplete Beta function I_x(a,b). */
function incompleteBeta(a: number, b: number, x: number): number {
  if (x < 0 || x > 1) {
    throw new RangeError("x must be in [0, 1]");
  }
  if (x === 0) {
    return 0;
  }
  if (x === 1) {
    return 1;
  }
  const bt = Math.exp(
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaCF(a, b, x)) / a;
  }
  return 1 - (bt * betaCF(b, a, 1 - x)) / b;
}

function betaCF(a: number, b: number, x: number): number {
  const maxIter = 200;
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
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
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
    if (Math.abs(del - 1) < 1e-12) {
      break;
    }
  }
  return f;
}

/** Natural log of gamma function. */
function lnGamma(z: number): number {
  return Math.log(Math.abs(gamma(z)));
}
