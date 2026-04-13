/**
 * cut / qcut — bin continuous data into discrete intervals.
 *
 * Mirrors `pandas.cut` and `pandas.qcut`:
 *
 * - {@link cut} — bin values into fixed-width or user-supplied bins.
 * - {@link qcut} — bin values into quantile-based bins of equal population.
 *
 * Both functions return a {@link BinResult} describing the assigned bin for
 * each input value, the ordered bin labels, the numeric bin edges, and (for
 * `qcut`) the actual quantile edges used.
 *
 * @example
 * ```ts
 * import { cut, qcut } from "tsb";
 *
 * const result = cut([1, 2, 3, 4, 5], 2);
 * result.codes;  // [0, 0, 0, 1, 1]
 * result.labels; // ["(1.0, 3.0]", "(3.0, 5.0]"]
 * result.bins;   // [1, 3, 5]
 *
 * const qr = qcut([1, 2, 3, 4, 5], 2);
 * qr.codes;  // [0, 0, 1, 1, 1]  (median split)
 * ```
 *
 * @module
 */

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Result of {@link cut} or {@link qcut}.
 *
 * - `codes` — integer bin index for each input value (`null` for NaN / missing).
 * - `labels` — ordered array of label strings (one per bin).
 * - `bins` — numeric bin edge array (length = `labels.length + 1`).
 */
export interface BinResult {
  /** Bin index for each input value. `null` when the value is NaN or out of range. */
  readonly codes: ReadonlyArray<number | null>;
  /** Ordered bin labels. */
  readonly labels: readonly string[];
  /** Bin edge array: `bins[i]` to `bins[i+1]` is the i-th bin. */
  readonly bins: readonly number[];
}

/** Options for {@link cut}. */
export interface CutOptions {
  /**
   * Custom labels for the resulting bins.
   * - Array of strings: one label per bin (length must equal number of bins).
   * - `false`: return integer codes directly (labels will be `["0","1",...]`).
   * - Omitted: auto-generate interval strings like `"(0.5, 1.5]"`.
   */
  readonly labels?: readonly string[] | false;
  /**
   * Whether intervals are closed on the right (default `true`).
   * - `true`  → `(a, b]`
   * - `false` → `[a, b)`
   */
  readonly right?: boolean;
  /**
   * When `true`, the leftmost interval is closed on the left as well
   * (default `false`).  Only meaningful when `right` is `true`.
   */
  readonly include_lowest?: boolean;
  /**
   * Number of decimal places in auto-generated interval labels (default `3`).
   */
  readonly precision?: number;
  /**
   * How to handle duplicate bin edges generated from data (default `"raise"`).
   * - `"raise"` — throw if duplicate edges are detected.
   * - `"drop"`  — silently remove duplicate edges.
   *
   * Only relevant when `bins` is an integer.
   */
  readonly duplicates?: "raise" | "drop";
}

/** Options for {@link qcut}. */
export interface QCutOptions {
  /**
   * Custom labels (same semantics as {@link CutOptions.labels}).
   */
  readonly labels?: readonly string[] | false;
  /**
   * Number of decimal places in auto-generated interval labels (default `3`).
   */
  readonly precision?: number;
  /**
   * How to handle duplicate quantile edges (default `"raise"`).
   */
  readonly duplicates?: "raise" | "drop";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Format a numeric edge to at most `precision` decimal places. */
function fmt(v: number, precision: number): string {
  return v
    .toFixed(precision)
    .replace(/\.?0+$/, "")
    .replace(/^-0$/, "0");
}

/** Build interval label string from two edges. */
function intervalLabel(lo: number, hi: number, right: boolean, precision: number): string {
  const left = right ? "(" : "[";
  const right_bracket = right ? "]" : ")";
  return `${left}${fmt(lo, precision)}, ${fmt(hi, precision)}${right_bracket}`;
}

/** Compute the k-th quantile (0–1) of a sorted (non-NaN) array using linear interpolation. */
function quantileOfSorted(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) {
    return Number.NaN;
  }
  if (q <= 0) {
    return sorted[0] as number;
  }
  if (q >= 1) {
    return sorted.at(-1) as number;
  }
  const idx = q * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) {
    return sorted[lo] as number;
  }
  const frac = idx - lo;
  return (sorted[lo] as number) * (1 - frac) + (sorted[hi] as number) * frac;
}

