/**
 * covariance — rolling covariance and correlation between two Series.
 *
 * Mirrors the following pandas methods:
 * - `Series.rolling(window).cov(other)` — rolling sample covariance
 * - `Series.rolling(window).corr(other)` — rolling Pearson correlation
 * - `DataFrame.rolling(window).cov(other)` — column-wise rolling covariance
 * - `DataFrame.rolling(window).corr(other)` — column-wise rolling correlation
 *
 * For each window position both series are aligned by positional index; any
 * position where either value is missing (null, undefined, or NaN) is skipped.
 * The window requires at least `minPeriods` valid paired observations to
 * produce a non-null result (defaults to 2 — one degree of freedom needed).
 *
 * **Covariance formula** (sample covariance, `ddof = 1` by default):
 * ```
 * cov(x, y) = Σ(xi − x̄)(yi − ȳ) / (n − ddof)
 * ```
 *
 * **Pearson correlation**:
 * ```
 * corr(x, y) = cov(x, y) / (std(x) * std(y))
 * ```
 * Returns `NaN` when either series has zero variance in the window.
 *
 * @example
 * ```ts
 * import { rollingCov, rollingCorr } from "tsb";
 *
 * const x = new Series({ data: [1, 2, 3, 4, 5] });
 * const y = new Series({ data: [2, 4, 6, 8, 10] });
 *
 * rollingCov(x, y, 3);
 * // Series [null, null, 2, 2, 2]  (perfect covariance in window of 3)
 *
 * rollingCorr(x, y, 3);
 * // Series [null, null, 1, 1, 1]  (perfect correlation)
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public option types ───────────────────────────────────────────────────────

/** Options shared by {@link rollingCov} and {@link rollingCorr}. */
export interface RollingCovCorrOptions {
  /**
   * Minimum number of valid paired (non-null / non-NaN) observations in a
   * window required to produce a non-null result.
   *
   * Defaults to `2` — needed to have at least one degree of freedom.
   */
  readonly minPeriods?: number;
  /**
   * Delta degrees of freedom for the covariance denominator `(n − ddof)`.
   * Defaults to `1` (sample covariance, matching pandas).
   * Pass `0` for population covariance.
   *
   * _Only used by `rollingCov`.  `rollingCorr` always normalises internally
   * with `ddof=1`._
   */
  readonly ddof?: number;
}

/** Options for DataFrame rolling cov / corr. */
export interface RollingCovCorrDataFrameOptions extends RollingCovCorrOptions {
  /**
   * Column names to include.  When omitted all numeric columns are processed.
   * Non-numeric columns are dropped from the output.
   */
  readonly columns?: readonly string[];
}

// ─── internal helpers ──────────────────────────────────────────────────────────

/** True when a scalar value is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Extract the paired numeric values from two parallel arrays within a window
 * slice.  Any position where either value is missing is dropped.
 */
function pairedNums(
  xs: readonly Scalar[],
  ys: readonly Scalar[],
  start: number,
  end: number,
): { px: number[]; py: number[] } {
  const px: number[] = [];
  const py: number[] = [];
  for (let i = start; i < end; i++) {
    const xv = xs[i];
    const yv = ys[i];
    if (
      !isMissing(xv) &&
      typeof xv === "number" &&
      !isMissing(yv) &&
      typeof yv === "number"
    ) {
      px.push(xv);
      py.push(yv);
    }
  }
  return { px, py };
}

/**
 * Compute sample covariance of two parallel numeric arrays.
 * Returns `null` when `n < 2` or `n <= ddof`.
 */
function sampleCov(px: readonly number[], py: readonly number[], ddof: number): number | null {
  const n = px.length;
  if (n < 2 || n <= ddof) {
    return null;
  }
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += px[i] as number;
    sumY += py[i] as number;
  }
  const mx = sumX / n;
  const my = sumY / n;
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += ((px[i] as number) - mx) * ((py[i] as number) - my);
  }
  return cov / (n - ddof);
}

