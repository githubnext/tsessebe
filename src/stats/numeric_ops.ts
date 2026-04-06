/**
 * numeric_ops — element-wise mathematical functions for Series and DataFrame.
 *
 * Mirrors the following pandas / NumPy functions applied to a Series or DataFrame:
 * - `np.floor(series)` / `np.floor(df)` — floor of each element
 * - `np.ceil(series)`  / `np.ceil(df)`  — ceiling of each element
 * - `np.trunc(series)` / `np.trunc(df)` — truncate decimal part toward zero
 * - `np.sqrt(series)`  / `np.sqrt(df)`  — square root (NaN for negatives)
 * - `np.exp(series)`   / `np.exp(df)`   — e raised to the power of each element
 * - `np.log(series)`   / `np.log(df)`   — natural logarithm (NaN for ≤ 0)
 * - `np.log2(series)`  / `np.log2(df)`  — base-2 logarithm (NaN for ≤ 0)
 * - `np.log10(series)` / `np.log10(df)` — base-10 logarithm (NaN for ≤ 0)
 * - `np.sign(series)`  / `np.sign(df)`  — sign of each element: −1, 0, or 1
 *
 * All functions are **pure** (return new Series/DataFrame; inputs are unchanged).
 * Missing values (null / NaN) are **propagated** through every operation.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a finite number (not null / undefined / NaN). */
function isFiniteNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/** Apply `fn` to each numeric element; non-numeric values pass through unchanged. */
function mapNumeric(vals: readonly Scalar[], fn: (v: number) => number): Scalar[] {
  const out: Scalar[] = new Array<Scalar>(vals.length);
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i] as Scalar;
    out[i] = isFiniteNum(v) ? fn(v) : v;
  }
  return out;
}

