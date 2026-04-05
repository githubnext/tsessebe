/**
 * compare — element-wise comparison operations for Series and DataFrame.
 *
 * Mirrors the following pandas methods (all return boolean results):
 * - `Series.eq(other)`  / `DataFrame.eq(other)`  — element-wise `==`
 * - `Series.ne(other)`  / `DataFrame.ne(other)`  — element-wise `!=`
 * - `Series.lt(other)`  / `DataFrame.lt(other)`  — element-wise `<`
 * - `Series.gt(other)`  / `DataFrame.gt(other)`  — element-wise `>`
 * - `Series.le(other)`  / `DataFrame.le(other)`  — element-wise `<=`
 * - `Series.ge(other)`  / `DataFrame.ge(other)`  — element-wise `>=`
 *
 * The `other` argument may be:
 *   - a **scalar** (`Scalar`) — compared against every element
 *   - a **Series** — compared element-by-element (by position)
 *   - a **DataFrame** — compared column-by-column, element-by-element
 *     (for DataFrame variants)
 *
 * Missing values (`null` / `undefined` / `NaN`) in either operand always yield
 * `false` — matching pandas' default `fill_value=np.nan` behaviour.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** The six binary comparison operators. */
export type CompareOp = "eq" | "ne" | "lt" | "gt" | "le" | "ge";

/**
 * The `other` argument for Series comparison functions.
 * May be a scalar, another Series (aligned by position), or a plain boolean array.
 */
export type SeriesOther = Scalar | Series<Scalar>;

/**
 * The `other` argument for DataFrame comparison functions.
 * May be a scalar (broadcast to all cells) or another DataFrame (column-aligned).
 */
export type DataFrameOther = Scalar | DataFrame;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a non-null, non-NaN value that can be compared with `<`. */
function isComparable(v: Scalar): boolean {
  if (v === null || v === undefined) {
    return false;
  }
  if (typeof v === "number" && Number.isNaN(v)) {
    return false;
  }
  return true;
}

/** Apply comparison `op` to two values; returns `false` when either is missing. */
function compareScalars(a: Scalar, b: Scalar, op: CompareOp): boolean {
  if (!isComparable(a) || !isComparable(b)) {
    // eq is special: null eq null → false (pandas NaN != NaN convention)
    return false;
  }
  switch (op) {
    case "eq":
      return a === b;
    case "ne":
      return a !== b;
    case "lt":
      return (a as number) < (b as number);
    case "gt":
      return (a as number) > (b as number);
    case "le":
      return (a as number) <= (b as number);
    case "ge":
      return (a as number) >= (b as number);
  }
}

/**
 * Build an array of boolean results by comparing `vals` element-wise
 * against `other` (resolved to a scalar array of the same length).
 * Returns `Scalar[]` so it can be directly used in Series/DataFrame constructors.
 */
function buildBoolArray(vals: readonly Scalar[], others: readonly Scalar[], op: CompareOp): Scalar[] {
  const n = vals.length;
  const out: Scalar[] = new Array<Scalar>(n);
  for (let i = 0; i < n; i++) {
    out[i] = compareScalars(vals[i] as Scalar, others[i] as Scalar, op);
  }
  return out;
}

/** Resolve `SeriesOther` to a scalar array of length `n`. */
function resolveSeriesOther(other: SeriesOther, n: number): readonly Scalar[] {
  if (other instanceof Series) {
    if (other.values.length !== n) {
      throw new RangeError(
        `Other Series length ${other.values.length} does not match Series length ${n}`,
      );
    }
    return other.values;
  }
  // Broadcast scalar
  return new Array<Scalar>(n).fill(other as Scalar);
}

// ─── Series comparison factory ────────────────────────────────────────────────

