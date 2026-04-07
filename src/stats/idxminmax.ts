/**
 * idxmin / idxmax — return the index label of the minimum / maximum value.
 *
 * Mirrors `pandas.Series.idxmin()`, `pandas.Series.idxmax()`,
 * `pandas.DataFrame.idxmin()`, and `pandas.DataFrame.idxmax()`.
 *
 * For a Series, returns the **label** (from `series.index`) at the position
 * of the minimum or maximum value.  For a DataFrame, returns a Series whose
 * values are the row (or column) labels where the extremum occurs.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [3, 1, 2], index: ["a", "b", "c"] });
 * idxmin(s); // "b"
 * idxmax(s); // "a"
 *
 * const df = DataFrame.fromColumns({ x: [3, 1, 2], y: [1, 4, 0] });
 * idxminDataFrame(df); // Series({ x: 1, y: 2 }) — row positions of min per column
 * idxmaxDataFrame(df); // Series({ x: 0, y: 1 })
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/frame.ts";
import { Series } from "../core/series.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Return true when `v` is a missing value (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Return true when `a` is strictly less than `b` for numeric/comparable Scalars. */
function lessThan(a: Scalar, b: Scalar): boolean {
  if (typeof a === "number" && typeof b === "number") return a < b;
  if (typeof a === "string" && typeof b === "string") return a < b;
  if (typeof a === "boolean" && typeof b === "boolean") return a < b;
  if (a instanceof Date && b instanceof Date) return a.getTime() < b.getTime();
  // cross-type: fall back to string comparison
  return String(a) < String(b);
}

/** Return true when `a` is strictly greater than `b`. */
function greaterThan(a: Scalar, b: Scalar): boolean {
  if (typeof a === "number" && typeof b === "number") return a > b;
  if (typeof a === "string" && typeof b === "string") return a > b;
  if (typeof a === "boolean" && typeof b === "boolean") return a > b;
  if (a instanceof Date && b instanceof Date) return a.getTime() > b.getTime();
  return String(a) > String(b);
}

// ─── options ─────────────────────────────────────────────────────────────────

/** Options shared by idxmin / idxmax. */
export interface IdxMinMaxOptions {
  /**
   * Whether to skip NaN/null values when searching for the extremum.
   * When `true` (default), missing values are ignored.
   * When `false`, the first missing value causes the function to return `null`.
   */
  readonly skipna?: boolean;
}

/** Axis selector for DataFrame idxmin / idxmax. */
export type IdxAxis = 0 | 1 | "index" | "columns";

/** Options for {@link idxminDataFrame} and {@link idxmaxDataFrame}. */
export interface IdxMinMaxDataFrameOptions extends IdxMinMaxOptions {
  /**
   * Axis along which to find the extremum label.
   * - `0` / `"index"` (default): for each **column**, return the row label of the extremum.
   * - `1` / `"columns"`: for each **row**, return the column name of the extremum.
   */
  readonly axis?: IdxAxis;
}

// ─── Series: idxmin / idxmax ──────────────────────────────────────────────────

/**
 * Return the index label of the minimum value in `series`.
 *
 * Returns `null` when:
 * - The series is empty.
 * - All values are missing and `skipna` is `true`.
 * - `skipna` is `false` and any value is missing before a non-missing minimum
 *   is found (mirrors pandas behaviour: returns `NaN` / the missing-value
 *   label).
 *
 * @param series  - Input Series.
 * @param options - Optional `{ skipna }` setting (default `skipna: true`).
 */
export function idxmin<T extends Scalar>(
  series: Series<T>,
  options?: IdxMinMaxOptions,
): Label | null {
  return findExtremumLabel(series, "min", options?.skipna ?? true);
}

/**
 * Return the index label of the maximum value in `series`.
 *
 * Returns `null` when the series is empty or all values are missing (with
 * `skipna: true`).
 *
 * @param series  - Input Series.
 * @param options - Optional `{ skipna }` setting (default `skipna: true`).
 */
export function idxmax<T extends Scalar>(
  series: Series<T>,
  options?: IdxMinMaxOptions,
): Label | null {
  return findExtremumLabel(series, "max", options?.skipna ?? true);
}