/** Apply a column-wise numeric transform to every column of a DataFrame. */
function colWise(df: DataFrame, fn: (v: number) => number): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const col = df.col(name);
    const data = mapNumeric(col.values, fn);
    colMap.set(name, new Series<Scalar>({ data, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}

/** Build a Series result with the same index and name as the input. */
function seriesResult(series: Series<Scalar>, fn: (v: number) => number): Series<Scalar> {
  const data = mapNumeric(series.values, fn);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

// ─── floor ────────────────────────────────────────────────────────────────────

/**
 * Return the largest integer less than or equal to each element.
 *
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 * Mirrors `np.floor(series)`.
 *
 * @example
 * ```ts
 * import { Series, seriesFloor } from "tsb";
 * const s = new Series({ data: [1.7, -1.2, 0, 3.0] });
 * seriesFloor(s).values; // [1, -2, 0, 3]
 * ```
 */
export function seriesFloor(series: Series<Scalar>): Series<Scalar> {
  return seriesResult(series, Math.floor);
}

/**
 * Apply `Math.floor` to every numeric cell of a DataFrame.
 *
 * Mirrors `np.floor(df)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameFloor } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1.7, 2.3], b: [-0.5, 4.9] });
 * dataFrameFloor(df).col("a").values; // [1, 2]
 * ```
 */
export function dataFrameFloor(df: DataFrame): DataFrame {
  return colWise(df, Math.floor);
}

// ─── ceil ─────────────────────────────────────────────────────────────────────

/**
 * Return the smallest integer greater than or equal to each element.
 *
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 * Mirrors `np.ceil(series)`.
 *
 * @example
 * ```ts
 * import { Series, seriesCeil } from "tsb";
 * const s = new Series({ data: [1.2, -1.7, 0, 3.0] });
 * seriesCeil(s).values; // [2, -1, 0, 3]
 * ```
 */
export function seriesCeil(series: Series<Scalar>): Series<Scalar> {
  return seriesResult(series, Math.ceil);
}

/**
 * Apply `Math.ceil` to every numeric cell of a DataFrame.
 *
 * Mirrors `np.ceil(df)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameCeil } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1.2, 2.8], b: [-0.5, 4.1] });
 * dataFrameCeil(df).col("a").values; // [2, 3]
 * ```
 */
export function dataFrameCeil(df: DataFrame): DataFrame {
  return colWise(df, Math.ceil);
}

// ─── trunc ────────────────────────────────────────────────────────────────────

/**
 * Truncate each element toward zero (remove the fractional part).
 *
 * Equivalent to `np.trunc(series)`. Note: differs from floor for negatives —
 * `trunc(-1.9) === -1` whereas `floor(-1.9) === -2`.
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 *
 * @example
 * ```ts
 * import { Series, seriesTrunc } from "tsb";
 * const s = new Series({ data: [1.9, -1.9, 0.5, -0.5] });
 * seriesTrunc(s).values; // [1, -1, 0, 0]
 * ```
 */
export function seriesTrunc(series: Series<Scalar>): Series<Scalar> {
  return seriesResult(series, Math.trunc);
}

/**
 * Apply `Math.trunc` to every numeric cell of a DataFrame.
 *
 * Mirrors `np.trunc(df)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameTrunc } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1.9, -1.9], b: [0.5, -0.5] });
 * dataFrameTrunc(df).col("a").values; // [1, -1]
 * ```
 */
export function dataFrameTrunc(df: DataFrame): DataFrame {
  return colWise(df, Math.trunc);
}

// ─── sqrt ─────────────────────────────────────────────────────────────────────

/**
 * Return the square root of each element.
 *
 * Returns `NaN` for negative values (matching NumPy behaviour for real-valued sqrt).
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 * Mirrors `np.sqrt(series)`.
 *
 * @example
 * ```ts
 * import { Series, seriesSqrt } from "tsb";
 * const s = new Series({ data: [0, 1, 4, 9, 16] });
 * seriesSqrt(s).values; // [0, 1, 2, 3, 4]
 * ```
 */
export function seriesSqrt(series: Series<Scalar>): Series<Scalar> {
  return seriesResult(series, Math.sqrt);
}

/**
 * Apply `Math.sqrt` to every numeric cell of a DataFrame.
 *
 * Mirrors `np.sqrt(df)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameSqrt } from "tsb";
 * const df = DataFrame.fromColumns({ a: [0, 4, 9], b: [1, 16, 25] });
 * dataFrameSqrt(df).col("a").values; // [0, 2, 3]
 * ```
 */
export function dataFrameSqrt(df: DataFrame): DataFrame {
  return colWise(df, Math.sqrt);
}

// ─── exp ──────────────────────────────────────────────────────────────────────

/**
 * Return *e* raised to the power of each element.
 *
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 * Mirrors `np.exp(series)`.
 *
 * @example
 * ```ts
 * import { Series, seriesExp } from "tsb";
 * const s = new Series({ data: [0, 1, 2] });
 * seriesExp(s).values; // [1, Math.E, Math.E ** 2]
 * ```
 */
export function seriesExp(series: Series<Scalar>): Series<Scalar> {
  return seriesResult(series, Math.exp);
}

/**
 * Apply `Math.exp` to every numeric cell of a DataFrame.
 *
 * Mirrors `np.exp(df)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameExp } from "tsb";
 * const df = DataFrame.fromColumns({ a: [0, 1], b: [2, 3] });
 * dataFrameExp(df).col("a").values; // [1, Math.E]
 * ```
 */
export function dataFrameExp(df: DataFrame): DataFrame {
  return colWise(df, Math.exp);
}

// ─── log ──────────────────────────────────────────────────────────────────────

/**
 * Return the natural logarithm (base *e*) of each element.
 *
 * Returns `NaN` for values ≤ 0 (matching NumPy real-valued behaviour).
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 * Mirrors `np.log(series)`.
 *
 * @example
 * ```ts
 * import { Series, seriesLog } from "tsb";
 * const s = new Series({ data: [1, Math.E, Math.E ** 2] });
 * seriesLog(s).values; // [0, 1, 2]
 * ```
 */
export function seriesLog(series: Series<Scalar>): Series<Scalar> {
  return seriesResult(series, Math.log);
}

/**
 * Apply `Math.log` to every numeric cell of a DataFrame.
 *
 * Mirrors `np.log(df)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameLog } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, Math.E], b: [Math.E ** 2, 1] });
 * dataFrameLog(df).col("a").values; // [0, 1]
 * ```
 */
export function dataFrameLog(df: DataFrame): DataFrame {
  return colWise(df, Math.log);
}

// ─── log2 ─────────────────────────────────────────────────────────────────────

/**
 * Return the base-2 logarithm of each element.
 *
 * Returns `NaN` for values ≤ 0.
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 * Mirrors `np.log2(series)`.
 *
 * @example
 * ```ts
 * import { Series, seriesLog2 } from "tsb";
 * const s = new Series({ data: [1, 2, 4, 8] });
 * seriesLog2(s).values; // [0, 1, 2, 3]
 * ```
 */
export function seriesLog2(series: Series<Scalar>): Series<Scalar> {
  return seriesResult(series, Math.log2);
}

/**
 * Apply `Math.log2` to every numeric cell of a DataFrame.
 *
 * Mirrors `np.log2(df)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameLog2 } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [4, 8] });
 * dataFrameLog2(df).col("a").values; // [0, 1]
 * ```
 */
export function dataFrameLog2(df: DataFrame): DataFrame {
  return colWise(df, Math.log2);
}

// ─── log10 ────────────────────────────────────────────────────────────────────

/**
 * Return the base-10 logarithm of each element.
 *
 * Returns `NaN` for values ≤ 0.
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 * Mirrors `np.log10(series)`.
 *
 * @example
 * ```ts
 * import { Series, seriesLog10 } from "tsb";
 * const s = new Series({ data: [1, 10, 100, 1000] });
 * seriesLog10(s).values; // [0, 1, 2, 3]
 * ```
 */
export function seriesLog10(series: Series<Scalar>): Series<Scalar> {
  return seriesResult(series, Math.log10);
}

/**
 * Apply `Math.log10` to every numeric cell of a DataFrame.
 *
 * Mirrors `np.log10(df)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameLog10 } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 10], b: [100, 1000] });
 * dataFrameLog10(df).col("a").values; // [0, 1]
 * ```
 */
export function dataFrameLog10(df: DataFrame): DataFrame {
  return colWise(df, Math.log10);
}

// ─── sign ─────────────────────────────────────────────────────────────────────

/**
 * Return the sign of each element: `−1`, `0`, or `1`.
 *
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 * Mirrors `np.sign(series)`.
 *
 * @example
 * ```ts
 * import { Series, seriesSign } from "tsb";
 * const s = new Series({ data: [-5, -0.1, 0, 0.1, 7] });
 * seriesSign(s).values; // [-1, -1, 0, 1, 1]
 * ```
 */
export function seriesSign(series: Series<Scalar>): Series<Scalar> {
  return seriesResult(series, Math.sign);
}

/**
 * Apply `Math.sign` to every numeric cell of a DataFrame.
 *
 * Mirrors `np.sign(df)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameSign } from "tsb";
 * const df = DataFrame.fromColumns({ a: [-5, 0, 3], b: [1, -1, 0] });
 * dataFrameSign(df).col("a").values; // [-1, 0, 1]
 * ```
 */
export function dataFrameSign(df: DataFrame): DataFrame {
  return colWise(df, Math.sign);
}
