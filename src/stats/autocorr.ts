/**
 * autocorr — autocorrelation coefficient for Series.
 *
 * Mirrors `pandas.Series.autocorr(lag=1)`.
 *
 * The autocorrelation at lag `k` is the Pearson correlation between the
 * series and itself shifted by `k` positions:
 *
 * ```
 * autocorr(s, k) = pearsonr(s[k:], s[:-k])
 * ```
 *
 * Negative lags are treated symmetrically (|lag| is used for the offset).
 * Missing values (`null`, `undefined`, `NaN`) in either element of any pair
 * are silently dropped before computing the correlation.
 *
 * @module
 */

import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public API types ─────────────────────────────────────────────────────────

/** Options for {@link autocorr}. */
export interface AutocorrOptions {
  /**
   * Minimum number of valid (non-missing) observation pairs required to
   * produce a finite result.  If fewer pairs are available, returns `NaN`.
   * Defaults to `1`.
   */
  readonly minPeriods?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Arithmetic mean of a non-empty numeric array. */
function arrayMean(arr: readonly number[]): number {
  let s = 0;
  for (const v of arr) {
    s += v;
  }
  return s / arr.length;
}

/**
 * Pearson correlation from two equal-length numeric arrays.
 * Returns `NaN` when `n < minPeriods` or either variance is zero.
 */
function rawPearsonCorr(xs: readonly number[], ys: readonly number[], minPeriods: number): number {
  const n = xs.length;
  if (n < minPeriods) {
    return Number.NaN;
  }
  const mx = arrayMean(xs);
  const my = arrayMean(ys);
  let num = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - mx;
    const dy = (ys[i] as number) - my;
    num += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  const denom = Math.sqrt(varX * varY);
  return denom === 0 ? Number.NaN : num / denom;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Compute the Pearson autocorrelation of `series` at the given `lag`.
 *
 * Mirrors `pandas.Series.autocorr(lag)`.
 *
 * ### Algorithm
 *
 * 1. Let `k = |lag|`.  (Negative lags are symmetric.)
 * 2. Form pairs `(s[i], s[i - k])` for `i = k, …, n−1`.
 * 3. Drop any pair where either element is missing or non-numeric.
 * 4. Return the Pearson correlation coefficient of the remaining pairs.
 *
 * ### Edge cases
 *
 * - `lag === 0` → returns `1` if the series has ≥ `minPeriods` numeric values,
 *   otherwise `NaN`.
 * - `|lag| >= series.length` → returns `NaN` (no overlapping pairs).
 * - Fewer than `minPeriods` valid pairs → returns `NaN`.
 * - All values identical (zero variance) → returns `NaN` (consistent with
 *   `numpy.corrcoef` / pandas).
 *
 * @param series  - Input series.  Non-numeric values are treated as missing.
 * @param lag     - Lag offset.  Defaults to `1`.
 * @param options - {@link AutocorrOptions}.
 * @returns Pearson autocorrelation coefficient in [-1, 1], or `NaN`.
 */
export function autocorr(
  series: Series<Scalar>,
  lag = 1,
  options: AutocorrOptions = {},
): number {
  const minPeriods = options.minPeriods ?? 1;
  const absLag = Math.abs(lag);
  const vals = series.values as readonly Scalar[];
  const n = vals.length;

  // Lag 0: correlate with itself — always 1 if we have enough data.
  if (absLag === 0) {
    let count = 0;
    for (const v of vals) {
      if (typeof v === "number" && !Number.isNaN(v)) {
        count++;
      }
    }
    return count >= minPeriods ? 1 : Number.NaN;
  }

  // No overlapping pairs.
  if (absLag >= n) {
    return Number.NaN;
  }

  // Build aligned pairs: s[i] vs s[i - absLag], skipping missing / non-numeric.
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = absLag; i < n; i++) {
    const a = vals[i] as Scalar;
    const b = vals[i - absLag] as Scalar;
    if (isMissing(a) || isMissing(b)) {
      continue;
    }
    if (typeof a !== "number" || typeof b !== "number") {
      continue;
    }
    xs.push(a);
    ys.push(b);
  }

  return rawPearsonCorr(xs, ys, minPeriods);
}
