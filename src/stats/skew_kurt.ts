/**
 * skew_kurt — skewness and excess kurtosis for Series and DataFrame.
 *
 * Mirrors:
 * - `pandas.Series.skew(skipna?, min_count?)` — Fisher–Pearson coefficient
 * - `pandas.Series.kurt(skipna?)` — Fisher's definition of excess kurtosis
 * - `pandas.DataFrame.skew(axis?, skipna?, numeric_only?)`
 * - `pandas.DataFrame.kurt(axis?, skipna?, numeric_only?)`
 *
 * Formulas follow pandas defaults:
 * - Skewness: adjusted Fisher–Pearson (unbiased, n/(n-1)/(n-2) correction)
 * - Kurtosis: excess kurtosis (subtract 3) with pandas' bias-correction factor
 *
 * @module
 */

import type { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { DtypeKind } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link skewSeries} and {@link kurtSeries}. */
export interface SkewKurtSeriesOptions {
  /**
   * If `true` (default), exclude null/NaN values before computing.
   */
  readonly skipna?: boolean;
}

/** Options for {@link skewDataFrame} and {@link kurtDataFrame}. */
export interface SkewKurtDataFrameOptions {
  /**
   * Axis along which to compute.
   * - `0` (default): reduce along rows, one result per column.
   * - `1`: reduce along columns, one result per row.
   */
  readonly axis?: 0 | 1;
  /**
   * If `true` (default), exclude null/NaN values.
   */
  readonly skipna?: boolean;
  /**
   * If `true`, only include numeric columns (when `axis=0`).
   * @defaultValue `false`
   */
  readonly numericOnly?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar value is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** True when a dtype kind is numeric (int, uint, or float). */
function isNumericKind(kind: DtypeKind): boolean {
  if (kind === "int") {
    return true;
  }
  if (kind === "uint") {
    return true;
  }
  if (kind === "float") {
    return true;
  }
  return false;
}

/**
 * Extract finite numeric values from a Scalar array, optionally skipping
 * missing values.
 */
function extractNumbers(values: readonly Scalar[], skipna: boolean): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (isMissing(v)) {
      if (!skipna) {
        return []; // presence of NaN propagates as NaN
      }
      continue;
    }
    if (typeof v === "number") {
      out.push(v);
    }
  }
  return out;
}

/**
 * Compute the adjusted Fisher–Pearson skewness coefficient (unbiased).
 *
 * Formula (same as pandas):
 *   G1 = n / ((n-1)(n-2)) * sum((x - mean)^3) / std_sample^3
 *
 * Returns `NaN` when `n < 3` or std is 0.
 */
function computeSkewness(xs: readonly number[]): number {
  const n = xs.length;
  if (n < 3) {
    return Number.NaN;
  }

  let sum = 0;
  for (const x of xs) {
    sum += x;
  }
  const mean = sum / n;

  let m2 = 0;
  let m3 = 0;
  for (const x of xs) {
    const d = x - mean;
    m2 += d * d;
    m3 += d * d * d;
  }

  const variance = m2 / (n - 1); // sample variance
  const std = Math.sqrt(variance);

  if (std === 0) {
    return Number.NaN;
  }

  const skew = (n / ((n - 1) * (n - 2))) * (m3 / (std * std * std));
  return skew;
}

/**
 * Compute excess kurtosis with pandas' bias-correction factor.
 *
 * Formula (same as pandas):
 *   G2 = n(n+1)/((n-1)(n-2)(n-3)) * sum((x-mean)^4) / s_sample^4
 *        - 3(n-1)^2 / ((n-2)(n-3))
 *   where s_sample^2 = sum((x-mean)^2) / (n-1)
 *
 * Returns `NaN` when `n < 4` or sample variance is 0.
 */
function computeKurtosis(xs: readonly number[]): number {
  const n = xs.length;
  if (n < 4) {
    return Number.NaN;
  }

  let sum = 0;
  for (const x of xs) {
    sum += x;
  }
  const mean = sum / n;

  let m2 = 0;
  let m4 = 0;
  for (const x of xs) {
    const d = x - mean;
    const d2 = d * d;
    m2 += d2;
    m4 += d2 * d2;
  }

  // Sample variance (denominator n-1)
  const sampleVar = m2 / (n - 1);

  if (sampleVar === 0) {
    return Number.NaN;
  }

  const a = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
  const b = m4 / (sampleVar * sampleVar);
  const c = (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));

  return a * b - c;
}

