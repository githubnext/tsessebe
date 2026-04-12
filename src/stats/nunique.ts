/**
 * nunique_any_all — count unique values and boolean reductions for Series and
 * DataFrame.
 *
 * Mirrors:
 * - `pandas.Series.nunique(dropna?)` — count distinct non-null values
 * - `pandas.Series.any(skipna?)` — true if any element is truthy
 * - `pandas.Series.all(skipna?)` — true if all elements are truthy
 * - `pandas.DataFrame.nunique(axis?, dropna?)`
 * - `pandas.DataFrame.any(axis?, skipna?, bool_only?)`
 * - `pandas.DataFrame.all(axis?, skipna?, bool_only?)`
 *
 * @module
 */

import type { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link nuniqueSeries}. */
export interface NuniqueSeriesOptions {
  /**
   * If `true` (default), exclude null/NaN values from the unique count.
   */
  readonly dropna?: boolean;
}

/** Options for {@link nuniqueDataFrame}. */
export interface NuniqueDataFrameOptions extends NuniqueSeriesOptions {
  /**
   * Axis along which to count unique values.
   * - `0` (default): count per column.
   * - `1`: count per row.
   */
  readonly axis?: 0 | 1;
}

/** Options for {@link anySeries} and {@link allSeries}. */
export interface AnyAllSeriesOptions {
  /**
   * If `true` (default), skip null/NaN values (they do not contribute).
   * If `false`, null/NaN is treated as falsy.
   */
  readonly skipna?: boolean;
}

