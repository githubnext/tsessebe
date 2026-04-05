/**
 * Conditional selection — `where` and `mask`.
 *
 * Mirrors `pandas.Series.where` and `pandas.Series.mask`:
 *   - `where(cond, other)` — keep values where `cond` is true, replace with `other` elsewhere
 *   - `mask(cond, other)` — replace values where `cond` is true with `other`
 */

import type { Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Normalise a condition to a boolean array. */
function normaliseCond(cond: Series<Scalar> | boolean[], n: number): boolean[] {
  if (Array.isArray(cond)) {
    return cond;
  }
  const vals = cond.values;
  return Array.from({ length: n }, (_, i) => Boolean(vals[i]));
}

/** Resolve `other` to a value for position i. */
function resolveOther(other: Scalar | Series<Scalar>, i: number): Scalar {
  if (other instanceof Series) {
    return (other.values[i] as Scalar | undefined) ?? null;
  }
  return other;
}

// ─── Series where / mask ──────────────────────────────────────────────────────

/**
 * Keep values where `cond` is `true`, replace with `other` where `false`.
 * Equivalent to `pandas.Series.where`.
 *
 * @example
 * ```ts
 * whereSeries(s, [true, false, true], null); // [s[0], null, s[2]]
 * ```
 */
export function whereSeries(
  s: Series<Scalar>,
  cond: Series<Scalar> | boolean[],
  other: Scalar | Series<Scalar> = null,
): Series<Scalar> {
  const vals = s.values;
  const n = vals.length;
  const bools = normaliseCond(cond, n);
  const out: Scalar[] = [];
  for (let i = 0; i < n; i++) {
    out.push(bools[i] ? (vals[i] ?? null) : resolveOther(other, i));
  }
  return new Series<Scalar>({ data: out, index: s.index, name: s.name });
}

/**
 * Replace values where `cond` is `true` with `other`.
 * Equivalent to `pandas.Series.mask` — the inverse of `where`.
 *
 * @example
 * ```ts
 * maskSeries(s, [false, true, false], 0); // [s[0], 0, s[2]]
 * ```
 */
export function maskSeries(
  s: Series<Scalar>,
  cond: Series<Scalar> | boolean[],
  other: Scalar | Series<Scalar> = null,
): Series<Scalar> {
  const vals = s.values;
  const n = vals.length;
  const bools = normaliseCond(cond, n);
  const out: Scalar[] = [];
  for (let i = 0; i < n; i++) {
    out.push(bools[i] ? resolveOther(other, i) : (vals[i] ?? null));
  }
  return new Series<Scalar>({ data: out, index: s.index, name: s.name });
}

// ─── DataFrame where / mask ───────────────────────────────────────────────────

/** Condition matrix: either a DataFrame (boolean cells) or a single boolean array. */
export type DataFrameCond = DataFrame | boolean[];

/** Resolve a cell condition. */
function resolveCondCell(cond: DataFrameCond, col: string, i: number): boolean {
  if (Array.isArray(cond)) {
    return Boolean(cond[i]);
  }
  if (cond.columns.toArray().includes(col)) {
    const v = (cond.col(col) as Series<Scalar>).values[i];
    return Boolean(v);
  }
  return true;
}

/** Apply where/mask logic over a DataFrame. */
function applyDataFrameConditional(
  df: DataFrame,
  cond: DataFrameCond,
  other: Scalar | DataFrame,
  keepWhenTrue: boolean,
): DataFrame {
  const data: Record<string, Scalar[]> = {};
  const nRows = df.shape[0];

  for (const col of df.columns) {
    const vals = (df.col(col) as Series<Scalar>).values;
    const colArr: Scalar[] = [];
    for (let i = 0; i < nRows; i++) {
      const condVal = resolveCondCell(cond, col, i);
      const keep = keepWhenTrue ? condVal : !condVal;
      if (keep) {
        colArr.push(vals[i] ?? null);
      } else if (other instanceof DataFrame) {
        const otherVals = (other.col(col) as Series<Scalar>).values;
        colArr.push(otherVals[i] ?? null);
      } else {
        colArr.push(other);
      }
    }
    data[col] = colArr;
  }
  return DataFrame.fromColumns(data, { index: df.index });
}

/**
 * Keep values where `cond` is `true`, replace with `other` where `false`.
 * Equivalent to `pandas.DataFrame.where`.
 *
 * @example
 * ```ts
 * whereDataFrame(df, [true, false, true], null);
 * ```
 */
export function whereDataFrame(
  df: DataFrame,
  cond: DataFrameCond,
  other: Scalar | DataFrame = null,
): DataFrame {
  return applyDataFrameConditional(df, cond, other, true);
}

/**
 * Replace values where `cond` is `true` with `other`.
 * Equivalent to `pandas.DataFrame.mask`.
 *
 * @example
 * ```ts
 * maskDataFrame(df, [false, true, false], 0);
 * ```
 */
export function maskDataFrame(
  df: DataFrame,
  cond: DataFrameCond,
  other: Scalar | DataFrame = null,
): DataFrame {
  return applyDataFrameConditional(df, cond, other, false);
}
