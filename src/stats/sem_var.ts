/**
 * sem_var — sample/population variance and standard error of the mean for
 * Series and DataFrame.
 *
 * Mirrors:
 * - `pandas.Series.var(ddof?, skipna?, min_count?)` — variance
 * - `pandas.Series.sem(ddof?, skipna?, min_count?)` — standard error of mean
 * - `pandas.DataFrame.var(axis?, ddof?, skipna?, numeric_only?)`
 * - `pandas.DataFrame.sem(axis?, ddof?, skipna?, numeric_only?)`
 *
 * `ddof` (degrees of freedom delta):
 * - `1` (default): sample variance — divides by `n - 1`
 * - `0`: population variance — divides by `n`
 *
 * `skipna` (default `true`): ignore NaN/null values.
 * `minCount` (default `1`): minimum number of valid observations required;
 *   returns `NaN` if fewer are present.
 *
 * SEM = sqrt(var / n) where var uses the given ddof.
 *
 * @module
 */

import type { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { DtypeKind } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link varSeries} and {@link semSeries}. */
export interface VarSemSeriesOptions {
  /**
   * Delta degrees of freedom. Divisor is `n - ddof`.
   * @defaultValue `1`
   */
  readonly ddof?: number;
  /**
   * If `true` (default), exclude null/NaN values.
   */
  readonly skipna?: boolean;
  /**
   * Minimum number of non-null observations required.  Returns `NaN` when
   * fewer valid values are present.
   * @defaultValue `1`
   */
  readonly minCount?: number;
}

/** Options for {@link varDataFrame} and {@link semDataFrame}. */
export interface VarSemDataFrameOptions extends VarSemSeriesOptions {
  /**
   * Axis along which to compute.
   * - `0` (default): reduce along rows, one result per column.
   * - `1`: reduce along columns, one result per row.
   */
  readonly axis?: 0 | 1;
  /**
   * If `true`, only include numeric columns when `axis=0`.
   * @defaultValue `false`
   */
  readonly numericOnly?: boolean;
}

/** Internal callback type for variance/SEM reduction. */
type StatFn = (xs: readonly number[], ddof: number, minCount: number) => number;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar value is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** True when a dtype kind is numeric. */
function isNumericKind(kind: DtypeKind): boolean {
  return kind === "int" || kind === "uint" || kind === "float";
}

/**
 * Extract numeric values, respecting skipna and minCount.
 * Returns an empty array when skipna=false and any missing value is present.
 */
