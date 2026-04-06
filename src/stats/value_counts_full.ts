/**
 * valueCountsBinned — `Series.value_counts(bins=N)` for numeric data.
 *
 * Extends the basic `valueCounts` with a `bins` parameter that partitions
 * numeric values into equal-width intervals before counting, mirroring
 * `pandas.Series.value_counts(bins=N)`.
 *
 * ```
 * pd.Series([1,2,3,4,5]).value_counts(bins=2)
 * (0.996, 3.0]    3
 * (3.0, 5.0]      2
 * dtype: int64
 * ```
 *
 * @module
 */

import type { Scalar } from "../types.ts";
import { Series } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Dtype } from "../core/index.ts";
import { cut, cutIntervalIndex } from "./cut.ts";

// ─── types ────────────────────────────────────────────────────────────────────

/** Options for {@link valueCountsBinned}. */
export interface ValueCountsBinnedOptions {
  /**
   * If `true` (default), sort results by frequency (highest first unless
   * `ascending=true`). If `false`, sort by interval position (left edge
   * ascending).
   * @defaultValue `true`
   */
  readonly sort?: boolean;
  /**
   * Sort direction when `sort=true`.
   * @defaultValue `false` (descending — highest count first)
   */
  readonly ascending?: boolean;
  /**
   * If `true`, return relative frequencies (proportions) instead of counts.
   * @defaultValue `false`
   */
  readonly normalize?: boolean;
}

// ─── implementation ──────────────────────────────────────────────────────────

/**
 * Count values in a numeric Series after binning into equal-width intervals.
 *
 * Mirrors `pandas.Series.value_counts(bins=N)`:
 * - Internally calls `cut(series, bins)` to assign each value to a bin.
 * - Missing / out-of-range values are always excluded from the result.
 * - Returns a `Series<number>` indexed by interval-label strings.
 *
 * @param series - Numeric Series to bin and count.
 * @param bins   - Number of equal-width bins.
 * @param options - Optional configuration.
 * @returns `Series<number>` of counts (or proportions when `normalize=true`).
 *
 * @example
 * ```ts
 * import { Series, valueCountsBinned } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * const vc = valueCountsBinned(s, 2);
 * // Index:  ["(0.995, 3.0]", "(3.0, 5.005]"]
 * // Values: [3, 2]
 * ```
 */
export function valueCountsBinned(
  series: Series<Scalar>,
  bins: number,
  options?: ValueCountsBinnedOptions,
): Series<number> {
  const sort = options?.sort ?? true;
  const ascending = options?.ascending ?? false;
  const normalize = options?.normalize ?? false;

  // Step 1: build the ordered interval labels via IntervalIndex
  const intervalIdx = cutIntervalIndex(series, bins);
  // interval labels in positional order (left edge ascending)
  const orderedLabels: string[] = Array.from(
    { length: intervalIdx.left.length },
    (_, i): string => {
      const lo = intervalIdx.left[i] as number;
      const hi = intervalIdx.right[i] as number;
      const cl = intervalIdx.closed;
      const lParen = cl === "left" || cl === "both" ? "[" : "(";
      const rParen = cl === "right" || cl === "both" ? "]" : ")";
      return `${lParen}${lo}, ${hi}${rParen}`;
    },
  );

  // Step 2: cut the series to assign each value to a bin label
  const binned = cut(series, bins) as Series<string | null>;

  // Step 3: count occurrences per label (NaN/null → excluded)
  const countMap = new Map<string, number>();
  for (const lbl of orderedLabels) {
    countMap.set(lbl, 0);
  }
  for (const v of binned.values) {
    if (v !== null && v !== undefined) {
      const prev = countMap.get(v) ?? 0;
      countMap.set(v, prev + 1);
    }
  }

  // Step 4: build result pairs [label, count]
  let pairs: Array<[string, number]> = orderedLabels.map(
    (lbl): [string, number] => [lbl, countMap.get(lbl) ?? 0],
  );

  // Step 5: optionally sort by count
  if (sort) {
    pairs.sort((a, b): number => {
      const diff = (b[1] as number) - (a[1] as number); // descending by default
      return ascending ? -diff : diff;
    });
  } else if (ascending) {
    // sort=false but ascending=true → reverse interval order
    pairs = pairs.slice().reverse();
  }
  // sort=false, ascending=false → keep natural interval order (already in pairs)

  // Step 6: apply normalisation
  const total = pairs.reduce((s, [, c]) => s + c, 0);
  const divisor = normalize && total > 0 ? total : 1;

  const labels: string[] = pairs.map(([lbl]) => lbl);
  const values: number[] = pairs.map(([, c]) => c / divisor);

  return new Series<number>({
    data: values,
    index: new Index<string>(labels),
    name: series.name,
    dtype: normalize ? Dtype.float64 : Dtype.int64,
  });
}
