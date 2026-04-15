/**
 * cut and qcut — bin continuous values into discrete intervals.
 *
 * Mirrors `pandas.cut()` and `pandas.qcut()`:
 *
 * - `cut()` divides the range of `x` into equal-width bins (when `bins` is an
 *   integer) or uses caller-supplied bin edges.
 * - `qcut()` divides by sample quantiles so each bin holds approximately the
 *   same number of observations.
 *
 * Both functions return a `Series<string | null>` where each value is an
 * interval label like `"(0.0, 1.0]"`, `null` for out-of-range values, an
 * integer code when `labels=false`, or a custom string when custom labels are
 * provided.
 *
 * @example
 * ```ts
 * import { cut, qcut } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * cut(s, 2);
 * // Series ["(0.995, 3.0]", "(0.995, 3.0]", "(0.995, 3.0]", "(3.0, 5.005]", "(3.0, 5.005]"]
 *
 * qcut(s, 2);
 * // Series ["(0.999, 3.0]", "(0.999, 3.0]", "(0.999, 3.0]", "(3.0, 5.0]", "(3.0, 5.0]"]
 * ```
 *
 * @module
 */

import { IntervalIndex } from "../core/index.ts";
import type { IntervalClosed } from "../core/index.ts";
import { Series } from "../core/index.ts";
import { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── option types ──────────────────────────────────────────────────────────

/** Options for {@link cut}. */
export interface CutOptions {
  /**
   * Whether intervals are right-closed `(a, b]` (`true`) or left-closed
   * `[a, b)` (`false`). Default `true`.
   */
  readonly right?: boolean;
  /**
   * Labels to use for the bins.
   *
   * - `undefined` (default): interval strings like `"(0, 1]"`.
   * - `false`: integer codes (0-indexed position).
   * - `string[]`: custom label per bin (length must equal number of bins).
   */
  readonly labels?: readonly string[] | false;
  /**
   * When `true`, the leftmost bin includes its left edge even when
   * `right=true`. Mirrors pandas `include_lowest`. Default `false`.
   */
  readonly includeLowest?: boolean;
  /**
   * What to do when computed bin edges contain duplicates (only relevant for
   * user-supplied bin arrays). Default `"raise"`.
   */
  readonly duplicates?: "raise" | "drop";
}

/** Options for {@link qcut}. */
export interface QCutOptions {
  /** Same as in {@link CutOptions}. */
  readonly labels?: readonly string[] | false;
  /**
   * What to do when quantile-based bin edges contain duplicates (can happen
   * with highly-repeated values). Default `"raise"`.
   */
  readonly duplicates?: "raise" | "drop";
}

// ─── internal helpers ──────────────────────────────────────────────────────

/** Extract numeric values from a Series or plain array (NaN for non-numeric). */
function extractNums(x: readonly Scalar[] | Series<Scalar>): readonly number[] {
  const raw: readonly Scalar[] = x instanceof Series ? (x.values as readonly Scalar[]) : x;
  return raw.map((v): number => {
    if (typeof v === "number" && Number.isFinite(v)) {
      return v;
    }
    return Number.NaN;
  });
}

/** Extract the Index from a CutInput (or build a RangeIndex). */
function extractIndex(x: readonly Scalar[] | Series<Scalar>, len: number): Index<Label> {
  if (x instanceof Series) {
    return x.index as Index<Label>;
  }
  const labels: Label[] = Array.from({ length: len }, (_, i): Label => i);
  return new Index<Label>(labels);
}

/** Extract the name from a CutInput (null when not a named Series). */
function extractName(x: readonly Scalar[] | Series<Scalar>): string | null {
  if (x instanceof Series) {
    return x.name;
  }
  return null;
}

/** Compute min and max of finite values; throw if range is degenerate. */
function finiteRange(nums: readonly number[]): { lo: number; hi: number } {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const v of nums) {
    if (Number.isFinite(v)) {
      if (v < lo) {
        lo = v;
      }
      if (v > hi) {
        hi = v;
      }
    }
  }
  if (!Number.isFinite(lo)) {
    throw new RangeError("cut: no finite values in input");
  }
  if (lo === hi) {
    throw new RangeError(`cut: all values are equal (${lo}); cannot compute bin width`);
  }
  return { lo, hi };
}

/** Build `n` equal-width bin edges spanning the range of `nums`. */
function equalWidthEdges(nums: readonly number[], n: number): readonly number[] {
  if (n < 1) {
    throw new RangeError(`cut: bins must be ≥ 1, got ${n}`);
  }
  const { lo, hi } = finiteRange(nums);
  // Expand endpoints by 0.1% to include exact extremes (mirrors pandas).
  const pad = (hi - lo) * 0.001;
  const step = (hi - lo) / n;
  const edges: number[] = [lo - pad];
  for (let i = 1; i < n; i++) {
    edges.push(lo + step * i);
  }
  edges.push(hi + pad);
  return edges;
}

