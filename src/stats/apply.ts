/**
 * apply — element-wise and axis-wise function application for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.apply(fn)` — apply a function to each element of a Series.
 * - `DataFrame.applymap(fn)` / `DataFrame.map(fn)` — apply element-wise to every cell.
 * - `DataFrame.apply(fn, axis=0|1)` — apply fn to each column or each row.
 *
 * All functions are **pure** (return new Series/DataFrame; inputs are unchanged).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Options for {@link dataFrameApply}.
 *
 * Controls which axis the aggregating function is applied along.
 */
export interface DataFrameApplyOptions {
  /**
   * Axis along which `fn` is applied.
   *
   * - `0` / `"index"` (default): apply `fn` to each **column** Series →
   *   the result has one value per column, indexed by column names.
   * - `1` / `"columns"`: apply `fn` to each **row** Series →
   *   the result has one value per row, indexed by row labels.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build an `Index<Label>` from an array of strings for column-name axes. */
function colIndex(names: readonly string[]): Index<Label> {
  return new Index<Label>(names as readonly Label[]);
}

/** Extract a single row from a DataFrame as a Series (columns as index). */
function extractRow(df: DataFrame, rowIdx: number, colIdx: Index<Label>): Series<Scalar> {
  const rowData: Scalar[] = [];
  for (const name of df.columns.values) {
    const col = df.col(name);
    rowData.push(col.values[rowIdx] as Scalar);
  }
  return new Series<Scalar>({ data: rowData, index: colIdx });
}

/** Apply fn to each column of a DataFrame; return one value per column. */
function applyAxis0(df: DataFrame, fn: (slice: Series<Scalar>) => Scalar): Series<Scalar> {
  const results: Scalar[] = [];
  for (const name of df.columns.values) {
    results.push(fn(df.col(name)));
  }
  return new Series<Scalar>({ data: results, index: colIndex(df.columns.values) });
}

/** Apply fn to each row of a DataFrame; return one value per row. */
function applyAxis1(df: DataFrame, fn: (slice: Series<Scalar>) => Scalar): Series<Scalar> {
  const nRows = df.index.size;
  const results: Scalar[] = new Array<Scalar>(nRows);
  const colIdx = colIndex(df.columns.values);
  for (let i = 0; i < nRows; i++) {
    results[i] = fn(extractRow(df, i, colIdx));
  }
  return new Series<Scalar>({ data: results, index: df.index });
}

// ─── applySeries ──────────────────────────────────────────────────────────────

/**
 * Apply a function to each element of a Series.
 *
 * The function receives the element value and its label.  The returned Series
 * preserves the original index and name.
 *
 * Mirrors `pandas.Series.apply(func)`.
 *
 * @example
 * ```ts
 * import { Series, applySeries } from "tsb";
 * const s = new Series({ data: [1, 2, 3], name: "x" });
 * applySeries(s, (v) => (v as number) * 2).values; // [2, 4, 6]
 * ```
 */
export function applySeries(
  series: Series<Scalar>,
  fn: (value: Scalar, label: Label) => Scalar,
): Series<Scalar> {
  const n = series.values.length;
  const out: Scalar[] = new Array<Scalar>(n);
  for (let i = 0; i < n; i++) {
    out[i] = fn(series.values[i] as Scalar, series.index.at(i));
  }
  return new Series<Scalar>({ data: out, index: series.index, name: series.name });
}

// ─── applymap ─────────────────────────────────────────────────────────────────

/**
 * Apply a function element-wise to every cell of a DataFrame.
 *
 * The function receives the cell value and the column name.  The returned
 * DataFrame preserves the original shape, index, and column names.
 *
 * Mirrors `pandas.DataFrame.applymap(func)` (renamed `DataFrame.map` in pandas 2.1+).
 *
 * @example
 * ```ts
 * import { DataFrame, applymap } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * applymap(df, (v) => (v as number) ** 2).col("b").values; // [9, 16]
 * ```
 */
export function applymap(df: DataFrame, fn: (value: Scalar, colName: string) => Scalar): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const col = df.col(name);
    const n = col.values.length;
    const out: Scalar[] = new Array<Scalar>(n);
    for (let i = 0; i < n; i++) {
      out[i] = fn(col.values[i] as Scalar, name);
    }
    colMap.set(name, new Series<Scalar>({ data: out, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}

// ─── dataFrameApply ───────────────────────────────────────────────────────────

/**
 * Apply a function to each column or each row of a DataFrame.
 *
 * With `axis=0` (default): `fn` receives each **column** as a `Series`;
 * the result is a `Series` indexed by column names (one value per column).
 *
 * With `axis=1`: `fn` receives each **row** as a `Series` (column names as index);
 * the result is a `Series` indexed by row labels (one value per row).
 *
 * Mirrors `pandas.DataFrame.apply(func, axis=0|1)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameApply } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * // column sum (axis=0):
 * dataFrameApply(df, (col) => col.sum()).values; // [6, 15]
 * // row sum (axis=1):
 * dataFrameApply(df, (row) => row.sum(), { axis: 1 }).values; // [5, 7, 9]
 * ```
 */
export function dataFrameApply(
  df: DataFrame,
  fn: (slice: Series<Scalar>) => Scalar,
  options: DataFrameApplyOptions = {},
): Series<Scalar> {
  const axis = options.axis ?? 0;
  if (axis === 1 || axis === "columns") {
    return applyAxis1(df, fn);
  }
  return applyAxis0(df, fn);
}
