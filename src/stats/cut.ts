/**
 * cut / qcut — bin continuous data into discrete intervals.
 *
 * Mirrors `pandas.cut()` and `pandas.qcut()`:
 * - `cut(x, bins, options)` — uniform or user-defined bin edges
 * - `qcut(x, q, options)` — quantile-based (equal-frequency) bins
 *
 * Each function returns:
 * - a `Series<string | null>` of bin-label strings (or custom labels)
 * - optionally the bin edges used (via `retbins: true`)
 *
 * @module
 */

import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link cut}. */
export interface CutOptions {
  /**
   * Whether the right edge of each interval is closed.
   * Default `true` — `(lo, hi]` (half-open on left, closed on right).
   * When `false` — `[lo, hi)`.
   */
  readonly right?: boolean;
  /**
   * Custom labels for the resulting bins.
   * - `readonly string[]` — one label per bin interval.
   * - `false` — use integer codes (0, 1, 2, …) as labels.
   * - `undefined` (default) — auto-generate `"(lo, hi]"` style labels.
   */
  readonly labels?: readonly string[] | false;
  /**
   * When `true`, return a `[series, binEdges]` tuple.
   * When `false` (default), return only the Series.
   */
  readonly retbins?: boolean;
  /**
   * Number of decimal places for auto-generated interval labels.
   * Default `3`.
   */
  readonly precision?: number;
  /**
   * When `bins` is a number, extend the left edge by a small factor
   * so the minimum value is included. Default `true`.
   */
  readonly includeLowest?: boolean;
  /**
   * When `true` (default), result categories are ordered by interval.
   * Currently affects only label ordering in the returned series, not dtype.
   */
  readonly ordered?: boolean;
}

/** Options for {@link qcut}. */
export interface QcutOptions {
  /**
   * Custom labels for the resulting bins.
   * - `readonly string[]` — one label per quantile interval.
   * - `false` — use integer codes (0, 1, 2, …).
   * - `undefined` (default) — auto-generate percentile-range labels.
   */
  readonly labels?: readonly string[] | false;
  /** When `true`, return a `[series, binEdges]` tuple. Default `false`. */
  readonly retbins?: boolean;
  /** Decimal places for auto-generated labels. Default `3`. */
  readonly precision?: number;
  /**
   * Whether to allow duplicate bin edges (non-unique quantile boundaries).
   * When `"raise"` (default), throws if duplicates are found.
   * When `"drop"`, silently removes duplicates.
   */
  readonly duplicates?: "raise" | "drop";
}

// ─── helper types ─────────────────────────────────────────────────────────────

/** Result when `retbins` is `false` (default). */
export type CutResult = Series<string | null>;

/** Result when `retbins` is `true`. */
export type CutResultWithBins = [Series<string | null>, readonly number[]];

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when value is null/undefined/NaN. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Format a number to `precision` decimal places, stripping trailing zeros. */
function fmt(n: number, precision: number): string {
  return Number(n.toFixed(precision)).toString();
}

/** Build interval label string like `"(0.0, 1.5]"` or `"[0.0, 1.5)"`. */
function intervalLabel(lo: number, hi: number, right: boolean, precision: number): string {
  const l = fmt(lo, precision);
  const r = fmt(hi, precision);
  return right ? `(${l}, ${r}]` : `[${l}, ${r})`;
}

/**
 * Compute linear-interpolation quantile (same algorithm as describe.ts).
 *
 * @param sorted ascending-sorted array of finite numbers
 * @param q      quantile in [0, 1]
 */
function linearQuantile(sorted: readonly number[], q: number): number {
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

/** Validate and normalise user-supplied bin edges (sorted, unique). */
function normaliseBinEdges(edges: readonly number[]): readonly number[] {
  if (edges.length < 2) {
    throw new RangeError("At least 2 bin edges required.");
  }
  const sorted = [...edges].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if ((sorted[i] as number) === (sorted[i - 1] as number)) {
      throw new RangeError(
        `Bin edge ${sorted[i]} appears more than once. Bin edges must be unique.`,
      );
    }
  }
  return sorted;
}

/** Binary search: find the bin index for value `v` given sorted `edges`. */
function findBin(v: number, edges: readonly number[], right: boolean): number {
  let lo = 0;
  let hi = edges.length - 2; // last valid bin index

  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const edgeMid = edges[mid + 1] as number;
    if (right ? v <= edgeMid : v < edgeMid) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo;
}

/** Build the label array for `numBins` intervals. */
function buildLabels(
  edges: readonly number[],
  right: boolean,
  labels: readonly string[] | false | undefined,
  precision: number,
  numBins: number,
): readonly (string | null)[] {
  if (labels === false) {
    return Array.from({ length: numBins }, (_, i) => String(i));
  }
  if (labels !== undefined) {
    if (labels.length !== numBins) {
      throw new RangeError(
        `labels length (${labels.length}) must equal number of bins (${numBins}).`,
      );
    }
    return labels;
  }
  return Array.from({ length: numBins }, (_, i) => {
    const lo = edges[i] as number;
    const hi = edges[i + 1] as number;
    return intervalLabel(lo, hi, right, precision);
  });
}

