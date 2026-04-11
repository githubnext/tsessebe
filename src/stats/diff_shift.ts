/**
 * diff_shift — discrete difference and value-shift for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.diff(periods=1)` — first discrete difference shifted by `periods`
 * - `Series.shift(periods=1, fill_value=NaN)` — shift index by `periods`
 * - `DataFrame.diff(periods=1, axis=0)` — column-wise or row-wise diff
 * - `DataFrame.shift(periods=1, fill_value=NaN, axis=0)` — column-wise or row-wise shift
 *
 * All functions are **pure** (return new objects; inputs are unchanged).
 * Non-numeric values in `diff` yield `null`.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Axis, Scalar } from "../types.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/** Options for {@link diffSeries} and {@link diffDataFrame}. */
export interface DiffOptions {
  /**
   * Number of periods to shift for calculating difference.
   * Negative values shift in the opposite direction.
   * Default `1`.
   */
  readonly periods?: number;
}

/** Options for {@link diffDataFrame}. */
export interface DataFrameDiffOptions extends DiffOptions {
  /**
   * Axis along which to compute the difference.
   * - `0` or `"index"` (default): diff down each **column**.
   * - `1` or `"columns"`: diff across each **row**.
   */
  readonly axis?: Axis;
}

/** Options for {@link shiftSeries} and {@link shiftDataFrame}. */
export interface ShiftOptions {
  /**
   * Number of periods to shift.
   * Positive: shift forward (later rows get earlier values).
   * Negative: shift backward.
   * Default `1`.
   */
  readonly periods?: number;
  /**
   * Value to fill positions that fall outside the original range.
   * Default `null` (treated as missing, like pandas NaN).
   */
  readonly fillValue?: Scalar;
}

/** Options for {@link shiftDataFrame}. */
export interface DataFrameShiftOptions extends ShiftOptions {
  /**
   * Axis along which to shift.
   * - `0` or `"index"` (default): shift down each **column**.
   * - `1` or `"columns"`: shift across each **row**.
   */
  readonly axis?: Axis;
}

// ─── helpers ───────────────────────────────────────────────────────────────────

/** True when `v` is a finite number (not null / undefined / NaN). */
function isFiniteNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/**
 * Compute element-wise discrete difference for an array of scalars.
 * `result[i] = arr[i] - arr[i - periods]`.
 * Non-numeric positions (either current or prior) yield `null`.
 */
function diffArray(vals: readonly Scalar[], periods: number): Scalar[] {
  const n = vals.length;
  const out: Scalar[] = new Array<Scalar>(n).fill(null);
  for (let i = 0; i < n; i++) {
    const j = i - periods;
    if (j < 0 || j >= n) {
      out[i] = null;
      continue;
    }
    const cur = vals[i] as Scalar;
    const prev = vals[j] as Scalar;
    if (isFiniteNum(cur) && isFiniteNum(prev)) {
      out[i] = cur - prev;
    } else {
      out[i] = null;
    }
  }
  return out;
}

/**
 * Shift an array of scalars by `periods` positions, filling with `fillValue`.
 * Positive `periods` moves values forward (later positions get earlier values);
 * negative `periods` moves values backward.
 */
function shiftArray(vals: readonly Scalar[], periods: number, fillValue: Scalar): Scalar[] {
  const n = vals.length;
  const out: Scalar[] = new Array<Scalar>(n).fill(fillValue);
  if (periods >= 0) {
    for (let i = periods; i < n; i++) {
      out[i] = vals[i - periods] as Scalar;
    }
  } else {
    const offset = -periods;
    for (let i = 0; i < n - offset; i++) {
      out[i] = vals[i + offset] as Scalar;
    }
  }
  return out;
}

// ─── Series: diff ──────────────────────────────────────────────────────────────

