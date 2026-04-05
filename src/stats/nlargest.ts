/**
 * nlargest / nsmallest — return the n largest or smallest values.
 *
 * Mirrors `pandas.Series.nlargest()` / `pandas.Series.nsmallest()` and
 * `pandas.DataFrame.nlargest()` / `pandas.DataFrame.nsmallest()`:
 *
 * - `nlargestSeries(series, n, keep)` — n largest values, sorted descending
 * - `nsmallestSeries(series, n, keep)` — n smallest values, sorted ascending
 * - `nlargestDataFrame(df, n, columns, keep)` — n rows with largest column values
 * - `nsmallestDataFrame(df, n, columns, keep)` — n rows with smallest column values
 *
 * NaN / null values are excluded from the selection (same as pandas).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * How to handle duplicate values at the selection boundary.
 *
 * - `"first"` (default): among ties, keep those that appear first in the original data.
 * - `"last"`: among ties, keep those that appear last in the original data.
 * - `"all"`: include all ties at the boundary, even if this returns more than `n` rows.
 */
export type NKeep = "first" | "last" | "all";

/** Options for {@link nlargestSeries}, {@link nsmallestSeries}. */
export interface NTopOptions {
  /**
   * How to handle duplicate values at the boundary.
   * @defaultValue `"first"`
   */
  readonly keep?: NKeep;
}

/** Options for {@link nlargestDataFrame}, {@link nsmallestDataFrame}. */
export interface NTopDataFrameOptions {
  /** Columns to sort by (primary then secondary, etc.). */
  readonly columns: string | readonly string[];
  /**
   * How to handle duplicate rows at the boundary.
   * @defaultValue `"first"`
   */
  readonly keep?: NKeep;
}

// ─── internal types ───────────────────────────────────────────────────────────

/** A (value, original-position) pair used during selection. */
interface ValPos {
  readonly val: number | string | boolean;
  readonly pos: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Compare two non-missing scalars.
 * Returns a negative number, 0, or a positive number.
 */
function cmpNonNull(a: number | string | boolean, b: number | string | boolean): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/**
 * Compare two Scalars; missing values sort last (treated as the worst value
 * regardless of ascending direction).
 */
function cmpScalar(a: Scalar, b: Scalar): number {
  const aMiss = isMissing(a);
  const bMiss = isMissing(b);
  if (aMiss && bMiss) {
    return 0;
  }
  if (aMiss) {
    return 1;
  }
  if (bMiss) {
    return -1;
  }
  return cmpNonNull(a as number | string | boolean, b as number | string | boolean);
}

/** Collect (value, position) pairs for every non-missing element in `values`. */
function buildValidPairs(values: readonly Scalar[]): ValPos[] {
  const pairs: ValPos[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i] as Scalar;
    if (!isMissing(v)) {
      pairs.push({ val: v as number | string | boolean, pos: i });
    }
  }
  return pairs;
}

/** In-place sort by value (primary) then by position for tie-breaking. */
function sortPairsByValAndPos(pairs: ValPos[], ascending: boolean, keep: "first" | "last"): void {
  pairs.sort((a, b) => {
    const c = cmpNonNull(a.val, b.val);
    const ordered = ascending ? c : -c;
    if (ordered !== 0) {
      return ordered;
    }
    return keep === "first" ? a.pos - b.pos : b.pos - a.pos;
  });
}

/** Select positions using `keep="all"` semantics (may exceed n). */
function selectAllPositions(pairs: ValPos[], n: number, ascending: boolean): number[] {
  const sorted = [...pairs].sort((a, b) => {
    const c = cmpNonNull(a.val, b.val);
    return ascending ? c : -c;
  });
  const take = Math.min(n, sorted.length);
  if (take === 0) {
    return [];
  }
  const boundary = sorted[take - 1];
  if (boundary === undefined) {
    return [];
  }
  const threshVal = boundary.val;
  const selected = pairs.filter(({ val }) => {
    const c = cmpNonNull(val, threshVal);
    return ascending ? c <= 0 : c >= 0;
  });
  selected.sort((a, b) => {
    const c = cmpNonNull(a.val, b.val);
    return ascending ? c : -c;
  });
  return selected.map(({ pos }) => pos);
}

