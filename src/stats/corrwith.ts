/**
 * corrwith — pairwise correlation of a DataFrame with a Series or another DataFrame.
 * autocorr — lag-N autocorrelation for a numeric Series.
 *
 * Mirrors:
 * - `pandas.Series.autocorr(lag=1)` — Pearson correlation of the Series with
 *   itself shifted by `lag` positions (positional shift, not label-aligned).
 * - `pandas.DataFrame.corrwith(other, axis=0, drop=False, method="pearson")` —
 *   compute the pairwise column-wise (or row-wise) Pearson correlation between
 *   a DataFrame and a Series or another DataFrame.
 *
 * ### autoCorr
 *
 * The autocorrelation at lag `k` is `pearsonCorr(s, s.shift(k))`.  The shift
 * is positional — i.e. the first `k` elements of the shifted copy become `null`
 * (dropped from the correlation computation). This matches pandas' behaviour.
 *
 * ### corrWith
 *
 * When `other` is a **Series** (axis=0):
 * - Each *column* of `df` is correlated with `other` using label alignment.
 * - The result is a Series indexed by the column names of `df`.
 *
 * When `other` is a **DataFrame** (axis=0):
 * - Columns present in both DataFrames are correlated pairwise.
 * - If `drop=false` (default), columns present in only one DataFrame receive
 *   `NaN` in the result.  If `drop=true`, those columns are omitted.
 * - The result is a Series indexed by the union (or intersection) of column
 *   names.
 *
 * When `axis=1` the same logic applies along rows instead of columns.
 *
 * @module
 */