function makeSeriesCompare(
  series: Series<Scalar>,
  other: SeriesOther,
  op: CompareOp,
): Series<Scalar> {
  const n = series.values.length;
  const others = resolveSeriesOther(other, n);
  const data = buildBoolArray(series.values, others, op);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

// ─── Series comparison functions ──────────────────────────────────────────────

/**
 * Element-wise equality `==`.
 *
 * Returns a `Series<boolean>` that is `true` where `series[i] === other[i]`.
 * Missing values always yield `false`.
 *
 * Mirrors `pandas.Series.eq(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesEq } from "tsb";
 * const s = new Series({ data: [1, 2, 3] });
 * seriesEq(s, 2).values; // [false, true, false]
 * ```
 */
export function seriesEq(series: Series<Scalar>, other: SeriesOther): Series<Scalar> {
  return makeSeriesCompare(series, other, "eq");
}

/**
 * Element-wise inequality `!=`.
 *
 * Mirrors `pandas.Series.ne(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesNe } from "tsb";
 * const s = new Series({ data: [1, 2, 3] });
 * seriesNe(s, 2).values; // [true, false, true]
 * ```
 */
export function seriesNe(series: Series<Scalar>, other: SeriesOther): Series<Scalar> {
  return makeSeriesCompare(series, other, "ne");
}

/**
 * Element-wise less-than `<`.
 *
 * Mirrors `pandas.Series.lt(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesLt } from "tsb";
 * const s = new Series({ data: [1, 2, 3] });
 * seriesLt(s, 2).values; // [true, false, false]
 * ```
 */
export function seriesLt(series: Series<Scalar>, other: SeriesOther): Series<Scalar> {
  return makeSeriesCompare(series, other, "lt");
}

/**
 * Element-wise greater-than `>`.
 *
 * Mirrors `pandas.Series.gt(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesGt } from "tsb";
 * const s = new Series({ data: [1, 2, 3] });
 * seriesGt(s, 2).values; // [false, false, true]
 * ```
 */
export function seriesGt(series: Series<Scalar>, other: SeriesOther): Series<Scalar> {
  return makeSeriesCompare(series, other, "gt");
}

/**
 * Element-wise less-than-or-equal `<=`.
 *
 * Mirrors `pandas.Series.le(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesLe } from "tsb";
 * const s = new Series({ data: [1, 2, 3] });
 * seriesLe(s, 2).values; // [true, true, false]
 * ```
 */
export function seriesLe(series: Series<Scalar>, other: SeriesOther): Series<Scalar> {
  return makeSeriesCompare(series, other, "le");
}

/**
 * Element-wise greater-than-or-equal `>=`.
 *
 * Mirrors `pandas.Series.ge(other)`.
 *
 * @example
 * ```ts
 * import { Series, seriesGe } from "tsb";
 * const s = new Series({ data: [1, 2, 3] });
 * seriesGe(s, 2).values; // [false, true, true]
 * ```
 */
export function seriesGe(series: Series<Scalar>, other: SeriesOther): Series<Scalar> {
  return makeSeriesCompare(series, other, "ge");
}

// ─── DataFrame helpers ────────────────────────────────────────────────────────

/** Resolve `DataFrameOther` to a scalar for a given column of length `n`. */
function resolveDfOther(other: DataFrameOther, colName: string, n: number): readonly Scalar[] {
  if (other instanceof DataFrame) {
    const col = other.get(colName);
    if (col === undefined) {
      // Column missing → fill with null (comparisons will all be false)
      return new Array<Scalar>(n).fill(null);
    }
    if (col.values.length !== n) {
      throw new RangeError(
        `Other DataFrame column "${colName}" length ${col.values.length} does not match ${n}`,
      );
    }
    return col.values;
  }
  // Broadcast scalar
  return new Array<Scalar>(n).fill(other as Scalar);
}

/** Apply comparison op column-wise across a DataFrame. */
function makeDataFrameCompare(df: DataFrame, other: DataFrameOther, op: CompareOp): DataFrame {
  const nrows = df.shape[0];
  const colMap = new Map<string, Series<Scalar>>();

  for (const name of df.columns.values) {
    const col = df.col(name);
    const others = resolveDfOther(other, name, nrows);
    const data = buildBoolArray(col.values, others, op);
    colMap.set(name, new Series<Scalar>({ data, index: df.index, name }));
  }

  return new DataFrame(colMap, df.index);
}

// ─── DataFrame comparison functions ───────────────────────────────────────────

/**
 * Element-wise equality `==` across a DataFrame.
 *
 * `other` may be a scalar (broadcast to all cells) or another DataFrame
 * (compared column-by-column).
 *
 * Mirrors `pandas.DataFrame.eq(other)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameEq } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * dataFrameEq(df, 2).col("a").values; // [false, true]
 * ```
 */
export function dataFrameEq(df: DataFrame, other: DataFrameOther): DataFrame {
  return makeDataFrameCompare(df, other, "eq");
}

/**
 * Element-wise inequality `!=` across a DataFrame.
 *
 * Mirrors `pandas.DataFrame.ne(other)`.
 */
export function dataFrameNe(df: DataFrame, other: DataFrameOther): DataFrame {
  return makeDataFrameCompare(df, other, "ne");
}

/**
 * Element-wise less-than `<` across a DataFrame.
 *
 * Mirrors `pandas.DataFrame.lt(other)`.
 */
export function dataFrameLt(df: DataFrame, other: DataFrameOther): DataFrame {
  return makeDataFrameCompare(df, other, "lt");
}

/**
 * Element-wise greater-than `>` across a DataFrame.
 *
 * Mirrors `pandas.DataFrame.gt(other)`.
 */
export function dataFrameGt(df: DataFrame, other: DataFrameOther): DataFrame {
  return makeDataFrameCompare(df, other, "gt");
}

/**
 * Element-wise less-than-or-equal `<=` across a DataFrame.
 *
 * Mirrors `pandas.DataFrame.le(other)`.
 */
export function dataFrameLe(df: DataFrame, other: DataFrameOther): DataFrame {
  return makeDataFrameCompare(df, other, "le");
}

/**
 * Element-wise greater-than-or-equal `>=` across a DataFrame.
 *
 * Mirrors `pandas.DataFrame.ge(other)`.
 */
export function dataFrameGe(df: DataFrame, other: DataFrameOther): DataFrame {
  return makeDataFrameCompare(df, other, "ge");
}
