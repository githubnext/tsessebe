/**
 * dropna — remove missing values from Series or DataFrame.
 *
 * Mirrors `pandas.DataFrame.dropna` and `pandas.Series.dropna` as standalone
 * functions with the full suite of options: `axis`, `how`, `thresh`, `subset`.
 *
 * The existing `.dropna()` class methods only handle the simplest case
 * (drop rows where *any* value is missing). This module adds:
 *
 * - **axis = 1 / "columns"** — drop *columns* that contain missing values
 * - **how = "all"** — only drop if *all* values are missing (vs. any)
 * - **thresh** — keep rows/columns that have at least N non-missing values
 * - **subset** — restrict the check to a list of columns (DataFrame axis=0)
 *
 * @module
 *
 * @example
 * ```ts
 * import { dropna } from "tsb";
 * import { DataFrame, Series } from "tsb";
 *
 * // Series — drop missing elements
 * const s = new Series({ data: [1, null, NaN, 4] });
 * dropna(s).values; // [1, 4]
 *
 * // DataFrame — drop rows with any missing value (default)
 * const df = DataFrame.fromColumns({ a: [1, null, 3], b: [4, 5, null] });
 * dropna(df).shape; // [1, 2]  (only row index 0 survives)
 *
 * // how = "all" — only drop rows where every value is missing
 * dropna(df, { how: "all" }).shape; // [2, 2]
 *
 * // thresh — keep rows with at least 2 non-null values
 * dropna(df, { thresh: 2 }).shape; // [1, 2]
 *
 * // axis = 1 — drop columns with any missing value
 * dropna(df, { axis: 1 }).columns.toArray(); // []
 *
 * // subset — only check column "a" when deciding which rows to drop
 * dropna(df, { subset: ["a"] }).shape; // [2, 2]
 * ```
 */

