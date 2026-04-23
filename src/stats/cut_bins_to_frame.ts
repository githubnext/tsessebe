/**
 * cutBinsToFrame — summarise the bins produced by `cut` or `qcut` as a DataFrame.
 *
 * Given a {@link BinResult} (as returned by {@link cut} or {@link qcut}) and an
 * optional array of original data values, `cutBinsToFrame` builds a tidy
 * summary DataFrame with one row per bin and the following columns:
 *
 * | column      | description                                               |
 * |-------------|-----------------------------------------------------------|
 * | `bin`       | bin label string (e.g. `"(0.0, 1.0]"`)                   |
 * | `left`      | lower (left) bin edge                                     |
 * | `right`     | upper (right) bin edge                                    |
 * | `count`     | number of observations that fell in each bin              |
 * | `frequency` | proportion of observations (`count / total`)              |
 *
 * When no `data` argument is supplied `count` and `frequency` are both `0`.
 *
 * @example
 * ```ts
 * import { cut, cutBinsToFrame } from "tsb";
 *
 * const result = cut([1, 2, 3, 4, 5], 2);
 * const df = cutBinsToFrame(result);
 * // df.columns → ["bin", "left", "right", "count", "frequency"]
 * // df.shape   → [2, 5]
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { BinResult } from "./cut_qcut.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link cutBinsToFrame}. */
export interface CutBinsToFrameOptions {
  /**
   * Original data values used to compute bin counts.
   * When provided, `count` and `frequency` columns are populated.
   * @default []
   */
  readonly data?: readonly (number | null | undefined)[];
}

// ─── implementation ───────────────────────────────────────────────────────────

/**
 * Convert a {@link BinResult} into a summary DataFrame.
 *
 * @param result  Result of {@link cut} or {@link qcut}.
 * @param options See {@link CutBinsToFrameOptions}.
 */
export function cutBinsToFrame(result: BinResult, options: CutBinsToFrameOptions = {}): DataFrame {
  const { data = [] } = options;

  const { labels, bins, codes } = result;
  const numBins = labels.length;

  // ── bin edges ────────────────────────────────────────────────────────────────
  const leftEdges: number[] = [];
  const rightEdges: number[] = [];
  for (let i = 0; i < numBins; i++) {
    leftEdges.push(bins[i] as number);
    rightEdges.push(bins[i + 1] as number);
  }

  // ── counts ────────────────────────────────────────────────────────────────────
  const counts: number[] = Array.from({ length: numBins }, () => 0);

  // Count using supplied codes array (same length as data)
  const codeSource: ReadonlyArray<number | null> =
    data.length > 0 ? codes : ([] as Array<number | null>);

  let total = 0;
  for (const code of codeSource) {
    if (code !== null && code >= 0 && code < numBins) {
      (counts[code] as number)++;
      total++;
    }
  }

  // ── frequency ─────────────────────────────────────────────────────────────────
  const frequencies: number[] = counts.map((c) => (total > 0 ? c / total : 0));

  return DataFrame.fromColumns({
    bin: labels as readonly string[],
    left: leftEdges,
    right: rightEdges,
    count: counts,
    frequency: frequencies,
  });
}

// ─── cutBinCounts ─────────────────────────────────────────────────────────────

/**
 * Return the per-bin observation counts from a {@link BinResult} as a plain
 * `Record<string, number>` mapping label → count.
 *
 * This is a lightweight alternative to {@link cutBinsToFrame} when you only
 * need the count dictionary and not the full DataFrame.
 *
 * @example
 * ```ts
 * import { cut, cutBinCounts } from "tsb";
 *
 * const result = cut([1, 2, 3, 4, 5], 2);
 * cutBinCounts(result);
 * // { "(1.0, 3.0]": 3, "(3.0, 5.0]": 2 }
 * ```
 */
export function cutBinCounts(result: BinResult): Record<string, number> {
  const { labels, codes } = result;
  const out: Record<string, number> = {};
  for (const label of labels) {
    out[label] = 0;
  }
  for (const code of codes) {
    if (code !== null) {
      const label = labels[code];
      if (label !== undefined) {
        out[label] = (out[label] as number) + 1;
      }
    }
  }
  return out;
}

// ─── binEdges ────────────────────────────────────────────────────────────────

/**
 * Extract a DataFrame of bin edges and labels from a {@link BinResult}.
 *
 * Produces a two-column DataFrame with `left` and `right` columns indexed
 * by the bin label.
 *
 * @example
 * ```ts
 * import { cut, binEdges } from "tsb";
 *
 * const result = cut([1, 2, 3, 4, 5], 2);
 * const edges = binEdges(result);
 * // edges.index → Index ["(1.0, 3.0]", "(3.0, 5.0]"]
 * // edges.columns → ["left", "right"]
 * ```
 */
export function binEdges(result: BinResult): DataFrame {
  const { labels, bins } = result;
  const numBins = labels.length;
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i < numBins; i++) {
    left.push(bins[i] as number);
    right.push(bins[i + 1] as number);
  }
  return DataFrame.fromColumns({ left, right }, { index: labels as unknown as number[] });
}
