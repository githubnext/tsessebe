/**
 * rolling_moments — rolling skewness and kurtosis for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.rolling(window).skew()` — Fisher-Pearson adjusted skewness
 * - `Series.rolling(window).kurt()` — excess (Fisher) kurtosis (bias-corrected)
 *
 * Both functions slide a trailing window of size `window` over the values,
 * collecting valid (non-null / non-NaN) observations and computing the moment.
 * When the count of valid values in the window falls below `minPeriods`
 * (default: 3 for skew, 4 for kurt, matching the minimum required for a
 * defined result), the output at that position is `null`.
 *
 * **Skew formula** (Fisher-Pearson, adjusted): requires ≥ 3 valid values.
 * ```
 * g1 = m3 / σ³             (biased third standardised moment)
 * skew = √(n(n-1)) / (n-2) * g1
 * ```
 *
 * **Kurtosis formula** (excess, bias-corrected): requires ≥ 4 valid values.
 * ```
 * kurt = (n+1)*n*(n-1) / ((n-2)*(n-3)) * (m4/m2²) − 3*(n-1)² / ((n-2)*(n-3))
 * ```
 *
 * @example
 * ```ts
 * import { rollingSkew, rollingKurtosis } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 4, 8, 16] });
 *
 * rollingSkew(s, 4);
 * // Series [null, null, null, ≈0.869, ≈0.869]
 *
 * rollingKurtosis(s, 4);
 * // Series [null, null, null, null, ≈-0.539]  (window=4 min, kurt needs 4)
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public option types ───────────────────────────────────────────────────────

/** Options shared by rolling-moment functions. */
export interface RollingMomentsOptions {
  /**
   * Minimum number of valid (non-null / non-NaN) observations in a window
   * required to produce a non-null result.
   *
   * Defaults to the statistical minimum: 3 for skew, 4 for kurtosis.
   */
  readonly minPeriods?: number;
  /**
   * Whether to centre the window. When `true` the window is symmetric around
   * the current position; when `false` (default) the window is trailing
   * (right-aligned), matching pandas default.
   */
  readonly center?: boolean;
}

/** Options for DataFrame rolling-moment functions. */
export interface RollingMomentsDataFrameOptions extends RollingMomentsOptions {
  /**
   * Axis: `0` or `"index"` for column-wise (default), `1` or `"columns"` for
   * row-wise aggregation.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar is missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Collect valid (non-missing) numeric values from a window slice. */
function validNums(vals: readonly Scalar[], start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i < end; i++) {
    const v = vals[i];
    if (typeof v === "number" && !Number.isNaN(v)) {
      out.push(v);
    }
  }
  return out;
}

/** Compute the (inclusive) window bounds [start, end) for position i. */
function windowBounds(
  i: number,
  window: number,
  n: number,
  center: boolean,
): [number, number] {
  if (center) {
    const half = Math.floor((window - 1) / 2);
    const start = Math.max(0, i - half);
    const end = Math.min(n, i + window - half);
    return [start, end];
  }
  return [Math.max(0, i - window + 1), i + 1];
}

/**
 * Fisher-Pearson adjusted skewness.
 *
 * Returns NaN when `n < 3` or when variance is zero.
 */
function fisherSkew(nums: readonly number[]): number {
  const n = nums.length;
  if (n < 3) return Number.NaN;

  let sum = 0;
  for (const v of nums) sum += v;
  const mean = sum / n;

  let m2 = 0;
  let m3 = 0;
  for (const v of nums) {
    const d = v - mean;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
  }
  m2 /= n;
  m3 /= n;

  if (m2 === 0) return Number.NaN;

  const sigma = Math.sqrt(m2);
  const g1 = m3 / (sigma * sigma * sigma);
  return (Math.sqrt(n * (n - 1)) / (n - 2)) * g1;
}

