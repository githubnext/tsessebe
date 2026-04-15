/**
 * where / mask — conditional value selection and replacement.
 *
 * Mirrors:
 * - `pandas.Series.where(cond, other=NaN)`  — keep values where `cond` is true
 * - `pandas.Series.mask(cond, other=NaN)`   — replace values where `cond` is true
 * - `pandas.DataFrame.where(cond, other=NaN)`
 * - `pandas.DataFrame.mask(cond, other=NaN)`
 *
 * The `cond` argument may be:
 *   - an element-wise predicate `(value: Scalar, index: number) => boolean`
 *   - a `Series<boolean>` / `readonly boolean[]` (for Series variants)
 *   - a boolean `DataFrame` (for DataFrame variants)
 *
 * `other` is the replacement value when the condition is not met.
 * Defaults to `null` (analogous to `NaN` in pandas).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Element-wise predicate used as a `cond` argument. */
export type WherePredicate = (value: Scalar, index: number) => boolean;

/**
 * A condition for {@link whereSeries} / {@link maskSeries}.
 *
 * May be:
 * - a `WherePredicate` (called for each element)
 * - a `Series<boolean>` whose values are aligned by position
 * - a `readonly boolean[]` aligned by position
 */
export type SeriesCond = WherePredicate | Series<boolean> | readonly boolean[];

/**
 * A condition for {@link whereDataFrame} / {@link maskDataFrame}.
 *
 * May be:
 * - a `WherePredicate` applied element-wise across all columns
 * - a `DataFrame` of boolean values aligned by column name and position
 */
export type DataFrameCond = WherePredicate | DataFrame;

