/**
 * DataFrame.insert() and DataFrame.pop() — column insertion and removal.
 *
 * Mirrors `pandas.DataFrame.insert(loc, column, value)` and
 * `pandas.DataFrame.pop(item)`.
 *
 * Since `DataFrame` in tsb is immutable, both operations return a new DataFrame.
 * `popColumn` returns both the extracted `Series` and the resulting DataFrame.
 *
 * @example
 * ```ts
 * import { DataFrame, insertColumn, popColumn } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 *
 * // Insert column "x" at position 1 (between "a" and "b")
 * const df2 = insertColumn(df, 1, "x", [10, 20]);
 * // df2.columns.values → ["a", "x", "b"]
 *
 * // Pop column "a" out of df2
 * const { series, df: df3 } = popColumn(df2, "a");
 * // series.values → [1, 2]
 * // df3.columns.values → ["x", "b"]
 * ```
 *
 * @packageDocumentation
 */

import type { Label, Scalar } from "../types.ts";
import type { Index } from "./base-index.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── insertColumn ─────────────────────────────────────────────────────────────

/**
 * Insert a new column into `df` at integer column position `loc`.
 *
 * Mirrors `pandas.DataFrame.insert(loc, column, value, allow_duplicates=False)`.
 * Raises a `RangeError` if:
 * - `column` already exists in `df` (no duplicates by default)
 * - `loc` is out of range (must be 0 ≤ loc ≤ df.shape[1])
 * - `values` length does not match the number of rows
 *
 * @param df             Source DataFrame (not mutated).
 * @param loc            Zero-based integer position at which to insert the column.
 * @param column         Name of the new column.
 * @param values         Column data as an array of scalars or a `Series<Scalar>`.
 * @param allowDuplicates When `true`, silently allow duplicate column names. Default `false`.
 * @returns A new DataFrame with the column inserted.
 */
export function insertColumn(
  df: DataFrame,
  loc: number,
  column: string,
  values: readonly Scalar[] | Series<Scalar>,
  allowDuplicates = false,
): DataFrame {
  const nCols = df.shape[1];
  const nRows = df.shape[0];

  if (!allowDuplicates && df.has(column)) {
    throw new RangeError(
      `Column "${column}" already exists. Use allowDuplicates=true to permit duplicate names.`,
    );
  }

  if (loc < 0 || loc > nCols) {
    throw new RangeError(`loc=${loc} is out of range [0, ${nCols}].`);
  }

  // Resolve values to a Series aligned to df's row index.
  const series: Series<Scalar> =
    values instanceof Series
      ? values
      : new Series<Scalar>({ data: values, index: df.index, name: column });

  if (series.size !== nRows) {
    throw new RangeError(
      `values length ${series.size} does not match DataFrame row count ${nRows}.`,
    );
  }

  // Rebuild the column map, inserting the new column at position `loc`.
  const colNames: string[] = [];
  const colMap = new Map<string, Series<Scalar>>();
  let idx = 0;

  for (const colName of df.columns.values) {
    if (idx === loc) {
      colNames.push(column);
    }
    colNames.push(colName);
    colMap.set(colName, df.col(colName));
    idx++;
  }

  // Handle insertion at the end (loc === nCols).
  if (loc === nCols) {
    colNames.push(column);
  }

  // Always add the new column data to the map (last-wins for duplicate names).
  colMap.set(column, series);

  return new DataFrame(colMap, df.index, colNames);
}

// ─── popColumn ────────────────────────────────────────────────────────────────

/** Return type of {@link popColumn}. */
export interface PopResult {
  /** The extracted column as a Series. */
  readonly series: Series<Scalar>;
  /** The DataFrame with the column removed. */
  readonly df: DataFrame;
}

/**
 * Remove a column from `df` and return both the extracted `Series` and the
 * resulting DataFrame.
 *
 * Mirrors `pandas.DataFrame.pop(item)`, but because tsb DataFrames are
 * immutable this function returns the removed Series *and* the new DataFrame
 * (rather than mutating in place).
 *
 * Raises a `RangeError` if `col` does not exist in `df`.
 *
 * @param df  Source DataFrame (not mutated).
 * @param col Name of the column to remove.
 * @returns   `{ series, df }` — the extracted column and the remaining DataFrame.
 *
 * @example
 * ```ts
 * const { series, df: remaining } = popColumn(df, "age");
 * // series contains the "age" column; remaining has all other columns
 * ```
 */
export function popColumn(df: DataFrame, col: string): PopResult {
  const series = df.get(col);
  if (series === undefined) {
    throw new RangeError(`Column "${col}" not found in DataFrame.`);
  }

  const colMap = new Map<string, Series<Scalar>>();
  for (const colName of df.columns.values) {
    if (colName !== col) {
      colMap.set(colName, df.col(colName));
    }
  }

  return {
    series,
    df: new DataFrame(colMap, df.index),
  };
}

// ─── reorderColumns ──────────────────────────────────────────────────────────

/**
 * Reorder the columns of `df` to match `order`.
 *
 * Mirrors `df[order]` in pandas.  All names in `order` must be present in `df`;
 * extra names in `df` not listed in `order` are dropped.
 *
 * @param df    Source DataFrame.
 * @param order New column order (subset of `df.columns.values`).
 * @returns     A new DataFrame with columns in the specified order.
 */
export function reorderColumns(df: DataFrame, order: readonly string[]): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of order) {
    const s = df.get(name);
    if (s === undefined) {
      throw new RangeError(`Column "${name}" not found in DataFrame.`);
    }
    colMap.set(name, s);
  }
  return new DataFrame(colMap, df.index);
}

// ─── moveColumn ──────────────────────────────────────────────────────────────

/**
 * Move an existing column to a new integer position.
 *
 * This is a convenience wrapper combining {@link popColumn} and
 * {@link insertColumn}: it removes the column from its current position and
 * re-inserts it at `newLoc` in the resulting DataFrame.
 *
 * @param df     Source DataFrame.
 * @param col    Name of the column to move.
 * @param newLoc Target position (0 ≤ newLoc ≤ df.shape[1] − 1).
 * @returns      A new DataFrame with the column at the new position.
 */
export function moveColumn(df: DataFrame, col: string, newLoc: number): DataFrame {
  const { series, df: without } = popColumn(df, col);
  return insertColumn(without, newLoc, col, series);
}

// ─── internal re-export helper (used by DataFrame constructor access) ─────────

/**
 * Build a new DataFrame from an ordered iterable of `[name, Series]` pairs and
 * a row index.  Exported for use by other tsb modules that need to construct
 * DataFrames without going through the public factory methods.
 *
 * @internal
 */
export function dataFrameFromPairs(
  pairs: Iterable<readonly [string, Series<Scalar>]>,
  index: Index<Label>,
): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const [name, series] of pairs) {
    colMap.set(name, series);
  }
  return new DataFrame(colMap, index);
}
