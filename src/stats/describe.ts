/**
 * describe — summary statistics for Series and DataFrame.
 *
 * Mirrors `pandas.DataFrame.describe()` / `pandas.Series.describe()`:
 * - Numeric series: count, mean, std, min, percentiles…, max
 * - Non-numeric series: count, unique, top, freq
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { DtypeKind } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public API types ─────────────────────────────────────────────────────────

/** Options for {@link describe}. */
export interface DescribeOptions {
  /**
   * Percentile levels to include (values between 0 and 1).
   * Defaults to `[0.25, 0.5, 0.75]` — same as pandas.
   */
  readonly percentiles?: readonly number[];
  /**
   * Which columns to include when describing a DataFrame.
   * - `"number"` (default): only numeric columns
   * - `"object"`: only non-numeric / categorical columns
   * - `"all"`: every column regardless of dtype
   */
  readonly include?: "number" | "object" | "all";
}

// ─── constants ────────────────────────────────────────────────────────────────

const DEFAULT_PERCENTILES: readonly number[] = [0.25, 0.5, 0.75];

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a dtype kind is numeric (int, uint, or float). */
function isNumericKind(kind: DtypeKind): boolean {
  return kind === "int" || kind === "uint" || kind === "float";
}

/** True when a Series holds numeric data. */
function isNumericSeries(s: Series<Scalar>): boolean {
  return isNumericKind(s.dtype.kind);
}

/** Extract finite, non-missing numbers from a scalar array. */
function numericValues(vals: readonly Scalar[]): number[] {
  return vals.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
}

/**
 * Compute a single quantile via linear interpolation (pandas `method='linear'`).
 *
 * @param sorted - ascending-sorted numeric array (no NaN/null)
 * @param q      - quantile level in [0, 1]
 * @returns        interpolated value, or `NaN` when the array is empty
 *
 * @example
 * ```ts
 * quantile([1, 2, 3, 4], 0.5); // 2.5
 * ```
 */
export function quantile(sorted: readonly number[], q: number): number {
  const n = sorted.length;
  if (n === 0) {
    return Number.NaN;
  }
  const pos = q * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) {
    return sorted[lo] as number;
  }
  const frac = pos - lo;
  return (sorted[lo] as number) * (1 - frac) + (sorted[hi] as number) * frac;
}

/** Format a quantile level as a percentage label (0.25 → `"25%"`). */
function pctLabel(q: number): string {
  const rounded = Math.round(q * 100 * 1e6) / 1e6;
  return `${rounded}%`;
}

/** Build the ordered row-label list for a numeric describe. */
function numericRowLabels(percentiles: readonly number[]): Label[] {
  return ["count", "mean", "std", "min", ...percentiles.map(pctLabel), "max"];
}

// ─── single-column statistics ─────────────────────────────────────────────────

/** Compute numeric stats: [count, mean, std, min, ...pct, max]. */
function numericStats(vals: readonly Scalar[], percentiles: readonly number[]): Scalar[] {
  const nums = numericValues(vals);
  const n = nums.length;
  if (n === 0) {
    const nanRow = percentiles.map(() => Number.NaN as Scalar);
    return [0, Number.NaN, Number.NaN, Number.NaN, ...nanRow, Number.NaN];
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const mean = nums.reduce((acc, v) => acc + v, 0) / n;
  const variance =
    n >= 2 ? nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1) : Number.NaN;
  const std = Math.sqrt(variance);
  const pctVals = percentiles.map((q) => quantile(sorted, q));
  return [n, mean, std, sorted[0] as number, ...pctVals, sorted[n - 1] as number];
}

/** Compute categorical stats: [count, unique, top, freq]. */
function categoricalStats(vals: readonly Scalar[]): Scalar[] {
  const nonNull = vals.filter(
    (v) => v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v)),
  );
  const n = nonNull.length;
  if (n === 0) {
    return [0, 0, null, null];
  }
  const freq = new Map<Scalar, number>();
  for (const v of nonNull) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  let topVal: Scalar = null;
  let topFreq = 0;
  for (const [v, f] of freq) {
    if (f > topFreq) {
      topFreq = f;
      topVal = v;
    }
  }
  return [n, freq.size, topVal, topFreq];
}

// ─── Series describe ──────────────────────────────────────────────────────────

/** Describe a numeric Series (count / mean / std / min / percentiles / max). */
function describeNumericSeries(s: Series<Scalar>, percentiles: readonly number[]): Series<Scalar> {
  const labels = numericRowLabels(percentiles);
  const stats = numericStats(s.values as readonly Scalar[], percentiles);
  return new Series({ data: stats, index: new Index<Label>(labels), name: s.name });
}

