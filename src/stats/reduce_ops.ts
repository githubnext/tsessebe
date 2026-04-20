/**
 * reduce_ops — boolean and counting reduction operations for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.nunique()` / `DataFrame.nunique()` — count distinct non-null values
 * - `Series.any()` / `DataFrame.any()` — true if any element is truthy
 * - `Series.all()` / `DataFrame.all()` — true if all elements are truthy
 *
 * All functions are **pure** (return new objects; inputs are unchanged).
 *
 * @module
 */

import type { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link nuniqueSeries} and {@link nunique}. */
export interface NuniqueOptions {
  /**
   * Whether to exclude missing values (null, undefined, NaN) from the count.
   * Defaults to `true` — same as pandas.
   */
  readonly dropna?: boolean;
}

/** Options for {@link nunique} (DataFrame variant). */
export interface NuniqueDataFrameOptions extends NuniqueOptions {
  /**
   * - `0` or `"index"` (default): count unique values **per column**.
   * - `1` or `"columns"`: count unique values **per row**.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

/** Options for {@link anySeries}, {@link allSeries}, {@link anyDataFrame}, {@link allDataFrame}. */
export interface BoolReduceOptions {
  /**
   * Whether to skip missing values (null, undefined, NaN).
   * Defaults to `true` — same as pandas.
   */
  readonly skipna?: boolean;
}

/** Options for {@link anyDataFrame} and {@link allDataFrame}. */
export interface BoolReduceDataFrameOptions extends BoolReduceOptions {
  /**
   * - `0` or `"index"` (default): reduce along **rows** → result per column.
   * - `1` or `"columns"`: reduce along **columns** → result per row.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
  /**
   * When `true`, only consider boolean columns.
   * Defaults to `false` — same as pandas.
   */
  readonly boolOnly?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Resolve axis to a numeric form (0 = column-wise, 1 = row-wise). */
function resolveAxis(axis: 0 | 1 | "index" | "columns" | undefined): 0 | 1 {
  if (axis === 1 || axis === "columns") {
    return 1;
  }
  return 0;
}

/** Count distinct values in an array, optionally dropping missing values. */
function countUnique(vals: readonly Scalar[], dropna: boolean): number {
  const seen = new Set<Scalar>();
  for (const v of vals) {
    if (dropna && isMissing(v)) {
      continue;
    }
    seen.add(v);
  }
  return seen.size;
}

/** True if any element in `vals` is truthy, with optional skipna. */
function reduceAny(vals: readonly Scalar[], skipna: boolean): boolean {
  for (const v of vals) {
    if (skipna && isMissing(v)) {
      continue;
    }
    if (v) {
      return true;
    }
  }
  return false;
}

/** True if all elements in `vals` are truthy, with optional skipna. */
function reduceAll(vals: readonly Scalar[], skipna: boolean): boolean {
  for (const v of vals) {
    if (skipna && isMissing(v)) {
      continue;
    }
    if (!v) {
      return false;
    }
  }
  return true;
}

// ─── nunique ──────────────────────────────────────────────────────────────────

/**
 * Count distinct values in a Series.
 *
 * Missing values (null, undefined, NaN) are excluded by default.
 *
 * @param series  - Input Series.
 * @param options - Control whether to exclude missing values.
 * @returns         Number of unique values.
 *
 * @example
 * ```ts
 * const s = new Series([1, 2, 2, null]);
 * nuniqueSeries(s); // 2
 * nuniqueSeries(s, { dropna: false }); // 3
 * ```
 */
export function nuniqueSeries(series: Series<Scalar>, options: NuniqueOptions = {}): number {
  const dropna = options.dropna ?? true;
  return countUnique(series.values, dropna);
}

/**
 * Count distinct values per column (or per row) in a DataFrame.
 *
 * @param df      - Input DataFrame.
 * @param options - Axis (0 = column-wise, 1 = row-wise) and dropna flag.
 * @returns         Series with count of unique values per column/row.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 2], b: ["x", "y", "x"] });
 * nunique(df); // Series { a: 2, b: 2 }
 * ```
 */
export function nunique(df: DataFrame, options: NuniqueDataFrameOptions = {}): Series<Scalar> {
  const axis = resolveAxis(options.axis);
  const dropna = options.dropna ?? true;

  if (axis === 0) {
    return nuniqueByColumns(df, dropna);
  }
  return nuniqueByRows(df, dropna);
}

/** Count unique values per column → result is column-indexed Series. */
function nuniqueByColumns(df: DataFrame, dropna: boolean): Series<Scalar> {
  const colNames = [...df.columns.values];
  const counts: Scalar[] = colNames.map((name) => countUnique(df.col(name).values, dropna));
  return new Series<Scalar>({ data: counts, index: new Index<Label>(colNames) });
}

/** Count unique values per row → result is row-indexed Series. */
function nuniqueByRows(df: DataFrame, dropna: boolean): Series<Scalar> {
  const colNames = [...df.columns.values];
  const nRows = df.index.size;
  const counts: Scalar[] = [];
  for (let r = 0; r < nRows; r++) {
    const row: Scalar[] = colNames.map((c) => df.col(c).values[r] ?? null);
    counts.push(countUnique(row, dropna));
  }
  return new Series<Scalar>({ data: counts, index: df.index });
}

// ─── any ─────────────────────────────────────────────────────────────────────

/**
 * Return `true` if any element in a Series is truthy.
 *
 * @param series  - Input Series.
 * @param options - Whether to skip missing values (default: `true`).
 * @returns         `true` when at least one truthy element exists.
 *
 * @example
 * ```ts
 * const s = new Series([0, 0, 1]);
 * anySeries(s); // true
 * ```
 */
export function anySeries(series: Series<Scalar>, options: BoolReduceOptions = {}): boolean {
  const skipna = options.skipna ?? true;
  return reduceAny(series.values, skipna);
}

/**
 * Return a boolean Series indicating whether any element is truthy per column (or row).
 *
 * @param df      - Input DataFrame.
 * @param options - Axis, skipna, and boolOnly options.
 * @returns         Boolean Series with one value per column (axis=0) or row (axis=1).
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [0, 0, 1], b: [0, 0, 0] });
 * anyDataFrame(df); // Series { a: true, b: false }
 * ```
 */
export function anyDataFrame(
  df: DataFrame,
  options: BoolReduceDataFrameOptions = {},
): Series<Scalar> {
  const axis = resolveAxis(options.axis);
  const skipna = options.skipna ?? true;
  const boolOnly = options.boolOnly ?? false;

  if (axis === 0) {
    return anyByColumns(df, skipna, boolOnly);
  }
  return anyByRows(df, skipna, boolOnly);
}

/** `any` per column → result indexed by column names. */
function anyByColumns(df: DataFrame, skipna: boolean, boolOnly: boolean): Series<Scalar> {
  const colNames = getRelevantColumns(df, boolOnly);
  const result: Scalar[] = colNames.map((name) => reduceAny(df.col(name).values, skipna));
  return new Series<Scalar>({ data: result, index: new Index<Label>(colNames) });
}

/** `any` per row → result indexed by row index. */
function anyByRows(df: DataFrame, skipna: boolean, boolOnly: boolean): Series<Scalar> {
  const colNames = getRelevantColumns(df, boolOnly);
  const nRows = df.index.size;
  const result: Scalar[] = [];
  for (let r = 0; r < nRows; r++) {
    const row: Scalar[] = colNames.map((c) => df.col(c).values[r] ?? null);
    result.push(reduceAny(row, skipna));
  }
  return new Series<Scalar>({ data: result, index: df.index });
}

// ─── all ─────────────────────────────────────────────────────────────────────

/**
 * Return `true` if all elements in a Series are truthy.
 *
 * @param series  - Input Series.
 * @param options - Whether to skip missing values (default: `true`).
 * @returns         `true` when every non-missing element is truthy.
 *
 * @example
 * ```ts
 * const s = new Series([1, 2, 3]);
 * allSeries(s); // true
 * ```
 */
export function allSeries(series: Series<Scalar>, options: BoolReduceOptions = {}): boolean {
  const skipna = options.skipna ?? true;
  return reduceAll(series.values, skipna);
}

/**
 * Return a boolean Series indicating whether all elements are truthy per column (or row).
 *
 * @param df      - Input DataFrame.
 * @param options - Axis, skipna, and boolOnly options.
 * @returns         Boolean Series with one value per column (axis=0) or row (axis=1).
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [0, 1, 1] });
 * allDataFrame(df); // Series { a: true, b: false }
 * ```
 */
export function allDataFrame(
  df: DataFrame,
  options: BoolReduceDataFrameOptions = {},
): Series<Scalar> {
  const axis = resolveAxis(options.axis);
  const skipna = options.skipna ?? true;
  const boolOnly = options.boolOnly ?? false;

  if (axis === 0) {
    return allByColumns(df, skipna, boolOnly);
  }
  return allByRows(df, skipna, boolOnly);
}

/** `all` per column → result indexed by column names. */
function allByColumns(df: DataFrame, skipna: boolean, boolOnly: boolean): Series<Scalar> {
  const colNames = getRelevantColumns(df, boolOnly);
  const result: Scalar[] = colNames.map((name) => reduceAll(df.col(name).values, skipna));
  return new Series<Scalar>({ data: result, index: new Index<Label>(colNames) });
}

/** `all` per row → result indexed by row index. */
function allByRows(df: DataFrame, skipna: boolean, boolOnly: boolean): Series<Scalar> {
  const colNames = getRelevantColumns(df, boolOnly);
  const nRows = df.index.size;
  const result: Scalar[] = [];
  for (let r = 0; r < nRows; r++) {
    const row: Scalar[] = colNames.map((c) => df.col(c).values[r] ?? null);
    result.push(reduceAll(row, skipna));
  }
  return new Series<Scalar>({ data: result, index: df.index });
}

// ─── shared helpers ───────────────────────────────────────────────────────────

/** Filter column names to only boolean columns when boolOnly=true. */
function getRelevantColumns(df: DataFrame, boolOnly: boolean): string[] {
  const colNames = [...df.columns.values];
  if (!boolOnly) {
    return colNames;
  }
  return colNames.filter((name) => df.col(name).dtype.kind === "bool");
}
