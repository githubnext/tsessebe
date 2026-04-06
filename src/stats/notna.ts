/**
 * notna / isna — element-wise missing-value detection.
 *
 * Mirrors `pandas.notna`, `pandas.isna`, `pandas.notnull`, `pandas.isnull`.
 *
 * A value is considered **missing** when it is:
 * - `null`
 * - `undefined`
 * - `NaN` (numeric `number` only — `Number.isNaN`)
 *
 * All four public names follow the pandas naming convention:
 * - `isna` / `isnull`   — returns `true` where data is missing
 * - `notna` / `notnull` — returns `true` where data is **not** missing
 *
 * @module
 *
 * @example
 * ```ts
 * import { isna, notna } from "tsb";
 * import { Series } from "tsb";
 *
 * // Scalar
 * isna(null);     // true
 * isna(NaN);      // true
 * isna(0);        // false
 * notna(null);    // false
 * notna("hello"); // true
 *
 * // Array
 * isna([1, null, NaN, "x"]); // [false, true, true, false]
 *
 * // Series
 * const s = new Series([1, null, NaN, 4]);
 * isna(s).values;  // [false, true, true, false]
 * notna(s).values; // [true, false, false, true]
 *
 * // DataFrame
 * import { DataFrame } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, null], b: [NaN, 3] });
 * isna(df).toRecords();
 * // [{ a: false, b: true }, { a: true, b: false }]
 * ```
 */

import type { Scalar } from "../types.ts";
import { DataFrame } from "../core/frame.ts";
import { Series } from "../core/series.ts";

// ─── internal helper ──────────────────────────────────────────────────────────

/** Return `true` when `v` is a missing value (null, undefined, NaN). */
function missing(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "number" && Number.isNaN(v)) return true;
  return false;
}

// ─── overload signatures ──────────────────────────────────────────────────────

/**
 * Return `true` when `value` is missing (`null`, `undefined`, or `NaN`).
 *
 * Overloads:
 * - `isna(scalar)` → `boolean`
 * - `isna(array)`  → `boolean[]`
 * - `isna(series)` → `Series<Scalar>` (boolean values)
 * - `isna(df)`     → `DataFrame` (boolean values)
 */
export function isna(value: DataFrame): DataFrame;
export function isna(value: Series<Scalar>): Series<Scalar>;
export function isna(value: readonly Scalar[]): boolean[];
export function isna(value: Scalar): boolean;
export function isna(
  value: Scalar | readonly Scalar[] | Series<Scalar> | DataFrame,
): boolean | boolean[] | Series<Scalar> | DataFrame {
  if (value instanceof DataFrame) {
    return _isnaDataFrame(value);
  }
  if (value instanceof Series) {
    return _isnaSeries(value);
  }
  if (Array.isArray(value)) {
    return (value as readonly Scalar[]).map(missing);
  }
  return missing(value as Scalar);
}

/**
 * Return `true` when `value` is **not** missing (`null`, `undefined`, or `NaN`).
 *
 * Overloads:
 * - `notna(scalar)` → `boolean`
 * - `notna(array)`  → `boolean[]`
 * - `notna(series)` → `Series<Scalar>` (boolean values)
 * - `notna(df)`     → `DataFrame` (boolean values)
 */
export function notna(value: DataFrame): DataFrame;
export function notna(value: Series<Scalar>): Series<Scalar>;
export function notna(value: readonly Scalar[]): boolean[];
export function notna(value: Scalar): boolean;
export function notna(
  value: Scalar | readonly Scalar[] | Series<Scalar> | DataFrame,
): boolean | boolean[] | Series<Scalar> | DataFrame {
  if (value instanceof DataFrame) {
    return _notnaDataFrame(value);
  }
  if (value instanceof Series) {
    return _notnaSeries(value);
  }
  if (Array.isArray(value)) {
    return (value as readonly Scalar[]).map((v) => !missing(v));
  }
  return !missing(value as Scalar);
}

/** Alias for {@link isna}. */
export const isnull = isna;

/** Alias for {@link notna}. */
export const notnull = notna;

// ─── private helpers ──────────────────────────────────────────────────────────

function _isnaSeries(s: Series<Scalar>): Series<Scalar> {
  const bools: Scalar[] = s.values.map(missing);
  return new Series({ data: bools, index: s.index, name: s.name });
}

function _notnaSeries(s: Series<Scalar>): Series<Scalar> {
  const bools: Scalar[] = s.values.map((v) => !missing(v));
  return new Series({ data: bools, index: s.index, name: s.name });
}

function _isnaDataFrame(df: DataFrame): DataFrame {
  const cols: Map<string, Series<Scalar>> = new Map();
  for (const colName of df.columns) {
    const col = df.col(colName);
    const bools: Scalar[] = col.values.map(missing);
    cols.set(colName, new Series({ data: bools, index: col.index, name: colName }));
  }
  return new DataFrame(cols, df.index);
}

function _notnaDataFrame(df: DataFrame): DataFrame {
  const cols: Map<string, Series<Scalar>> = new Map();
  for (const colName of df.columns) {
    const col = df.col(colName);
    const bools: Scalar[] = col.values.map((v) => !missing(v));
    cols.set(colName, new Series({ data: bools, index: col.index, name: colName }));
  }
  return new DataFrame(cols, df.index);
}