/** Remove duplicate edges; optionally raise on duplicates. */
function deduplicateEdges(
  edges: readonly number[],
  duplicates: "raise" | "drop",
): readonly number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const e of edges) {
    if (seen.has(e)) {
      if (duplicates === "raise") {
        throw new RangeError(`cut: duplicate bin edge ${e}. Pass duplicates="drop" to ignore.`);
      }
    } else {
      seen.add(e);
      result.push(e);
    }
  }
  return result;
}

/** Build an IntervalIndex from bin edges and right/left-closed preference. */
function buildIntervalIndex(edges: readonly number[], right: boolean): IntervalIndex {
  const closed: IntervalClosed = right ? "right" : "left";
  return IntervalIndex.fromBreaks(edges, closed);
}

/** Assign each numeric value to a bin index (-1 = out of range / NaN). */
function assignBins(
  nums: readonly number[],
  idx: IntervalIndex,
  includeLowest: boolean,
  right: boolean,
): readonly number[] {
  return nums.map((v): number => {
    if (!Number.isFinite(v)) {
      return -1;
    }
    const loc = idx.get_loc(v);
    if (loc !== -1) {
      return loc;
    }
    // Handle boundary values not captured by default closure.
    if (includeLowest && right && idx.size > 0 && v === (idx.left[0] as number)) {
      return 0;
    }
    // right=false: include right edge of last bin
    if (!right && idx.size > 0 && v === (idx.right[idx.size - 1] as number)) {
      return idx.size - 1;
    }
    return -1;
  });
}

/** Build label values for the result Series. */
function resolveLabels(
  assignments: readonly number[],
  idx: IntervalIndex,
  labels: readonly string[] | false | undefined,
): readonly Scalar[] {
  if (labels === false) {
    return assignments.map((bin): Scalar => (bin === -1 ? null : bin));
  }
  if (labels !== undefined) {
    if (labels.length !== idx.size) {
      throw new RangeError(
        `cut: labels length (${labels.length}) must equal number of bins (${idx.size})`,
      );
    }
    return assignments.map((bin): Scalar => (bin === -1 ? null : (labels[bin] as string)));
  }
  // Default: interval string representation.
  return assignments.map((bin): Scalar => (bin === -1 ? null : idx.at(bin).toString()));
}

/** Shared core: assign bins and build result Series. */
function cutCore(
  nums: readonly number[],
  edges: readonly number[],
  inputIndex: Index<Label>,
  name: string | null,
  right: boolean,
  labels: readonly string[] | false | undefined,
  includeLowest: boolean,
): Series<Scalar> {
  const idx = buildIntervalIndex(edges, right);
  const assignments = assignBins(nums, idx, includeLowest, right);
  const data = resolveLabels(assignments, idx, labels);
  return new Series<Scalar>({ data, index: inputIndex, name });
}

// ─── public functions ──────────────────────────────────────────────────────

/**
 * Bin values into discrete intervals.
 *
 * Mirrors `pandas.cut()`.
 *
 * @param x - Input values (Series or plain array).
 * @param bins - Number of equal-width bins or explicit bin edges.
 * @param options - Optional configuration.
 * @returns A `Series<string | null>` (or integer codes when `labels=false`).
 *
 * @example
 * ```ts
 * cut(new Series({ data: [1, 2, 3, 4, 5] }), 2);
 * // Series: ["(0.995, 3.0]", "(0.995, 3.0]", …]
 *
 * cut(new Series({ data: [1, 2, 3, 4, 5] }), [0, 2, 5], { labels: ["low", "high"] });
 * // Series: ["low", "low", "high", "high", "high"]
 *
 * cut(new Series({ data: [1, 2, 3, 4, 5] }), 2, { labels: false });
 * // Series: [0, 0, 0, 1, 1]
 * ```
 */
export function cut(
  x: readonly Scalar[] | Series<Scalar>,
  bins: number | readonly number[],
  options?: CutOptions,
): Series<Scalar> {
  const right = options?.right ?? true;
  const labels = options?.labels;
  const includeLowest = options?.includeLowest ?? false;
  const duplicates = options?.duplicates ?? "raise";

  const nums = extractNums(x);
  const inputIndex = extractIndex(x, nums.length);
  const name = extractName(x);

  let edges: readonly number[];
  if (typeof bins === "number") {
    edges = equalWidthEdges(nums, bins);
  } else {
    if (bins.length < 2) {
      throw new RangeError("cut: bins array must have at least 2 elements");
    }
    edges = deduplicateEdges([...bins], duplicates);
  }

  return cutCore(nums, edges, inputIndex, name, right, labels, includeLowest);
}

