/**
 * corr — pairwise Pearson correlation and covariance.
 *
 * Mirrors `pandas.DataFrame.corr()`, `pandas.DataFrame.cov()`, and
 * `pandas.Series.corr()`:
 * - `pearsonCorr(a, b)` — Pearson correlation between two Series (after
 *   aligning on a shared index and dropping NaN pairs).
 * - `dataFrameCorr(df)` — symmetric N×N correlation matrix for all
 *   numeric columns of a DataFrame.
 * - `dataFrameCov(df, ddof?)` — symmetric N×N covariance matrix for all
 *   numeric columns of a DataFrame.
 *
 * @module
 */

import { DataFrame, Index, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public API types ─────────────────────────────────────────────────────────

/** Supported correlation methods. Only `"pearson"` is implemented for now. */
export type CorrMethod = "pearson";

/** Options for {@link pearsonCorr} and {@link dataFrameCorr}. */
export interface CorrOptions {
  /**
   * Minimum number of non-NaN, non-null observations required to compute a
   * valid result.  If fewer valid pairs exist, returns `NaN`.
   * Defaults to `1`.
   */
  readonly minPeriods?: number;
  /** Correlation method.  Only `"pearson"` is supported. */
  readonly method?: CorrMethod;
}

/** Options for {@link dataFrameCov}. */
export interface CovOptions {
  /**
   * Delta degrees of freedom for the denominator `(n − ddof)`.
   * Defaults to `1` (sample covariance, same as pandas).
   */
  readonly ddof?: number;
  /**
   * Minimum number of non-NaN, non-null observations required.
   * Defaults to `1`.
   */
  readonly minPeriods?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar value is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Align two Series by their indices (inner join) and extract paired numeric
 * values, discarding any pair where either value is missing.
 *
 * Returns `[xs, ys]` — two equal-length arrays of finite numbers.
 */
function alignedPairs(a: Series<Scalar>, b: Series<Scalar>): [number[], number[]] {
  // Build label → position maps for both series
  const bMap = new Map<string, number>();
  for (let j = 0; j < b.index.size; j++) {
    bMap.set(String(b.index.at(j)), j);
  }

  const xs: number[] = [];
  const ys: number[] = [];

  for (let i = 0; i < a.index.size; i++) {
    const label = String(a.index.at(i));
    const j = bMap.get(label);
    if (j === undefined) {
      continue;
    }
    const av = a.values[i] as Scalar;
    const bv = b.values[j] as Scalar;
    if (isMissing(av) || isMissing(bv)) {
      continue;
    }
    if (typeof av !== "number" || typeof bv !== "number") {
      continue;
    }
    xs.push(av);
    ys.push(bv);
  }
  return [xs, ys];
}

/**
 * Compute the arithmetic mean of a non-empty array.
 * Returns `NaN` for an empty array.
 */
function arrayMean(arr: readonly number[]): number {
  if (arr.length === 0) {
    return Number.NaN;
  }
  let s = 0;
  for (const v of arr) {
    s += v;
  }
  return s / arr.length;
}

/**
 * Raw Pearson correlation from two equal-length aligned arrays.
 * Returns `NaN` when either variance is zero or `n < minPeriods`.
 */
function rawPearsonCorr(xs: readonly number[], ys: readonly number[], minPeriods: number): number {
  const n = xs.length;
  if (n < minPeriods) {
    return Number.NaN;
  }
  const mx = arrayMean(xs);
  const my = arrayMean(ys);
  let num = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - mx;
    const dy = (ys[i] as number) - my;
    num += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  const denom = Math.sqrt(varX * varY);
  return denom === 0 ? Number.NaN : num / denom;
}

/**
 * Raw covariance from two equal-length aligned arrays.
 * Returns `NaN` when `n - ddof <= 0` or `n < minPeriods`.
 */
function rawCov(
  xs: readonly number[],
  ys: readonly number[],
  ddof: number,
  minPeriods: number,
): number {
  const n = xs.length;
  if (n < minPeriods || n - ddof <= 0) {
    return Number.NaN;
  }
  const mx = arrayMean(xs);
  const my = arrayMean(ys);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += ((xs[i] as number) - mx) * ((ys[i] as number) - my);
  }
  return sum / (n - ddof);
}

/** Extract numeric-only column names from a DataFrame. */
function numericColumns(df: DataFrame): string[] {
  return df.columns.values.filter((c) => {
    const s = df.col(c);
    const kind = s.dtype.kind;
    return kind === "int" || kind === "uint" || kind === "float";
  });
}

/** Build a symmetric N×N DataFrame from a pairwise-value function. */
function buildSymmetricDf(
  cols: readonly string[],
  pairFn: (a: Series<Scalar>, b: Series<Scalar>) => number,
  df: DataFrame,
): DataFrame {
  const n = cols.length;
  const idx = new Index<Label>([...cols]);
  const colMap = new Map<string, Series<Scalar>>();

  for (let j = 0; j < n; j++) {
    const cj = cols[j] as string;
    const vals: Scalar[] = Array.from({ length: n }) as Scalar[];
    for (let i = 0; i < n; i++) {
      const ci = cols[i] as string;
      vals[i] = pairFn(df.col(ci), df.col(cj));
    }
    colMap.set(cj, new Series<Scalar>({ data: vals, index: idx }));
  }

  return new DataFrame(colMap, idx);
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Pearson correlation coefficient between two Series.
 *
 * Aligns on shared index labels and drops pairs where either value is missing.
 * Returns `NaN` when fewer than `minPeriods` valid pairs exist, or when
 * either series has zero variance.
 *
 * @example
 * ```ts
 * const a = new Series({ data: [1, 2, 3], index: ["x", "y", "z"] });
 * const b = new Series({ data: [4, 5, 6], index: ["x", "y", "z"] });
 * pearsonCorr(a, b); // 1.0
 * ```
 */
export function pearsonCorr(
  a: Series<Scalar>,
  b: Series<Scalar>,
  options: CorrOptions = {},
): number {
  const minPeriods = options.minPeriods ?? 1;
  const [xs, ys] = alignedPairs(a, b);
  return rawPearsonCorr(xs, ys, minPeriods);
}

/**
 * Pairwise Pearson correlation matrix for all numeric columns in `df`.
 *
 * Returns a symmetric `DataFrame` where both the row-index and the column
 * labels are the numeric column names of `df`.  Diagonal entries are `1.0`.
 *
 * @example
 * ```ts
 * const df = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6], c: ["x", "y", "z"] });
 * const r = dataFrameCorr(df);
 * r.col("a").at(0); // 1.0  (a corr a)
 * r.col("b").at(0); // 1.0  (a corr b — perfect linear relationship)
 * ```
 */
export function dataFrameCorr(df: DataFrame, options: CorrOptions = {}): DataFrame {
  const minPeriods = options.minPeriods ?? 1;
  const cols = numericColumns(df);
  return buildSymmetricDf(cols, (a, b) => rawPearsonCorr(...alignedPairs(a, b), minPeriods), df);
}

/**
 * Pairwise covariance matrix for all numeric columns in `df`.
 *
 * Returns a symmetric `DataFrame` where both the row-index and the column
 * labels are the numeric column names of `df`.  Diagonal entries are the
 * variance of each column.
 *
 * @param options.ddof - delta degrees of freedom (default `1`)
 *
 * @example
 * ```ts
 * const df = new DataFrame({ a: [1, 2, 3], b: [2, 4, 6] });
 * const cov = dataFrameCov(df);
 * cov.col("a").at(0); // 1.0  (variance of a)
 * ```
 */
export function dataFrameCov(df: DataFrame, options: CovOptions = {}): DataFrame {
  const ddof = options.ddof ?? 1;
  const minPeriods = options.minPeriods ?? 1;
  const cols = numericColumns(df);
  return buildSymmetricDf(cols, (a, b) => rawCov(...alignedPairs(a, b), ddof, minPeriods), df);
}