/**
 * Compute Pearson correlation of two parallel numeric arrays.
 * Returns `null` when `n < 2`, `NaN` when either variance is zero.
 */
function pearsonCorrWindow(px: readonly number[], py: readonly number[]): number | null {
  const n = px.length;
  if (n < 2) {
    return null;
  }
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += px[i] as number;
    sumY += py[i] as number;
  }
  const mx = sumX / n;
  const my = sumY / n;
  let covXY = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = (px[i] as number) - mx;
    const dy = (py[i] as number) - my;
    covXY += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX === 0 || varY === 0) {
    return Number.NaN;
  }
  return covXY / Math.sqrt(varX * varY);
}

// ─── public Series API ────────────────────────────────────────────────────────

/**
 * Compute the rolling sample covariance between two Series.
 *
 * Mirrors `pandas.Series.rolling(window).cov(other)`.
 *
 * Values are aligned positionally (not by index label). Any position where
 * either `x` or `y` is missing is skipped. The covariance is `null` when the
 * number of valid pairs in the window is less than `minPeriods` (default 2).
 *
 * @param x - First Series.
 * @param y - Second Series (must have the same length as `x`).
 * @param window - Number of observations in the trailing window.
 * @param options - Optional configuration (minPeriods, ddof).
 * @returns A `Series<Scalar>` with rolling covariance values.
 *
 * @example
 * ```ts
 * const a = new Series({ data: [1, 2, 3, 4, 5] });
 * const b = new Series({ data: [5, 4, 3, 2, 1] });
 * rollingCov(a, b, 3);
 * // Series [null, null, -1, -1, -1]
 * ```
 */
export function rollingCov(
  x: Series<Scalar>,
  y: Series<Scalar>,
  window: number,
  options?: RollingCovCorrOptions,
): Series<Scalar> {
  if (window < 1) {
    throw new RangeError(`rollingCov: window must be ≥ 1, got ${window}`);
  }
  const n = x.values.length;
  if (y.values.length !== n) {
    throw new RangeError(
      `rollingCov: x and y must have the same length (${n} vs ${y.values.length})`,
    );
  }
  const ddof = options?.ddof ?? 1;
  const minPeriods = options?.minPeriods ?? 2;
  const xs = x.values as readonly Scalar[];
  const ys = y.values as readonly Scalar[];
  const data: Scalar[] = [];
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - window + 1);
    const { px, py } = pairedNums(xs, ys, start, i + 1);
    if (px.length < minPeriods) {
      data.push(null);
    } else {
      const v = sampleCov(px, py, ddof);
      data.push(v === null ? null : v);
    }
  }
  return new Series<Scalar>({ data, index: x.index, name: x.name });
}

/**
 * Compute the rolling Pearson correlation between two Series.
 *
 * Mirrors `pandas.Series.rolling(window).corr(other)`.
 *
 * @param x - First Series.
 * @param y - Second Series (must have the same length as `x`).
 * @param window - Number of observations in the trailing window.
 * @param options - Optional configuration (minPeriods).
 * @returns A `Series<Scalar>` with rolling Pearson correlation values in `[-1, 1]`,
 *   `NaN` where either series has zero variance, `null` below `minPeriods`.
 *
 * @example
 * ```ts
 * const a = new Series({ data: [1, 2, 3, 4, 5] });
 * const b = new Series({ data: [2, 4, 6, 8, 10] });
 * rollingCorr(a, b, 3);
 * // Series [null, null, 1, 1, 1]
 * ```
 */