/** Internal helper: scan series for the extremum and return its index label. */
function findExtremumLabel<T extends Scalar>(
  series: Series<T>,
  mode: "min" | "max",
  skipna: boolean,
): Label | null {
  const vals = series.values;
  const idx = series.index;
  const n = vals.length;

  let bestPos = -1;
  let bestVal: Scalar = null;

  for (let i = 0; i < n; i++) {
    const v = vals[i] ?? null;
    if (isMissing(v)) {
      if (!skipna) {
        // pandas returns the label of the NaN position when skipna=False
        return idx.at(i);
      }
      continue;
    }
    if (bestPos === -1) {
      bestPos = i;
      bestVal = v;
    } else {
      const beats =
        mode === "min" ? lessThan(v as Scalar, bestVal) : greaterThan(v as Scalar, bestVal);
      if (beats) {
        bestPos = i;
        bestVal = v;
      }
    }
  }

  return bestPos === -1 ? null : idx.at(bestPos);
}

// ─── DataFrame: idxmin / idxmax ───────────────────────────────────────────────

/**
 * Return a Series of index labels where the minimum value occurs.
 *
 * - **axis 0 (default)**: For each column, return the row label of the minimum.
 *   The result is a Series indexed by column names.
 * - **axis 1**: For each row, return the column name of the minimum.
 *   The result is a Series indexed by row labels.
 *
 * @param df      - Source DataFrame.
 * @param options - Optional `{ axis, skipna }`.
 */
export function idxminDataFrame(
  df: DataFrame,
  options?: IdxMinMaxDataFrameOptions,
): Series<Scalar> {
  return findExtremumDataFrame(df, "min", options);
}

/**
 * Return a Series of index labels where the maximum value occurs.
 *
 * - **axis 0 (default)**: For each column, return the row label of the maximum.
 * - **axis 1**: For each row, return the column name of the maximum.
 *
 * @param df      - Source DataFrame.
 * @param options - Optional `{ axis, skipna }`.
 */
export function idxmaxDataFrame(
  df: DataFrame,
  options?: IdxMinMaxDataFrameOptions,
): Series<Scalar> {
  return findExtremumDataFrame(df, "max", options);
}

/** Internal helper: columnar or row-wise extremum scan for DataFrames. */
function findExtremumDataFrame(
  df: DataFrame,
  mode: "min" | "max",
  options?: IdxMinMaxDataFrameOptions,
): Series<Scalar> {
  const axis = options?.axis ?? 0;
  const skipna = options?.skipna ?? true;
  const axisNum: 0 | 1 = axis === 0 || axis === "index" ? 0 : 1;

  if (axisNum === 0) {
    // For each column → row label of extremum
    const colNames = df.columns.toArray();
    const resultVals: Scalar[] = [];
    for (const colName of colNames) {
      const s = df.col(colName);
      resultVals.push(findExtremumLabel(s, mode, skipna));
    }
    return new Series<Scalar>({ data: resultVals, index: df.columns.toArray() as Label[] });
  } else {
    // For each row → column name of extremum
    const rowCount = df.index.size;
    const colNames = df.columns.toArray();
    const resultVals: Scalar[] = [];
    const rowLabels: Label[] = [];

    for (let ri = 0; ri < rowCount; ri++) {
      rowLabels.push(df.index.at(ri));
      let bestCol: string | null = null;
      let bestVal: Scalar = null;
      let bestSet = false;

      for (const colName of colNames) {
        const v: Scalar = df.col(colName).values[ri] ?? null;
        if (isMissing(v)) {
          if (!skipna) {
            bestCol = colName;
            bestSet = true;
            break;
          }
          continue;
        }
        if (!bestSet) {
          bestCol = colName;
          bestVal = v;
          bestSet = true;
        } else {
          const beats =
            mode === "min"
              ? lessThan(v, bestVal as Scalar)
              : greaterThan(v, bestVal as Scalar);
          if (beats) {
            bestCol = colName;
            bestVal = v;
          }
        }
      }
      resultVals.push(bestCol);
    }
    return new Series<Scalar>({ data: resultVals, index: rowLabels });
  }
}
