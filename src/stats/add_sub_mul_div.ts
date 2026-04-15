/**
 * add_sub_mul_div — element-wise addition, subtraction, multiplication, and
 * true-division for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.add(other)` / `DataFrame.add(other)`
 * - `Series.sub(other)` / `DataFrame.sub(other)`
 * - `Series.mul(other)` / `DataFrame.mul(other)`
 * - `Series.div(other)` / `DataFrame.div(other)`  (true division — returns float)
 * - `Series.radd(other)` / `DataFrame.radd(other)` (reversed operands)
 * - `Series.rsub(other)` / `DataFrame.rsub(other)`
 * - `Series.rmul(other)` / `DataFrame.rmul(other)`
 * - `Series.rdiv(other)` / `DataFrame.rdiv(other)`
 *
 * Each function accepts either a **scalar** (number) or another
 * **Series / DataFrame** of compatible shape as the right-hand operand.
 * When two Series are supplied the operation is performed **positionally**
 * (index labels are not used for alignment — same as pandas' default
 * `fill_value=None` positional path when shapes match).
 *
 * Missing values (null / NaN / undefined) are propagated unchanged.
 * Division by zero follows IEEE-754: `n / 0 → ±Infinity`, `0 / 0 → NaN`
 * (consistent with `pandas.Series.div` on floats).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a number (possibly NaN / Infinity). */
function isNum(v: Scalar): v is number {
  return typeof v === "number";
}

/**
 * Apply a two-argument numeric transform to two value arrays of the same
 * length.  Both `a[i]` and `b[i]` must be finite numbers; otherwise the
 * missing/non-numeric value is propagated.
 */
function zipNumeric(
  as: readonly Scalar[],
  bs: readonly Scalar[],
  fn: (a: number, b: number) => number,
): Scalar[] {
  const n = as.length;
  const out: Scalar[] = new Array<Scalar>(n);
  for (let i = 0; i < n; i++) {
    const a = as[i] as Scalar;
    const b = bs[i] as Scalar;
    if (isNum(a) && !Number.isNaN(a) && isNum(b) && !Number.isNaN(b)) {
      out[i] = fn(a, b);
    } else {
      out[i] = a === null || a === undefined || (isNum(a) && Number.isNaN(a)) ? a : b;
    }
  }
  return out;
}

/**
 * Apply a scalar numeric transform to a value array.  Non-numeric values
 * pass through unchanged.
 */
function mapScalar(
  vals: readonly Scalar[],
  scalar: number,
  fn: (a: number, b: number) => number,
): Scalar[] {
  const out: Scalar[] = new Array<Scalar>(vals.length);
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i] as Scalar;
    out[i] = isNum(v) && !Number.isNaN(v) ? fn(v, scalar) : v;
  }
  return out;
}