/** Describe a categorical Series (count / unique / top / freq). */
function describeCategoricalSeries(s: Series<Scalar>): Series<Scalar> {
  const labels: Label[] = ["count", "unique", "top", "freq"];
  const stats = categoricalStats(s.values as readonly Scalar[]);
  return new Series({ data: stats, index: new Index<Label>(labels), name: s.name });
}

// ─── DataFrame describe ───────────────────────────────────────────────────────

/** Select columns to describe based on the `include` option. */
function selectColumns(df: DataFrame, include: DescribeOptions["include"]): string[] {
  return df.columns.values.filter((name) => {
    const numeric = isNumericSeries(df.col(name));
    if (include === "number") {
      return numeric;
    }
    if (include === "object") {
      return !numeric;
    }
    return true; // "all"
  });
}

/** Determine unified row labels when include === "all" and types are mixed. */
function rowLabelsForAll(cols: readonly string[], df: DataFrame, pcts: readonly number[]): Label[] {
  const hasNum = cols.some((c) => isNumericSeries(df.col(c)));
  const hasCat = cols.some((c) => !isNumericSeries(df.col(c)));
  if (hasNum && hasCat) {
    return [...numericRowLabels(pcts), "unique", "top", "freq"];
  }
  if (hasNum) {
    return numericRowLabels(pcts);
  }
  return ["count", "unique", "top", "freq"];
}

/** Choose the row labels for a describe DataFrame. */
function chooseRowLabels(
  include: Required<DescribeOptions>["include"],
  cols: readonly string[],
  df: DataFrame,
  pcts: readonly number[],
): Label[] {
  if (include === "number") {
    return numericRowLabels(pcts);
  }
  if (include === "object") {
    return ["count", "unique", "top", "freq"];
  }
  return rowLabelsForAll(cols, df, pcts);
}

/** Build a stat-Series for one column, filling nulls for absent rows. */
function buildColStat(
  s: Series<Scalar>,
  opts: Required<DescribeOptions>,
  rowLabels: readonly Label[],
): Series<Scalar> {
  const isNum = isNumericSeries(s);
  const rawLabels: Label[] = isNum
    ? numericRowLabels(opts.percentiles)
    : ["count", "unique", "top", "freq"];
  const rawStats: Scalar[] = isNum
    ? numericStats(s.values as readonly Scalar[], opts.percentiles)
    : categoricalStats(s.values as readonly Scalar[]);
  const statMap = new Map<Label, Scalar>(rawLabels.map((lbl, i) => [lbl, rawStats[i] ?? null]));
  const data = rowLabels.map((lbl) => statMap.get(lbl) ?? null);
  return new Series({ data, index: new Index<Label>([...rowLabels]), name: s.name });
}

/** Describe a DataFrame: stat-Series per selected column assembled into a result DataFrame. */
function describeDataFrame(df: DataFrame, opts: Required<DescribeOptions>): DataFrame {
  const cols = selectColumns(df, opts.include);
  if (cols.length === 0) {
    return new DataFrame(new Map(), new Index<Label>([]));
  }
  const rowLabels = chooseRowLabels(opts.include, cols, df, opts.percentiles);
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of cols) {
    colMap.set(name, buildColStat(df.col(name), opts, rowLabels));
  }
  return new DataFrame(colMap, new Index<Label>(rowLabels));
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Compute summary statistics for a `Series` or `DataFrame`.
 *
 * Mirrors `pandas.DataFrame.describe()` / `pandas.Series.describe()`.
 *
 * - **Numeric** series/columns: `count`, `mean`, `std`, `min`,
 *   percentile rows (default 25 %, 50 %, 75 %), `max`.
 * - **Non-numeric** series/columns: `count`, `unique`, `top`, `freq`.
 *
 * @param obj     - A `Series` or `DataFrame` to summarize.
 * @param options - Optional configuration.
 * @returns         A `Series` (from a Series input) or a `DataFrame`.
 *
 * @example
 * ```ts
 * import { Series, describe } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * describe(s);
 * // Series { count: 5, mean: 3, std: 1.58…, min: 1, "25%": 2, "50%": 3, "75%": 4, max: 5 }
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * describe(df);
 * // DataFrame rows: count / mean / std / min / 25% / 50% / 75% / max
 * ```
 */
export function describe(
  obj: Series<Scalar> | DataFrame,
  options?: DescribeOptions,
): Series<Scalar> | DataFrame {
  const percentiles = options?.percentiles ?? DEFAULT_PERCENTILES;
  const include = options?.include ?? "number";
  const opts: Required<DescribeOptions> = { percentiles, include };
  if (obj instanceof Series) {
    if (isNumericSeries(obj)) {
      return describeNumericSeries(obj, opts.percentiles);
    }
    return describeCategoricalSeries(obj);
  }
  return describeDataFrame(obj, opts);
}