// ─── qcut internals ────────────────────────────────────────────────────────

/** Compute a single quantile value at fraction `p` from a sorted array. */
function quantileAt(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) {
    return Number.NaN;
  }
  const pos = p * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) {
    return sorted[lo] as number;
  }
  return (sorted[lo] as number) + ((sorted[hi] as number) - (sorted[lo] as number)) * (pos - lo);
}

/** Build quantile edges from n equal quantiles or an array of fractions. */
function buildQuantileEdges(
  sorted: readonly number[],
  q: number | readonly number[],
): readonly number[] {
  if (typeof q === "number") {
    if (q < 2) {
      throw new RangeError(`qcut: q must be ≥ 2, got ${q}`);
    }
    return Array.from({ length: q + 1 }, (_, i): number => quantileAt(sorted, i / q));
  }
  if (q.length < 2) {
    throw new RangeError("qcut: q array must have at least 2 elements");
  }
  return q.map((p): number => quantileAt(sorted, p));
}

/**
 * Quantile-based binning.
 *
 * Mirrors `pandas.qcut()`.
 *
 * @param x - Input values (Series or plain array).
 * @param q - Number of quantiles or array of quantile fractions `[0, 1]`.
 * @param options - Optional configuration.
 * @returns A `Series<string | null>` (or integer codes when `labels=false`).
 *
 * @example
 * ```ts
 * qcut(new Series({ data: [1, 2, 3, 4, 5] }), 4);
 * // Splits into approximate quartiles.
 *
 * qcut(new Series({ data: [1, 2, 3, 4, 5] }), [0, 0.25, 0.5, 0.75, 1.0]);
 * // Explicit quantile fractions.
 * ```
 */
export function qcut(
  x: readonly Scalar[] | Series<Scalar>,
  q: number | readonly number[],
  options?: QCutOptions,
): Series<Scalar> {
  const labels = options?.labels;
  const duplicates = options?.duplicates ?? "raise";

  const nums = extractNums(x);
  const inputIndex = extractIndex(x, nums.length);
  const name = extractName(x);

  const finiteNums = nums.filter((v): v is number => Number.isFinite(v));
  if (finiteNums.length === 0) {
    throw new RangeError("qcut: no finite values in input");
  }
  const sorted = [...finiteNums].sort((a, b): number => a - b);

  const rawEdges = buildQuantileEdges(sorted, q);
  const edges = deduplicateEdges(rawEdges, duplicates);

  // qcut always uses right-closed intervals; first bin uses include_lowest behaviour.
  return cutCore(nums, edges, inputIndex, name, true, labels, true);
}

// ─── IntervalIndex helper ─────────────────────────────────────────────────

/**
 * Compute the `IntervalIndex` that corresponds to a `cut` operation.
 *
 * Useful when you need the bin definitions alongside the result.
 *
 * @example
 * ```ts
 * const idx = cutIntervalIndex([1,2,3,4,5], 2);
 * // IntervalIndex: [(0.995, 3.0], (3.0, 5.005]]
 * ```
 */
export function cutIntervalIndex(
  x: readonly Scalar[] | Series<Scalar>,
  bins: number | readonly number[],
  options?: Pick<CutOptions, "right" | "duplicates">,
): IntervalIndex {
  const right = options?.right ?? true;
  const duplicates = options?.duplicates ?? "raise";
  const nums = extractNums(x);

  let edges: readonly number[];
  if (typeof bins === "number") {
    edges = equalWidthEdges(nums, bins);
  } else {
    edges = deduplicateEdges([...bins], duplicates);
  }
  return buildIntervalIndex(edges, right);
}

/**
 * Compute the `IntervalIndex` that corresponds to a `qcut` operation.
 *
 * @example
 * ```ts
 * const idx = qcutIntervalIndex([1,2,3,4,5], 2);
 * ```
 */
export function qcutIntervalIndex(
  x: readonly Scalar[] | Series<Scalar>,
  q: number | readonly number[],
  options?: Pick<QCutOptions, "duplicates">,
): IntervalIndex {
  const duplicates = options?.duplicates ?? "raise";
  const nums = extractNums(x);
  const finiteNums = nums.filter((v): v is number => Number.isFinite(v));
  if (finiteNums.length === 0) {
    throw new RangeError("qcutIntervalIndex: no finite values in input");
  }
  const sorted = [...finiteNums].sort((a, b): number => a - b);
  const rawEdges = buildQuantileEdges(sorted, q);
  const edges = deduplicateEdges(rawEdges, duplicates);
  return buildIntervalIndex(edges, true);
}