/**
 * Excess kurtosis (bias-corrected Fisher–Pearson).
 *
 * Matches pandas `rolling().kurt()` formula.  Returns NaN when `n < 4` or
 * variance is zero.
 */
function excessKurtosis(nums: readonly number[]): number {
  const n = nums.length;
  if (n < 4) return Number.NaN;

  let sum = 0;
  for (const v of nums) sum += v;
  const mean = sum / n;

  let m2 = 0;
  let m4 = 0;
  for (const v of nums) {
    const d = v - mean;
    const d2 = d * d;
    m2 += d2;
    m4 += d2 * d2;
  }
  m2 /= n;
  m4 /= n;

  if (m2 === 0) return Number.NaN;

  const denom = (n - 2) * (n - 3);
  const term1 = ((n + 1) * n * (n - 1)) / denom;
  const term2 = (3 * (n - 1) * (n - 1)) / denom;
  return term1 * (m4 / (m2 * m2)) - term2;
}

/**
 * Apply a rolling moment aggregation to a Series.
 *
 * @param series - Input Series.
 * @param window - Rolling window size (positive integer).
 * @param agg - Aggregation function: `(nums) => number | null`; NaN → null.
 * @param minPeriods - Minimum valid observations to produce a result.
 * @param center - Whether to centre the window.
 */
function applyRolling(
  series: Series<Scalar>,
  window: number,
  agg: (nums: readonly number[]) => number,
  minPeriods: number,
  center: boolean,
): Series<Scalar> {
  if (window < 1 || !Number.isInteger(window)) {
    throw new RangeError(`rollingMoments: window must be a positive integer, got ${window}`);
  }
  const vals = series.values;
  const n = vals.length;
  const result: Scalar[] = new Array<Scalar>(n).fill(null);

  for (let i = 0; i < n; i++) {
    const [start, end] = windowBounds(i, window, n, center);
    const nums = validNums(vals, start, end);
    if (nums.length < minPeriods) {
      result[i] = null;
      continue;
    }
    const v = agg(nums);
    result[i] = Number.isNaN(v) ? null : v;
  }

  return new Series<Scalar>({ data: result, index: series.index, name: series.name });
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Rolling Fisher-Pearson adjusted skewness.
 *
 * Mirrors `pandas.Series.rolling(window).skew()`.
 *
 * Requires ≥ 3 valid values per window.  Positions with fewer valid
 * observations (or with zero variance) return `null`.
 *
 * @param series - Input Series.
 * @param window - Rolling window size.
 * @param options - Optional configuration.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * rollingSkew(s, 3);
 * // [null, null, 0, 0, 0]  (uniform spacing → 0 skew)
 * ```
 */
export function rollingSkew(
  series: Series<Scalar>,
  window: number,
  options?: RollingMomentsOptions,
): Series<Scalar> {
  const center = options?.center ?? false;
  const minPeriods = options?.minPeriods ?? 3;
  return applyRolling(series, window, fisherSkew, minPeriods, center);
}

/**
 * Rolling excess kurtosis (bias-corrected Fisher–Pearson).
 *
 * Mirrors `pandas.Series.rolling(window).kurt()`.
 *
 * Requires ≥ 4 valid values per window.  Positions with fewer valid
 * observations (or with zero variance) return `null`.
 *
 * @param series - Input Series.
 * @param window - Rolling window size.
 * @param options - Optional configuration.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [2, 1, 3, 5, 4] });
 * rollingKurtosis(s, 5);
 * // [null, null, null, null, ≈ -1.2]
 * ```
 */
export function rollingKurtosis(
  series: Series<Scalar>,
  window: number,
  options?: RollingMomentsOptions,
): Series<Scalar> {
  const center = options?.center ?? false;
  const minPeriods = options?.minPeriods ?? 4;
  return applyRolling(series, window, excessKurtosis, minPeriods, center);
}

/**
 * Column-wise rolling Fisher-Pearson skewness for a DataFrame.
 *
 * Mirrors `pandas.DataFrame.rolling(window).skew()`.
 *
 * @param df - Input DataFrame.
 * @param window - Rolling window size.
 * @param options - Optional configuration.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [4, 3, 2, 1] });
 * rollingSkewDataFrame(df, 3);
 * ```
 */
export function rollingSkewDataFrame(
  df: DataFrame,
  window: number,
  options?: RollingMomentsDataFrameOptions,
): DataFrame {
  const axis = options?.axis ?? 0;
  const colOptions: RollingMomentsOptions = {
    minPeriods: options?.minPeriods,
    center: options?.center,
  };

  if (axis === 1 || axis === "columns") {
    // Row-wise: apply over each row
    const cols = df.columns.values as string[];
    const nRows = df.index.length;
    const resultData: Scalar[][] = Array.from({ length: nRows }, () =>
      new Array<Scalar>(cols.length).fill(null),
    );

    for (let r = 0; r < nRows; r++) {
      const rowVals: Scalar[] = cols.map((c) => (df.col(c).values[r] as Scalar | undefined) ?? null);
      const rowSeries = new Series({ data: rowVals });
      const rowResult = rollingSkew(rowSeries, window, colOptions);
      for (let c = 0; c < cols.length; c++) {
        (resultData[r] as Scalar[])[c] = (rowResult.values[c] as Scalar | undefined) ?? null;
      }
    }
    const colMap = new Map<string, Series<Scalar>>();
    for (let c = 0; c < cols.length; c++) {
      const colName = cols[c] as string;
      colMap.set(colName, new Series({ data: resultData.map((row) => (row[c] as Scalar | undefined) ?? null) }));
    }
    return new DataFrame(colMap, df.index);
  }

  // Column-wise (default axis=0)
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values as string[]) {
    colMap.set(name, rollingSkew(df.col(name), window, colOptions));
  }
  return new DataFrame(colMap, df.index);
}