/**
 * Compute the first discrete difference of a Series.
 *
 * `result[i] = series[i] - series[i - periods]`.
 * The first `|periods|` positions (or last, for negative) are `null`.
 * Non-numeric values yield `null`.
 *
 * Mirrors `pandas.Series.diff(periods=1)`.
 *
 * @example
 * ```ts
 * import { Series } from "tsb";
 * import { diffSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 3, 6, 10, 15] });
 * diffSeries(s).values;          // [null, 2, 3, 4, 5]
 * diffSeries(s, { periods: 2 }).values; // [null, null, 5, 7, 9]
 * ```
 */
export function diffSeries(series: Series<Scalar>, options: DiffOptions = {}): Series<Scalar> {
  const periods = options.periods ?? 1;
  const data = diffArray(series.values as readonly Scalar[], periods);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

// ─── Series: shift ─────────────────────────────────────────────────────────────

/**
 * Shift the values of a Series by `periods` positions.
 *
 * Positive `periods` shifts values forward (down); earlier positions are filled
 * with `fillValue`. Negative `periods` shifts backward (up).
 *
 * Mirrors `pandas.Series.shift(periods=1, fill_value=NaN)`.
 *
 * @example
 * ```ts
 * import { Series } from "tsb";
 * import { shiftSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * shiftSeries(s).values;                      // [null, 1, 2, 3, 4]
 * shiftSeries(s, { periods: -1 }).values;      // [2, 3, 4, 5, null]
 * shiftSeries(s, { periods: 2, fillValue: 0 }).values; // [0, 0, 1, 2, 3]
 * ```
 */
export function shiftSeries(series: Series<Scalar>, options: ShiftOptions = {}): Series<Scalar> {
  const periods = options.periods ?? 1;
  const fillValue = options.fillValue !== undefined ? options.fillValue : null;
  const data = shiftArray(series.values as readonly Scalar[], periods, fillValue);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

// ─── DataFrame: diff ──────────────────────────────────────────────────────────

/**
 * Compute the first discrete difference of a DataFrame.
 *
 * When `axis=0` (default), diffs down each column independently.
 * When `axis=1`, diffs across each row (column N minus column N-periods).
 *
 * Mirrors `pandas.DataFrame.diff(periods=1, axis=0)`.
 *
 * @example
 * ```ts
 * import { DataFrame } from "tsb";
 * import { diffDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 3, 6], b: [10, 20, 35] });
 * diffDataFrame(df).col("a").values; // [null, 2, 3]
 * diffDataFrame(df).col("b").values; // [null, 10, 15]
 * ```
 */
export function diffDataFrame(df: DataFrame, options: DataFrameDiffOptions = {}): DataFrame {
  const periods = options.periods ?? 1;
  const axis = options.axis ?? 0;
  const colNames = df.columns.values;

  if (axis === 1 || axis === "columns") {
    return diffDataFrameRowWise(df, colNames, periods);
  }
  return diffDataFrameColWise(df, colNames, periods);
}

/** Diff each column independently (axis=0). */
function diffDataFrameColWise(
  df: DataFrame,
  colNames: readonly string[],
  periods: number,
): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    const col = df.col(name) as Series<Scalar>;
    const data = diffArray(col.values as readonly Scalar[], periods);
    colMap.set(name, new Series<Scalar>({ data, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}

/** Diff across columns (axis=1). */
function diffDataFrameRowWise(
  df: DataFrame,
  colNames: readonly string[],
  periods: number,
): DataFrame {
  const nRows = df.index.size;
  const nCols = colNames.length;
  const colMap = new Map<string, Series<Scalar>>();

  for (let c = 0; c < nCols; c++) {
    const name = colNames[c];
    if (name === undefined) {
      continue;
    }
    const rowData: Scalar[] = new Array<Scalar>(nRows).fill(null);
    const priorIdx = c - periods;
    if (priorIdx < 0 || priorIdx >= nCols) {
      colMap.set(name, new Series<Scalar>({ data: rowData, index: df.index, name }));
      continue;
    }
    const priorName = colNames[priorIdx];
    if (priorName === undefined) {
      colMap.set(name, new Series<Scalar>({ data: rowData, index: df.index, name }));
      continue;
    }
    const curCol = df.col(name) as Series<Scalar>;
    const priorCol = df.col(priorName) as Series<Scalar>;
    for (let r = 0; r < nRows; r++) {
      const cur = curCol.iat(r);
      const prev = priorCol.iat(r);
      if (isFiniteNum(cur) && isFiniteNum(prev)) {
        rowData[r] = cur - prev;
      } else {
        rowData[r] = null;
      }
    }
    colMap.set(name, new Series<Scalar>({ data: rowData, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}

// ─── DataFrame: shift ─────────────────────────────────────────────────────────

/**
 * Shift the values of a DataFrame by `periods` positions.
 *
 * When `axis=0` (default), each column is shifted independently.
 * When `axis=1`, each row is shifted across columns.
 *
 * Mirrors `pandas.DataFrame.shift(periods=1, fill_value=NaN, axis=0)`.
 *
 * @example
 * ```ts
 * import { DataFrame } from "tsb";
 * import { shiftDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * shiftDataFrame(df).col("a").values;            // [null, 1, 2]
 * shiftDataFrame(df, { periods: -1 }).col("b").values; // [5, 6, null]
 * ```
 */
export function shiftDataFrame(df: DataFrame, options: DataFrameShiftOptions = {}): DataFrame {
  const periods = options.periods ?? 1;
  const fillValue = options.fillValue !== undefined ? options.fillValue : null;
  const axis = options.axis ?? 0;
  const colNames = df.columns.values;

  if (axis === 1 || axis === "columns") {
    return shiftDataFrameRowWise(df, colNames, periods, fillValue);
  }
  return shiftDataFrameColWise(df, colNames, periods, fillValue);
}

/** Shift each column independently (axis=0). */
function shiftDataFrameColWise(
  df: DataFrame,
  colNames: readonly string[],
  periods: number,
  fillValue: Scalar,
): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    const col = df.col(name) as Series<Scalar>;
    const data = shiftArray(col.values as readonly Scalar[], periods, fillValue);
    colMap.set(name, new Series<Scalar>({ data, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}

/** Shift each row across columns (axis=1). */
function shiftDataFrameRowWise(
  df: DataFrame,
  colNames: readonly string[],
  periods: number,
  fillValue: Scalar,
): DataFrame {
  const nRows = df.index.size;
  const nCols = colNames.length;

  // Build a 2D matrix [row][col] of shifted values
  const matrix: Scalar[][] = Array.from({ length: nRows }, () =>
    new Array<Scalar>(nCols).fill(fillValue),
  );

  if (periods >= 0) {
    for (let c = periods; c < nCols; c++) {
      const srcName = colNames[c - periods];
      if (srcName === undefined) {
        continue;
      }
      const src = df.col(srcName) as Series<Scalar>;
      for (let r = 0; r < nRows; r++) {
        const row = matrix[r];
        if (row !== undefined) {
          row[c] = src.iat(r);
        }
      }
    }
  } else {
    const offset = -periods;
    for (let c = 0; c < nCols - offset; c++) {
      const srcName = colNames[c + offset];
      if (srcName === undefined) {
        continue;
      }
      const src = df.col(srcName) as Series<Scalar>;
      for (let r = 0; r < nRows; r++) {
        const row = matrix[r];
        if (row !== undefined) {
          row[c] = src.iat(r);
        }
      }
    }
  }

  const colMap = new Map<string, Series<Scalar>>();
  for (let c = 0; c < nCols; c++) {
    const name = colNames[c];
    if (name === undefined) {
      continue;
    }
    const data = matrix.map((row) => row[c] as Scalar);
    colMap.set(name, new Series<Scalar>({ data, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}
