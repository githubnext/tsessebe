/**
 * Pairwise statistics — per-column pairwise correlation and covariance matrices.
 *
 * Mirrors `pandas.DataFrame.corrwith()` and the pairwise forms of
 * `DataFrame.corr()` / `DataFrame.cov()`.
 *
 * Exported functions:
 * - `corrwith(df, other)` — element-wise column correlation between two DataFrames
 * - `pairwiseCorr(df)` — full N×N correlation matrix across all numeric columns
 * - `pairwiseCov(df)` — full N×N covariance matrix across all numeric columns
 * - `rollingCorr(x, y, window)` — rolling window correlation between two Series
 * - `rollCov(x, y, window)` — rolling window covariance between two Series
 *
 * @example
 * ```ts
 * import { DataFrame, pairwiseCorr, pairwiseCov, corrwith } from "tsb";
 *
 * const df = DataFrame.fromColumns({
 *   a: [1, 2, 3, 4, 5],
 *   b: [5, 4, 3, 2, 1],
 *   c: [2, 3, 4, 5, 6],
 * });
 *
 * const corrMatrix = pairwiseCorr(df);
 * corrMatrix.col("a").iloc(0); // 1.0
 *
 * const covMatrix = pairwiseCov(df);
 *
 * const other = DataFrame.fromColumns({ a: [2, 4, 6, 8, 10], b: [1, 1, 1, 1, 1] });
 * corrwith(df, other);
 * ```
 */

import { Index } from "../core/index.ts";
import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Extract numeric values from a Series (skip nulls). */
function numericPairs(a: readonly Scalar[], b: readonly Scalar[]): [number[], number[]] {
  const na: number[] = [];
  const nb: number[] = [];
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i];
    const bi = b[i];
    if (
      typeof ai === "number" &&
      typeof bi === "number" &&
      !Number.isNaN(ai) &&
      !Number.isNaN(bi)
    ) {
      na.push(ai);
      nb.push(bi);
    }
  }
  return [na, nb];
}

/** Mean of a number array. */
function mean(xs: readonly number[]): number {
  if (xs.length === 0) {
    return Number.NaN;
  }
  let s = 0;
  for (const x of xs) {
    s += x;
  }
  return s / xs.length;
}

/** Sample covariance of two numeric arrays (already filtered for NaN). */
function sampleCov(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n < 2) {
    return Number.NaN;
  }
  const mx = mean(xs);
  const my = mean(ys);
  let s = 0;
  for (let i = 0; i < n; i++) {
    s += ((xs[i] as number) - mx) * ((ys[i] as number) - my);
  }
  return s / (n - 1);
}

/** Sample standard deviation. */
function sampleStd(xs: readonly number[]): number {
  return Math.sqrt(sampleCov(xs, xs));
}

/** Pearson correlation coefficient. */
function pearsonCorr(xs: readonly number[], ys: readonly number[]): number {
  const cov = sampleCov(xs, ys);
  const sx = sampleStd(xs);
  const sy = sampleStd(ys);
  if (sx === 0 || sy === 0 || Number.isNaN(cov)) {
    return Number.NaN;
  }
  return cov / (sx * sy);
}

/** Extract numeric column values as Scalar arrays. */
function columnValues(df: DataFrame, colName: string): Scalar[] {
  const col = df.col(colName);
  const vals: Scalar[] = [];
  for (let i = 0; i < col.size; i++) {
    vals.push(col.iloc(i));
  }
  return vals;
}

/** Collect only numeric column names from a DataFrame. */
function numericColNames(df: DataFrame): string[] {
  return df.columns.values.map(String).filter((name) => {
    const col = df.col(name);
    for (let i = 0; i < col.size; i++) {
      const v = col.iloc(i);
      if (v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v))) {
        return typeof v === "number";
      }
    }
    return false;
  });
}

/** Build a square DataFrame from a 2-D array and column/row names. */
function squareDataFrame(matrix: number[][], names: string[]): DataFrame {
  const colMap: Record<string, number[]> = {};
  for (let j = 0; j < names.length; j++) {
    const name = names[j] as string;
    colMap[name] = matrix.map((row) => row[j] as number);
  }
  const rowIdx = new Index<string>(names);
  return DataFrame.fromColumns(colMap, { index: rowIdx });
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Compute the pairwise column-correlation matrix for a DataFrame.
 *
 * Only numeric columns are included.  The result is a square DataFrame
 * where both rows and columns are the numeric column names.
 *
 * @param df - Source DataFrame.
 * @returns A square DataFrame with Pearson correlation coefficients.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1,2,3], b: [3,2,1] });
 * const corr = pairwiseCorr(df);
 * corr.col("a").iloc(0); // 1.0
 * corr.col("b").iloc(0); // -1.0
 * ```
 */
export function pairwiseCorr(df: DataFrame): DataFrame {
  const names = numericColNames(df);
  const colData = names.map((n) => columnValues(df, n));

  const matrix: number[][] = names.map((_, i) =>
    names.map((_, j) => {
      const [xs, ys] = numericPairs(colData[i] ?? [], colData[j] ?? []);
      if (i === j) {
        return xs.length < 2 ? Number.NaN : 1.0;
      }
      return pearsonCorr(xs, ys);
    }),
  );

  return squareDataFrame(matrix, names);
}

/**
 * Compute the pairwise column-covariance matrix for a DataFrame.
 *
 * Only numeric columns are included.  The result is a square DataFrame
 * where both rows and columns are the numeric column names.
 *
 * @param df - Source DataFrame.
 * @returns A square DataFrame with sample covariance values.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1,2,3], b: [3,2,1] });
 * const cov = pairwiseCov(df);
 * ```
 */
