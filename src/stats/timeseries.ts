/**
 * Time series analysis — ACF, PACF, and ARMA parameter estimation.
 *
 * Mirrors `statsmodels.tsa` and pandas' `Series.autocorr()`.
 * Provides autocorrelation, partial autocorrelation, and simple
 * ARMA(p,q) moment-based parameter stubs.
 *
 * @example
 * ```ts
 * import { acf, pacf } from "tsb";
 *
 * const ts = [1, 2, 3, 2, 1, 2, 3, 2, 1];
 * const acfValues = acf(ts, 4);
 * // acfValues.values: [1, rho1, rho2, rho3, rho4]
 * ```
 *
 * @module
 */

// ─── types ────────────────────────────────────────────────────────────────────

/** Result of an ACF or PACF computation. */
export interface AutocorrResult {
  /** Lag indices (0, 1, 2, …, nlags). */
  readonly lags: readonly number[];
  /** Autocorrelation (or partial autocorrelation) values at each lag. */
  readonly values: readonly number[];
  /** Approximate 95 % confidence bounds (±1.96/√n). */
  readonly confInt: readonly number[];
}

/** Simple ARMA(p, q) model parameters. */
export interface ArmaParams {
  /** AR coefficients φ₁ … φ_p. */
  readonly arCoefs: readonly number[];
  /** MA coefficients θ₁ … θ_q. */
  readonly maCoefs: readonly number[];
  /** Estimated noise variance. */
  readonly noiseVar: number;
}

/** Ljung-Box portmanteau test result. */
export interface LjungBoxResult {
  /** Ljung-Box Q statistic. */
  readonly statistic: number;
  /** P-value from chi-squared distribution with `nlags` df. */
  readonly pValue: number;
  /** Degrees of freedom. */
  readonly df: number;
}

// ─── math helpers ─────────────────────────────────────────────────────────────

/** Sample mean of a numeric array. */
function mean(xs: readonly number[]): number {
  if (xs.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const x of xs) {
    sum += x;
  }
  return sum / xs.length;
}

/** Sample autocovariance at lag k (biased). */
function autocovariance(xs: readonly number[], mu: number, lag: number): number {
  const n = xs.length;
  let sum = 0;
  for (let i = 0; i < n - lag; i++) {
    sum += ((xs[i] ?? 0) - mu) * ((xs[i + lag] ?? 0) - mu);
  }
  return sum / n;
}

/** Normalised autocorrelation at lag k (1.0 at lag 0 for zero-variance series). */
function normAcv(gamma0: number, xs: readonly number[], mu: number, k: number): number {
  if (gamma0 > 0) {
    return autocovariance(xs, mu, k) / gamma0;
  }
  return k === 0 ? 1 : 0;
}

/** Update a single Levinson-Durbin step k, modifying phi in place. */
function ldStep(phi: number[][], gamma: readonly number[], k: number): void {
  let num = gamma[k] ?? 0;
  const prevPhi = phi[k - 1];
  for (let j = 1; j <= k - 1; j++) {
    num -= (prevPhi?.[j] ?? 0) * (gamma[k - j] ?? 0);
  }
  const kk = num / (gamma[0] ?? 1);
  const currPhi = phi[k];
  if (currPhi === undefined) {
    return;
  }
  currPhi[k] = kk;
  for (let j = 1; j <= k - 1; j++) {
    currPhi[j] = (prevPhi?.[j] ?? 0) - kk * (prevPhi?.[k - j] ?? 0);
  }
}

/** Solve Yule-Walker equations via Levinson-Durbin recursion. */
function levinsonDurbin(gamma: readonly number[], order: number): number[] {
  if (order === 0) {
    return [];
  }
  const phi: number[][] = Array.from({ length: order + 1 }, () =>
    new Array<number>(order + 1).fill(0),
  );
  const phi1 = phi[1];
  if (phi1 !== undefined) {
    phi1[1] = (gamma[1] ?? 0) / (gamma[0] ?? 1);
  }
  for (let k = 2; k <= order; k++) {
    ldStep(phi, gamma, k);
  }
  const result: number[] = [];
  const last = phi[order];
  for (let j = 1; j <= order; j++) {
    result.push(last?.[j] ?? 0);
  }
  return result;
}

/** Regularized incomplete gamma via series expansion (upper tail). */
function gammaIncUpper(a: number, x: number): number {
  if (x <= 0) {
    return 1;
  }
  // Use simple log-sum series
  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n <= 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-12 * Math.abs(sum)) {
      break;
    }
  }
  const lnGammaA = lnGamma(a);
  return 1 - Math.exp(-x + a * Math.log(x) - lnGammaA) * sum;
}

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

/** CDF of chi-squared distribution with `df` degrees of freedom. */
function chi2Cdf(x: number, df: number): number {
  if (x <= 0) {
    return 0;
  }
  return 1 - gammaIncUpper(df / 2, x / 2);
}

// ─── ACF ─────────────────────────────────────────────────────────────────────

