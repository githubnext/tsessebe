/**
 * abs / round — element-wise absolute value and rounding.
 *
 * Mirrors pandas:
 * - `pandas.Series.abs()` — element-wise absolute value of numeric data
 * - `pandas.Series.round(decimals)` — round each element to `decimals` places
 * - `pandas.DataFrame.abs()` — column-wise abs
 * - `pandas.DataFrame.round(decimals)` — column-wise round (decimals may be a
 *   scalar or a `Record<string, number>` for per-column precision)
 *
 * Behaviour for non-numeric values:
 * - `abs`: non-numeric values (including `null`, `undefined`, `NaN`, strings,
 *   booleans) pass through **unchanged**, matching pandas' behaviour of only
 *   operating on numeric dtypes.
 * - `round`: same pass-through rule.
 *
 * All functions are **pure** — inputs are never mutated.
 *
 * @module
 *
 * @example
 * ```ts
 * import { absSeries, roundSeries, absDataFrame, roundDataFrame } from "tsb";
 * import { Series, DataFrame } from "tsb";
 *
 * const s = new Series([-3, 1.75, null, -0.5]);
 * absSeries(s).values;         // [3, 1.75, null, 0.5]
 * roundSeries(s, 1).values;    // [-3, 1.8, null, -0.5]
 *
 * const df = DataFrame.fromColumns({ a: [-1, 2], b: [3.14159, -2.71] });
 * absDataFrame(df).toRecords();
 * // [{ a: 1, b: 3.14159 }, { a: 2, b: 2.71 }]
 * roundDataFrame(df, 2).toRecords();
 * // [{ a: -1, b: 3.14 }, { a: 2, b: -2.71 }]
 * roundDataFrame(df, { a: 0, b: 1 }).toRecords();
 * // [{ a: -1, b: 3.1 }, { a: 2, b: -2.7 }]
 * ```
 */

import { DataFrame } from "../core/frame.ts";
import { Series } from "../core/series.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Per-column decimal precision for {@link roundDataFrame}.
 *
 * Columns not listed retain their original values (i.e. `decimals=0` is NOT
 * assumed for missing keys).
 */
export type RoundDecimals = number | Readonly<Record<string, number>>;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a finite number (not null / undefined / NaN). */
function isFiniteNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/**
 * Round a finite number to `decimals` decimal places.
 *
 * Uses the standard "round half away from zero" semantics of `Number.toFixed`
 * to avoid IEEE-754 round-half-to-even surprises.
 */
function roundNumber(n: number, decimals: number): number {
  if (decimals < 0) {
    // Round to tens / hundreds etc. (negative decimals, like pandas)
    const factor = 10 ** -decimals;
    return Math.round(n / factor) * factor;
  }
  // Use toFixed to get correct rounding then parse back to number.
  return Number(n.toFixed(decimals));
}

/**
 * Apply `abs` to a raw value array — numeric values are made non-negative;
 * all other values (strings, booleans, null, undefined, NaN) pass through.
 */
function absVals(vals: readonly Scalar[]): Scalar[] {
  return vals.map((v) => (isFiniteNum(v) ? Math.abs(v) : v));
}

/**
 * Apply `round` to a raw value array with the given precision.
 */
function roundVals(vals: readonly Scalar[], decimals: number): Scalar[] {
  return vals.map((v) => (isFiniteNum(v) ? roundNumber(v, decimals) : v));
}

// ─── Series ───────────────────────────────────────────────────────────────────

/**
 * Return a new Series with each numeric element replaced by its absolute value.
 *
 * Non-numeric values (`null`, `undefined`, `NaN`, strings, booleans) are
 * returned **unchanged**.
 *
 * Mirrors `pandas.Series.abs()`.
 *
 * @param series - Input Series.
 * @returns New Series of the same length and index.
 */
export function absSeries(series: Series<Scalar>): Series<Scalar> {
  return new Series({
    data: absVals(series.values),
    index: series.index,
    name: series.name,
  });
}

/**
 * Return a new Series with each numeric element rounded to `decimals` decimal
 * places.
 *
 * - `decimals = 0` (default) rounds to the nearest integer.
 * - Negative `decimals` rounds to the left of the decimal point (e.g. `-1`
 *   rounds to the nearest 10), matching pandas.
 * - Non-numeric values pass through unchanged.
 *
 * Mirrors `pandas.Series.round(decimals=0)`.
 *
 * @param series   - Input Series.
 * @param decimals - Number of decimal places (default `0`).
 * @returns New Series of the same length and index.
 */
export function roundSeries(series: Series<Scalar>, decimals = 0): Series<Scalar> {
  return new Series({
    data: roundVals(series.values, decimals),
    index: series.index,
    name: series.name,
  });
}

// ─── DataFrame ────────────────────────────────────────────────────────────────

/**
 * Return a new DataFrame with each numeric element replaced by its absolute
 * value, column by column.
 *
 * Non-numeric values pass through unchanged.
 *
 * Mirrors `pandas.DataFrame.abs()`.
 *
 * @param df - Input DataFrame.
 * @returns New DataFrame with identical structure but abs-transformed values.
 */
export function absDataFrame(df: DataFrame): DataFrame {
  const newCols = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values as string[]) {
    newCols.set(name, absSeries(df.col(name)));
  }
  return new DataFrame(newCols, df.index);
}

/**
 * Return a new DataFrame with numeric elements rounded column by column.
 *
 * - If `decimals` is a **number**, it is applied to all columns.
 * - If `decimals` is a **`Record<string, number>`**, each key specifies the
 *   precision for the named column.  Columns not mentioned are left unchanged.
 *
 * Mirrors `pandas.DataFrame.round(decimals=0)`.
 *
 * @param df       - Input DataFrame.
 * @param decimals - Decimal precision (scalar or per-column map).
 * @returns New DataFrame with identical structure but rounded values.
 */
export function roundDataFrame(df: DataFrame, decimals: RoundDecimals = 0): DataFrame {
  const newCols = new Map<string, Series<Scalar>>();

  for (const name of df.columns.values as string[]) {
    const col = df.col(name);
    if (typeof decimals === "number") {
      newCols.set(name, roundSeries(col, decimals));
    } else {
      const prec = decimals[name];
      if (prec !== undefined) {
        newCols.set(name, roundSeries(col, prec));
      } else {
        newCols.set(name, col);
      }
    }
  }

  return new DataFrame(newCols, df.index);
}