/** Options shared by `where` and `mask` variants. */
export interface WhereMaskOptions {
  /**
   * Replacement value used where the condition is **not** satisfied (for
   * `where`) or **is** satisfied (for `mask`).
   * @defaultValue `null`
   */
  readonly other?: Scalar;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Resolve `SeriesCond` to a boolean array of length `n`. */
function resolveSeriesCond(cond: SeriesCond, n: number, vals: readonly Scalar[]): boolean[] {
  if (typeof cond === "function") {
    return vals.map((v, i) => cond(v, i));
  }
  const bools: readonly boolean[] = cond instanceof Series ? cond.values : cond;
  if (bools.length !== n) {
    throw new RangeError(`Condition length ${bools.length} does not match Series length ${n}`);
  }
  return [...bools];
}

/**
 * Core apply: return a new array where `keepWhenTrue` controls the semantics.
 * - `keepWhenTrue = true`  → **where**: keep value when cond[i] is true
 * - `keepWhenTrue = false` → **mask**: keep value when cond[i] is false
 */
function applyCondition(
  vals: readonly Scalar[],
  bools: boolean[],
  other: Scalar,
  keepWhenTrue: boolean,
): Scalar[] {
  const out: Scalar[] = new Array<Scalar>(vals.length);
  for (let i = 0; i < vals.length; i++) {
    const keep = keepWhenTrue ? (bools[i] as boolean) : !(bools[i] as boolean);
    out[i] = keep ? (vals[i] as Scalar) : other;
  }
  return out;
}

// ─── Series where ─────────────────────────────────────────────────────────────

/**
 * Return a copy of `series` with values **kept** where `cond` is true and
 * replaced with `other` where `cond` is false.
 *
 * Mirrors `pandas.Series.where(cond, other=NaN)`.
 *
 * @example
 * ```ts
 * import { Series, whereSeries } from "tsb";
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * whereSeries(s, (v) => (v as number) > 2).values;
 * // [null, null, 3, 4, 5]
 * ```
 */
export function whereSeries(
  series: Series<Scalar>,
  cond: SeriesCond,
  options?: WhereMaskOptions,
): Series<Scalar> {
  const other = options?.other ?? null;
  const bools = resolveSeriesCond(cond, series.values.length, series.values);
  const data = applyCondition(series.values, bools, other, true);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

// ─── Series mask ──────────────────────────────────────────────────────────────

/**
 * Return a copy of `series` with values **replaced** by `other` where `cond`
 * is true (and kept where `cond` is false).
 *
 * Mirrors `pandas.Series.mask(cond, other=NaN)`.
 *
 * @example
 * ```ts
 * import { Series, maskSeries } from "tsb";
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * maskSeries(s, (v) => (v as number) > 2).values;
 * // [1, 2, null, null, null]
 * ```
 */
export function maskSeries(
  series: Series<Scalar>,
  cond: SeriesCond,
  options?: WhereMaskOptions,
): Series<Scalar> {
  const other = options?.other ?? null;
  const bools = resolveSeriesCond(cond, series.values.length, series.values);
  const data = applyCondition(series.values, bools, other, false);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

// ─── DataFrame where ──────────────────────────────────────────────────────────

/**
 * Resolve a `DataFrameCond` for a specific column of length `n`.
 * Returns a boolean array where `true` means "keep the value".
 */
function resolveDataFrameCond(
  cond: DataFrameCond,
  colName: string,
  n: number,
  vals: readonly Scalar[],
): boolean[] {
  if (typeof cond === "function") {
    return vals.map((v, i) => (cond as WherePredicate)(v, i));
  }
  // cond is a boolean DataFrame — look up column by name
  const condCol = cond.get(colName);
  if (condCol === undefined) {
    // Column not present in condition → treat all as false (don't keep / do mask)
    return new Array<boolean>(n).fill(false);
  }
  const bools = condCol.values;
  if (bools.length !== n) {
    throw new RangeError(
      `Condition column "${colName}" length ${bools.length} does not match DataFrame rows ${n}`,
    );
  }
  return bools.map((v) => Boolean(v));
}

/**
 * Apply a condition column-wise across a DataFrame.
 *
 * @param df            Input DataFrame
 * @param cond          Condition (predicate or boolean DataFrame)
 * @param other         Replacement scalar
 * @param keepWhenTrue  `true` → where semantics; `false` → mask semantics
 */
function applyDfCond(
  df: DataFrame,
  cond: DataFrameCond,
  other: Scalar,
  keepWhenTrue: boolean,
): DataFrame {
  const nrows = df.shape[0];
  const colMap = new Map<string, Series<Scalar>>();

  for (const name of df.columns.values) {
    const col = df.col(name);
    const bools = resolveDataFrameCond(cond, name, nrows, col.values);
    const data = applyCondition(col.values, bools, other, keepWhenTrue);
    colMap.set(name, new Series<Scalar>({ data, index: df.index, name }));
  }

  return new DataFrame(colMap, df.index);
}

/**
 * Return a copy of `df` with cell values **kept** where `cond` is true and
 * replaced with `other` where `cond` is false.
 *
 * `cond` may be an element-wise predicate or a boolean `DataFrame` aligned
 * column-by-column with `df`.
 *
 * Mirrors `pandas.DataFrame.where(cond, other=NaN)`.
 *
 * @example
 * ```ts
 * import { DataFrame, whereDataFrame } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, -2, 3], b: [-4, 5, -6] });
 * whereDataFrame(df, (v) => (v as number) >= 0).col("a").values;
 * // [1, null, 3]
 * ```
 */
export function whereDataFrame(
  df: DataFrame,
  cond: DataFrameCond,
  options?: WhereMaskOptions,
): DataFrame {
  return applyDfCond(df, cond, options?.other ?? null, true);
}

// ─── DataFrame mask ───────────────────────────────────────────────────────────

/**
 * Return a copy of `df` with cell values **replaced** by `other` where `cond`
 * is true (kept where `cond` is false).
 *
 * Mirrors `pandas.DataFrame.mask(cond, other=NaN)`.
 *
 * @example
 * ```ts
 * import { DataFrame, maskDataFrame } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, -2, 3], b: [-4, 5, -6] });
 * maskDataFrame(df, (v) => (v as number) < 0).col("a").values;
 * // [1, null, 3]
 * ```
 */
export function maskDataFrame(
  df: DataFrame,
  cond: DataFrameCond,
  options?: WhereMaskOptions,
): DataFrame {
  return applyDfCond(df, cond, options?.other ?? null, false);
}