import type { DataFrame } from "../core/frame.ts";
import { Series } from "../core/series.ts";
import type { Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar value is considered missing (null, undefined, or NaN). */
function missing(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

// ─── public types ─────────────────────────────────────────────────────────────

/** How to decide that a row/column should be dropped. */
export type DropnaHow = "any" | "all";

/** Options for {@link dropnaDataFrame}. */
export interface DropnaDataFrameOptions {
  /**
   * Axis along which to drop:
   * - `0` / `"index"` — drop *rows* (default)
   * - `1` / `"columns"` — drop *columns*
   */
  axis?: 0 | 1 | "index" | "columns";

  /**
   * - `"any"` (default) — drop if *any* value in the row/column is missing
   * - `"all"` — drop only if *all* values are missing
   */
  how?: DropnaHow;

  /**
   * Minimum number of **non-null** values required to keep a row/column.
   * When provided, overrides `how`.
   */
  thresh?: number;

  /**
   * For `axis=0` only: restrict the missing-value check to these column names.
   * Ignored for `axis=1`.
   */
  subset?: readonly string[];
}

// ─── Series overload ──────────────────────────────────────────────────────────

/**
 * Drop missing values from a Series.
 *
 * Returns a new Series containing only the elements that are not null,
 * undefined, or NaN.
 *
 * @param s - Input Series.
 * @returns New Series with missing values removed.
 */
export function dropnaSeries<T extends Scalar>(s: Series<T>): Series<T> {
  return s.dropna();
}

// ─── DataFrame implementation ─────────────────────────────────────────────────

/**
 * Drop rows or columns containing missing values from a DataFrame.
 *
 * @param df - Input DataFrame.
 * @param options - Control axis, how, thresh, and subset.
 * @returns New DataFrame with missing rows/columns removed.
 */
export function dropnaDataFrame(df: DataFrame, options: DropnaDataFrameOptions = {}): DataFrame {
  const { axis = 0, how = "any", thresh, subset } = options;
  const axisNum = axis === "columns" ? 1 : axis === "index" ? 0 : axis;

  if (axisNum === 1) {
    return _dropColumnsWithMissing(df, how, thresh);
  }
  return _dropRowsWithMissing(df, how, thresh, subset);
}

// ─── axis = 0: drop rows ──────────────────────────────────────────────────────

function _dropRowsWithMissing(
  df: DataFrame,
  how: DropnaHow,
  thresh: number | undefined,
  subset: readonly string[] | undefined,
): DataFrame {
  const nRows = df.shape[0];
  const colNames = df.columns.toArray() as string[];

  // Columns to check for missing values.
  const checkCols: string[] = subset
    ? colNames.filter((c) => (subset as readonly string[]).includes(c))
    : colNames;

  // Pre-fetch column values for speed.
  const colValues: Map<string, readonly Scalar[]> = new Map();
  for (const col of checkCols) {
    colValues.set(col, df.col(col).values as readonly Scalar[]);
  }

  const keepRows: number[] = [];
  for (let i = 0; i < nRows; i++) {
    if (_keepRow(i, checkCols, colValues, how, thresh)) {
      keepRows.push(i);
    }
  }

  return _selectRows(df, keepRows);
}

/** Decide whether row `i` should be kept. */
function _keepRow(
  i: number,
  checkCols: readonly string[],
  colValues: Map<string, readonly Scalar[]>,
  how: DropnaHow,
  thresh: number | undefined,
): boolean {
  if (checkCols.length === 0) {
    return true;
  }

  let nullCount = 0;
  let nonNullCount = 0;

  for (const col of checkCols) {
    const vals = colValues.get(col);
    if (vals === undefined) {
      continue;
    }
    const v = vals[i];
    if (missing(v)) {
      nullCount++;
    } else {
      nonNullCount++;
    }
  }

  if (thresh !== undefined) {
    return nonNullCount >= thresh;
  }
  if (how === "all") {
    return nullCount < checkCols.length; // keep unless ALL are missing
  }
  // how === "any"
  return nullCount === 0;
}

// ─── axis = 1: drop columns ───────────────────────────────────────────────────

function _dropColumnsWithMissing(
  df: DataFrame,
  how: DropnaHow,
  thresh: number | undefined,
): DataFrame {
  const nRows = df.shape[0];
  const colNames = df.columns.toArray() as string[];
  const keepCols: string[] = [];

  for (const col of colNames) {
    const vals = df.col(col).values as readonly Scalar[];
    if (_keepColumn(vals, nRows, how, thresh)) {
      keepCols.push(col);
    }
  }

  return _selectCols(df, keepCols);
}

/** Decide whether column `col` should be kept. */
function _keepColumn(
  vals: readonly Scalar[],
  nRows: number,
  how: DropnaHow,
  thresh: number | undefined,
): boolean {
  if (nRows === 0) {
    return true;
  }

  let nullCount = 0;
  for (const v of vals) {
    if (missing(v)) {
      nullCount++;
    }
  }
  const nonNullCount = nRows - nullCount;

  if (thresh !== undefined) {
    return nonNullCount >= thresh;
  }
  if (how === "all") {
    return nullCount < nRows;
  }
  // how === "any"
  return nullCount === 0;
}

// ─── DataFrame selection helpers ──────────────────────────────────────────────

/** Build a new DataFrame keeping only the specified row positions. */
function _selectRows(df: DataFrame, positions: readonly number[]): DataFrame {
  // Re-implement via the public .filter() API using a boolean mask.
  const nRows = df.shape[0];
  const posSet = new Set(positions);
  const mask: boolean[] = Array.from({ length: nRows }, (_, i) => posSet.has(i));
  return df.filter(mask);
}

/** Build a new DataFrame keeping only the specified columns. */
function _selectCols(df: DataFrame, colNames: readonly string[]): DataFrame {
  return df.select(colNames);
}

// ─── unified overloads ────────────────────────────────────────────────────────

/**
 * Drop missing values — works on both Series and DataFrame.
 *
 * **Series**: no options needed; always returns a new Series with missing
 * elements removed.
 *
 * **DataFrame**: full options (`axis`, `how`, `thresh`, `subset`) are available.
 *
 * @example
 * ```ts
 * // Series
 * dropna(new Series({ data: [1, null, 3] })).values; // [1, 3]
 *
 * // DataFrame — drop columns that have any missing value
 * dropna(df, { axis: 1 });
 *
 * // DataFrame — drop rows that are entirely null
 * dropna(df, { how: "all" });
 * ```
 */
export function dropna<T extends Scalar>(s: Series<T>): Series<T>;
export function dropna(df: DataFrame, options?: DropnaDataFrameOptions): DataFrame;
export function dropna<T extends Scalar>(
  input: Series<T> | DataFrame,
  options?: DropnaDataFrameOptions,
): Series<T> | DataFrame {
  if (input instanceof Series) {
    return dropnaSeries(input);
  }
  return dropnaDataFrame(input, options ?? {});
}