/** Select positions using `keep="first"` or `keep="last"` semantics. */
function selectFirstLastPositions(
  pairs: ValPos[],
  n: number,
  ascending: boolean,
  keep: "first" | "last",
): number[] {
  sortPairsByValAndPos(pairs, ascending, keep);
  const selected = pairs.slice(0, Math.min(n, pairs.length));
  selected.sort((a, b) => {
    const c = cmpNonNull(a.val, b.val);
    return ascending ? c : -c;
  });
  return selected.map(({ pos }) => pos);
}

/** Choose original positions for the top-n selection of a value array. */
function selectSeriesPositions(
  values: readonly Scalar[],
  n: number,
  ascending: boolean,
  keep: NKeep,
): number[] {
  const pairs = buildValidPairs(values);
  if (keep === "all") {
    return selectAllPositions(pairs, n, ascending);
  }
  return selectFirstLastPositions(pairs, n, ascending, keep);
}

/** Build a result Series by selecting rows at the given positions. */
function buildSeriesResult(series: Series<Scalar>, positions: readonly number[]): Series<Scalar> {
  const data: Scalar[] = positions.map((i) => series.values[i] as Scalar);
  const idxVals: Label[] = positions.map((i) => series.index.at(i));
  return new Series<Scalar>({
    data,
    index: idxVals,
    name: series.name,
    dtype: series.dtype,
  });
}

// ─── DataFrame helpers ────────────────────────────────────────────────────────

/** Resolve `columns` option to a `readonly string[]`. */
function resolveCols(columns: string | readonly string[]): readonly string[] {
  return typeof columns === "string" ? [columns] : columns;
}

/**
 * Compare two DataFrame rows lexicographically by `cols`.
 * Missing values sort last regardless of direction.
 */
function cmpRows(
  df: DataFrame,
  i: number,
  j: number,
  cols: readonly string[],
  ascending: boolean,
): number {
  for (const col of cols) {
    const s = df.col(col);
    const vi = s.values[i] as Scalar;
    const vj = s.values[j] as Scalar;
    const c = cmpScalar(vi, vj);
    const ordered = ascending ? c : -c;
    if (ordered !== 0) {
      return ordered;
    }
  }
  return 0;
}

/** Collect sorted row-index positions for `keep="all"` mode on a DataFrame. */
function dfSelectAll(
  df: DataFrame,
  n: number,
  cols: readonly string[],
  ascending: boolean,
): number[] {
  const nRows = df.index.size;
  const order = Array.from({ length: nRows }, (_, i) => i);
  order.sort((a, b) => cmpRows(df, a, b, cols, ascending));
  const take = Math.min(n, nRows);
  if (take === 0) {
    return [];
  }
  const boundary = order[take - 1];
  if (boundary === undefined) {
    return [];
  }
  const selected = order.filter((i) => cmpRows(df, i, boundary, cols, ascending) <= 0);
  selected.sort((a, b) => cmpRows(df, a, b, cols, ascending));
  return selected;
}

/** Collect sorted row-index positions for `keep="first"` or `keep="last"` on a DataFrame. */
function dfSelectFirstLast(
  df: DataFrame,
  n: number,
  cols: readonly string[],
  ascending: boolean,
  keep: "first" | "last",
): number[] {
  const nRows = df.index.size;
  const order = Array.from({ length: nRows }, (_, i) => i);
  order.sort((a, b) => {
    const c = cmpRows(df, a, b, cols, ascending);
    if (c !== 0) {
      return c;
    }
    return keep === "first" ? a - b : b - a;
  });
  const selected = order.slice(0, Math.min(n, nRows));
  selected.sort((a, b) => cmpRows(df, a, b, cols, ascending));
  return selected;
}

