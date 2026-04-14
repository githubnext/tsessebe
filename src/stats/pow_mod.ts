/**
 * pow_mod — element-wise exponentiation, modulo, and floor-division for
 * Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.pow(other)` / `DataFrame.pow(other)`
 * - `Series.mod(other)` / `DataFrame.mod(other)`
 * - `Series.floordiv(other)` / `DataFrame.floordiv(other)`
 *
 * Each function accepts either a **scalar** (number) or another
 * **Series / DataFrame** of compatible shape as the right-hand operand.
 * When two Series are supplied the operation is performed **positionally**
 * (index labels are not used for alignment — same as pandas' default
 * `fill_value=None` positional path when shapes match).
 *
 * Missing values (null / NaN / undefined) are propagated unchanged.
 * Division by zero follows JavaScript semantics: `n / 0 → ±Infinity`,
 * `0 / 0 → NaN` (consistent with `pandas.Series.floordiv` on floats).
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
 * result is `null`.
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

// ─── pow ──────────────────────────────────────────────────────────────────────

const _pow = (a: number, b: number): number => a ** b;

/**
 * Raise each element of `series` to the power of `other`.
 *
 * `other` may be a scalar number or another Series of the same length.
 * Missing values are propagated unchanged.
 * Mirrors `pandas.Series.pow(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesPow } from "tsb";
 * const s = new Series({ data: [2, 3, 4] });
 * seriesPow(s, 3).values;                     // [8, 27, 64]
 * seriesPow(s, new Series({ data: [1, 2, 3] })).values; // [2, 9, 64]
 * ```
 */
export function seriesPow(series: Series<Scalar>, other: number | Series<Scalar>): Series<Scalar> {
  const data =
    typeof other === "number"
      ? mapScalar(series.values, other, _pow)
      : zipNumeric(series.values, other.values, _pow);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Raise every numeric cell of `df` to the power of `other`.
 *
 * `other` may be a scalar number or a DataFrame with the same columns.
 * Mirrors `pandas.DataFrame.pow(other)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFramePow } from "tsb";
 * const df = DataFrame.fromColumns({ a: [2, 3], b: [4, 5] });
 * dataFramePow(df, 2).col("a").values; // [4, 9]
 * ```
 */
export function dataFramePow(df: DataFrame, other: number | DataFrame): DataFrame {
  return colWiseBinary(df, other, _pow);
}

// ─── mod ──────────────────────────────────────────────────────────────────────

/** Python-style modulo: result has the same sign as the divisor. */
const _mod = (a: number, b: number): number => {
  // Use `a - floor(a/b)*b` to avoid the addition overflow that occurs with
  // `((a%b)+b)%b` when `a+b` exceeds Number.MAX_VALUE.
  const r = a - Math.floor(a / b) * b;
  // Normalise −0 → 0 for consistency with pandas.
  return r === 0 ? 0 : r;
};

/**
 * Compute the element-wise modulo of `series` divided by `other`.
 *
 * Uses **Python / pandas semantics**: the result always has the same sign as
 * the divisor (i.e. `a mod b = ((a % b) + b) % b`).  This matches
 * `pandas.Series.mod(other)`.
 *
 * `other` may be a scalar number or another Series of the same length.
 * Missing values are propagated unchanged.
 *
 * @example
 * ```ts
 * import { Series, seriesMod } from "tsb";
 * const s = new Series({ data: [-7, 3, 10] });
 * seriesMod(s, 3).values;  // [2, 0, 1]   (Python-style)
 * ```
 */
export function seriesMod(series: Series<Scalar>, other: number | Series<Scalar>): Series<Scalar> {
  const data =
    typeof other === "number"
      ? mapScalar(series.values, other, _mod)
      : zipNumeric(series.values, other.values, _mod);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Compute the element-wise modulo of every numeric cell of `df` by `other`.
 *
 * Mirrors `pandas.DataFrame.mod(other)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameMod } from "tsb";
 * const df = DataFrame.fromColumns({ a: [7, 8], b: [10, 11] });
 * dataFrameMod(df, 3).col("a").values; // [1, 2]
 * ```
 */
export function dataFrameMod(df: DataFrame, other: number | DataFrame): DataFrame {
  return colWiseBinary(df, other, _mod);
}

// ─── floordiv ─────────────────────────────────────────────────────────────────

/** Python-style floor division: always rounds towards −∞. */
const _floordiv = (a: number, b: number): number => {
  const q = Math.floor(a / b);
  return q === 0 ? 0 : q;
};

/**
 * Compute the element-wise floor-division of `series` by `other`.
 *
 * Rounds towards **negative infinity** (Python / pandas `//` semantics), so
 * `-7 // 2 = -4` (not `-3`).  Division by zero follows IEEE-754:
 * `n // 0 → ±Infinity`, `0 // 0 → NaN`.
 *
 * `other` may be a scalar number or another Series of the same length.
 * Mirrors `pandas.Series.floordiv(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesFloorDiv } from "tsb";
 * const s = new Series({ data: [7, -7, 10] });
 * seriesFloorDiv(s, 2).values;  // [3, -4, 5]
 * ```
 */
export function seriesFloorDiv(
  series: Series<Scalar>,
  other: number | Series<Scalar>,
): Series<Scalar> {
  const data =
    typeof other === "number"
      ? mapScalar(series.values, other, _floordiv)
      : zipNumeric(series.values, other.values, _floordiv);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Compute the element-wise floor-division of every numeric cell of `df` by
 * `other`.
 *
 * Mirrors `pandas.DataFrame.floordiv(other)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameFloorDiv } from "tsb";
 * const df = DataFrame.fromColumns({ a: [7, -7], b: [10, 11] });
 * dataFrameFloorDiv(df, 3).col("a").values; // [2, -3]
 * ```
 */
export function dataFrameFloorDiv(df: DataFrame, other: number | DataFrame): DataFrame {
  return colWiseBinary(df, other, _floordiv);
}