/** Check whether `v` is within the valid bin range. */
function isInRange(v: number, lo0: number, hiN: number, right: boolean): boolean {
  if (right) {
    return v > lo0 && v <= hiN;
  }
  return v >= lo0 && v < hiN;
}

/**
 * Assign each value in `data` to a bin interval, returning a label string
 * (or `null` for missing / out-of-range values).
 */
function assignBins(
  data: readonly Scalar[],
  edges: readonly number[],
  right: boolean,
  labels: readonly string[] | false | undefined,
  precision: number,
  includeLowest: boolean,
): readonly (string | null)[] {
  const numBins = edges.length - 1;
  const binLabels = buildLabels(edges, right, labels, precision, numBins);

  const lo0 = edges[0] as number;
  const hiN = edges[numBins] as number;
  // Widen leftmost edge by a tiny epsilon so the minimum value falls inside.
  const adjustedLo0 = includeLowest ? lo0 - 1e-10 * (Math.abs(lo0) + 1) : lo0;

  return data.map((raw): string | null => {
    if (isMissing(raw) || typeof raw !== "number") {
      return null;
    }
    if (!isInRange(raw, adjustedLo0, hiN, right)) {
      return null;
    }
    const bin = findBin(raw, edges, right);
    return binLabels[bin] ?? null;
  });
}

/** Compute equal-width edges from a numeric range. */
function equalWidthEdges(minVal: number, maxVal: number, bins: number): readonly number[] {
  if (minVal === maxVal) {
    const lo = minVal - 0.5;
    const hi = maxVal + 0.5;
    return Array.from({ length: bins + 1 }, (_, i) => lo + (i * (hi - lo)) / bins);
  }
  const step = (maxVal - minVal) / bins;
  return Array.from({ length: bins + 1 }, (_, i) => minVal + i * step);
}

/** Extract finite numbers from a scalar array. */
function numericOnly(vals: readonly Scalar[]): number[] {
  return vals.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
}

/** Build edges from a numeric integer bin count. */
function edgesFromCount(nums: readonly number[], bins: number): readonly number[] {
  if (!Number.isInteger(bins) || bins < 1) {
    throw new RangeError("`bins` must be a positive integer when given as a number.");
  }
  if (nums.length === 0) {
    throw new RangeError("Cannot determine bin edges: no finite numeric values in x.");
  }
  const minVal = Math.min(...nums);
  const maxVal = Math.max(...nums);
  return equalWidthEdges(minVal, maxVal, bins);
}

