/**
 * cum_ops — cumulative operations for Series and DataFrame.
 *
 * Mirrors `pandas.Series.cumsum()` / `cumprod()` / `cummax()` / `cummin()`:
 * - `cumsum(series, options)` — cumulative sum (numeric)
 * - `cumprod(series, options)` — cumulative product (numeric)
 * - `cummax(series, options)` — cumulative maximum (comparable scalar)
 * - `cummin(series, options)` — cumulative minimum (comparable scalar)
 * - `dataFrameCumsum(df, options)` — column-wise (default) or row-wise cumulative sum
 * - `dataFrameCumprod(df, options)` — cumulative product
 * - `dataFrameCummax(df, options)` — cumulative maximum
 * - `dataFrameCummin(df, options)` — cumulative minimum
 *
 * `skipna` (default `true`): if `true`, NaN/null is ignored in the running
 * accumulator but returns NaN/null in the result at missing positions.
 * If `false`, any NaN/null poisons all subsequent values.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for Series-level cumulative operations. */
export interface CumOpsOptions {
  /**
   * If `true` (default), NaN/null positions return NaN/null in the result
   * but the running accumulator skips them.
   * If `false`, any NaN/null encountered poisons all subsequent values.
   */
  readonly skipna?: boolean;
}

/** Options for DataFrame-level cumulative operations. */
export interface DataFrameCumOpsOptions extends CumOpsOptions {
  /**
   * - `0` or `"index"` (default): apply operation down each **column**.
   * - `1` or `"columns"`: apply operation across each **row**.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── internal types ───────────────────────────────────────────────────────────

/** Non-null, non-NaN scalar — safely comparable with `<` and `>`. */
type NonNullScalar = number | string | boolean | bigint | Date;

/** Signature for a column-level cumulative function (used internally). */
type CumFn = (vals: readonly Scalar[], skipna: boolean) => Scalar[];

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a finite number (not null/undefined/NaN). */
function isFiniteNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/** True when `v` is a non-null, non-NaN scalar. */
function isNonNull(v: Scalar): v is NonNullScalar {
  return v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v));
}

/** Compare two non-null scalars; returns negative/zero/positive. */
function cmpNonNull(a: NonNullScalar, b: NonNullScalar): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

// ─── core accumulators ────────────────────────────────────────────────────────

/**
 * Compute a numeric cumulative operation over `vals`.
 * Returns an equal-length array of numbers; missing positions → NaN.
 */
function cumulateNum(
  vals: readonly Scalar[],
  skipna: boolean,
  init: number,
  folder: (acc: number, v: number) => number,
): number[] {
  const n = vals.length;
  const out: number[] = new Array<number>(n);
  let acc = init;
  let poisoned = false;
  for (let i = 0; i < n; i++) {
    const v = vals[i] as Scalar;
    if (!isFiniteNum(v)) {
      out[i] = Number.NaN;
      if (!skipna) {
        poisoned = true;
      }
    } else if (poisoned) {
      out[i] = Number.NaN;
    } else {
      acc = folder(acc, v);
      out[i] = acc;
    }
  }
  return out;
}

/**
 * Compute a scalar cumulative operation (e.g., running max/min) over `vals`.
 * Missing positions → null in result.
 * `update(newVal, runVal)` returns `true` when `newVal` should become the new
 * running value.
 */
function cumulateSc(
  vals: readonly Scalar[],
  skipna: boolean,
  update: (newVal: NonNullScalar, runVal: NonNullScalar) => boolean,
): Scalar[] {
  const n = vals.length;
  const out: Scalar[] = new Array<Scalar>(n);
  let runVal: NonNullScalar | null = null;
  let poisoned = false;
  for (let i = 0; i < n; i++) {
    const v = vals[i] as Scalar;
    if (!isNonNull(v)) {
      out[i] = null;
      if (!skipna) {
        poisoned = true;
      }
    } else if (poisoned) {
      out[i] = null;
    } else {
      if (runVal === null || update(v, runVal)) {
        runVal = v;
      }
      out[i] = runVal;
    }
  }
  return out;
}