export function pairwiseCov(df: DataFrame): DataFrame {
  const names = numericColNames(df);
  const colData = names.map((n) => columnValues(df, n));

  const matrix: number[][] = names.map((_, i) =>
    names.map((_, j) => {
      const [xs, ys] = numericPairs(colData[i] ?? [], colData[j] ?? []);
      return sampleCov(xs, ys);
    }),
  );

  return squareDataFrame(matrix, names);
}

/**
 * Compute the pairwise column-correlation between two DataFrames
 * (mirroring `pandas.DataFrame.corrwith`).
 *
 * For each column name that appears in both `df` and `other`, computes the
 * Pearson correlation.  The result is a Series indexed by column name.
 *
 * @param df    - Base DataFrame.
 * @param other - Other DataFrame to correlate column-wise.
 * @returns A Series of correlation values, indexed by shared column names.
 *
 * @example
 * ```ts
 * const df    = DataFrame.fromColumns({ a: [1,2,3], b: [1,2,3] });
 * const other = DataFrame.fromColumns({ a: [1,2,3], b: [3,2,1] });
 * const result = corrwith(df, other);
 * result.iloc(0); // 1.0  (a with a)
 * result.iloc(1); // -1.0 (b with b reversed)
 * ```
 */
export function corrwith(df: DataFrame, other: DataFrame): Series {
  const shared = df.columns.values
    .map(String)
    .filter((name) => other.columns.values.map(String).includes(name));

  const correlations: Scalar[] = shared.map((name) => {
    const a = columnValues(df, name);
    const b = columnValues(other, name);
    const [xs, ys] = numericPairs(a, b);
    if (xs.length < 2) {
      return null;
    }
    return pearsonCorr(xs, ys);
  });

  return new Series({
    data: correlations,
    index: new Index<string>(shared),
  });
}

// ─── rolling correlation / covariance ────────────────────────────────────────

/**
 * Options for rolling pairwise statistics.
 */
export interface RollingPairwiseOptions {
  /** Minimum number of observations to produce a non-NaN result. Defaults to `window`. */
  readonly minPeriods?: number;
}

/**
 * Compute rolling Pearson correlation between two Series.
 *
 * @param x       - First Series (numeric).
 * @param y       - Second Series (numeric, same length as `x`).
 * @param window  - Rolling window size (number of observations).
 * @param options - Optional configuration.
 * @returns A Series of rolling correlation values.
 *
 * @example
 * ```ts
 * const x = new Series({ data: [1, 2, 3, 4, 5] });
 * const y = new Series({ data: [5, 4, 3, 2, 1] });
 * const rc = rollingCorr(x, y, 3);
 * ```
 */
export function rollingCorr(
  x: Series,
  y: Series,
  window: number,
  options?: RollingPairwiseOptions,
): Series {
  return rollingPairwise(x, y, window, pearsonCorr, options);
}

/**
 * Compute rolling sample covariance between two Series.
 *
 * @param x       - First Series (numeric).
 * @param y       - Second Series (numeric, same length as `x`).
 * @param window  - Rolling window size (number of observations).
 * @param options - Optional configuration.
 * @returns A Series of rolling covariance values.
 *
 * @example
 * ```ts
 * const x = new Series({ data: [1, 2, 3, 4, 5] });
 * const y = new Series({ data: [5, 4, 3, 2, 1] });
 * const rc = rollCov(x, y, 3);
 * ```
 */
export function rollCov(
  x: Series,
  y: Series,
  window: number,
  options?: RollingPairwiseOptions,
): Series {
  return rollingPairwise(x, y, window, sampleCov, options);
}

/** Shared implementation for rollingCorr / rollCov. */
function rollingPairwise(
  x: Series,
  y: Series,
  window: number,
  fn: (xs: readonly number[], ys: readonly number[]) => number,
  options?: RollingPairwiseOptions,
): Series {
  const minPeriods = options?.minPeriods ?? window;
  const n = Math.min(x.size, y.size);
  const result: Scalar[] = [];

  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - window + 1);
    const xSlice: number[] = [];
    const ySlice: number[] = [];
    for (let j = start; j <= i; j++) {
      const xv = x.iloc(j);
      const yv = y.iloc(j);
      if (
        typeof xv === "number" &&
        typeof yv === "number" &&
        !Number.isNaN(xv) &&
        !Number.isNaN(yv)
      ) {
        xSlice.push(xv);
        ySlice.push(yv);
      }
    }
    if (xSlice.length < minPeriods) {
      result.push(null);
    } else {
      result.push(fn(xSlice, ySlice));
    }
  }

  return new Series({ data: result, index: x.index });
}
