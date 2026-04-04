/**
 * Moments — skewness and excess kurtosis for Series and DataFrame.
 *
 * Mirrors `pandas.Series.skew` / `pandas.Series.kurt` (kurtosis) and their
 * DataFrame equivalents.
 *
 * Both use the adjusted Fisher–Pearson standardized moment coefficients
 * (same as pandas default `bias=False`):
 *
 *   skewness  = n / ((n-1)(n-2)) * Σ((x-μ)/σ)³
 *   kurtosis  = n(n+1) / ((n-1)(n-2)(n-3)) * Σ((x-μ)/σ)⁴
 *              - 3(n-1)² / ((n-2)(n-3))          [excess, Fisher]
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when scalar is considered missing (null | undefined | NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Extract non-missing numeric values from a Series. */
function numericValues(s: Series<Scalar>): number[] {
  const out: number[] = [];
  for (const v of s.values) {
    if (!isMissing(v) && typeof v === "number") {
      out.push(v);
    }
  }
  return out;
}

/**
 * Adjusted Fisher–Pearson skewness coefficient (matches pandas default).
 *
 * G1 = n / ((n-1)(n-2)) * Σ[(xi - x̄) / s]³
 * where s is the sample standard deviation (ddof=1).
 */
function adjustedSkewness(nums: readonly number[]): number {
  const n = nums.length;
  if (n < 3) {
    return Number.NaN;
  }
  const mu = nums.reduce((s, v) => s + v, 0) / n;
  const ss2 = nums.reduce((s, v) => s + (v - mu) ** 2, 0);
  if (ss2 === 0) {
    return 0;
  }
  const ss3 = nums.reduce((s, v) => s + (v - mu) ** 3, 0);
  // sample std (ddof=1) then cubed
  const sampleStdCubed = Math.pow(ss2 / (n - 1), 1.5);
  return (n / ((n - 1) * (n - 2))) * (ss3 / sampleStdCubed);
}

/**
 * Adjusted excess kurtosis (Fisher, matches pandas default).
 *
 * G2 = n(n+1)/((n-1)(n-2)(n-3)) * Σ[(xi-x̄)/s]⁴ − 3(n-1)²/((n-2)(n-3))
 * where s is the sample standard deviation (ddof=1).
 */
function adjustedKurtosis(nums: readonly number[]): number {
  const n = nums.length;
  if (n < 4) {
    return Number.NaN;
  }
  const mu = nums.reduce((s, v) => s + v, 0) / n;
  const ss2 = nums.reduce((s, v) => s + (v - mu) ** 2, 0);
  if (ss2 === 0) {
    return 0;
  }
  const ss4 = nums.reduce((s, v) => s + (v - mu) ** 4, 0);
  // sample variance (ddof=1) squared
  const sampleVar = ss2 / (n - 1);
  const standardizedSum = ss4 / (sampleVar * sampleVar);
  const a = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
  const b = (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
  return a * standardizedSum - b;
}

// ─── skewSeries ───────────────────────────────────────────────────────────────

/**
 * Compute the adjusted Fisher–Pearson skewness coefficient of a Series.
 *
 * Returns `NaN` when fewer than 3 valid (non-missing) values are present.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 2, 3, 4, 10] });
 * skewSeries(s); // ~1.56 (right-skewed)
 * ```
 */
export function skewSeries(s: Series<Scalar>): number {
  return adjustedSkewness(numericValues(s));
}

// ─── skewDataFrame ────────────────────────────────────────────────────────────

/**
 * Compute skewness for each numeric column in a DataFrame.
 *
 * Returns a Series indexed by column name.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1,2,3,4,5,10], b: [1,1,1,1,1,1] });
 * skewDataFrame(df);
 * // Series { a: ~1.56, b: 0 }
 * ```
 */
export function skewDataFrame(df: DataFrame): Series<Scalar> {
  const labels: Label[] = [];
  const values: Scalar[] = [];
  for (const colName of df.columns.values) {
    const col = df.col(colName);
    const nums = numericValues(col);
    if (nums.length === 0) {
      continue;
    }
    labels.push(colName);
    values.push(adjustedSkewness(nums));
  }
  return new Series<Scalar>({ data: values, index: labels, name: "skew" });
}

// ─── kurtosisSeries ───────────────────────────────────────────────────────────

/**
 * Compute the adjusted excess kurtosis (Fisher) of a Series.
 *
 * Returns `NaN` when fewer than 4 valid values are present.
 * A normal distribution has excess kurtosis = 0.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * kurtosisSeries(s); // -1.3 (platykurtic)
 * ```
 */
export function kurtosisSeries(s: Series<Scalar>): number {
  return adjustedKurtosis(numericValues(s));
}

/**
 * Alias for {@link kurtosisSeries} — matches `pandas.Series.kurt`.
 */
export const kurtSeries = kurtosisSeries;

// ─── kurtosisDataFrame ────────────────────────────────────────────────────────

/**
 * Compute excess kurtosis for each numeric column in a DataFrame.
 *
 * Returns a Series indexed by column name.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1,2,3,4,5], b: [1,1,1,1,1] });
 * kurtosisDataFrame(df);
 * // Series { a: -1.3, b: 0 }
 * ```
 */
export function kurtosisDataFrame(df: DataFrame): Series<Scalar> {
  const labels: Label[] = [];
  const values: Scalar[] = [];
  for (const colName of df.columns.values) {
    const col = df.col(colName);
    const nums = numericValues(col);
    if (nums.length === 0) {
      continue;
    }
    labels.push(colName);
    values.push(adjustedKurtosis(nums));
  }
  return new Series<Scalar>({ data: values, index: labels, name: "kurtosis" });
}

/**
 * Alias for {@link kurtosisDataFrame} — matches `pandas.DataFrame.kurt`.
 */
export const kurtDataFrame = kurtosisDataFrame;