// ─── public API — Series ──────────────────────────────────────────────────────

/**
 * Return the adjusted Fisher–Pearson skewness of a numeric Series.
 *
 * Returns `NaN` when fewer than 3 non-null values are present or the
 * standard deviation is zero.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4, 100] });
 * skewSeries(s); // approx 2.02
 * ```
 */
export function skewSeries(series: Series<Scalar>, options: SkewKurtSeriesOptions = {}): number {
  const skipna = options.skipna ?? true;
  const xs = extractNumbers(series.values as readonly Scalar[], skipna);
  return computeSkewness(xs);
}

/**
 * Return the excess kurtosis (Fisher's definition, bias-corrected) of a
 * numeric Series.
 *
 * Returns `NaN` when fewer than 4 non-null values are present or the
 * standard deviation is zero.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 2, 3, 3, 3, 4, 4, 5] });
 * kurtSeries(s); // approx -0.44
 * ```
 */
export function kurtSeries(series: Series<Scalar>, options: SkewKurtSeriesOptions = {}): number {
  const skipna = options.skipna ?? true;
  const xs = extractNumbers(series.values as readonly Scalar[], skipna);
  return computeKurtosis(xs);
}

// ─── public API — DataFrame ───────────────────────────────────────────────────

/**
 * Return the skewness of each column (axis=0) or each row (axis=1) of a
 * DataFrame as a numeric Series.
 *
 * Non-numeric columns are omitted when `axis=0`.  When `axis=1`, only
 * numeric values in each row contribute.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 8, 16] });
 * skewDataFrame(df); // Series with index ["a","b"]
 * ```
 */
export function skewDataFrame(
  df: DataFrame,
  options: SkewKurtDataFrameOptions = {},
): Series<Scalar> {
  const axis = options.axis ?? 0;
  const skipna = options.skipna ?? true;
  const numericOnly = options.numericOnly ?? false;

  if (axis === 0) {
    return reduceColumns(df, numericOnly, skipna, computeSkewness);
  }
  return reduceRows(df, skipna, computeSkewness);
}

/**
 * Return the excess kurtosis of each column (axis=0) or each row (axis=1)
 * of a DataFrame as a numeric Series.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [1, 1, 8, 8] });
 * kurtDataFrame(df); // Series with index ["a","b"]
 * ```
 */
export function kurtDataFrame(
  df: DataFrame,
  options: SkewKurtDataFrameOptions = {},
): Series<Scalar> {
  const axis = options.axis ?? 0;
  const skipna = options.skipna ?? true;
  const numericOnly = options.numericOnly ?? false;

  if (axis === 0) {
    return reduceColumns(df, numericOnly, skipna, computeKurtosis);
  }
  return reduceRows(df, skipna, computeKurtosis);
}

/** Reduce each numeric column to a single number using the given statistic. */
function reduceColumns(
  df: DataFrame,
  numericOnly: boolean,
  skipna: boolean,
  statFn: (xs: readonly number[]) => number,
): Series<Scalar> {
  const colNames = df.columns.values as readonly string[];
  const labels: string[] = [];
  const values: number[] = [];

  for (const col of colNames) {
    const series = df.col(col);
    if (numericOnly && !isNumericKind(series.dtype.kind)) {
      continue;
    }
    if (!isNumericKind(series.dtype.kind)) {
      continue;
    }
    labels.push(col);
    const xs = extractNumbers(series.values as readonly Scalar[], skipna);
    values.push(statFn(xs));
  }

  return new Series({ data: values, index: labels });
}

/** Reduce each row to a single number using the given statistic. */
function reduceRows(
  df: DataFrame,
  skipna: boolean,
  statFn: (xs: readonly number[]) => number,
): Series<Scalar> {
  const colNames = df.columns.values as readonly string[];
  const rowCount = df.index.size;
  const values: number[] = [];

  for (let r = 0; r < rowCount; r++) {
    const rowVals: Scalar[] = [];
    for (const col of colNames) {
      const series = df.col(col);
      if (isNumericKind(series.dtype.kind)) {
        rowVals.push(series.values[r] as Scalar);
      }
    }
    const xs = extractNumbers(rowVals, skipna);
    values.push(statFn(xs));
  }

  return new Series({ data: values, index: df.index });
}
