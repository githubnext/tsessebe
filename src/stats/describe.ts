/**
 * `describe` — summary statistics for Series and DataFrame.
 *
 * Mirrors `pandas.Series.describe` / `pandas.DataFrame.describe`.
 *
 * For numeric Series, returns: count, mean, std, min, 25%, 50%, 75%, max.
 * For non-numeric Series, returns: count, unique, top, freq.
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

/** Compute a percentile of a sorted array using linear interpolation. */
function percentile(sorted: readonly number[], p: number): number {
  const n = sorted.length;
  if (n === 0) {
    return Number.NaN;
  }
  if (n === 1) {
    return sorted[0] as number;
  }
  const idx = (p / 100) * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  const loVal = sorted[lo] as number;
  const hiVal = sorted[hi] as number;
  return loVal + frac * (hiVal - loVal);
}

/** Sample standard deviation (ddof=1). */
function sampleStd(nums: readonly number[]): number {
  const n = nums.length;
  if (n < 2) {
    return Number.NaN;
  }
  const mu = nums.reduce((s, v) => s + v, 0) / n;
  const ss = nums.reduce((s, v) => s + (v - mu) ** 2, 0);
  return Math.sqrt(ss / (n - 1));
}

/** Check whether a Series is numeric (all non-missing values are numbers). */
function isNumericSeries(s: Series<Scalar>): boolean {
  for (const v of s.values) {
    if (!isMissing(v) && typeof v !== "number") {
      return false;
    }
  }
  return true;
}

// ─── describe Series ──────────────────────────────────────────────────────────

/**
 * Compute summary statistics for a numeric Series.
 *
 * Returns a new Series indexed by statistic name.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * describe(s);
 * // Series { count:5, mean:3, std:1.581, min:1, 25%:2, 50%:3, 75%:4, max:5 }
 * ```
 */
export function describe(s: Series<Scalar>): Series<Scalar> {
  if (isNumericSeries(s)) {
    return describeNumericSeries(s);
  }
  return describeObjectSeries(s);
}

/** Describe a numeric Series. */
function describeNumericSeries(s: Series<Scalar>): Series<Scalar> {
  const nums = numericValues(s);
  const sorted = [...nums].sort((a, b) => a - b);
  const count = nums.length;
  const mu = count === 0 ? Number.NaN : nums.reduce((acc, v) => acc + v, 0) / count;
  const stats: Scalar[] = [
    count,
    mu,
    sampleStd(nums),
    count === 0 ? Number.NaN : (sorted[0] as number),
    percentile(sorted, 25),
    percentile(sorted, 50),
    percentile(sorted, 75),
    count === 0 ? Number.NaN : (sorted[sorted.length - 1] as number),
  ];
  return new Series<Scalar>({
    data: stats,
    index: ["count", "mean", "std", "min", "25%", "50%", "75%", "max"],
    name: s.name,
  });
}

/** Describe a non-numeric (object/string) Series. */
function describeObjectSeries(s: Series<Scalar>): Series<Scalar> {
  const vals: Scalar[] = [];
  for (const v of s.values) {
    if (!isMissing(v)) {
      vals.push(v);
    }
  }
  const count = vals.length;
  const uniqueSet = new Set(vals.map((v) => String(v)));
  const unique = uniqueSet.size;

  // Find the most frequent value (top) and its count (freq).
  const freq = new Map<string, number>();
  for (const v of vals) {
    const k = String(v);
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  let topKey = "";
  let topFreq = 0;
  for (const [k, f] of freq) {
    if (f > topFreq) {
      topKey = k;
      topFreq = f;
    }
  }

  const stats: Scalar[] = [count, unique, topKey, topFreq];
  return new Series<Scalar>({
    data: stats,
    index: ["count", "unique", "top", "freq"],
    name: s.name,
  });
}

// ─── describe DataFrame ───────────────────────────────────────────────────────

/**
 * Compute summary statistics for all numeric columns of a DataFrame.
 *
 * Non-numeric columns are excluded (mirrors pandas default `include='number'`).
 * Returns a DataFrame indexed by statistic name; columns are the numeric columns.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1,2,3], b: [4.0, 5.0, 6.0] });
 * describeDataFrame(df);
 * // DataFrame with rows: count, mean, std, min, 25%, 50%, 75%, max
 * ```
 */
export function describeDataFrame(df: DataFrame): DataFrame {
  const statNames: Label[] = ["count", "mean", "std", "min", "25%", "50%", "75%", "max"];
  const colData: Record<string, Scalar[]> = {};

  for (const colName of df.columns.values) {
    const col = df.col(colName);
    if (!isNumericSeries(col)) {
      continue;
    }
    const nums = numericValues(col);
    const sorted = [...nums].sort((a, b) => a - b);
    const count = nums.length;
    const mu = count === 0 ? Number.NaN : nums.reduce((acc, v) => acc + v, 0) / count;
    colData[colName] = [
      count,
      mu,
      sampleStd(nums),
      count === 0 ? Number.NaN : (sorted[0] as number),
      percentile(sorted, 25),
      percentile(sorted, 50),
      percentile(sorted, 75),
      count === 0 ? Number.NaN : (sorted[sorted.length - 1] as number),
    ];
  }

  return DataFrame.fromColumns(colData, { index: statNames });
}