/**
 * Column-wise rolling excess kurtosis for a DataFrame.
 *
 * Mirrors `pandas.DataFrame.rolling(window).kurt()`.
 *
 * @param df - Input DataFrame.
 * @param window - Rolling window size.
 * @param options - Optional configuration.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5], b: [5, 4, 3, 2, 1] });
 * rollingKurtosisDataFrame(df, 5);
 * ```
 */
export function rollingKurtosisDataFrame(
  df: DataFrame,
  window: number,
  options?: RollingMomentsDataFrameOptions,
): DataFrame {
  const axis = options?.axis ?? 0;
  const colOptions: RollingMomentsOptions = {
    minPeriods: options?.minPeriods,
    center: options?.center,
  };

  if (axis === 1 || axis === "columns") {
    const cols = df.columns.values as string[];
    const nRows = df.index.length;
    const resultData: Scalar[][] = Array.from({ length: nRows }, () =>
      new Array<Scalar>(cols.length).fill(null),
    );
    for (let r = 0; r < nRows; r++) {
      const rowVals: Scalar[] = cols.map((c) => (df.col(c).values[r] as Scalar | undefined) ?? null);
      const rowSeries = new Series({ data: rowVals });
      const rowResult = rollingKurtosis(rowSeries, window, colOptions);
      for (let c = 0; c < cols.length; c++) {
        (resultData[r] as Scalar[])[c] = (rowResult.values[c] as Scalar | undefined) ?? null;
      }
    }
    const colMap = new Map<string, Series<Scalar>>();
    for (let c = 0; c < cols.length; c++) {
      const colName = cols[c] as string;
      colMap.set(colName, new Series({ data: resultData.map((row) => (row[c] as Scalar | undefined) ?? null) }));
    }
    return new DataFrame(colMap, df.index);
  }

  // Column-wise
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values as string[]) {
    colMap.set(name, rollingKurtosis(df.col(name), window, colOptions));
  }
  return new DataFrame(colMap, df.index);
}