/**
 * Sample autocorrelation function (ACF).
 *
 * @param xs     - Time series values.
 * @param nlags  - Number of lags to compute (default: min(10*log10(n), n/4)).
 * @returns `{ lags, values, confInt }`.
 * @throws {RangeError} If `xs` has fewer than 2 values.
 */
export function acf(xs: readonly number[], nlags?: number): AutocorrResult {
  const n = xs.length;
  if (n < 2) {
    throw new RangeError("Time series must have at least 2 observations");
  }
  const maxLags = nlags ?? Math.min(Math.floor(10 * Math.log10(n)), Math.floor(n / 4));
  const mu = mean(xs);
  const gamma0 = autocovariance(xs, mu, 0);
  const lags: number[] = [];
  const values: number[] = [];
  const confInt: number[] = [];
  const bound = (1.96 / Math.sqrt(n)) * (gamma0 > 0 ? 1 : 0);

  for (let k = 0; k <= maxLags; k++) {
    lags.push(k);
    values.push(normAcv(gamma0, xs, mu, k));
    confInt.push(bound);
  }
  return { lags, values, confInt };
}

// ─── PACF ─────────────────────────────────────────────────────────────────────

/**
 * Sample partial autocorrelation function (PACF).
 *
 * Uses the Yule-Walker equations via Levinson-Durbin recursion.
 *
 * @param xs     - Time series values.
 * @param nlags  - Number of lags (default: same as `acf`).
 * @returns `{ lags, values, confInt }`.
 * @throws {RangeError} If `xs` has fewer than 2 values.
 */
export function pacf(xs: readonly number[], nlags?: number): AutocorrResult {
  const n = xs.length;
  if (n < 2) {
    throw new RangeError("Time series must have at least 2 observations");
  }
  const maxLags = nlags ?? Math.min(Math.floor(10 * Math.log10(n)), Math.floor(n / 4));
  const mu = mean(xs);
  const gamma0 = autocovariance(xs, mu, 0);
  const gamma: number[] = [];
  for (let k = 0; k <= maxLags; k++) {
    gamma.push(normAcv(gamma0, xs, mu, k));
  }

  const lags: number[] = [0];
  const values: number[] = [1];
  const bound = 1.96 / Math.sqrt(n);
  const confInt: number[] = [0];

  for (let p = 1; p <= maxLags; p++) {
    const phi = levinsonDurbin(gamma, p);
    lags.push(p);
    values.push(phi[p - 1] ?? 0);
    confInt.push(bound);
  }
  return { lags, values, confInt };
}

// ─── ARMA fit ─────────────────────────────────────────────────────────────────

/**
 * Moment-based ARMA(p, 0) parameter estimation via Yule-Walker equations.
 *
 * For `q > 0`, MA coefficients are set to zero (stub — full ML estimation
 * requires iterative optimisation beyond the scope of this stub).
 *
 * @param xs - Time series values.
 * @param p  - AR order.
 * @param q  - MA order (stub — only 0 is fully supported).
 * @returns Estimated ARMA parameters.
 * @throws {RangeError} If `xs` has fewer than `p + 1` observations.
 */
export function fitArma(xs: readonly number[], p: number, q: number): ArmaParams {
  if (xs.length <= p) {
    throw new RangeError(`Need at least ${p + 1} observations to fit AR(${p})`);
  }
  const mu = mean(xs);
  const gamma0 = autocovariance(xs, mu, 0);
  const gamma: number[] = [];
  for (let k = 0; k <= p; k++) {
    gamma.push(normAcv(gamma0, xs, mu, k));
  }
  const arCoefs = p > 0 ? levinsonDurbin(gamma, p) : [];
  const maCoefs = new Array<number>(q).fill(0);
  // Residual variance approximation
  let noiseVar = gamma0;
  for (let j = 0; j < p; j++) {
    noiseVar -= (arCoefs[j] ?? 0) * autocovariance(xs, mu, j + 1);
  }
  return { arCoefs, maCoefs, noiseVar: Math.max(0, noiseVar) };
}

// ─── Ljung-Box ────────────────────────────────────────────────────────────────

/**
 * Ljung-Box portmanteau test for residual autocorrelation.
 *
 * Tests H₀: the first `nlags` autocorrelations are jointly zero.
 *
 * @param xs    - Residual series.
 * @param nlags - Number of lags to test.
 * @returns Q statistic and p-value.
 * @throws {RangeError} If `xs` has fewer than `nlags + 1` observations.
 */
export function ljungBox(xs: readonly number[], nlags: number): LjungBoxResult {
  const n = xs.length;
  if (n <= nlags) {
    throw new RangeError("Need more observations than lags");
  }
  const { values } = acf(xs, nlags);
  let q = 0;
  for (let k = 1; k <= nlags; k++) {
    const rk = values[k] ?? 0;
    q += (rk * rk) / (n - k);
  }
  q *= n * (n + 2);
  return { statistic: q, pValue: 1 - chi2Cdf(q, nlags), df: nlags };
}