/** Apply a binary column-wise transform to every column of a DataFrame. */
function colWiseBinary(
  df: DataFrame,
  other: DataFrame | number,
  fn: (a: number, b: number) => number,
): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const col = df.col(name);
    let data: Scalar[];
    if (typeof other === "number") {
      data = mapScalar(col.values, other, fn);
    } else {
      const otherCol = other.col(name);
      data = zipNumeric(col.values, otherCol.values, fn);
    }
    colMap.set(name, new Series<Scalar>({ data, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}

// ─── add ──────────────────────────────────────────────────────────────────────

const _add = (a: number, b: number): number => a + b;

/**
 * Add `other` to each element of `series`.
 *
 * `other` may be a scalar number or another Series of the same length.
 * Missing values are propagated unchanged.
 * Mirrors `pandas.Series.add(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesAdd } from "tsb";
 * const s = new Series({ data: [1, 2, 3] });
 * seriesAdd(s, 10).values;                                    // [11, 12, 13]
 * seriesAdd(s, new Series({ data: [4, 5, 6] })).values;      // [5, 7, 9]
 * ```
 */
export function seriesAdd(series: Series<Scalar>, other: number | Series<Scalar>): Series<Scalar> {
  const data =
    typeof other === "number"
      ? mapScalar(series.values, other, _add)
      : zipNumeric(series.values, other.values, _add);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Add `other` to every numeric cell of `df`.
 *
 * `other` may be a scalar number or a DataFrame with the same columns.
 * Mirrors `pandas.DataFrame.add(other)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameAdd } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * dataFrameAdd(df, 10).col("a").values; // [11, 12]
 * ```
 */
export function dataFrameAdd(df: DataFrame, other: number | DataFrame): DataFrame {
  return colWiseBinary(df, other, _add);
}

/**
 * Reversed addition: compute `other + series[i]` for each element.
 *
 * For a commutative operation this is equivalent to `seriesAdd`, but it is
 * provided for API parity with `pandas.Series.radd`.
 */
export function seriesRadd(series: Series<Scalar>, other: number | Series<Scalar>): Series<Scalar> {
  // addition is commutative
  return seriesAdd(series, other);
}

/**
 * Reversed addition for DataFrame: `other + df[col][i]`.
 * Equivalent to `dataFrameAdd` due to commutativity.
 * Mirrors `pandas.DataFrame.radd`.
 */
export function dataFrameRadd(df: DataFrame, other: number | DataFrame): DataFrame {
  return dataFrameAdd(df, other);
}

// ─── sub ──────────────────────────────────────────────────────────────────────

const _sub = (a: number, b: number): number => a - b;
const _rsub = (a: number, b: number): number => b - a;

/**
 * Subtract `other` from each element of `series`.
 *
 * `other` may be a scalar number or another Series of the same length.
 * Missing values are propagated unchanged.
 * Mirrors `pandas.Series.sub(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesSub } from "tsb";
 * const s = new Series({ data: [10, 20, 30] });
 * seriesSub(s, 5).values;   // [5, 15, 25]
 * ```
 */
export function seriesSub(series: Series<Scalar>, other: number | Series<Scalar>): Series<Scalar> {
  const data =
    typeof other === "number"
      ? mapScalar(series.values, other, _sub)
      : zipNumeric(series.values, other.values, _sub);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Subtract each element of `series` from `other` (reversed operands).
 *
 * Computes `other - series[i]`.  Mirrors `pandas.Series.rsub(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesRsub } from "tsb";
 * const s = new Series({ data: [1, 2, 3] });
 * seriesRsub(s, 10).values;  // [9, 8, 7]   (10 - 1, 10 - 2, 10 - 3)
 * ```
 */
export function seriesRsub(series: Series<Scalar>, other: number | Series<Scalar>): Series<Scalar> {
  const data =
    typeof other === "number"
      ? mapScalar(series.values, other, _rsub)
      : zipNumeric(series.values, other.values, _rsub);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Subtract each element of `df` from a scalar or corresponding DataFrame cell.
 * Mirrors `pandas.DataFrame.sub(other)`.
 */
export function dataFrameSub(df: DataFrame, other: number | DataFrame): DataFrame {
  return colWiseBinary(df, other, _sub);
}

/**
 * Reversed subtraction for DataFrame: `other - df[col][i]`.
 * Mirrors `pandas.DataFrame.rsub(other)`.
 */
export function dataFrameRsub(df: DataFrame, other: number | DataFrame): DataFrame {
  return colWiseBinary(df, other, _rsub);
}

// ─── mul ──────────────────────────────────────────────────────────────────────

const _mul = (a: number, b: number): number => a * b;

/**
 * Multiply each element of `series` by `other`.
 *
 * `other` may be a scalar number or another Series of the same length.
 * Missing values are propagated unchanged.
 * Mirrors `pandas.Series.mul(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesMul } from "tsb";
 * const s = new Series({ data: [1, 2, 3] });
 * seriesMul(s, 3).values;  // [3, 6, 9]
 * ```
 */
export function seriesMul(series: Series<Scalar>, other: number | Series<Scalar>): Series<Scalar> {
  const data =
    typeof other === "number"
      ? mapScalar(series.values, other, _mul)
      : zipNumeric(series.values, other.values, _mul);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Reversed multiplication: `other * series[i]`.
 * For a commutative operation this is equivalent to `seriesMul`.
 * Mirrors `pandas.Series.rmul`.
 */
export function seriesRmul(series: Series<Scalar>, other: number | Series<Scalar>): Series<Scalar> {
  return seriesMul(series, other);
}

/**
 * Multiply every numeric cell of `df` by `other`.
 * Mirrors `pandas.DataFrame.mul(other)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameMul } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * dataFrameMul(df, 2).col("b").values; // [6, 8]
 * ```
 */
export function dataFrameMul(df: DataFrame, other: number | DataFrame): DataFrame {
  return colWiseBinary(df, other, _mul);
}

/**
 * Reversed multiplication for DataFrame.
 * Equivalent to `dataFrameMul` due to commutativity.
 * Mirrors `pandas.DataFrame.rmul`.
 */
export function dataFrameRmul(df: DataFrame, other: number | DataFrame): DataFrame {
  return dataFrameMul(df, other);
}

// ─── div (true division) ──────────────────────────────────────────────────────

const _div = (a: number, b: number): number => a / b;
const _rdiv = (a: number, b: number): number => b / a;

/**
 * Divide each element of `series` by `other` (true division).
 *
 * Division by zero follows IEEE-754: `n / 0 → ±Infinity`, `0 / 0 → NaN`.
 * `other` may be a scalar number or another Series of the same length.
 * Missing values are propagated unchanged.
 * Mirrors `pandas.Series.div(other)` (also known as `truediv`).
 *
 * @example
 * ```ts
 * import { Series, seriesDiv } from "tsb";
 * const s = new Series({ data: [4, 9, 16] });
 * seriesDiv(s, 2).values;  // [2, 4.5, 8]
 * ```
 */
export function seriesDiv(series: Series<Scalar>, other: number | Series<Scalar>): Series<Scalar> {
  const data =
    typeof other === "number"
      ? mapScalar(series.values, other, _div)
      : zipNumeric(series.values, other.values, _div);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Reversed true-division: compute `other / series[i]` for each element.
 * Mirrors `pandas.Series.rdiv(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesRdiv } from "tsb";
 * const s = new Series({ data: [2, 4, 8] });
 * seriesRdiv(s, 16).values;  // [8, 4, 2]   (16/2, 16/4, 16/8)
 * ```
 */
export function seriesRdiv(series: Series<Scalar>, other: number | Series<Scalar>): Series<Scalar> {
  const data =
    typeof other === "number"
      ? mapScalar(series.values, other, _rdiv)
      : zipNumeric(series.values, other.values, _rdiv);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Divide every numeric cell of `df` by `other` (true division).
 * Mirrors `pandas.DataFrame.div(other)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameDiv } from "tsb";
 * const df = DataFrame.fromColumns({ a: [4, 9], b: [6, 8] });
 * dataFrameDiv(df, 2).col("a").values; // [2, 4.5]
 * ```
 */
export function dataFrameDiv(df: DataFrame, other: number | DataFrame): DataFrame {
  return colWiseBinary(df, other, _div);
}

/**
 * Reversed true-division for DataFrame: `other / df[col][i]`.
 * Mirrors `pandas.DataFrame.rdiv(other)`.
 */
export function dataFrameRdiv(df: DataFrame, other: number | DataFrame): DataFrame {
  return colWiseBinary(df, other, _rdiv);
}
