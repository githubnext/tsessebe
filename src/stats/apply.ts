/**
 * apply — function application and mapping for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.apply(func)` — apply a function element-wise to a Series
 * - `Series.map(func | dict)` — map values via function or lookup table
 * - `DataFrame.apply(func, axis=0)` — apply a function to each column/row (returns Series)
 * - `DataFrame.apply(func, axis=0, result_type="expand")` — apply returning a DataFrame
 * - `DataFrame.applymap(func)` / `DataFrame.map(func)` — element-wise mapping
 *
 * All functions are **pure** (return new objects; inputs are unchanged).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Axis, Label, Scalar } from "../types.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/** A lookup map used in {@link mapSeries}. */
export type MapLookup = ReadonlyMap<Scalar, Scalar> | Readonly<Record<string, Scalar>>;

/** Options for {@link applyDataFrame}. */
export interface ApplyDataFrameOptions {
  /**
   * Axis along which to apply the function.
   * - `0` or `"index"` (default): apply to each **column** (function receives a column Series)
   * - `1` or `"columns"`: apply to each **row** (function receives a row Series)
   */
  readonly axis?: Axis;
}

/** Options for {@link applyExpandDataFrame}. */
export interface ApplyExpandDataFrameOptions {
  /**
   * Axis along which to apply the function.
   * - `0` or `"index"` (default): apply to each **column** (function receives a column Series)
   * - `1` or `"columns"`: apply to each **row** (function receives a row Series)
   */
  readonly axis?: Axis;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build a row Series from a DataFrame at position `r`. */
function rowSeries(df: DataFrame, r: number): Series<Scalar> {
  const colNames = df.columns.values;
  const data: Scalar[] = new Array<Scalar>(colNames.length);
  const labels: Label[] = new Array<Label>(colNames.length);
  for (let c = 0; c < colNames.length; c++) {
    const colName = colNames[c];
    if (colName === undefined) {
      data[c] = null;
      labels[c] = c;
      continue;
    }
    data[c] = df.col(colName).iat(r);
    labels[c] = colName;
  }
  return new Series<Scalar>({ data, index: labels, name: String(df.index.at(r)) });
}

/** Resolve an object-literal lookup to a Map. */
function toMap(lookup: MapLookup): ReadonlyMap<Scalar, Scalar> {
  if (lookup instanceof Map) {
    return lookup;
  }
  return new Map(Object.entries(lookup as Readonly<Record<string, Scalar>>));
}

// ─── applySeries ──────────────────────────────────────────────────────────────

/**
 * Apply a function element-wise to each value in a Series.
 *
 * Non-numeric values are passed to `fn` unchanged — `fn` controls what happens to them.
 * Mirrors `pandas.Series.apply(func)`.
 *
 * @example
 * ```ts
 * import { Series, applySeries } from "tsb";
 * const s = new Series({ data: [1, 4, 9] });
 * applySeries(s, (v) => Math.sqrt(v as number)).values; // [1, 2, 3]
 * ```
 */
export function applySeries(
  series: Series<Scalar>,
  fn: (value: Scalar, label: Label, index: number) => Scalar,
): Series<Scalar> {
  const n = series.size;
  const out: Scalar[] = new Array<Scalar>(n);
  for (let i = 0; i < n; i++) {
    out[i] = fn(series.iat(i), series.index.at(i), i);
  }
  return new Series<Scalar>({ data: out, index: series.index, name: series.name });
}

// ─── mapSeries ────────────────────────────────────────────────────────────────

/**
 * Map values of a Series via a function, a `Map`, or a plain object lookup table.
 *
 * - **Function**: applied element-wise (same as {@link applySeries}).
 * - **Map / Record**: values not found in the lookup become `null` (matching pandas NaN).
 *
 * Mirrors `pandas.Series.map(arg)`.
 *
 * @example
 * ```ts
 * import { Series, mapSeries } from "tsb";
 * const s = new Series({ data: ["a", "b", "c"] });
 * mapSeries(s, { a: 1, b: 2, c: 3 }).values; // [1, 2, 3]
 * mapSeries(s, (v) => String(v).toUpperCase()).values; // ["A", "B", "C"]
 * ```
 */
export function mapSeries(
  series: Series<Scalar>,
  mapper: ((value: Scalar, label: Label, index: number) => Scalar) | MapLookup,
): Series<Scalar> {
  if (typeof mapper === "function") {
    return applySeries(series, mapper);
  }
  const lookup = toMap(mapper);
  const n = series.size;
  const out: Scalar[] = new Array<Scalar>(n);
  for (let i = 0; i < n; i++) {
    const v = series.iat(i);
    out[i] = lookup.has(v) ? (lookup.get(v) ?? null) : null;
  }
  return new Series<Scalar>({ data: out, index: series.index, name: series.name });
}

// ─── applyDataFrame ───────────────────────────────────────────────────────────

/**
 * Apply a reducing function to each column (axis=0) or row (axis=1) of a DataFrame.
 *
 * The function receives a `Series<Scalar>` representing the column or row,
 * and must return a single `Scalar` value.  The result is a Series indexed by
 * column names (axis=0) or row labels (axis=1).
 *
 * Mirrors `pandas.DataFrame.apply(func, axis=0)`.
 *
 * @example
 * ```ts
 * import { DataFrame, applyDataFrame } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * // Sum of each column:
 * applyDataFrame(df, (col) => (col.values as number[]).reduce((a, b) => a + b, 0)).values;
 * // → [6, 15]  (index: ["a", "b"])
 * ```
 */
export function applyDataFrame(
  df: DataFrame,
  fn: (slice: Series<Scalar>, label: Label) => Scalar,
  options: ApplyDataFrameOptions = {},
): Series<Scalar> {
  const axis: Axis = options.axis ?? 0;
  const isColAxis = axis === 0 || axis === "index";

  if (isColAxis) {
    return applyDataFrameCols(df, fn);
  }
  return applyDataFrameRows(df, fn);
}

/** Apply fn to each column, return a Series indexed by column names. */
function applyDataFrameCols(
  df: DataFrame,
  fn: (slice: Series<Scalar>, label: Label) => Scalar,
): Series<Scalar> {
  const colNames = df.columns.values;
  const data: Scalar[] = new Array<Scalar>(colNames.length);
  const labels: Label[] = new Array<Label>(colNames.length);
  for (let c = 0; c < colNames.length; c++) {
    const colName = colNames[c];
    if (colName === undefined) {
      data[c] = null;
      labels[c] = c;
      continue;
    }
    data[c] = fn(df.col(colName), colName);
    labels[c] = colName;
  }
  return new Series<Scalar>({ data, index: labels });
}

/** Apply fn to each row, return a Series indexed by row labels. */
function applyDataFrameRows(
  df: DataFrame,
  fn: (slice: Series<Scalar>, label: Label) => Scalar,
): Series<Scalar> {
  const nRows = df.index.size;
  const data: Scalar[] = new Array<Scalar>(nRows);
  const labels: Label[] = new Array<Label>(nRows);
  for (let r = 0; r < nRows; r++) {
    const label = df.index.at(r);
    data[r] = fn(rowSeries(df, r), label);
    labels[r] = label;
  }
  return new Series<Scalar>({ data, index: labels });
}

// ─── applyExpandDataFrame ─────────────────────────────────────────────────────

/**
 * Apply a function to each column (axis=0) or row (axis=1) of a DataFrame,
 * where the function returns a `Series<Scalar>`.  The results are assembled
 * into a new DataFrame.
 *
 * - **axis=0**: function is called for each column; returned Series become
 *   new column data (same row index expected).
 * - **axis=1**: function is called for each row; returned Series become
 *   new rows assembled as a DataFrame.
 *
 * Mirrors `pandas.DataFrame.apply(func, axis=0, result_type="expand")`.
 *
 * @example
 * ```ts
 * import { DataFrame, Series, applyExpandDataFrame } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * // Double each column:
 * applyExpandDataFrame(df, (col) =>
 *   new Series({ data: col.values.map((v) => (v as number) * 2), index: col.index })
 * ).col("a").values; // [2, 4]
 * ```
 */
export function applyExpandDataFrame(
  df: DataFrame,
  fn: (slice: Series<Scalar>, label: Label) => Series<Scalar>,
  options: ApplyExpandDataFrameOptions = {},
): DataFrame {
  const axis: Axis = options.axis ?? 0;
  const isColAxis = axis === 0 || axis === "index";

  if (isColAxis) {
    return applyExpandCols(df, fn);
  }
  return applyExpandRows(df, fn);
}

/** Apply expand function to each column → reassemble as DataFrame. */
function applyExpandCols(
  df: DataFrame,
  fn: (slice: Series<Scalar>, label: Label) => Series<Scalar>,
): DataFrame {
  const colNames = df.columns.values;
  const colMap = new Map<string, Series<Scalar>>();
  for (const colName of colNames) {
    if (colName === undefined) {
      continue;
    }
    colMap.set(colName, fn(df.col(colName), colName));
  }
  return new DataFrame(colMap, df.index);
}

/** Lookup a column key value from a row Series result. */
function lookupRowValue(row: Series<Scalar>, colKey: string): Scalar {
  for (let j = 0; j < row.index.size; j++) {
    if (String(row.index.at(j)) === colKey) {
      return row.iat(j);
    }
  }
  return null;
}

/** Apply expand function to each row → reassemble results as DataFrame. */
function applyExpandRows(
  df: DataFrame,
  fn: (slice: Series<Scalar>, label: Label) => Series<Scalar>,
): DataFrame {
  const nRows = df.index.size;
  const rowResults: Series<Scalar>[] = [];
  const rowLabels: Label[] = new Array<Label>(nRows);

  for (let r = 0; r < nRows; r++) {
    const label = df.index.at(r);
    rowLabels[r] = label;
    rowResults.push(fn(rowSeries(df, r), label));
  }

  const firstResult = rowResults[0];
  if (firstResult === undefined || nRows === 0) {
    return new DataFrame(new Map(), df.index);
  }

  const resultCols: Label[] = [];
  for (let j = 0; j < firstResult.index.size; j++) {
    resultCols.push(firstResult.index.at(j));
  }

  const colMap = new Map<string, Series<Scalar>>();
  for (const colLabel of resultCols) {
    const colKey = String(colLabel);
    const data: Scalar[] = new Array<Scalar>(nRows);
    for (let r = 0; r < nRows; r++) {
      const row = rowResults[r];
      data[r] = row !== undefined ? lookupRowValue(row, colKey) : null;
    }
    colMap.set(colKey, new Series<Scalar>({ data, index: rowLabels, name: colKey }));
  }

  return new DataFrame(colMap);
}

// ─── mapDataFrame ─────────────────────────────────────────────────────────────

/**
 * Apply a function element-wise to every cell of a DataFrame.
 *
 * The function receives `(value, rowLabel, columnName)` and returns a `Scalar`.
 * The result is a new DataFrame with the same shape, index, and columns.
 *
 * Mirrors `pandas.DataFrame.applymap(func)` (renamed to `map` in pandas ≥ 2.1).
 *
 * @example
 * ```ts
 * import { DataFrame, mapDataFrame } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * mapDataFrame(df, (v) => (v as number) ** 2).col("b").values; // [16, 25, 36]
 * ```
 */
export function mapDataFrame(
  df: DataFrame,
  fn: (value: Scalar, rowLabel: Label, colName: string) => Scalar,
): DataFrame {
  const colNames = df.columns.values;
  const colMap = new Map<string, Series<Scalar>>();

  for (const colName of colNames) {
    if (colName === undefined) {
      continue;
    }
    const col = df.col(colName);
    const out: Scalar[] = new Array<Scalar>(df.index.size);
    for (let r = 0; r < df.index.size; r++) {
      out[r] = fn(col.iat(r), df.index.at(r), colName);
    }
    colMap.set(colName, new Series<Scalar>({ data: out, index: df.index, name: colName }));
  }

  return new DataFrame(colMap, df.index);
}
