/**
 * where_mask — conditional replacement for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.where(cond, other=NaN)` — keep where `cond` is `true`, replace with `other` where `false`
 * - `Series.mask(cond, other=NaN)` — keep where `cond` is `false`, replace with `other` where `true`
 * - `DataFrame.where(cond, other=NaN)` — element-wise conditional keep/replace
 * - `DataFrame.mask(cond, other=NaN)` — element-wise conditional keep/replace (inverted)
 *
 * All functions are **pure** — inputs are never mutated.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * A boolean condition for a Series where/mask operation.
 *
 * - `readonly boolean[]` — parallel boolean array (same length as the Series)
 * - `Series<boolean>` — a boolean Series (positional alignment)
 * - `(s: Series<Scalar>) => readonly boolean[]` — callable returning a boolean array
 */
export type SeriesCond =
  | readonly boolean[]
  | Series<boolean>
  | ((s: Series<Scalar>) => readonly boolean[]);

/** Options for {@link whereSeries} and {@link maskSeries}. */
export interface SeriesWhereOptions {
  /**
   * Replacement value used wherever the condition is not satisfied.
   * Defaults to `NaN`.
   */
  readonly other?: Scalar;
}

/**
 * A boolean condition for a DataFrame where/mask operation.
 *
 * - `DataFrame` — a boolean DataFrame with the same columns (positional per column)
 * - `(df: DataFrame) => DataFrame` — callable returning a boolean DataFrame
 */
export type DataFrameCond = DataFrame | ((df: DataFrame) => DataFrame);

/** Options for {@link whereDataFrame} and {@link maskDataFrame}. */
export interface DataFrameWhereOptions {
  /**
   * Replacement scalar used wherever the condition is not satisfied.
   * Defaults to `NaN`.
   */
  readonly other?: Scalar;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Resolve a {@link SeriesCond} to a flat boolean array. */
function resolveSeriesCond(cond: SeriesCond, s: Series<Scalar>): readonly boolean[] {
  if (typeof cond === "function") {
    return cond(s);
  }
  if (cond instanceof Series) {
    return cond.values as readonly boolean[];
  }
  return cond;
}

/**
 * Map over `vals`: keep `vals[i]` when `keep[i]` is `true`, otherwise use `other`.
 */
function applyKeep(vals: readonly Scalar[], keep: readonly boolean[], other: Scalar): Scalar[] {
  return vals.map((v, i) => (keep[i] === true ? v : other));
}

/** Invert a boolean array. */
function invertBools(arr: readonly boolean[]): boolean[] {
  return arr.map((b) => !b);
}

/** Resolve a {@link DataFrameCond} to a boolean DataFrame. */
function resolveDataFrameCond(cond: DataFrameCond, df: DataFrame): DataFrame {
  if (typeof cond === "function") {
    return cond(df);
  }
  return cond;
}

// ─── Series functions ─────────────────────────────────────────────────────────

/**
 * Return a new Series keeping values where `cond` is `true` and replacing
 * them with `other` where `cond` is `false`.
 *
 * Mirrors `pandas.Series.where(cond, other=NaN)`.
 *
 * @param s - Source Series.
 * @param cond - Boolean condition (array, Series, or callable).
 * @param options - Optional `other` replacement value (default `NaN`).
 * @returns A new Series with conditional replacements applied.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4] });
 * whereSeries(s, [true, false, true, false], { other: 0 });
 * // Series [1, 0, 3, 0]
 * ```
 */
export function whereSeries(
  s: Series<Scalar>,
  cond: SeriesCond,
  options?: SeriesWhereOptions,
): Series<Scalar> {
  const other = options?.other ?? Number.NaN;
  const keep = resolveSeriesCond(cond, s);
  return s.withValues(applyKeep(s.values, keep, other));
}

/**
 * Return a new Series keeping values where `cond` is `false` and replacing
 * them with `other` where `cond` is `true`.
 *
 * Mirrors `pandas.Series.mask(cond, other=NaN)`.
 *
 * @param s - Source Series.
 * @param cond - Boolean condition (array, Series, or callable).
 * @param options - Optional `other` replacement value (default `NaN`).
 * @returns A new Series with conditional replacements applied.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4] });
 * maskSeries(s, [false, true, false, true], { other: 0 });
 * // Series [1, 0, 3, 0]
 * ```
 */
export function maskSeries(
  s: Series<Scalar>,
  cond: SeriesCond,
  options?: SeriesWhereOptions,
): Series<Scalar> {
  const other = options?.other ?? Number.NaN;
  const keep = invertBools(resolveSeriesCond(cond, s));
  return s.withValues(applyKeep(s.values, keep, other));
}

// ─── DataFrame functions ──────────────────────────────────────────────────────

/**
 * Return a new DataFrame keeping each value where the corresponding entry in
 * `cond` is `true` and replacing it with `other` where `cond` is `false`.
 *
 * Mirrors `pandas.DataFrame.where(cond, other=NaN)`.
 *
 * @param df - Source DataFrame.
 * @param cond - A boolean DataFrame (same columns) or a callable returning one.
 * @param options - Optional `other` replacement scalar (default `NaN`).
 * @returns A new DataFrame with conditional replacements applied.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * const cond = DataFrame.fromColumns({ a: [true, false, true], b: [false, true, true] });
 * whereDataFrame(df, cond, { other: 0 });
 * // DataFrame { a: [1, 0, 3], b: [0, 5, 6] }
 * ```
 */
export function whereDataFrame(
  df: DataFrame,
  cond: DataFrameCond,
  options?: DataFrameWhereOptions,
): DataFrame {
  const other = options?.other ?? Number.NaN;
  const condDf = resolveDataFrameCond(cond, df);
  const colArrays: Record<string, Scalar[]> = {};
  for (const colName of df.columns.values) {
    const srcCol = df.col(colName);
    const condCol = condDf.col(colName);
    const keep = condCol.values as readonly boolean[];
    colArrays[colName] = applyKeep(srcCol.values, keep, other);
  }
  return DataFrame.fromColumns(colArrays, { index: df.index });
}

/**
 * Return a new DataFrame keeping each value where the corresponding entry in
 * `cond` is `false` and replacing it with `other` where `cond` is `true`.
 *
 * Mirrors `pandas.DataFrame.mask(cond, other=NaN)`.
 *
 * @param df - Source DataFrame.
 * @param cond - A boolean DataFrame (same columns) or a callable returning one.
 * @param options - Optional `other` replacement scalar (default `NaN`).
 * @returns A new DataFrame with conditional replacements applied.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * const cond = DataFrame.fromColumns({ a: [false, true, false], b: [true, false, false] });
 * maskDataFrame(df, cond, { other: 0 });
 * // DataFrame { a: [1, 0, 3], b: [0, 5, 6] }
 * ```
 */
export function maskDataFrame(
  df: DataFrame,
  cond: DataFrameCond,
  options?: DataFrameWhereOptions,
): DataFrame {
  const other = options?.other ?? Number.NaN;
  const condDf = resolveDataFrameCond(cond, df);
  const colArrays: Record<string, Scalar[]> = {};
  for (const colName of df.columns.values) {
    const srcCol = df.col(colName);
    const condCol = condDf.col(colName);
    const keep = invertBools(condCol.values as readonly boolean[]);
    colArrays[colName] = applyKeep(srcCol.values, keep, other);
  }
  return DataFrame.fromColumns(colArrays, { index: df.index });
}
