/**
 * na_ops — missing-value utilities for Series and DataFrame.
 *
 * Mirrors the following pandas module-level functions and methods:
 * - `pd.isna(obj)` / `pd.isnull(obj)` — detect missing values
 * - `pd.notna(obj)` / `pd.notnull(obj)` — detect non-missing values
 * - `Series.ffill()` / `DataFrame.ffill()` — forward-fill missing values
 * - `Series.bfill()` / `DataFrame.bfill()` — backward-fill missing values
 *
 * All functions are **pure** (return new objects; inputs are unchanged).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link ffillSeries} and {@link bfillSeries}. */
export interface FillDirectionOptions {
  /**
   * Maximum number of consecutive NaN/null values to fill.
   * `null` means no limit (default).
   */
  readonly limit?: number | null;
}

/** Options for {@link dataFrameFfill} and {@link dataFrameBfill}. */
export interface DataFrameFillOptions extends FillDirectionOptions {
  /**
   * - `0` or `"index"` (default): fill missing values down each **column**.
   * - `1` or `"columns"`: fill missing values across each **row**.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Forward-fill an array of scalars in-place (returns a new array). */
function ffillArray(vals: readonly Scalar[], limit: number | null): Scalar[] {
  const out: Scalar[] = Array.from(vals);
  let lastValid: Scalar = null;
  let streak = 0;
  for (let i = 0; i < out.length; i++) {
    if (isMissing(out[i])) {
      if (!isMissing(lastValid) && (limit === null || streak < limit)) {
        out[i] = lastValid;
        streak++;
      }
    } else {
      lastValid = out[i] as Scalar;
      streak = 0;
    }
  }
  return out;
}

/** Backward-fill an array of scalars (returns a new array). */
function bfillArray(vals: readonly Scalar[], limit: number | null): Scalar[] {
  const out: Scalar[] = Array.from(vals);
  let nextValid: Scalar = null;
  let streak = 0;
  for (let i = out.length - 1; i >= 0; i--) {
    if (isMissing(out[i])) {
      if (!isMissing(nextValid) && (limit === null || streak < limit)) {
        out[i] = nextValid;
        streak++;
      }
    } else {
      nextValid = out[i] as Scalar;
      streak = 0;
    }
  }
  return out;
}

// ─── isna / notna ─────────────────────────────────────────────────────────────

/**
 * Detect missing values in a scalar, Series, or DataFrame.
 *
 * - For a **scalar**: returns `true` if the value is `null`, `undefined`, or `NaN`.
 * - For a **Series**: returns a `Series<boolean>` of the same index.
 * - For a **DataFrame**: returns a `DataFrame` of boolean columns.
 *
 * Mirrors `pandas.isna()` / `pandas.isnull()`.
 *
 * @example
 * ```ts
 * import { isna } from "tsb";
 * isna(null);          // true
 * isna(42);            // false
 * isna(NaN);           // true
 *
 * const s = new Series({ data: [1, null, NaN, 4] });
 * isna(s);             // Series([false, true, true, false])
 * ```
 */
export function isna(value: Scalar): boolean;
export function isna(value: Series<Scalar>): Series<boolean>;
export function isna(value: DataFrame): DataFrame;
export function isna(
  value: Scalar | Series<Scalar> | DataFrame,
): boolean | Series<boolean> | DataFrame {
  if (value instanceof DataFrame) {
    return value.isna();
  }
  if (value instanceof Series) {
    return value.isna();
  }
  return isMissing(value as Scalar);
}

/**
 * Detect non-missing values in a scalar, Series, or DataFrame.
 *
 * Mirrors `pandas.notna()` / `pandas.notnull()`.
 *
 * @example
 * ```ts
 * import { notna } from "tsb";
 * notna(null);         // false
 * notna(42);           // true
 * ```
 */
export function notna(value: Scalar): boolean;
export function notna(value: Series<Scalar>): Series<boolean>;
export function notna(value: DataFrame): DataFrame;
export function notna(
  value: Scalar | Series<Scalar> | DataFrame,
): boolean | Series<boolean> | DataFrame {
  if (value instanceof DataFrame) {
    return value.notna();
  }
  if (value instanceof Series) {
    return value.notna();
  }
  return !isMissing(value as Scalar);
}

/** Alias for {@link isna}. Mirrors `pandas.isnull()`. */
export const isnull = isna;

/** Alias for {@link notna}. Mirrors `pandas.notnull()`. */
export const notnull = notna;

// ─── ffill ────────────────────────────────────────────────────────────────────

/**
 * Forward-fill missing values in a Series.
 *
 * Each `null`/`NaN` value is replaced with the last non-missing value
 * that precedes it (if any). Values before the first non-missing value
 * remain missing.
 *
 * Mirrors `pandas.Series.ffill()`.
 *
 * @param series - Input Series (unchanged).
 * @param options - Optional `{ limit }` — max consecutive fills.
 * @returns New Series with forward-filled values.
 *
 * @example
 * ```ts
 * import { ffillSeries } from "tsb";
 * const s = new Series({ data: [1, null, null, 4] });
 * ffillSeries(s);  // Series([1, 1, 1, 4])
 * ```
 */
export function ffillSeries<T extends Scalar>(
  series: Series<T>,
  options?: FillDirectionOptions,
): Series<T> {
  const limit = options?.limit ?? null;
  const filled = ffillArray(series.values as readonly Scalar[], limit) as T[];
  return new Series<T>({
    data: filled,
    index: series.index,
    dtype: series.dtype,
    name: series.name ?? null,
  });
}

/**
 * Backward-fill missing values in a Series.
 *
 * Each `null`/`NaN` value is replaced with the next non-missing value
 * that follows it (if any). Values after the last non-missing value
 * remain missing.
 *
 * Mirrors `pandas.Series.bfill()`.
 *
 * @example
 * ```ts
 * import { bfillSeries } from "tsb";
 * const s = new Series({ data: [1, null, null, 4] });
 * bfillSeries(s);  // Series([1, 4, 4, 4])
 * ```
 */
export function bfillSeries<T extends Scalar>(
  series: Series<T>,
  options?: FillDirectionOptions,
): Series<T> {
  const limit = options?.limit ?? null;
  const filled = bfillArray(series.values as readonly Scalar[], limit) as T[];
  return new Series<T>({
    data: filled,
    index: series.index,
    dtype: series.dtype,
    name: series.name ?? null,
  });
}

// ─── DataFrame ffill / bfill ──────────────────────────────────────────────────

/**
 * Forward-fill missing values in a DataFrame.
 *
 * By default operates **column-wise** (axis=0): each column is independently
 * forward-filled. With `axis=1` each row is forward-filled across columns.
 *
 * Mirrors `pandas.DataFrame.ffill()`.
 *
 * @example
 * ```ts
 * import { dataFrameFfill } from "tsb";
 * const df = new DataFrame({ data: { a: [1, null, 3], b: [null, 2, null] } });
 * dataFrameFfill(df);
 * // a: [1, 1, 3]
 * // b: [null, 2, 2]
 * ```
 */
export function dataFrameFfill(df: DataFrame, options?: DataFrameFillOptions): DataFrame {
  const limit = options?.limit ?? null;
  const axis = options?.axis ?? 0;
  const byRow = axis === 1 || axis === "columns";

  if (!byRow) {
    // column-wise: fill each column independently
    const colMap = new Map<string, Series<Scalar>>();
    for (const name of df.columns.values) {
      const col = df.col(name);
      const filled = ffillArray(col.values, limit) as Scalar[];
      colMap.set(name, new Series<Scalar>({ data: filled, index: col.index, dtype: col.dtype }));
    }
    return new DataFrame(colMap, df.index);
  }

  // row-wise: fill across columns for each row
  const nRows = df.shape[0];
  const cols = df.columns.values;
  const columns = cols.map((name) => df.col(name));
  const rowsFilled: Scalar[][] = columns.map((c) => Array.from(c.values));
  for (let r = 0; r < nRows; r++) {
    const rowVals: Scalar[] = columns.map((_, ci) => rowsFilled[ci]?.[r] ?? null);
    const filled = ffillArray(rowVals, limit);
    for (let ci = 0; ci < cols.length; ci++) {
      const rowsFilledCI = rowsFilled[ci];
      if (rowsFilledCI !== undefined) {
        rowsFilledCI[r] = filled[ci] ?? null;
      }
    }
  }
  const colMap = new Map<string, Series<Scalar>>();
  for (let ci = 0; ci < cols.length; ci++) {
    const name = cols[ci] as string;
    const col = columns[ci] as Series<Scalar>;
    colMap.set(
      name,
      new Series<Scalar>({
        data: rowsFilled[ci] ?? [],
        index: col.index,
        dtype: col.dtype,
      }),
    );
  }
  return new DataFrame(colMap, df.index);
}

/**
 * Backward-fill missing values in a DataFrame.
 *
 * By default operates **column-wise** (axis=0). With `axis=1` fills across rows.
 *
 * Mirrors `pandas.DataFrame.bfill()`.
 */
export function dataFrameBfill(df: DataFrame, options?: DataFrameFillOptions): DataFrame {
  const limit = options?.limit ?? null;
  const axis = options?.axis ?? 0;
  const byRow = axis === 1 || axis === "columns";

  if (!byRow) {
    const colMap = new Map<string, Series<Scalar>>();
    for (const name of df.columns.values) {
      const col = df.col(name);
      const filled = bfillArray(col.values, limit) as Scalar[];
      colMap.set(name, new Series<Scalar>({ data: filled, index: col.index, dtype: col.dtype }));
    }
    return new DataFrame(colMap, df.index);
  }

  const nRows = df.shape[0];
  const cols = df.columns.values;
  const columns = cols.map((name) => df.col(name));
  const rowsFilled: Scalar[][] = columns.map((c) => Array.from(c.values));
  for (let r = 0; r < nRows; r++) {
    const rowVals: Scalar[] = columns.map((_, ci) => rowsFilled[ci]?.[r] ?? null);
    const filled = bfillArray(rowVals, limit);
    for (let ci = 0; ci < cols.length; ci++) {
      const rowsFilledCI = rowsFilled[ci];
      if (rowsFilledCI !== undefined) {
        rowsFilledCI[r] = filled[ci] ?? null;
      }
    }
  }
  const colMap = new Map<string, Series<Scalar>>();
  for (let ci = 0; ci < cols.length; ci++) {
    const name = cols[ci] as string;
    const col = columns[ci] as Series<Scalar>;
    colMap.set(
      name,
      new Series<Scalar>({
        data: rowsFilled[ci] ?? [],
        index: col.index,
        dtype: col.dtype,
      }),
    );
  }
  return new DataFrame(colMap, df.index);
}