export function rollingCorr(
  x: Series<Scalar>,
  y: Series<Scalar>,
  window: number,
  options?: RollingCovCorrOptions,
): Series<Scalar> {
  if (window < 1) {
    throw new RangeError(`rollingCorr: window must be ≥ 1, got ${window}`);
  }
  const n = x.values.length;
  if (y.values.length !== n) {
    throw new RangeError(
      `rollingCorr: x and y must have the same length (${n} vs ${y.values.length})`,
    );
  }
  const minPeriods = options?.minPeriods ?? 2;
  const xs = x.values as readonly Scalar[];
  const ys = y.values as readonly Scalar[];
  const data: Scalar[] = [];
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - window + 1);
    const { px, py } = pairedNums(xs, ys, start, i + 1);
    if (px.length < minPeriods) {
      data.push(null);
    } else {
      data.push(pearsonCorrWindow(px, py));
    }
  }
  return new Series<Scalar>({ data, index: x.index, name: x.name });
}

// ─── public DataFrame API ─────────────────────────────────────────────────────

/**
 * Compute rolling sample covariance column-by-column between two DataFrames.
 *
 * Mirrors `pandas.DataFrame.rolling(window).cov(other)` for the case where
 * `other` is another DataFrame with matching columns.
 *
 * Each pair of matching columns `(df[col], other[col])` is passed to
 * {@link rollingCov}. The result is a DataFrame with the same shape as `df`
 * (or the intersection of columns when `options.columns` is omitted).
 *
 * @param df - Left DataFrame.
 * @param other - Right DataFrame. Must have at least the same columns as `df`.
 * @param window - Rolling window size.
 * @param options - Optional configuration.
 * @returns DataFrame of rolling covariance per column.
 *
 * @example
 * ```ts
 * const df = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6] });
 * const df2 = new DataFrame({ a: [2, 4, 6], b: [8, 10, 12] });
 * rollingCovDataFrame(df, df2, 2);
 * // DataFrame: a=[null,2,2], b=[null,2,2]
 * ```
 */
export function rollingCovDataFrame(
  df: DataFrame,
  other: DataFrame,
  window: number,
  options?: RollingCovCorrDataFrameOptions,
): DataFrame {
  return _rollingPairwiseDataFrame(df, other, window, options, "cov");
}

/**
 * Compute rolling Pearson correlation column-by-column between two DataFrames.
 *
 * Mirrors `pandas.DataFrame.rolling(window).corr(other)` for the case where
 * `other` is another DataFrame with matching columns.
 *
 * @param df - Left DataFrame.
 * @param other - Right DataFrame.
 * @param window - Rolling window size.
 * @param options - Optional configuration.
 * @returns DataFrame of rolling Pearson correlation per column.
 *
 * @example
 * ```ts
 * const df = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6] });
 * const df2 = new DataFrame({ a: [2, 4, 6], b: [8, 10, 12] });
 * rollingCorrDataFrame(df, df2, 2);
 * // DataFrame: a=[null,1,1], b=[null,1,1]
 * ```
 */
export function rollingCorrDataFrame(
  df: DataFrame,
  other: DataFrame,
  window: number,
  options?: RollingCovCorrDataFrameOptions,
): DataFrame {
  return _rollingPairwiseDataFrame(df, other, window, options, "corr");
}

/** Internal dispatcher for DataFrame rolling cov/corr. */
function _rollingPairwiseDataFrame(
  df: DataFrame,
  other: DataFrame,
  window: number,
  options: RollingCovCorrDataFrameOptions | undefined,
  mode: "cov" | "corr",
): DataFrame {
  const allCols = df.columns.values as string[];
  const cols = options?.columns
    ? (options.columns as string[]).filter((c): boolean => allCols.includes(c))
    : allCols.filter((c): boolean => {
        const col = df.col(c);
        return col.values.some((v): boolean => typeof v === "number" && !isMissing(v));
      });

  const resultCols = new Map<string, Series<Scalar>>();
  for (const col of cols) {
    const xSeries = df.col(col) as Series<Scalar>;
    const ySeries = other.col(col) as Series<Scalar>;
    const result =
      mode === "cov"
        ? rollingCov(xSeries, ySeries, window, options)
        : rollingCorr(xSeries, ySeries, window, options);
    resultCols.set(col, result);
  }
  return new DataFrame(resultCols, df.index);
}
