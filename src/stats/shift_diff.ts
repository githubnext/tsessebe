/**
 * shift_diff — shift and diff operations for Series and DataFrame.
 *
 * Mirrors `pandas.Series.shift()` / `DataFrame.shift()` and
 * `pandas.Series.diff()` / `DataFrame.diff()`:
 *
 * - `shiftSeries(series, periods)` — shift values by N positions (fills with null)
 * - `diffSeries(series, periods)` — first discrete difference
 * - `dataFrameShift(df, periods, options)` — column-wise or row-wise shift
 * - `dataFrameDiff(df, periods, options)` — column-wise or row-wise diff
 *
 * **`periods`** (default `1`):
 * - Positive → shift down (prepend nulls, drop tail values)
 * - Negative → shift up (append nulls, drop head values)
 * - Zero → identity (no change for shift; all-null for diff)
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for DataFrame-level shift/diff. */
export interface ShiftDiffDataFrameOptions {
  /**
   * - `0` or `"index"` (default): operate down each **column**.
   * - `1` or `"columns"`: operate across each **row**.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a finite number (not null/undefined/NaN). */
function isFiniteNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

// ─── core: shift ──────────────────────────────────────────────────────────────

/**
 * Shift `vals` by `periods` positions, filling exposed positions with `null`.
 *
 * @param vals   Input value array.
 * @param periods  Number of positions to shift.  Positive → down; negative → up.
 * @returns A new array of the same length with values shifted and holes filled
 *          with `null`.
 */
function shiftVals(vals: readonly Scalar[], periods: number): Scalar[] {
  const n = vals.length;
  const out: Scalar[] = new Array<Scalar>(n).fill(null);
  if (periods >= 0) {
    // shift down: out[i] = vals[i - periods]  (for i >= periods)
    for (let i = periods; i < n; i++) {
      const v = vals[i - periods];
      out[i] = v !== undefined ? v : null;
    }
  } else {
    // shift up: out[i] = vals[i - periods]  (periods < 0)
    const abs = -periods;
    for (let i = 0; i < n - abs; i++) {
      const v = vals[i + abs];
      out[i] = v !== undefined ? v : null;
    }
  }
  return out;
}

// ─── core: diff ───────────────────────────────────────────────────────────────

/**
 * First discrete difference of `vals` with lag `periods`.
 *
 * `out[i] = vals[i] - vals[i - periods]` when both are finite numbers;
 * otherwise `NaN`.
 */
function diffVals(vals: readonly Scalar[], periods: number): number[] {
  const n = vals.length;
  const out: number[] = new Array<number>(n).fill(Number.NaN);
  if (periods >= 0) {
    for (let i = periods; i < n; i++) {
      const cur = vals[i] as Scalar;
      const prev = vals[i - periods] as Scalar;
      if (isFiniteNum(cur) && isFiniteNum(prev)) {
        out[i] = cur - prev;
      }
    }
  } else {
    // negative periods: compare forward
    const abs = -periods;
    for (let i = 0; i < n - abs; i++) {
      const cur = vals[i] as Scalar;
      const fwd = vals[i + abs] as Scalar;
      if (isFiniteNum(cur) && isFiniteNum(fwd)) {
        out[i] = cur - fwd;
      }
    }
  }
  return out;
}

// ─── DataFrame helpers ────────────────────────────────────────────────────────

/**
 * Apply a column-level transform (Scalar[] → Scalar[]) to each column
 * independently (axis = 0).
 */
function colWiseTransform(df: DataFrame, fn: (vals: readonly Scalar[]) => Scalar[]): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const col = df.col(name);
    const result = fn(col.values);
    colMap.set(name, new Series<Scalar>({ data: result, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}

/** Extract a row from per-column data arrays. */
function extractRow(colData: ReadonlyArray<readonly Scalar[]>, i: number): Scalar[] {
  const row: Scalar[] = new Array<Scalar>(colData.length);
  for (let j = 0; j < colData.length; j++) {
    const col = colData[j];
    const v = col !== undefined ? col[i] : undefined;
    row[j] = v !== undefined ? v : null;
  }
  return row;
}

/**
 * Apply a row-level transform (Scalar[] → Scalar[]) to each row across
 * columns (axis = 1).
 */
function rowWiseTransform(df: DataFrame, fn: (vals: readonly Scalar[]) => Scalar[]): DataFrame {
  const colNames = df.columns.values;
  const nRows = df.index.size;
  const colData = colNames.map((c) => df.col(c).values);
  const outCols: Scalar[][] = colNames.map(() => new Array<Scalar>(nRows));

  for (let i = 0; i < nRows; i++) {
    const rowVals = extractRow(colData, i);
    const rowResult = fn(rowVals);
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

// ─── shiftSeries ──────────────────────────────────────────────────────────────

/**
 * **Shift** a Series by `periods` positions.
 *
 * Exposed positions (at the start when `periods > 0`, at the end when
 * `periods < 0`) are filled with `null`.  The index is unchanged.
 *
 * Mirrors `pandas.Series.shift(periods)`.
 *
 * @example
 * ```ts
 * import { Series, shiftSeries } from "tsb";
 * const s = new Series({ data: [1, 2, 3, 4] });
 * shiftSeries(s, 1).values;  // [null, 1, 2, 3]
 * shiftSeries(s, -1).values; // [2, 3, 4, null]
 * shiftSeries(s, 0).values;  // [1, 2, 3, 4]
 * ```
 */
export function shiftSeries(series: Series<Scalar>, periods = 1): Series<Scalar> {
  const result = shiftVals(series.values, periods);
  return new Series<Scalar>({ data: result, index: series.index, name: series.name });
}

// ─── diffSeries ───────────────────────────────────────────────────────────────

/**
 * **First discrete difference** of a Series.
 *
 * For each element at position `i`, computes `values[i] - values[i - periods]`.
 * Returns `NaN` for positions where either operand is missing or non-numeric.
 *
 * Mirrors `pandas.Series.diff(periods)`.
 *
 * @example
 * ```ts
 * import { Series, diffSeries } from "tsb";
 * const s = new Series({ data: [1, 3, 6, 10] });
 * diffSeries(s).values;     // [NaN, 2, 3, 4]
 * diffSeries(s, 2).values;  // [NaN, NaN, 5, 7]
 * diffSeries(s, -1).values; // [-2, -3, -4, NaN]
 * ```
 */
export function diffSeries(series: Series<Scalar>, periods = 1): Series<number> {
  const result = diffVals(series.values, periods);
  return new Series<number>({ data: result, index: series.index, name: series.name });
}

// ─── dataFrameShift ───────────────────────────────────────────────────────────

/**
 * **Shift** each column (or row) of a DataFrame by `periods` positions.
 *
 * Mirrors `pandas.DataFrame.shift(periods, axis)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameShift } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
 * dataFrameShift(df, 1).col("a").values; // [null, 1, 2]
 * ```
 */
export function dataFrameShift(
  df: DataFrame,
  periods = 1,
  options: ShiftDiffDataFrameOptions = {},
): DataFrame {
  const axis = options.axis ?? 0;
  const fn = (vals: readonly Scalar[]): Scalar[] => shiftVals(vals, periods);
  if (axis === 1 || axis === "columns") {
    return rowWiseTransform(df, fn);
  }
  return colWiseTransform(df, fn);
}

// ─── dataFrameDiff ────────────────────────────────────────────────────────────

/**
 * **First discrete difference** for each column (or row) of a DataFrame.
 *
 * Mirrors `pandas.DataFrame.diff(periods, axis)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameDiff } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 3, 6], b: [10, 30, 60] });
 * dataFrameDiff(df).col("a").values; // [NaN, 2, 3]
 * ```
 */
export function dataFrameDiff(
  df: DataFrame,
  periods = 1,
  options: ShiftDiffDataFrameOptions = {},
): DataFrame {
  const axis = options.axis ?? 0;
  const fn = (vals: readonly Scalar[]): number[] => diffVals(vals, periods);
  if (axis === 1 || axis === "columns") {
    return rowWiseTransform(df, fn);
  }
  return colWiseTransform(df, fn);
}