/** Options for {@link anyDataFrame} and {@link allDataFrame}. */
export interface AnyAllDataFrameOptions extends AnyAllSeriesOptions {
  /**
   * Axis along which to reduce.
   * - `0` (default): reduce along rows, one result per column.
   * - `1`: reduce along columns, one result per row.
   */
  readonly axis?: 0 | 1;
  /**
   * If `true`, only include boolean-typed columns when `axis=0`.
   * @defaultValue `false`
   */
  readonly boolOnly?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a value is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** True when a value is truthy (treating missing as falsy). */
function isTruthy(v: Scalar): boolean {
  if (isMissing(v)) {
    return false;
  }
  return Boolean(v);
}

/** Return true if any value in `vals` is truthy, skipping missing when skipna=true. */
function anyInSlice(vals: readonly Scalar[], skipna: boolean): boolean {
  for (const v of vals) {
    if (skipna && isMissing(v)) {
      continue;
    }
    if (isTruthy(v)) {
      return true;
    }
  }
  return false;
}

/** Return true if all values in `vals` are truthy, skipping missing when skipna=true. */
function allInSlice(vals: readonly Scalar[], skipna: boolean): boolean {
  for (const v of vals) {
    if (skipna && isMissing(v)) {
      continue;
    }
    if (!isTruthy(v)) {
      return false;
    }
  }
  return true;
}

// ─── nunique ──────────────────────────────────────────────────────────────────

/**
 * Count the number of unique values in a Series.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 2, 3, null] as Scalar[] });
 * nuniqueSeries(s); // 3 (null excluded)
 * nuniqueSeries(s, { dropna: false }); // 4
 * ```
 */
export function nuniqueSeries(series: Series<Scalar>, options: NuniqueSeriesOptions = {}): number {
  const dropna = options.dropna ?? true;
  const seen = new Set<Scalar>();
  for (const v of series.values as readonly Scalar[]) {
    if (dropna && isMissing(v)) {
      continue;
    }
    seen.add(v);
  }
  return seen.size;
}

/**
 * Count unique values per column (`axis=0`) or per row (`axis=1`) of a
 * DataFrame.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 2], b: ["x", "x", "y"] });
 * nuniqueDataFrame(df); // Series { a: 2, b: 2 }
 * ```
 */
export function nuniqueDataFrame(
  df: DataFrame,
  options: NuniqueDataFrameOptions = {},
): Series<Scalar> {
  const axis = options.axis ?? 0;
  const dropna = options.dropna ?? true;
  const colNames = df.columns.values as readonly string[];

  if (axis === 0) {
    const labels: string[] = [];
    const values: number[] = [];
    for (const col of colNames) {
      labels.push(col);
      values.push(nuniqueSeries(df.col(col), { dropna }));
    }
    return new Series({ data: values, index: labels });
  }

  // axis === 1: count unique values across each row
  const rowCount = df.index.size;
  const values: number[] = [];
  for (let r = 0; r < rowCount; r++) {
    const seen = new Set<Scalar>();
    for (const col of colNames) {
      const v = df.col(col).values[r] as Scalar;
      if (dropna && isMissing(v)) {
        continue;
      }
      seen.add(v);
    }
    values.push(seen.size);
  }
  return new Series({ data: values, index: df.index });
}

// ─── any ──────────────────────────────────────────────────────────────────────

/**
 * Return `true` if any element in the Series is truthy.
 *
 * With `skipna=true` (default), null/NaN values are skipped.
 * An empty (or all-null with skipna) series returns `false`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [0, 0, 1] });
 * anySeries(s); // true
 * ```
 */
export function anySeries(series: Series<Scalar>, options: AnyAllSeriesOptions = {}): boolean {
  return anyInSlice(series.values as readonly Scalar[], options.skipna ?? true);
}

/**
 * Return `true` if all elements in the Series are truthy.
 *
 * With `skipna=true` (default), null/NaN values are skipped.
 * An empty (or all-null with skipna) series returns `true` (vacuous truth).
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3] });
 * allSeries(s); // true
 * ```
 */
export function allSeries(series: Series<Scalar>, options: AnyAllSeriesOptions = {}): boolean {
  return allInSlice(series.values as readonly Scalar[], options.skipna ?? true);
}

// ─── DataFrame any/all ────────────────────────────────────────────────────────

/** Get the column values for a single row `r` from df. */
function rowValues(df: DataFrame, colNames: readonly string[], r: number): Scalar[] {
  const row: Scalar[] = [];
  for (const col of colNames) {
    row.push(df.col(col).values[r] as Scalar);
  }
  return row;
}

/**
 * Return whether any element is truthy along an axis of a DataFrame.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [0, 0], b: [0, 1] });
 * anyDataFrame(df); // Series { a: false, b: true }
 * ```
 */
export function anyDataFrame(df: DataFrame, options: AnyAllDataFrameOptions = {}): Series<Scalar> {
  const axis = options.axis ?? 0;
  const skipna = options.skipna ?? true;
  const boolOnly = options.boolOnly ?? false;
  const colNames = df.columns.values as readonly string[];

  if (axis === 0) {
    const labels: string[] = [];
    const values: boolean[] = [];
    for (const col of colNames) {
      const s = df.col(col);
      if (boolOnly && s.dtype.kind !== "bool") {
        continue;
      }
      labels.push(col);
      values.push(anySeries(s, { skipna }));
    }
    return new Series({ data: values, index: labels });
  }

  // axis === 1: any across columns for each row
  const values: boolean[] = [];
  for (let r = 0; r < df.index.size; r++) {
    values.push(anyInSlice(rowValues(df, colNames, r), skipna));
  }
  return new Series({ data: values, index: df.index });
}

/**
 * Return whether all elements are truthy along an axis of a DataFrame.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 1], b: [1, 0] });
 * allDataFrame(df); // Series { a: true, b: false }
 * ```
 */
export function allDataFrame(df: DataFrame, options: AnyAllDataFrameOptions = {}): Series<Scalar> {
  const axis = options.axis ?? 0;
  const skipna = options.skipna ?? true;
  const boolOnly = options.boolOnly ?? false;
  const colNames = df.columns.values as readonly string[];

  if (axis === 0) {
    const labels: string[] = [];
    const values: boolean[] = [];
    for (const col of colNames) {
      const s = df.col(col);
      if (boolOnly && s.dtype.kind !== "bool") {
        continue;
      }
      labels.push(col);
      values.push(allSeries(s, { skipna }));
    }
    return new Series({ data: values, index: labels });
  }

  // axis === 1: all across columns for each row
  const values: boolean[] = [];
  for (let r = 0; r < df.index.size; r++) {
    values.push(allInSlice(rowValues(df, colNames, r), skipna));
  }
  return new Series({ data: values, index: df.index });
}