function extractNumbers(values: readonly Scalar[], skipna: boolean): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (isMissing(v)) {
      if (!skipna) {
        return []; // NaN propagation when skipna=false
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
 * Compute sample/population variance.
 *
 * Returns `NaN` when fewer than `minCount` values are present, or when
 * `n - ddof <= 0`.
 */
function computeVar(xs: readonly number[], ddof: number, minCount: number): number {
  const n = xs.length;
  if (n < minCount) {
    return Number.NaN;
  }
  const denom = n - ddof;
  if (denom <= 0) {
    return Number.NaN;
  }
  let sum = 0;
  for (const x of xs) {
    sum += x;
  }
  const mean = sum / n;
  let ss = 0;
  for (const x of xs) {
    const d = x - mean;
    ss += d * d;
  }
  return ss / denom;
}

/**
 * Compute standard error of the mean: sqrt(var(ddof) / n).
 *
 * Returns `NaN` when variance is `NaN` or n = 0.
 */
function computeSem(xs: readonly number[], ddof: number, minCount: number): number {
  const n = xs.length;
  if (n < minCount || n === 0) {
    return Number.NaN;
  }
  const v = computeVar(xs, ddof, minCount);
  if (Number.isNaN(v)) {
    return Number.NaN;
  }
  return Math.sqrt(v / n);
}

// ─── Series reduction ─────────────────────────────────────────────────────────

function reduceSeriesImpl(
  series: Series<Scalar>,
  options: VarSemSeriesOptions,
  statFn: StatFn,
): number {
  const ddof = options.ddof ?? 1;
  const skipna = options.skipna ?? true;
  const minCount = options.minCount ?? 1;
  const xs = extractNumbers(series.values as readonly Scalar[], skipna);
  return statFn(xs, ddof, minCount);
}

// ─── DataFrame reduction ──────────────────────────────────────────────────────

/** Reduce each column of df to a scalar using statFn. */
function reduceColumns(
  df: DataFrame,
  options: VarSemDataFrameOptions,
  statFn: StatFn,
): Series<Scalar> {
  const ddof = options.ddof ?? 1;
  const skipna = options.skipna ?? true;
  const minCount = options.minCount ?? 1;
  const numericOnly = options.numericOnly ?? false;

  const colNames = df.columns.values as readonly string[];
  const labels: string[] = [];
  const values: number[] = [];

  for (const col of colNames) {
    const s = df.col(col);
    if (numericOnly && !isNumericKind(s.dtype.kind)) {
      continue;
    }
    labels.push(col);
    if (!isNumericKind(s.dtype.kind)) {
      values.push(Number.NaN);
      continue;
    }
    const xs = extractNumbers(s.values as readonly Scalar[], skipna);
    values.push(statFn(xs, ddof, minCount));
  }

  return new Series({ data: values, index: labels });
}

/** Reduce each row of df to a scalar using statFn. */
function reduceRows(
  df: DataFrame,
  options: VarSemDataFrameOptions,
  statFn: StatFn,
): Series<Scalar> {
  const ddof = options.ddof ?? 1;
  const skipna = options.skipna ?? true;
  const minCount = options.minCount ?? 1;

  const colNames = df.columns.values as readonly string[];
  const rowCount = df.index.size;
  const values: number[] = [];

  for (let r = 0; r < rowCount; r++) {
    const rowVals: Scalar[] = [];
    for (const col of colNames) {
      const s = df.col(col);
      if (isNumericKind(s.dtype.kind)) {
        rowVals.push(s.values[r] as Scalar);
      }
    }
    const xs = extractNumbers(rowVals, skipna);
    values.push(statFn(xs, ddof, minCount));
  }

  return new Series({ data: values, index: df.index });
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Return the variance of a numeric Series.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [2, 4, 4, 4, 5, 5, 7, 9] });
 * varSeries(s); // 4 (sample variance, ddof=1)
 * varSeries(s, { ddof: 0 }); // 3.5 (population variance)
 * ```
 */
export function varSeries(series: Series<Scalar>, options: VarSemSeriesOptions = {}): number {
  return reduceSeriesImpl(series, options, computeVar);
}

/**
 * Return the standard error of the mean (SEM) of a numeric Series.
 *
 * SEM = sqrt(var(ddof) / n) where n is the number of valid observations.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [2, 4, 4, 4, 5, 5, 7, 9] });
 * semSeries(s); // sqrt(4 / 8) = 0.707...
 * ```
 */
export function semSeries(series: Series<Scalar>, options: VarSemSeriesOptions = {}): number {
  return reduceSeriesImpl(series, options, computeSem);
}

/**
 * Return the variance of each column (`axis=0`, default) or each row
 * (`axis=1`) of a DataFrame as a numeric Series.
 *
 * Non-numeric columns without `numericOnly` contribute `NaN` to the result.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * varDataFrame(df); // Series { a: 1, b: 1 }
 * ```
 */
export function varDataFrame(df: DataFrame, options: VarSemDataFrameOptions = {}): Series<Scalar> {
  const axis = options.axis ?? 0;
  return axis === 0 ? reduceColumns(df, options, computeVar) : reduceRows(df, options, computeVar);
}

/**
 * Return the standard error of the mean for each column (`axis=0`, default)
 * or each row (`axis=1`) of a DataFrame as a numeric Series.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * semDataFrame(df); // Series { a: sqrt(1/3), b: sqrt(1/3) }
 * ```
 */
export function semDataFrame(df: DataFrame, options: VarSemDataFrameOptions = {}): Series<Scalar> {
  const axis = options.axis ?? 0;
  return axis === 0 ? reduceColumns(df, options, computeSem) : reduceRows(df, options, computeSem);
}
