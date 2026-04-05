/**
 * Binning utilities — `cut` and `qcut`.
 *
 * Mirrors:
 *   - `pandas.cut` — bin values into fixed-width intervals
 *   - `pandas.qcut` — bin values into quantile-based intervals
 */

import type { Scalar } from "../types.ts";
import { Interval, IntervalIndex } from "./interval-index.ts";
import { Series } from "./series.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True if v is a finite number. */
function isFiniteNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v) && Number.isFinite(v);
}

/** Linspace: n+1 evenly spaced edges from lo to hi. */
function linspace(lo: number, hi: number, n: number): number[] {
  const result: number[] = [];
  for (let i = 0; i <= n; i++) {
    result.push(lo + (hi - lo) * (i / n));
  }
  return result;
}

/** Find the bin index for `v` within sorted `edges`. Returns -1 if out of range. */
function findBin(v: number, edges: readonly number[], right: boolean): number {
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i] ?? Number.NEGATIVE_INFINITY;
    const hi = edges[i + 1] ?? Number.POSITIVE_INFINITY;
    const inBin = right ? v > lo && v <= hi : v >= lo && v < hi;
    if (inBin) {
      return i;
    }
  }
  // Include exact left-most edge when right=true
  if (right && v === edges[0]) {
    return 0;
  }
  return -1;
}

// ─── cut ──────────────────────────────────────────────────────────────────────

/** Result of {@link cut} with `retBins=true`. */
export interface CutResult {
  /** Series of Interval labels (or category codes if `labels` supplied). */
  series: Series<Scalar>;
  /** IntervalIndex of the computed bins. */
  bins: IntervalIndex;
}

/** Options for {@link cut}. */
export interface CutOptions {
  /** Custom labels for bins. Pass `false` to return integer bin codes. */
  labels?: readonly string[] | false;
  /** Whether the right boundary is closed. Default `true`. */
  right?: boolean;
  /** Return the computed bin edges. Default `false`. */
  retBins?: boolean;
  /** Whether to include the lowest value. Default `false`. */
  include_lowest?: boolean;
}

/**
 * Bin values in `s` into `bins` number of equal-width buckets.
 *
 * @example
 * ```ts
 * const { series } = cut(new Series({ data: [1, 2, 3, 4] }), 2);
 * // => Series of Interval labels
 * ```
 */
export function cut(
  s: Series<Scalar>,
  bins: number | readonly number[],
  opts: CutOptions = {},
): CutResult {
  const right = opts.right ?? true;
  const labels = opts.labels;

  const vals = s.values;
  const nums = vals.filter(isFiniteNum);
  const edges = buildEdges(bins, nums);
  const intervals = buildIntervals(edges, right);
  const intervalIdx = new IntervalIndex(intervals);

  const out: Scalar[] = [];
  for (const v of vals) {
    out.push(assignBin(v, edges, intervals, labels, right));
  }

  return {
    series: new Series<Scalar>({ data: out, index: s.index, name: s.name }),
    bins: intervalIdx,
  };
}

/** Build bin edges from a count or explicit array. */
function buildEdges(bins: number | readonly number[], nums: number[]): number[] {
  if (typeof bins === "number") {
    const minV = Math.min(...nums);
    const maxV = Math.max(...nums);
    return linspace(minV, maxV, bins);
  }
  return [...bins];
}

/** Build Interval objects from edges. */
function buildIntervals(edges: readonly number[], right: boolean): Interval[] {
  const intervals: Interval[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i] ?? 0;
    const hi = edges[i + 1] ?? 0;
    intervals.push(new Interval(lo, hi, right ? "right" : "left"));
  }
  return intervals;
}

/** Assign value to a bin, returning the label or Interval. */
function assignBin(
  v: Scalar,
  edges: readonly number[],
  intervals: readonly Interval[],
  labels: readonly string[] | false | undefined,
  right: boolean,
): Scalar {
  if (!isFiniteNum(v)) {
    return null;
  }
  const idx = findBin(v, edges, right);
  if (idx < 0) {
    return null;
  }
  if (labels === false) {
    return idx;
  }
  if (labels !== undefined && labels.length > 0) {
    return labels[idx] ?? null;
  }
  return (intervals[idx] ?? null) as unknown as Scalar;
}

// ─── qcut ─────────────────────────────────────────────────────────────────────

/** Result of {@link qcut} with `retBins=true`. */
export interface QCutResult {
  /** Series of Interval labels or integer codes. */
  series: Series<Scalar>;
  /** Quantile bin edges as a plain array. */
  bins: readonly number[];
}

/** Options for {@link qcut}. */
export interface QCutOptions {
  /** Custom labels for quantile bins. Pass `false` for integer codes. */
  labels?: readonly string[] | false;
  /** Whether the right boundary is closed. Default `true`. */
  right?: boolean;
  /** Allow duplicate quantile edges by dropping duplicates. Default `false`. */
  duplicates?: "raise" | "drop";
}

/**
 * Bin values in `s` into `q` quantile-based buckets.
 *
 * @example
 * ```ts
 * const { series } = qcut(new Series({ data: [1, 2, 3, 4] }), 2);
 * ```
 */
export function qcut(
  s: Series<Scalar>,
  q: number | readonly number[],
  opts: QCutOptions = {},
): QCutResult {
  const right = opts.right ?? true;
  const labels = opts.labels;
  const duplicates = opts.duplicates ?? "raise";

  const vals = s.values;
  const nums = vals.filter(isFiniteNum).sort((a, b) => a - b);
  const n = nums.length;

  const quantiles = buildQuantiles(q);
  let edges = quantiles.map((p) => quantileValue(nums, n, p));

  // Deduplicate edges if needed
  if (duplicates === "drop") {
    edges = [...new Set(edges)];
  } else {
    const seen = new Set<number>();
    for (const e of edges) {
      if (seen.has(e)) {
        throw new Error(`qcut: duplicate quantile edges (use duplicates="drop" to suppress)`);
      }
      seen.add(e);
    }
  }

  const intervals = buildIntervals(edges, right);
  const out: Scalar[] = [];
  for (const v of vals) {
    out.push(assignBin(v, edges, intervals, labels, right));
  }

  return {
    series: new Series<Scalar>({ data: out, index: s.index, name: s.name }),
    bins: edges,
  };
}

/** Build quantile percentile list from count or explicit array. */
function buildQuantiles(q: number | readonly number[]): number[] {
  if (typeof q === "number") {
    return linspace(0, 1, q);
  }
  return [...q];
}

/** Compute a quantile from a sorted numeric array. */
function quantileValue(sorted: readonly number[], n: number, p: number): number {
  if (n === 0) {
    return 0;
  }
  const idx = p * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const loV = sorted[lo] ?? 0;
  const hiV = sorted[hi] ?? 0;
  return loV + (hiV - loV) * (idx - lo);
}