/** Deduplicate a sorted numeric array, optionally raising on duplicates. */
function deduplicateEdges(edges: number[], duplicates: "raise" | "drop"): number[] {
  const deduped: number[] = [edges[0] as number];
  for (let i = 1; i < edges.length; i++) {
    if ((edges[i] as number) === deduped.at(-1)) {
      if (duplicates === "raise") {
        throw new Error(
          `Duplicate bin edge ${edges[i]}. Pass duplicates="drop" to silently remove duplicates.`,
        );
      }
      // drop duplicate — skip
    } else {
      deduped.push(edges[i] as number);
    }
  }
  return deduped;
}

/** Assign each value to a bin index given sorted bin edges. */
function assignBins(
  values: readonly number[],
  edges: readonly number[],
  right: boolean,
  include_lowest: boolean,
): Array<number | null> {
  const n = edges.length - 1; // number of bins
  return values.map((v) => {
    if (!Number.isFinite(v) || Number.isNaN(v)) {
      return null;
    }
    // Binary search for the bin
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const binHi = edges[mid + 1] as number;
      const _binLo = edges[mid] as number;
      if (right) {
        // (binLo, binHi]
        if (v <= binHi) {
          hi = mid;
        } else {
          lo = mid + 1;
        }
      } else {
        // [binLo, binHi)
        if (v < binHi) {
          hi = mid;
        } else {
          lo = mid + 1;
        }
      }
    }
    // Validate the found bin
    const binLo = edges[lo] as number;
    const binHi = edges[lo + 1] as number;
    if (right) {
      // (binLo, binHi] — but first bin may be [binLo, binHi] if include_lowest
      if (v > binHi) {
        return null;
      }
      if (lo === 0 && include_lowest) {
        if (v < binLo) {
          return null;
        }
      } else if (v <= binLo) {
        return null;
      }
    } else {
      // [binLo, binHi)
      if (v < binLo || v >= binHi) {
        // Last bin includes the right edge
        if (lo === n - 1 && v === binHi) {
          return lo;
        }
        return null;
      }
    }
    return lo;
  });
}

// ─── cut ──────────────────────────────────────────────────────────────────────

/**
 * Bin values into discrete intervals.
 *
 * @param x      Array of numeric values to bin.
 * @param bins   Number of equal-width bins **or** an explicit array of
 *               monotonically increasing bin edges.
 * @param options  See {@link CutOptions}.
 * @returns      A {@link BinResult}.
 *
 * @example
 * ```ts
 * const { codes, labels } = cut([1, 2, 3, 4, 5], 2);
 * // codes  → [0, 0, 0, 1, 1]
 * // labels → ["(1.0, 3.0]", "(3.0, 5.0]"]
 * ```
 */
export function cut(
  x: readonly number[],
  bins: number | readonly number[],
  options: CutOptions = {},
): BinResult {
  const {
    labels: labelsOpt,
    right = true,
    include_lowest = false,
    precision = 3,
    duplicates = "raise",
  } = options;

  // ── build bin edges ─────────────────────────────────────────────────────────
  let edges: number[];
  if (typeof bins === "number") {
    if (bins < 1 || !Number.isInteger(bins)) {
      throw new Error("`bins` must be a positive integer when passed as a number.");
    }
    const finite = x.filter((v) => Number.isFinite(v));
    if (finite.length === 0) {
      throw new Error("Cannot cut empty or all-NaN array.");
    }
    const mn = Math.min(...finite);
    const mx = Math.max(...finite);
    if (mn === mx) {
      throw new Error("Cannot cut constant array (all values identical).");
    }
    const step = (mx - mn) / bins;
    edges = Array.from({ length: bins + 1 }, (_, i) => mn + i * step);
    // Slightly extend the lower edge so the minimum value is included
    edges[0] = mn - step * 0.001;
    edges = deduplicateEdges(edges, duplicates);
  } else {
    if (bins.length < 2) {
      throw new Error("At least 2 bin edges must be supplied.");
    }
    edges = [...bins];
    // Validate monotone
    for (let i = 1; i < edges.length; i++) {
      if ((edges[i] as number) <= (edges[i - 1] as number)) {
        throw new Error("Bin edges must be monotonically increasing.");
      }
    }
  }

  const numBins = edges.length - 1;

  // ── build labels ────────────────────────────────────────────────────────────
  let resolvedLabels: string[];
  if (labelsOpt === false) {
    resolvedLabels = Array.from({ length: numBins }, (_, i) => String(i));
  } else if (Array.isArray(labelsOpt)) {
    if (labelsOpt.length !== numBins) {
      throw new Error(
        `Length of labels (${labelsOpt.length}) must equal number of bins (${numBins}).`,
      );
    }
    resolvedLabels = [...labelsOpt];
  } else {
    resolvedLabels = Array.from({ length: numBins }, (_, i) => {
      const lo = edges[i] as number;
      const hi = edges[i + 1] as number;
      if (i === 0 && include_lowest && right) {
        // Show the leftmost bin as [lo, hi]
        return `[${fmt(lo, precision)}, ${fmt(hi, precision)}]`;
      }
      return intervalLabel(lo, hi, right, precision);
    });
  }

  // ── assign bins ─────────────────────────────────────────────────────────────
  const codes = assignBins(x, edges, right, include_lowest);

  return { codes, labels: resolvedLabels, bins: edges };
}