/** Return series (or [series, edges] tuple) based on retbins flag. */
function wrapResult(
  series: Series<string | null>,
  edges: readonly number[],
  retbins: boolean,
): CutResult | CutResultWithBins {
  if (retbins) {
    return [series, edges];
  }
  return series;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Bin values in `x` into discrete intervals — mirrors `pandas.cut()`.
 *
 * @param x    Input Series of numeric values.
 * @param bins Either an integer number of equal-width bins, or an explicit
 *             sorted array of bin edges (length ≥ 2).
 * @param options  See {@link CutOptions}.
 * @returns    A `Series<string | null>` with bin-label for each element,
 *             or a `[Series, binEdges]` tuple when `retbins: true`.
 *
 * @example
 * ```ts
 * import { cut, Series } from "tsb";
 *
 * const s = new Series({ data: [1, 7, 5, 4, 2, 3], name: "x" });
 * const binned = cut(s, 3);
 * ```
 */
export function cut(x: Series<Scalar>, bins: number, options?: CutOptions): CutResult;
export function cut(x: Series<Scalar>, bins: readonly number[], options?: CutOptions): CutResult;
export function cut(
  x: Series<Scalar>,
  bins: number | readonly number[],
  options: CutOptions = {},
): CutResult | CutResultWithBins {
  const right = options.right ?? true;
  const labels = options.labels;
  const retbins = options.retbins ?? false;
  const precision = options.precision ?? 3;
  const includeLowest = options.includeLowest ?? true;

  const vals = x.values;
  const nums = numericOnly(vals);
  const edges = typeof bins === "number" ? edgesFromCount(nums, bins) : normaliseBinEdges(bins);

  const resultVals = assignBins(vals, edges, right, labels, precision, includeLowest);
  const series = new Series<string | null>({
    data: [...resultVals],
    index: x.index,
    name: x.name ?? null,
  });
  return wrapResult(series, edges, retbins);
}

/** Build quantile levels from an integer `q`. */
function quantileLevelsFromInt(q: number): readonly number[] {
  if (!Number.isInteger(q) || q < 2) {
    throw new RangeError("`q` must be an integer ≥ 2 when given as a number.");
  }
  return Array.from({ length: q + 1 }, (_, i) => i / q);
}

/** Deduplicate sorted edges, or raise if duplicates are found. */
function deduplicateEdges(rawEdges: number[], duplicates: "raise" | "drop"): readonly number[] {
  for (let i = 1; i < rawEdges.length; i++) {
    if ((rawEdges[i] as number) !== (rawEdges[i - 1] as number)) {
      continue;
    }
    if (duplicates === "drop") {
      const deduped = [...new Set(rawEdges)].sort((a, b) => a - b);
      if (deduped.length < 2) {
        throw new RangeError(
          "After dropping duplicate bin edges, fewer than 2 unique edges remain.",
        );
      }
      return deduped;
    }
    throw new RangeError(
      `Duplicate bin edges found: ${rawEdges[i]}. Use duplicates="drop" to handle.`,
    );
  }
  return rawEdges;
}

/**
 * Bin values in `x` into quantile-based (equal-frequency) intervals —
 * mirrors `pandas.qcut()`.
 *
 * @param x    Input Series of numeric values.
 * @param q    Either an integer number of quantiles, or an explicit array
 *             of quantile levels in [0, 1] (e.g. `[0, 0.25, 0.5, 0.75, 1]`).
 * @param options  See {@link QcutOptions}.
 * @returns    A `Series<string | null>` with quantile-bin label for each element,
 *             or a `[Series, binEdges]` tuple when `retbins: true`.
 *
 * @example
 * ```ts
 * import { qcut, Series } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], name: "v" });
 * const binned = qcut(s, 4); // 4 equal-frequency quartile bins
 * ```
 */
export function qcut(x: Series<Scalar>, q: number, options?: QcutOptions): CutResult;
export function qcut(x: Series<Scalar>, q: readonly number[], options?: QcutOptions): CutResult;
export function qcut(
  x: Series<Scalar>,
  q: number | readonly number[],
  options: QcutOptions = {},
): CutResult | CutResultWithBins {
  const labels = options.labels;
  const retbins = options.retbins ?? false;
  const precision = options.precision ?? 3;
  const duplicates = options.duplicates ?? "raise";

  const vals = x.values;
  const nums = numericOnly(vals);

  if (nums.length === 0) {
    throw new RangeError("Cannot compute quantiles: no finite numeric values in x.");
  }

  const sorted = [...nums].sort((a, b) => a - b);

  let qLevels: readonly number[];
  if (typeof q === "number") {
    qLevels = quantileLevelsFromInt(q);
  } else {
    if (q.length < 2) {
      throw new RangeError("`q` array must have at least 2 elements.");
    }
    qLevels = [...q].sort((a, b) => a - b);
  }

  const rawEdges = qLevels.map((qLevel) => linearQuantile(sorted, qLevel));
  const edges = deduplicateEdges(rawEdges, duplicates);

  const resultVals = assignBins(vals, edges, true, labels, precision, true);
  const series = new Series<string | null>({
    data: [...resultVals],
    index: x.index,
    name: x.name ?? null,
  });
  return wrapResult(series, edges, retbins);
}

/**
 * Return the integer bin code (0-based) for each element of `x`.
 *
 * Equivalent to `cut(x, bins, { labels: false })` but returns `number | null`.
 *
 * @param x    Input Series of numeric values.
 * @param bins Integer number of equal-width bins or explicit bin edges.
 * @returns    Series of integer bin codes (or `null` for missing/out-of-range).
 */
export function cutCodes(
  x: Series<Scalar>,
  bins: number | readonly number[],
  options?: Omit<CutOptions, "labels" | "retbins">,
): Series<number | null> {
  const strSeries = cut(x, bins as number, { ...options, labels: false }) as CutResult;
  const data = strSeries.values.map((v): number | null =>
    v === null ? null : Number.parseInt(v, 10),
  );
  return new Series<number | null>({
    data: [...data],
    index: x.index,
    name: x.name ?? null,
  });
}

/**
 * Return the unique bin labels in interval order.
 *
 * @param bins      integer or edge array (same as passed to `cut`/`qcut`)
 * @param minVal    minimum data value (used when `bins` is an integer)
 * @param maxVal    maximum data value (used when `bins` is an integer)
 * @param right     whether intervals are right-closed (default `true`)
 * @param precision decimal places (default `3`)
 */
export function cutCategories(
  bins: number | readonly number[],
  minVal: number,
  maxVal: number,
  right = true,
  precision = 3,
): readonly string[] {
  const edges =
    typeof bins === "number" ? equalWidthEdges(minVal, maxVal, bins) : normaliseBinEdges(bins);
  const numBins = edges.length - 1;
  return Array.from({ length: numBins }, (_, i) => {
    const lo = edges[i] as number;
    const hi = edges[i + 1] as number;
    return intervalLabel(lo, hi, right, precision);
  });
}
