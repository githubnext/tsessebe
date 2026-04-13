/**
 * window_extended — additional rolling-window aggregations for Series.
 *
 * Extends the core `Rolling` aggregations with higher-order statistics that
 * mirror pandas methods:
 * - `Series.rolling(w).sem()` → {@link rollingSem}
 * - `Series.rolling(w).skew()` → {@link rollingSkew}
 * - `Series.rolling(w).kurt()` → {@link rollingKurt}
 * - `Series.rolling(w).quantile(q)` → {@link rollingQuantile}
 *
 * All functions are **pure** (return new Series; inputs are unchanged).
 * Missing values (null / NaN) are excluded from each window calculation.
 * A `null` result is produced whenever the window has fewer than `minPeriods`
 * valid observations (or fewer than the function's minimum required count).
 *
 * @module
 */

import type { Index } from "../core/base-index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options shared by all rolling-window functions in this module. */
export interface WindowExtOptions {
  /**
   * Minimum number of valid (non-null / non-NaN) observations required in the
   * window to produce a non-null result.
   *
   * Defaults to the `window` size (matching pandas behaviour).
   */
  readonly minPeriods?: number;
  /**
   * Whether to centre the window around each position.
   * When `false` (default) the window is trailing (right-aligned).
   */
  readonly center?: boolean;
}

/** Options for {@link rollingQuantile}. */
export interface RollingQuantileOptions extends WindowExtOptions {
  /**
   * Interpolation method when the desired quantile falls between two values.
   * - `"linear"` (default): pandas default — linear interpolation.
   * - `"lower"`: take the lower of the two surrounding values.
   * - `"higher"`: take the higher of the two surrounding values.
   * - `"midpoint"`: arithmetic mean of the two surrounding values.
   * - `"nearest"`: whichever value is closest (lower on tie).
   */
  readonly interpolation?: "linear" | "lower" | "higher" | "midpoint" | "nearest";
}

// ─── minimal Series interface (mirrors RollingSeriesLike) ─────────────────────

/** Minimal interface the real `Series<Scalar>` class satisfies. */
interface SeriesLike {
  readonly values: readonly Scalar[];
  readonly index: Index<Label>;
  readonly name: string | null;
  withValues(data: readonly Scalar[], name?: string | null): SeriesLike;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

function validNums(slice: readonly Scalar[]): number[] {
  const out: number[] = [];
  for (const v of slice) {
    if (!isMissing(v) && typeof v === "number") {
      out.push(v);
    }
  }
  return out;
}

function trailingBounds(i: number, window: number, n: number): [number, number] {
  return [Math.max(0, i - window + 1), Math.min(n, i + 1)];
}

function centeredBounds(i: number, window: number, n: number): [number, number] {
  const half = Math.floor((window - 1) / 2);
  return [Math.max(0, i - half), Math.min(n, i + (window - half))];
}

function windowBounds(i: number, window: number, n: number, center: boolean): [number, number] {
  return center ? centeredBounds(i, window, n) : trailingBounds(i, window, n);
}

function numMean(nums: readonly number[]): number {
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

function numVar(nums: readonly number[], ddof: number): number {
  if (nums.length - ddof <= 0) {
    return Number.NaN;
  }
  const m = numMean(nums);
  return nums.reduce((s, v) => s + (v - m) ** 2, 0) / (nums.length - ddof);
}

function numStd(nums: readonly number[], ddof: number): number {
  return Math.sqrt(numVar(nums, ddof));
}

/** Apply an aggregation over each window, returning a new Series. */
function applyWindow(
  series: SeriesLike,
  window: number,
  opts: WindowExtOptions,
  minN: number,
  agg: (nums: number[], n: number) => Scalar,
): SeriesLike {
  const { values, index, name } = series;
  const n = values.length;
  const minPeriods = opts.minPeriods ?? window;
  const effectiveMin = Math.max(minN, minPeriods);
  const center = opts.center ?? false;
  const out: Scalar[] = new Array<Scalar>(n).fill(null);

  for (let i = 0; i < n; i++) {
    const [lo, hi] = windowBounds(i, window, n, center);
    const nums = validNums(values.slice(lo, hi));
    if (nums.length < effectiveMin) {
      continue;
    }
    out[i] = agg(nums, nums.length);
  }

  return series.withValues(out, name);
}

// ─── Rolling SEM ──────────────────────────────────────────────────────────────

/**
 * Rolling standard error of the mean.
 *
 * `sem = std(ddof=1) / sqrt(n)` where `n` is the number of valid observations
 * in the window.  Requires at least 2 valid values (else `null`).
 *
 * Mirrors `pandas.Series.rolling(window).sem()`.
 *
 * @param series - Input Series.
 * @param window - Size of the sliding window (number of observations).
 * @param opts - Window options.
 * @returns A new Series with rolling SEM values.
 *
 * @example
 * ```ts
 * const s = Series.from([1, 2, 3, 4, 5]);
 * rollingSem(s, 3); // [null, null, ~0.577, ~0.577, ~0.577]
 * ```
 */
export function rollingSem(
  series: SeriesLike,
  window: number,
  opts: WindowExtOptions = {},
): SeriesLike {
  return applyWindow(series, window, opts, 2, (nums) => {
    const s = numStd(nums, 1);
    return s / Math.sqrt(nums.length);
  });
}

// ─── Rolling Skewness ─────────────────────────────────────────────────────────

/**
 * Rolling Fisher-Pearson skewness (unbiased, 3rd standardised moment).
 *
 * Uses the standard adjustment formula:
 * ```
 * skew = [n / ((n-1)(n-2))] * Σ[(xᵢ - x̄) / s]³
 * ```
 * where `s` is the sample standard deviation (`ddof=1`).
 * Requires at least 3 valid observations (else `null`).
 *
 * Mirrors `pandas.Series.rolling(window).skew()`.
 *
 * @param series - Input Series.
 * @param window - Size of the sliding window.
 * @param opts - Window options.
 * @returns A new Series with rolling skewness values.
 *
 * @example
 * ```ts
 * const s = Series.from([1, 2, 3, 4, 5]);
 * rollingSkew(s, 3); // [null, null, 0, 0, 0]  (symmetric windows)
 * ```
 */
export function rollingSkew(
  series: SeriesLike,
  window: number,
  opts: WindowExtOptions = {},
): SeriesLike {
  return applyWindow(series, window, opts, 3, (nums, n) => {
    const m = numMean(nums);
    const s = numStd(nums, 1);
    if (s === 0 || Number.isNaN(s)) {
      return 0;
    }
    const sum3 = nums.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0);
    return (n / ((n - 1) * (n - 2))) * sum3;
  });
}

// ─── Rolling Kurtosis ─────────────────────────────────────────────────────────

/**
 * Rolling excess kurtosis (Fisher's definition, unbiased, 4th standardised moment).
 *
 * Uses the standard adjustment (Fisher, 1930):
 * ```
 * kurt = [n(n+1) / ((n-1)(n-2)(n-3))] * Σ[(xᵢ - x̄) / s]⁴
 *        − 3(n-1)² / ((n-2)(n-3))
 * ```
 * where `s` is the sample standard deviation (`ddof=1`).
 * Requires at least 4 valid observations (else `null`).
 *
 * Mirrors `pandas.Series.rolling(window).kurt()`.
 *
 * @param series - Input Series.
 * @param window - Size of the sliding window.
 * @param opts - Window options.
 * @returns A new Series with rolling excess kurtosis values.
 *
 * @example
 * ```ts
 * const s = Series.from([1, 2, 3, 4]);
 * rollingKurt(s, 4); // [null, null, null, -1.2]  (uniform distribution)
 * ```
 */
export function rollingKurt(
  series: SeriesLike,
  window: number,
  opts: WindowExtOptions = {},
): SeriesLike {
  return applyWindow(series, window, opts, 4, (nums, n) => {
    const m = numMean(nums);
    const s = numStd(nums, 1);
    if (s === 0 || Number.isNaN(s)) {
      return 0;
    }
    const sum4 = nums.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0);
    const term1 = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum4;
    const term2 = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
    return term1 - term2;
  });
}