/** Choose row positions for a DataFrame nlargest/nsmallest operation. */
function selectDataFrameRows(
  df: DataFrame,
  n: number,
  cols: readonly string[],
  ascending: boolean,
  keep: NKeep,
): number[] {
  if (keep === "all") {
    return dfSelectAll(df, n, cols, ascending);
  }
  return dfSelectFirstLast(df, n, cols, ascending, keep);
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Return the `n` largest values from `series`, sorted in descending order.
 *
 * NaN / null values are excluded from the result (same as pandas).
 *
 * Mirrors `pandas.Series.nlargest()`.
 *
 * @param series  - Input Series.
 * @param n       - Number of values to return.
 * @param options - Selection options (keep).
 * @returns A new Series with at most `n` elements (more if `keep="all"` and there are ties).
 *
 * @example
 * ```ts
 * import { Series, nlargestSeries } from "tsb";
 *
 * const s = new Series({ data: [3, 1, 4, 1, 5, 9, 2, 6] });
 * nlargestSeries(s, 3).values;  // [9, 6, 5]
 * ```
 */
export function nlargestSeries(
  series: Series<Scalar>,
  n: number,
  options: NTopOptions = {},
): Series<Scalar> {
  const keep: NKeep = options.keep ?? "first";
  const positions = selectSeriesPositions(series.values, n, false, keep);
  return buildSeriesResult(series, positions);
}

/**
 * Return the `n` smallest values from `series`, sorted in ascending order.
 *
 * NaN / null values are excluded from the result (same as pandas).
 *
 * Mirrors `pandas.Series.nsmallest()`.
 *
 * @param series  - Input Series.
 * @param n       - Number of values to return.
 * @param options - Selection options (keep).
 * @returns A new Series with at most `n` elements (more if `keep="all"` and there are ties).
 *
 * @example
 * ```ts
 * import { Series, nsmallestSeries } from "tsb";
 *
 * const s = new Series({ data: [3, 1, 4, 1, 5, 9, 2, 6] });
 * nsmallestSeries(s, 3).values;  // [1, 1, 2]
 * ```
 */
export function nsmallestSeries(
  series: Series<Scalar>,
  n: number,
  options: NTopOptions = {},
): Series<Scalar> {
  const keep: NKeep = options.keep ?? "first";
  const positions = selectSeriesPositions(series.values, n, true, keep);
  return buildSeriesResult(series, positions);
}

/**
 * Return the `n` rows of `df` with the largest values in the specified columns.
 *
 * Rows are returned sorted in descending order of the key columns.
 * NaN / null values sort last (treated as smallest).
 *
 * Mirrors `pandas.DataFrame.nlargest()`.
 *
 * @param df      - Input DataFrame.
 * @param n       - Number of rows to return.
 * @param options - Must include `columns` (string or string[]); optional `keep`.
 * @returns A new DataFrame with at most `n` rows (more if `keep="all"` and ties exist).
 *
 * @example
 * ```ts
 * import { DataFrame, nlargestDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [3, 1, 4, 1, 5], b: [10, 20, 30, 40, 50] });
 * nlargestDataFrame(df, 2, { columns: "a" }).col("a").values;  // [5, 4]
 * ```
 */
export function nlargestDataFrame(
  df: DataFrame,
  n: number,
  options: NTopDataFrameOptions,
): DataFrame {
  const cols = resolveCols(options.columns);
  const keep: NKeep = options.keep ?? "first";
  const positions = selectDataFrameRows(df, n, cols, false, keep);
  return df.iloc(positions);
}

/**
 * Return the `n` rows of `df` with the smallest values in the specified columns.
 *
 * Rows are returned sorted in ascending order of the key columns.
 * NaN / null values sort last.
 *
 * Mirrors `pandas.DataFrame.nsmallest()`.
 *
 * @param df      - Input DataFrame.
 * @param n       - Number of rows to return.
 * @param options - Must include `columns` (string or string[]); optional `keep`.
 * @returns A new DataFrame with at most `n` rows (more if `keep="all"` and ties exist).
 *
 * @example
 * ```ts
 * import { DataFrame, nsmallestDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [3, 1, 4, 1, 5], b: [10, 20, 30, 40, 50] });
 * nsmallestDataFrame(df, 2, { columns: "a" }).col("a").values;  // [1, 1]
 * ```
 */
export function nsmallestDataFrame(
  df: DataFrame,
  n: number,
  options: NTopDataFrameOptions,
): DataFrame {
  const cols = resolveCols(options.columns);
  const keep: NKeep = options.keep ?? "first";
  const positions = selectDataFrameRows(df, n, cols, true, keep);
  return df.iloc(positions);
}
