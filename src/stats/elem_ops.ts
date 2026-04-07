/**
 * elem_ops — element-wise scalar operations for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.clip(lower, upper)` / `DataFrame.clip(lower, upper)`
 * - `Series.abs()` / `DataFrame.abs()`
 * - `Series.round(decimals)` / `DataFrame.round(decimals)`
 *
 * All functions are **pure** (return new Series/DataFrame; inputs are unchanged).
 * Missing values (null / NaN) are **propagated** through every operation.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link clip} and {@link dataFrameClip}. */
export interface ClipOptions {
  /**
   * Lower bound.  Values below this are replaced with `lower`.
   * `null` / `undefined` means no lower bound (default).
   */
  readonly lower?: number | null;
  /**
   * Upper bound.  Values above this are replaced with `upper`.
   * `null` / `undefined` means no upper bound (default).
   */
  readonly upper?: number | null;
}

/** Options for {@link round} and {@link dataFrameRound}. */
export interface RoundOptions {
  /**
   * Number of decimal places to round to.  Default `0`.
   * Negative values round to the left of the decimal point (e.g. `-1` → nearest 10).
   */
  readonly decimals?: number;
}

/** Options for {@link dataFrameClip} — inherits ClipOptions, adds axis. */
export interface DataFrameElemOptions extends ClipOptions {
  /**
   * Axis for DataFrame operations.
   * - `0` or `"index"` (default): apply operation **column-wise**
   * - `1` or `"columns"`: apply operation **row-wise**
   *   (not meaningful for scalar ops; kept for API symmetry)
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a finite number (not null / undefined / NaN). */
function isFiniteNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/** Apply `fn` to each element; missing values pass through unchanged. */
function mapNumeric(vals: readonly Scalar[], fn: (v: number) => number): Scalar[] {
  const out: Scalar[] = new Array<Scalar>(vals.length);
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i] as Scalar;
    out[i] = isFiniteNum(v) ? fn(v) : v;
  }
  return out;
}

/** Apply a column-wise numeric transform to every column of a DataFrame. */
function colWiseElem(df: DataFrame, fn: (v: number) => number): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const col = df.col(name);
    const data = mapNumeric(col.values, fn);
    colMap.set(name, new Series<Scalar>({ data, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}

// ─── clip ─────────────────────────────────────────────────────────────────────

/** Build a clip transform function from lower / upper bounds. */
function makeClipFn(
  lower: number | null | undefined,
  upper: number | null | undefined,
): (v: number) => number {
  const lo = lower ?? Number.NEGATIVE_INFINITY;
  const hi = upper ?? Number.POSITIVE_INFINITY;
  return (v: number): number => {
    if (v < lo) {
      return lo;
    }
    if (v > hi) {
      return hi;
    }
    return v;
  };
}

/**
 * Clip values in a Series to a [lower, upper] range.
 *
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 * Mirrors `pandas.Series.clip(lower, upper)`.
 *
 * @example
 * ```ts
 * import { Series, clip } from "tsb";
 * const s = new Series({ data: [-3, 1, 5, 10] });
 * clip(s, { lower: 0, upper: 6 }).values; // [0, 1, 5, 6]
 * ```
 */
export function clip(series: Series<Scalar>, options: ClipOptions = {}): Series<Scalar> {
  const fn = makeClipFn(options.lower, options.upper);
  const data = mapNumeric(series.values, fn);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Clip values in every numeric cell of a DataFrame to a [lower, upper] range.
 *
 * Mirrors `pandas.DataFrame.clip(lower, upper)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameClip } from "tsb";
 * const df = DataFrame.fromColumns({ a: [-1, 2, 5], b: [0, 3, 8] });
 * dataFrameClip(df, { lower: 0, upper: 4 }).col("a").values; // [0, 2, 4]
 * ```
 */
export function dataFrameClip(df: DataFrame, options: ClipOptions = {}): DataFrame {
  const fn = makeClipFn(options.lower, options.upper);
  return colWiseElem(df, fn);
}

// ─── abs ──────────────────────────────────────────────────────────────────────

/**
 * Return a Series with the absolute value of each element.
 *
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 * Mirrors `pandas.Series.abs()`.
 *
 * @example
 * ```ts
 * import { Series, seriesAbs } from "tsb";
 * const s = new Series({ data: [-3, -1, 0, 2] });
 * seriesAbs(s).values; // [3, 1, 0, 2]
 * ```
 */
export function seriesAbs(series: Series<Scalar>): Series<Scalar> {
  const data = mapNumeric(series.values, Math.abs);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Return a DataFrame where every numeric cell is replaced by its absolute value.
 *
 * Mirrors `pandas.DataFrame.abs()`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameAbs } from "tsb";
 * const df = DataFrame.fromColumns({ a: [-1, 2], b: [-3, -4] });
 * dataFrameAbs(df).col("a").values; // [1, 2]
 * ```
 */
export function dataFrameAbs(df: DataFrame): DataFrame {
  return colWiseElem(df, Math.abs);
}

// ─── round ────────────────────────────────────────────────────────────────────

/** Build a rounding function for `decimals` decimal places. */
function makeRoundFn(decimals: number): (v: number) => number {
  if (decimals === 0) {
    return Math.round;
  }
  const factor = 10 ** decimals;
  return (v: number): number => Math.round(v * factor) / factor;
}

/**
 * Round each element of a Series to the given number of decimal places.
 *
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 * Mirrors `pandas.Series.round(decimals)`.
 *
 * @example
 * ```ts
 * import { Series, seriesRound } from "tsb";
 * const s = new Series({ data: [1.234, 2.567, 3.001] });
 * seriesRound(s, { decimals: 2 }).values; // [1.23, 2.57, 3.00]
 * ```
 */
export function seriesRound(series: Series<Scalar>, options: RoundOptions = {}): Series<Scalar> {
  const fn = makeRoundFn(options.decimals ?? 0);
  const data = mapNumeric(series.values, fn);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Round every numeric cell of a DataFrame to the given number of decimal places.
 *
 * Mirrors `pandas.DataFrame.round(decimals)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameRound } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1.5, 2.4], b: [3.14, 2.71] });
 * dataFrameRound(df, { decimals: 1 }).col("b").values; // [3.1, 2.7]
 * ```
 */
export function dataFrameRound(df: DataFrame, options: RoundOptions = {}): DataFrame {
  const fn = makeRoundFn(options.decimals ?? 0);
  return colWiseElem(df, fn);
}