import { DataFrame, Index, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";
import { pearsonCorr } from "./corr.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link corrWith}. */
export interface CorrWithOptions {
  /**
   * Axis along which to align and correlate.
   * - `0` / `"index"` (default): correlate columns
   * - `1` / `"columns"`: correlate rows
   */
  readonly axis?: 0 | 1 | "index" | "columns";
  /**
   * When `true`, drop columns/rows that appear in only one of the two objects.
   * When `false` (default), those labels receive `NaN`.
   */
  readonly drop?: boolean;
  /**
   * Minimum number of non-NaN observation pairs required to compute a valid
   * correlation.  Defaults to `1`.
   */
  readonly minPeriods?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True iff `v` is null, undefined, or NaN. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Transpose a DataFrame — rows become columns, columns become rows. */
function transpose(df: DataFrame): DataFrame {
  const rowLabels = df.index.toArray();
  const colLabels = df.columns.toArray();

  const newCols: Record<string, Scalar[]> = {};
  for (const r of rowLabels) {
    newCols[String(r)] = [];
  }
  for (const col of colLabels) {
    const vals = df.col(col).values;
    for (let i = 0; i < rowLabels.length; i++) {
      const r = rowLabels[i];
      if (r !== null && r !== undefined) {
        const arr = newCols[String(r)];
        if (arr !== undefined) {
          const v = vals[i];
          arr.push(v !== undefined ? v : null);
        }
      }
    }
  }
  return DataFrame.fromColumns(newCols, { index: colLabels });
}

// ─── autoCorr ─────────────────────────────────────────────────────────────────

/**
 * Compute the lag-N autocorrelation of a numeric Series.
 *
 * The autocorrelation at lag `k` is the Pearson correlation coefficient
 * between the Series and the same Series shifted by `k` positions.
 * The first `k` values of the shifted copy are `null` (excluded from
 * the correlation).
 *
 * Returns `NaN` when:
 * - There are fewer than 2 valid observation pairs.
 * - All valid values are identical (zero variance).
 *
 * Mirrors `pandas.Series.autocorr(lag=1)`.
 *
 * @param s   - Input numeric Series.
 * @param lag - Shift amount (default `1`). Must be a non-negative integer.
 *
 * @example
 * ```ts
 * import { Series, autoCorr } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * autoCorr(s);        // lag=1  → 1.0 (perfectly correlated with itself)
 * autoCorr(s, 0);     // lag=0  → 1.0
 * autoCorr(s, 2);     // lag=2  → 1.0
 * ```
 */
export function autoCorr(s: Series<Scalar>, lag = 1): number {
  if (lag < 0 || !Number.isInteger(lag)) {
    throw new RangeError(`autoCorr: lag must be a non-negative integer, got ${lag}`);
  }

  if (lag === 0) {
    // lag=0 → corr with itself = 1 if any valid value exists
    for (const v of s.values) {
      if (!isMissing(v !== undefined ? v : null)) {
        return 1;
      }
    }
    return Number.NaN;
  }

  const vals = s.values;
  const n = vals.length;
  if (lag >= n) {
    return Number.NaN;
  }

  // Collect aligned (original[i], original[i-lag]) pairs — drop if either is NA
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = lag; i < n; i++) {
    const rawA = vals[i];
    const rawB = vals[i - lag];
    const a: Scalar = rawA !== undefined ? rawA : null;
    const b: Scalar = rawB !== undefined ? rawB : null;
    if (isMissing(a) || isMissing(b)) {
      continue;
    }
    if (typeof a !== "number" || typeof b !== "number") {
      continue;
    }
    xs.push(a);
    ys.push(b);
  }

  if (xs.length < 2) {
    return Number.NaN;
  }

  const meanX = xs.reduce((acc, v) => acc + v, 0) / xs.length;
  const meanY = ys.reduce((acc, v) => acc + v, 0) / ys.length;
  let num = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = (xs[i] as number) - meanX;
    const dy = (ys[i] as number) - meanY;
    num += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  const denom = Math.sqrt(varX * varY);
  return denom === 0 ? Number.NaN : num / denom;
}

// ─── corrWith ─────────────────────────────────────────────────────────────────

/**
 * Compute the pairwise Pearson correlation of `df` columns with a Series or
 * another DataFrame.
 *
 * Mirrors `pandas.DataFrame.corrwith(other, axis=0, drop=False, method="pearson")`.
 *
 * **When `other` is a Series (axis=0):**
 * Each column of `df` is correlated individually with `other` using
 * label-based alignment.  The result is a Series indexed by `df`'s column
 * names.
 *
 * **When `other` is a DataFrame (axis=0):**
 * Columns present in both DataFrames are correlated pairwise.  Columns
 * appearing in only one are set to `NaN` unless `drop=true`, in which case
 * they are excluded from the result.
 *
 * **axis=1:**
 * The same logic applies along rows.  Each *row* of `df` is correlated with
 * the corresponding element in `other` (by row-label alignment).  The result
 * is a Series indexed by `df`'s row index.
 *
 * @example
 * ```ts
 * import { DataFrame, Series, corrWith } from "tsb";
 *
 * const df = DataFrame.fromColumns({
 *   A: [1, 2, 3, 4, 5],
 *   B: [5, 4, 3, 2, 1],
 * });
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * corrWith(df, s).values;
 * // A → 1.0,  B → -1.0
 * ```
 */
export function corrWith(
  df: DataFrame,
  other: DataFrame | Series<Scalar>,
  options: CorrWithOptions = {},
): Series<Scalar> {
  const axis = options.axis === 1 || options.axis === "columns" ? 1 : 0;
  const drop = options.drop ?? false;
  const minPeriods = options.minPeriods ?? 1;

  const dfWork = axis === 1 ? transpose(df) : df;

  if (other instanceof Series) {
    if (axis === 1) {
      const aligned = new Series({
        data: dfWork.index.toArray().map((_, i) => other.values[i] ?? null),
        index: dfWork.index,
      });
      return _corrWithSeries(dfWork, aligned, minPeriods);
    }
    return _corrWithSeries(dfWork, other, minPeriods);
  }

  const otherWork = axis === 1 ? transpose(other) : other;
  return _corrWithDataFrame(dfWork, otherWork, drop, minPeriods);
}

/** Correlate each column of `df` with a single Series. */
function _corrWithSeries(df: DataFrame, other: Series<Scalar>, minPeriods: number): Series<Scalar> {
  const cols = df.columns.toArray();
  const results: Scalar[] = cols.map((c) => pearsonCorr(df.col(c), other, { minPeriods }));
  return new Series({ data: results, index: new Index<Label>(cols) });
}

/** Correlate each common column of `df` with the matching column of `other`. */
function _corrWithDataFrame(
  df: DataFrame,
  other: DataFrame,
  drop: boolean,
  minPeriods: number,
): Series<Scalar> {
  const dfCols = new Set(df.columns.toArray());
  const otherCols = new Set(other.columns.toArray());

  const allCols = drop
    ? [...dfCols].filter((c) => otherCols.has(c))
    : [...new Set([...dfCols, ...otherCols])];

  const results: Scalar[] = allCols.map((c) => {
    if (!(dfCols.has(c) && otherCols.has(c))) {
      return Number.NaN;
    }
    return pearsonCorr(df.col(c), other.col(c), { minPeriods });
  });

  return new Series({ data: results, index: new Index<Label>(allCols) });
}