// ─── Rolling Quantile ─────────────────────────────────────────────────────────

/**
 * Compute a quantile value for each rolling window.
 *
 * @param sorted - A sorted array of valid numbers in the window.
 * @param q - Quantile in [0, 1].
 * @param method - Interpolation method.
 */
function computeQuantile(
  sorted: readonly number[],
  q: number,
  method: RollingQuantileOptions["interpolation"],
): number {
  const n = sorted.length;
  if (n === 0) {
    return Number.NaN;
  }
  if (n === 1) {
    return sorted[0] as number;
  }
  const virtual = q * (n - 1);
  const lo = Math.floor(virtual);
  const hi = Math.ceil(virtual);
  const loVal = sorted[lo] as number;
  const hiVal = sorted[hi] as number;
  switch (method ?? "linear") {
    case "lower":
      return loVal;
    case "higher":
      return hiVal;
    case "midpoint":
      return (loVal + hiVal) / 2;
    case "nearest": {
      const fracLo = virtual - lo;
      return fracLo < 0.5 ? loVal : hiVal;
    }
    default: {
      const frac = virtual - lo;
      return loVal + frac * (hiVal - loVal);
    }
  }
}

/**
 * Rolling quantile.
 *
 * Computes the `q`-th quantile for each sliding window, using linear
 * interpolation by default.
 *
 * Mirrors `pandas.Series.rolling(window).quantile(q, interpolation)`.
 *
 * @param series - Input Series.
 * @param q - Quantile to compute (0 ≤ q ≤ 1).
 * @param window - Size of the sliding window.
 * @param opts - Window options including interpolation method.
 * @returns A new Series with rolling quantile values.
 *
 * @throws {RangeError} If `q` is outside `[0, 1]`.
 *
 * @example
 * ```ts
 * const s = Series.from([1, 2, 3, 4, 5]);
 * rollingQuantile(s, 0.5, 3); // [null, null, 2, 3, 4]  (rolling median)
 * ```
 */
export function rollingQuantile(
  series: SeriesLike,
  q: number,
  window: number,
  opts: RollingQuantileOptions = {},
): SeriesLike {
  if (q < 0 || q > 1) {
    throw new RangeError(`rollingQuantile: q must be in [0, 1], got ${q}`);
  }
  const { interpolation } = opts;
  return applyWindow(series, window, opts, 1, (nums) => {
    const sorted = [...nums].sort((a, b) => a - b);
    return computeQuantile(sorted, q, interpolation);
  });
}
