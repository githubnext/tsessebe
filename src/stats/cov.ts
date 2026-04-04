/**
 * Covariance — sample covariance between Series, covariance matrix for DataFrames.
 *
 * Mirrors `pandas.Series.cov` / `pandas.DataFrame.cov`.
 *
 * Uses pairwise-complete observations (non-missing in both series).
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when scalar is considered missing (null | undefined | NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Extract aligned numeric pairs, excluding rows where either value is missing. */
function alignedNumericPairs(a: Series<Scalar>, b: Series<Scalar>): [number[], number[]] {
  const n = Math.min(a.values.length, b.values.length);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = a.values[i];
    const y = b.values[i];
    if (!isMissing(x) && !isMissing(y) && typeof x === "number" && typeof y === "number") {
      xs.push(x);
      ys.push(y);
    }
  }
  return [xs, ys];
}

/** Sample covariance of two aligned arrays (ddof=1 by default). */
function sampleCov(xs: readonly number[], ys: readonly number[], ddof: number): number {
  const n = xs.length;
  if (n < 2 || n - ddof <= 0) {
    return Number.NaN;
  }
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let ss = 0;
  for (let i = 0; i < n; i++) {
    ss += ((xs[i] as number) - mx) * ((ys[i] as number) - my);
  }
  return ss / (n - ddof);
}

// ─── covSeries ────────────────────────────────────────────────────────────────

/**
 * Compute the sample covariance between two Series.
 *
 * Uses pairwise-complete observations. Returns `NaN` if fewer than 2 valid
 * pairs exist after dropping missing values.
 *
 * @param a    - First Series (numeric values).
 * @param b    - Second Series (numeric values).
 * @param ddof - Delta degrees of freedom (default 1 → sample covariance).
 *
 * @example
 * ```ts
 * const a = new Series({ data: [1, 2, 3, 4] });
 * const b = new Series({ data: [4, 3, 2, 1] });
 * covSeries(a, b); // -1.6666...
 * ```
 */
export function covSeries(a: Series<Scalar>, b: Series<Scalar>, ddof = 1): number {
  const [xs, ys] = alignedNumericPairs(a, b);
  return sampleCov(xs, ys, ddof);
}

// ─── covDataFrame ─────────────────────────────────────────────────────────────

/**
 * Compute the covariance matrix for all numeric columns of a DataFrame.
 *
 * Returns a square DataFrame where entry (i, j) is the sample covariance
 * between column i and column j, using pairwise-complete observations.
 *
 * @param df   - Input DataFrame.
 * @param ddof - Delta degrees of freedom (default 1).
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1,2,3], b: [3,2,1] });
 * covDataFrame(df);
 * // DataFrame 2×2: a/b on both axes
 * ```
 */
export function covDataFrame(df: DataFrame, ddof = 1): DataFrame {
  const numericCols = collectNumericCols(df);
  const colData: Record<string, Scalar[]> = {};

  for (const ci of numericCols) {
    const row: Scalar[] = [];
    for (const cj of numericCols) {
      const [xs, ys] = alignedNumericPairs(df.col(ci), df.col(cj));
      row.push(sampleCov(xs, ys, ddof));
    }
    colData[ci] = row;
  }

  return DataFrame.fromColumns(colData, { index: numericCols });
}

/** Collect names of numeric columns from a DataFrame. */
function collectNumericCols(df: DataFrame): string[] {
  const out: string[] = [];
  for (const colName of df.columns.values) {
    const col = df.col(colName);
    let isNumeric = true;
    for (const v of col.values) {
      if (!isMissing(v) && typeof v !== "number") {
        isNumeric = false;
        break;
      }
    }
    if (isNumeric) {
      out.push(colName);
    }
  }
  return out;
}
