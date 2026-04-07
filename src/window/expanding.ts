/**
 * expanding — unbounded growing-window aggregations for Series.
 *
 * Mirrors `pandas.Series.expanding()`:
 * - `Expanding` — window grows from the start of the series to the current position.
 *
 * Supported aggregations: `mean`, `sum`, `std`, `var`, `min`, `max`, `count`,
 * `median`, `apply`.
 *
 * For DataFrame expanding, see `DataFrameExpanding` in `core/frame.ts`.
 *
 * @module
 */

import type { Index } from "../core/base-index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public option types ──────────────────────────────────────────────────────

/** Options for {@link Expanding}. */
export interface ExpandingOptions {
  /**
   * Minimum number of valid (non-null / non-NaN) observations required to
   * produce a non-null result.
   *
   * Defaults to `1` (matching pandas behaviour — single observation is enough).
   */
  readonly minPeriods?: number;
}

// ─── forward-declared Series type (avoids circular import) ────────────────────

/**
 * Minimal interface for the Series type needed by Expanding.
 * The real `Series<T>` class satisfies this interface.
 */
export interface ExpandingSeriesLike {
  readonly values: readonly Scalar[];
  readonly index: Index<Label>;
  readonly name: string | null;
  /** Create a new Series with the given data, preserving index and name. */
  withValues(data: readonly Scalar[], name?: string | null): ExpandingSeriesLike;
  /** Return the values as a plain array. */
  toArray(): readonly Scalar[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Extract the finite numeric values from a slice. */
function validNums(slice: readonly Scalar[]): number[] {
  const out: number[] = [];
  for (const v of slice) {
    if (!isMissing(v) && typeof v === "number") {
      out.push(v);
    }
  }
  return out;
}

/** Sum of a numeric array. */
function numSum(nums: readonly number[]): number {
  let s = 0;
  for (const v of nums) {
    s += v;
  }
  return s;
}

/** Mean of a non-empty numeric array. */
function numMean(nums: readonly number[]): number {
  return numSum(nums) / nums.length;
}

/** Variance of a numeric array with the given ddof. */
function numVar(nums: readonly number[], ddof: number): number {
  if (nums.length - ddof <= 0) {
    return Number.NaN;
  }
  const m = numMean(nums);
  const ss = nums.reduce((acc, v) => acc + (v - m) ** 2, 0);
  return ss / (nums.length - ddof);
}

/** Median of a numeric array (does NOT mutate input). */
function numMedian(nums: readonly number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid] as number;
  }
  return ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

// ─── Expanding ────────────────────────────────────────────────────────────────

/**
 * Growing-window helper for a single {@link ExpandingSeriesLike} (typically a Series).
 *
 * Unlike {@link Rolling}, which uses a fixed-size window, `Expanding` accumulates
 * all observations from the beginning of the series up to and including the
 * current position.
 *
 * Obtain via {@link Series.expanding}:
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * s.expanding().mean().toArray();  // [1, 1.5, 2, 2.5, 3]
 * s.expanding(2).sum().toArray();  // [null, 3, 6, 10, 15]
 * ```
 */
export class Expanding {
  private readonly _series: ExpandingSeriesLike;
  private readonly _minPeriods: number;

  /**
   * @param series  - Source Series (any dtype; non-numeric values treated as missing).
   * @param options - Optional {@link ExpandingOptions}.
   */
  constructor(series: ExpandingSeriesLike, options?: ExpandingOptions) {
    this._series = series;
    this._minPeriods = options?.minPeriods ?? 1;
  }

  // ─── core engine ────────────────────────────────────────────────────────────

  /**
   * Apply an aggregation function to the expanding window ending at each index,
   * returning a new Series.
   *
   * @param agg - Receives the valid numeric values in the expanding window.
   */
  private _applyAgg(agg: (nums: number[]) => Scalar): ExpandingSeriesLike {
    const vals = this._series.values;
    const n = vals.length;
    const result: Scalar[] = Array.from({ length: n }, (): Scalar => null);

    for (let i = 0; i < n; i++) {
      const slice = vals.slice(0, i + 1);
      const nums = validNums(slice);
      if (nums.length < this._minPeriods) {
        result[i] = null;
      } else {
        result[i] = agg(nums);
      }
    }

    return this._series.withValues(result);
  }

  // ─── aggregation methods ─────────────────────────────────────────────────

  /** Expanding arithmetic mean. */
  mean(): ExpandingSeriesLike {
    return this._applyAgg((nums) => numMean(nums));
  }

  /** Expanding sum. */
  sum(): ExpandingSeriesLike {
    return this._applyAgg((nums) => numSum(nums));
  }

  /**
   * Expanding standard deviation.
   *
   * @param ddof - Delta degrees of freedom (default: `1` — sample std, same as pandas).
   */
  std(ddof = 1): ExpandingSeriesLike {
    return this._applyAgg((nums) => {
      const v = numVar(nums, ddof);
      return Number.isNaN(v) ? null : Math.sqrt(v);
    });
  }

  /**
   * Expanding variance.
   *
   * @param ddof - Delta degrees of freedom (default: `1` — sample variance).
   */
  var(ddof = 1): ExpandingSeriesLike {
    return this._applyAgg((nums) => {
      const v = numVar(nums, ddof);
      return Number.isNaN(v) ? null : v;
    });
  }

  /** Expanding minimum. */
  min(): ExpandingSeriesLike {
    return this._applyAgg((nums) => Math.min(...nums));
  }

  /** Expanding maximum. */
  max(): ExpandingSeriesLike {
    return this._applyAgg((nums) => Math.max(...nums));
  }

  /**
   * Count of non-null, non-NaN values in the expanding window.
   *
   * Note: `count()` ignores `minPeriods` — it always returns the actual valid count.
   * This matches pandas `Expanding.count()` behaviour.
   */
  count(): ExpandingSeriesLike {
    const vals = this._series.values;
    const n = vals.length;
    const result: Scalar[] = Array.from({ length: n }, (): Scalar => null);

    for (let i = 0; i < n; i++) {
      const slice = vals.slice(0, i + 1);
      result[i] = validNums(slice).length;
    }

    return this._series.withValues(result);
  }

  /** Expanding median. */
  median(): ExpandingSeriesLike {
    return this._applyAgg((nums) => numMedian(nums));
  }

  /**
   * Apply a custom aggregation function over each expanding window.
   *
   * @param fn - Receives the valid numeric values for the window and must return a number.
   *             Called only when the window meets `minPeriods`.
   */
  apply(fn: (values: readonly number[]) => number): ExpandingSeriesLike {
    return this._applyAgg((nums) => fn(nums));
  }
}