// ─── DataFrame helpers ────────────────────────────────────────────────────────

/** Apply `fn` to each column independently (axis=0). */
function colWiseCum(df: DataFrame, skipna: boolean, fn: CumFn): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const col = df.col(name);
    const result = fn(col.values, skipna);
    colMap.set(name, new Series<Scalar>({ data: result, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}

/** Build a row vector from column data at row index `i`. */
function buildRow(colData: ReadonlyArray<readonly Scalar[]>, i: number): Scalar[] {
  const row: Scalar[] = new Array<Scalar>(colData.length);
  for (let j = 0; j < colData.length; j++) {
    const col = colData[j];
    const v = col !== undefined ? col[i] : undefined;
    row[j] = v !== undefined ? v : null;
  }
  return row;
}

/** Apply `fn` to each row across columns (axis=1). */
function rowWiseCum(df: DataFrame, skipna: boolean, fn: CumFn): DataFrame {
  const colNames = df.columns.values;
  const nRows = df.index.size;
  const colData = colNames.map((c) => df.col(c).values);
  const outCols = colNames.map(() => new Array<Scalar>(nRows));

  for (let i = 0; i < nRows; i++) {
    const rowVals = buildRow(colData, i);
    const rowResult = fn(rowVals, skipna);
    for (let j = 0; j < colNames.length; j++) {
      const col = outCols[j];
      const rv = rowResult[j];
      if (col !== undefined) {
        col[i] = rv !== undefined ? rv : null;
      }
    }
  }

  const colMap = new Map<string, Series<Scalar>>();
  for (let j = 0; j < colNames.length; j++) {
    const name = colNames[j];
    const data = outCols[j];
    if (name !== undefined && data !== undefined) {
      colMap.set(name, new Series<Scalar>({ data, index: df.index, name }));
    }
  }
  return new DataFrame(colMap, df.index);
}

/** Dispatch cumulative op over a DataFrame with the given axis. */
function dfCum(
  df: DataFrame,
  options: DataFrameCumOpsOptions,
  fn: CumFn,
): DataFrame {
  const skipna = options.skipna ?? true;
  const axis = options.axis ?? 0;
  if (axis === 1 || axis === "columns") {
    return rowWiseCum(df, skipna, fn);
  }
  return colWiseCum(df, skipna, fn);
}

// ─── cumsum ───────────────────────────────────────────────────────────────────

/** Column-level cumsum helper (used by DataFrame functions). */
function cumSumVals(vals: readonly Scalar[], skipna: boolean): Scalar[] {
  return cumulateNum(vals, skipna, 0, (acc, v) => acc + v);
}

/**
 * Compute the **cumulative sum** of a Series.
 *
 * Non-numeric values (strings, booleans, etc.) are treated as missing.
 *
 * @example
 * ```ts
 * import { Series, cumsum } from "tsb";
 * const s = new Series({ data: [1, 2, null, 4] });
 * cumsum(s).values; // [1, 3, NaN, 7]
 * cumsum(s, { skipna: false }).values; // [1, 3, NaN, NaN]
 * ```
 */
export function cumsum(series: Series<Scalar>, options: CumOpsOptions = {}): Series<number> {
  const skipna = options.skipna ?? true;
  const result = cumulateNum(series.values, skipna, 0, (acc, v) => acc + v);
  return new Series<number>({ data: result, index: series.index, name: series.name });
}

/**
 * Compute the **cumulative sum** for each column (or row) of a DataFrame.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameCumsum } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
 * dataFrameCumsum(df).col("a").values; // [1, 3, 6]
 * ```
 */
export function dataFrameCumsum(df: DataFrame, options: DataFrameCumOpsOptions = {}): DataFrame {
  return dfCum(df, options, cumSumVals);
}

// ─── cumprod ──────────────────────────────────────────────────────────────────

/** Column-level cumprod helper. */
function cumProdVals(vals: readonly Scalar[], skipna: boolean): Scalar[] {
  return cumulateNum(vals, skipna, 1, (acc, v) => acc * v);
}

/**
 * Compute the **cumulative product** of a Series.
 *
 * @example
 * ```ts
 * import { Series, cumprod } from "tsb";
 * const s = new Series({ data: [1, 2, 3, 4] });
 * cumprod(s).values; // [1, 2, 6, 24]
 * ```
 */
export function cumprod(series: Series<Scalar>, options: CumOpsOptions = {}): Series<number> {
  const skipna = options.skipna ?? true;
  const result = cumulateNum(series.values, skipna, 1, (acc, v) => acc * v);
  return new Series<number>({ data: result, index: series.index, name: series.name });
}

/**
 * Compute the **cumulative product** for each column (or row) of a DataFrame.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameCumprod } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [2, 3, 4] });
 * dataFrameCumprod(df).col("a").values; // [1, 2, 6]
 * ```
 */
export function dataFrameCumprod(df: DataFrame, options: DataFrameCumOpsOptions = {}): DataFrame {
  return dfCum(df, options, cumProdVals);
}

// ─── cummax ───────────────────────────────────────────────────────────────────

/** Column-level cummax helper. */
function cumMaxVals(vals: readonly Scalar[], skipna: boolean): Scalar[] {
  return cumulateSc(vals, skipna, (nv, rv) => cmpNonNull(nv, rv) > 0);
}

/**
 * Compute the **cumulative maximum** of a Series.
 *
 * Works on any comparable scalar type (numbers, strings, booleans).
 *
 * @example
 * ```ts
 * import { Series, cummax } from "tsb";
 * const s = new Series({ data: [3, 1, 4, 1, 5] });
 * cummax(s).values; // [3, 3, 4, 4, 5]
 * ```
 */
export function cummax(series: Series<Scalar>, options: CumOpsOptions = {}): Series<Scalar> {
  const skipna = options.skipna ?? true;
  const result = cumulateSc(series.values, skipna, (nv, rv) => cmpNonNull(nv, rv) > 0);
  return new Series<Scalar>({ data: result, index: series.index, name: series.name });
}

/**
 * Compute the **cumulative maximum** for each column (or row) of a DataFrame.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameCummax } from "tsb";
 * const df = DataFrame.fromColumns({ a: [3, 1, 4], b: [10, 30, 20] });
 * dataFrameCummax(df).col("a").values; // [3, 3, 4]
 * ```
 */
export function dataFrameCummax(df: DataFrame, options: DataFrameCumOpsOptions = {}): DataFrame {
  return dfCum(df, options, cumMaxVals);
}

// ─── cummin ───────────────────────────────────────────────────────────────────

/** Column-level cummin helper. */
function cumMinVals(vals: readonly Scalar[], skipna: boolean): Scalar[] {
  return cumulateSc(vals, skipna, (nv, rv) => cmpNonNull(nv, rv) < 0);
}

/**
 * Compute the **cumulative minimum** of a Series.
 *
 * Works on any comparable scalar type (numbers, strings, booleans).
 *
 * @example
 * ```ts
 * import { Series, cummin } from "tsb";
 * const s = new Series({ data: [3, 1, 4, 1, 5] });
 * cummin(s).values; // [3, 1, 1, 1, 1]
 * ```
 */
export function cummin(series: Series<Scalar>, options: CumOpsOptions = {}): Series<Scalar> {
  const skipna = options.skipna ?? true;
  const result = cumulateSc(series.values, skipna, (nv, rv) => cmpNonNull(nv, rv) < 0);
  return new Series<Scalar>({ data: result, index: series.index, name: series.name });
}

/**
 * Compute the **cumulative minimum** for each column (or row) of a DataFrame.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameCummin } from "tsb";
 * const df = DataFrame.fromColumns({ a: [3, 1, 4], b: [10, 30, 20] });
 * dataFrameCummin(df).col("a").values; // [3, 1, 1]
 * ```
 */
export function dataFrameCummin(df: DataFrame, options: DataFrameCumOpsOptions = {}): DataFrame {
  return dfCum(df, options, cumMinVals);
}
