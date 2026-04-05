/**
 * rolling — sliding-window aggregations for Series.
 *
 * Mirrors `pandas.Series.rolling()`:
 * - `Rolling` — window aggregations for a single Series-like object.
 *
 * Supported aggregations: `mean`, `sum`, `std`, `var`, `min`, `max`, `count`,
 * `median`, `apply`.
 *
 * For DataFrame rolling, see `DataFrameRolling` in `core/frame.ts`.
 *
 * @module
 */

import type { Label, Scalar } from "../types.ts";
import type { Index } from "../core/base-index.ts";

// ─── public option types ──────────────────────────────────────────────────────

/** Options for {@link Rolling}. */
export interface RollingOptions {
  /**
   * Minimum number of valid (non-null / non-NaN) observations in a window
   * required to produce a non-null result.
   *
   * Defaults to the `window` size (matching pandas behaviour).
   */
  readonly minPeriods?: number;
  /**
   * Whether to centre the window label.  When `true` the window is symmetric
   * around each index position; when `false` (default) the window is trailing
   * (right-aligned).
   */
  readonly center?: boolean;
}

// ─── forward-declared Series type (avoids circular import) ────────────────────

/**
 * Minimal interface for the Series type needed by Rolling.
 * The real `Series<T>` class satisfies this interface.
 */
export interface RollingSeriesLike {
  readonly values: readonly Scalar[];
  readonly index: Index<Label>;
  readonly name: string | null;
  /** Create a new Series with the given data, preserving index and name. */
  withValues(data: readonly Scalar[], name?: string | null): RollingSeriesLike;
  /** Return the values as a plain array. */
  toArray(): readonly Scalar[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Extract the finite numeric values from a window slice. */
function validNums(slice: readonly Scalar[]): number[] {
  const out: number[] = [];
  for (const v of slice) {
    if (!isMissing(v) && typeof v === "number") {
      out.push(v);
    }
  }
  return out;
}

/** Trailing-window [start, end) bounds for position `i`. */
function trailingBounds(i: number, window: number, n: number): [number, number] {
  const start = Math.max(0, i - window + 1);
  const end = Math.min(n, i + 1);
  return [start, end];
}

/** Centered-window [start, end) bounds for position `i`. */
function centeredBounds(i: number, window: number, n: number): [number, number] {
  const half = Math.floor((window - 1) / 2);
  const start = Math.max(0, i - half);
  const end = Math.min(n, i + (window - half));
  return [start, end];
}

/** Choose trailing or centered bounds. */
function windowBounds(
  i: number,
  window: number,
  n: number,
  center: boolean,
): [number, number] {
  return center ? centeredBounds(i, window, n) : trailingBounds(i, window, n);
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

// ─── Rolling ──────────────────────────────────────────────────────────────────

/**
 * Sliding-window helper for a single {@link RollingSeriesLike} (typically a Series).
 *
 * Obtain via {@link Series.rolling}:
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * s.rolling(3).mean().toArray(); // [null, null, 2, 3, 4]
 * ```
 */
export class Rolling {
  private readonly _series: RollingSeriesLike;
  private readonly _window: number;
  private readonly _minPeriods: number;
  private readonly _center: boolean;

  /**
   * @param series  - Source Series (any dtype; non-numeric values treated as missing).
   * @param window  - Size of the moving window (must be a positive integer).
   * @param options - Optional {@link RollingOptions}.
   */
  constructor(series: RollingSeriesLike, window: number, options?: RollingOptions) {
    if (!Number.isInteger(window) || window < 1) {
      throw new RangeError(`Rolling window must be a positive integer, got ${window}`);
    }
    this._series = series;
    this._window = window;
    this._minPeriods = options?.minPeriods ?? window;
    this._center = options?.center ?? false;
  }

  // ─── core engine ────────────────────────────────────────────────────────────

  /**
   * Apply an aggregation function to each window slice, returning a new Series.
   *
   * @param agg - Receives the valid numeric values in the current window.
   */
  private _applyAgg(agg: (nums: number[]) => Scalar): RollingSeriesLike {
    const vals = this._series.values;
    const n = vals.length;
    const result: Scalar[] = Array.from({ length: n }, (): Scalar => null);

    for (let i = 0; i < n; i++) {
      const [start, end] = windowBounds(i, this._window, n, this._center);
      const slice = vals.slice(start, end);
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

  /** Rolling arithmetic mean. */
  mean(): RollingSeriesLike {
    return this._applyAgg((nums) => numMean(nums));
  }

  /** Rolling sum. */
  sum(): RollingSeriesLike {
    return this._applyAgg((nums) => numSum(nums));
  }

  /**
   * Rolling standard deviation.
   *
   * @param ddof - Delta degrees of freedom (default: `1` — sample std, same as pandas).
   */
  std(ddof = 1): RollingSeriesLike {
    return this._applyAgg((nums) => {
      const v = numVar(nums, ddof);
      return Number.isNaN(v) ? null : Math.sqrt(v);
    });
  }

  /**
   * Rolling variance.
   *
   * @param ddof - Delta degrees of freedom (default: `1` — sample variance).
   */
  var(ddof = 1): RollingSeriesLike {
    return this._applyAgg((nums) => {
      const v = numVar(nums, ddof);
      return Number.isNaN(v) ? null : v;
    });
  }

  /** Rolling minimum. */
  min(): RollingSeriesLike {
    return this._applyAgg((nums) => Math.min(...nums));
  }

  /** Rolling maximum. */
  max(): RollingSeriesLike {
    return this._applyAgg((nums) => Math.max(...nums));
  }

  /**
   * Rolling count of non-null, non-NaN values.
   *
   * Note: `count()` ignores `minPeriods` — it always returns the actual valid count.
   * This matches pandas `Rolling.count()` behaviour.
   */
  count(): RollingSeriesLike {
    const vals = this._series.values;
    const n = vals.length;
    const result: Scalar[] = Array.from({ length: n }, (): Scalar => null);

    for (let i = 0; i < n; i++) {
      const [start, end] = windowBounds(i, this._window, n, this._center);
      const slice = vals.slice(start, end);
      result[i] = validNums(slice).length;
    }

    return this._series.withValues(result);
  }

  /** Rolling median. */
  median(): RollingSeriesLike {
    return this._applyAgg((nums) => numMedian(nums));
  }

  /**
   * Apply a custom aggregation function over each window.
   *
   * @param fn - Receives the valid numeric values for the window and must return a number.
   *             Called only when the window meets `minPeriods`.
   */
  apply(fn: (values: readonly number[]) => number): RollingSeriesLike {
    return this._applyAgg((nums) => fn(nums));
  }
}
