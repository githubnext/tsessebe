/**
 * math_ops — element-wise mathematical transformations for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.abs()` — absolute value of each element
 * - `DataFrame.abs()` — element-wise absolute value
 * - `Series.round(decimals?)` — round each element to N decimal places
 * - `DataFrame.round(decimals?)` — round each column to N decimal places
 *   (or per-column decimals via a Record)
 *
 * All functions are **pure** — inputs are never mutated.
 * `null` / `undefined` / `NaN` values propagate unchanged.
 *
 * @module
 */

import { DataFrame, Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Round a number to `decimals` decimal places using the "round half away from
 * zero" strategy (matches Python's `round()` for positive decimals).
 */
function roundNum(v: number, decimals: number): number {
  if (decimals === 0) {
    return Math.round(v);
  }
  const factor = 10 ** decimals;
  return Math.round(v * factor) / factor;
}

// ─── absSeries ────────────────────────────────────────────────────────────────

/**
 * Return a new Series with the absolute value of each numeric element.
 *
 * Mirrors `pandas.Series.abs()`.
 *
 * Non-numeric and missing values (`null`, `undefined`, `NaN`) are preserved
 * as-is.
 *
 * @example
 * ```ts
 * import { Series, absSeries } from "tsb";
 *
 * absSeries(new Series({ data: [-1, 2, -3, null] })).values;
 * // [1, 2, 3, null]
 * ```
 */
export function absSeries(s: Series<Scalar>): Series<Scalar> {
  const data: Scalar[] = s.values.map((v) => {
    if (isMissing(v)) {
      return v;
    }
    if (typeof v === "number") {
      return Math.abs(v);
    }
    return v; // non-numeric (string, boolean) — pass through unchanged
  });
  return new Series<Scalar>({ data, index: s.index, name: s.name });
}

// ─── absDataFrame ─────────────────────────────────────────────────────────────

/**
 * Return a new DataFrame where every numeric cell has been replaced by its
 * absolute value.
 *
 * Mirrors `pandas.DataFrame.abs()`.
 *
 * Non-numeric and missing values are preserved as-is.
 *
 * @example
 * ```ts
 * import { DataFrame, absDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [-1, 2], b: [3, -4] });
 * absDataFrame(df).col("a").values; // [1, 2]
 * absDataFrame(df).col("b").values; // [3, 4]
 * ```
 */
export function absDataFrame(df: DataFrame): DataFrame {
  const colNames = df.columns.values as readonly string[];
  const newColMap = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    newColMap.set(name, absSeries(df.col(name)));
  }
  return new DataFrame(newColMap, df.index, [...colNames]);
}

// ─── roundSeries ─────────────────────────────────────────────────────────────

/**
 * Return a new Series with each numeric element rounded to `decimals` decimal
 * places.
 *
 * Mirrors `pandas.Series.round(decimals=0)`.
 *
 * Missing values (`null`, `undefined`, `NaN`) are preserved as-is.
 *
 * @param decimals - Number of decimal places (default `0`). Negative values
 *   round to tens, hundreds, etc. (e.g. `-1` rounds to the nearest 10).
 *
 * @example
 * ```ts
 * import { Series, roundSeries } from "tsb";
 *
 * roundSeries(new Series({ data: [1.234, 5.678] }), 2).values;
 * // [1.23, 5.68]
 * ```
 */
export function roundSeries(s: Series<Scalar>, decimals = 0): Series<Scalar> {
  const data: Scalar[] = s.values.map((v) => {
    if (isMissing(v)) {
      return v;
    }
    if (typeof v === "number") {
      return roundNum(v, decimals);
    }
    return v;
  });
  return new Series<Scalar>({ data, index: s.index, name: s.name });
}

// ─── roundDataFrame ───────────────────────────────────────────────────────────

/**
 * Options for {@link roundDataFrame}.
 *
 * Either a single `decimals` number (applied to all columns) or a per-column
 * `Record<columnName, decimals>` (unspecified columns default to `0`).
 */
export type RoundDataFrameSpec = number | Readonly<Record<string, number>>;

/**
 * Return a new DataFrame with each numeric cell rounded to the specified
 * number of decimal places.
 *
 * Mirrors `pandas.DataFrame.round(decimals)`:
 * - Pass a single number to apply the same precision to all columns.
 * - Pass a `Record<colName, decimals>` to use per-column precision.
 *   Columns not listed default to `0`.
 *
 * @example
 * ```ts
 * import { DataFrame, roundDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1.111, 2.222], b: [3.333, 4.444] });
 * roundDataFrame(df, 2).col("a").values;     // [1.11, 2.22]
 * roundDataFrame(df, { a: 1, b: 2 }).col("b").values; // [3.33, 4.44]
 * ```
 */
export function roundDataFrame(df: DataFrame, decimals: RoundDataFrameSpec = 0): DataFrame {
  const colNames = df.columns.values as readonly string[];
  const newColMap = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    const d = typeof decimals === "number" ? decimals : (decimals[name] ?? 0);
    newColMap.set(name, roundSeries(df.col(name), d));
  }
  return new DataFrame(newColMap, df.index, [...colNames]);
}