// ─── qcut ─────────────────────────────────────────────────────────────────────

/**
 * Quantile-based discretization.
 *
 * Bins values such that each bin contains (approximately) equal numbers of
 * observations, using linearly-interpolated quantiles.
 *
 * @param x  Array of numeric values to bin.
 * @param q  Number of quantile bins (integer ≥ 2) **or** an explicit array
 *           of quantile probabilities in [0, 1] (monotonically increasing).
 *           Common shorthand: `4` → quartiles, `10` → deciles.
 * @param options  See {@link QCutOptions}.
 * @returns  A {@link BinResult}.
 *
 * @example
 * ```ts
 * const { codes, labels } = qcut([1, 2, 3, 4, 5], 4);
 * // Quantile edges at 0%, 25%, 50%, 75%, 100% of [1..5]
 * ```
 */
export function qcut(
  x: readonly number[],
  q: number | readonly number[],
  options: QCutOptions = {},
): BinResult {
  const { labels: labelsOpt, precision = 3, duplicates = "raise" } = options;

  // ── build quantile probabilities ─────────────────────────────────────────
  let quantiles: number[];
  if (typeof q === "number") {
    if (q < 2 || !Number.isInteger(q)) {
      throw new Error("`q` must be an integer ≥ 2 when passed as a number.");
    }
    quantiles = Array.from({ length: q + 1 }, (_, i) => i / q);
  } else {
    quantiles = [...q];
    if (quantiles.length < 2) {
      throw new Error("At least 2 quantile probabilities must be supplied.");
    }
    for (let i = 1; i < quantiles.length; i++) {
      if ((quantiles[i] as number) <= (quantiles[i - 1] as number)) {
        throw new Error("Quantile probabilities must be monotonically increasing.");
      }
    }
    if ((quantiles[0] as number) < 0 || (quantiles.at(-1) as number) > 1) {
      throw new Error("Quantile probabilities must be in [0, 1].");
    }
  }

  // ── compute edges from sorted data ───────────────────────────────────────
  const finite = x.filter((v) => Number.isFinite(v) && !Number.isNaN(v));
  if (finite.length === 0) {
    throw new Error("Cannot qcut empty or all-NaN array.");
  }
  const sorted = [...finite].sort((a, b) => a - b);

  let edges: number[] = quantiles.map((p) => quantileOfSorted(sorted, p));

  // Deduplicate
  edges = deduplicateEdges(edges, duplicates);

  const numBins = edges.length - 1;
  if (numBins < 1) {
    throw new Error(
      'Not enough unique quantile edges. Try passing duplicates="drop" or reducing `q`.',
    );
  }

  // ── build labels ────────────────────────────────────────────────────────────
  let resolvedLabels: string[];
  if (labelsOpt === false) {
    resolvedLabels = Array.from({ length: numBins }, (_, i) => String(i));
  } else if (Array.isArray(labelsOpt)) {
    if (labelsOpt.length !== numBins) {
      throw new Error(
        `Length of labels (${labelsOpt.length}) must equal number of bins (${numBins}).`,
      );
    }
    resolvedLabels = [...labelsOpt];
  } else {
    resolvedLabels = Array.from({ length: numBins }, (_, i) => {
      const lo = edges[i] as number;
      const hi = edges[i + 1] as number;
      if (i === 0) {
        // First bin is always left-closed in qcut (pandas semantics)
        return `[${fmt(lo, precision)}, ${fmt(hi, precision)}]`;
      }
      return `(${fmt(lo, precision)}, ${fmt(hi, precision)}]`;
    });
  }

  // ── assign bins (qcut always uses right-closed, include_lowest) ──────────
  const codes = assignBins(x, edges, true, true);

  return { codes, labels: resolvedLabels, bins: edges };
}
