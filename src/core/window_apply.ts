/**
 * window_apply — apply arbitrary functions over rolling / expanding windows.
 *
 * Mirrors pandas' `Series.rolling(n).apply(fn)` and
 * `Series.expanding().apply(fn)` APIs.
 *
 * - `rollingApply` — sliding window of fixed size
 * - `expandingApply` — growing window from the start
 * - `dataFrameRollingApply` — column-wise rolling apply on a DataFrame
 * - `dataFrameExpandingApply` — column-wise expanding apply on a DataFrame
 *
 * @example
 * ```ts
 * import { rollingApply, expandingApply } from "tsb";
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * // geometric mean over window of 3
 * const gmean = rollingApply(s, 3, (w) => Math.exp(w.reduce((a, x) => a + Math.log(x), 0) / w.length));
 * ```
 *
 * @module
 */

import type { Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for rolling-apply. */
export interface RollingApplyOptions {
  /**
   * Minimum number of non-null observations required to compute a result.
   * Default: same as `window`.
   */
  minPeriods?: number;
  /**
   * Whether to centre the window (symmetric around `i`).
   * Default: `false` (trailing window).
   */
  center?: boolean;
}

/** Options for expanding-apply. */
export interface ExpandingApplyOptions {
  /**
   * Minimum number of observations required to compute a result.
   * Default: `1`.
   */
  minPeriods?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a Scalar is considered missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Compute window start index for trailing / centred windows. */
function windowStart(i: number, window: number, center: boolean): number {
  if (center) {
    return Math.max(0, i - Math.floor((window - 1) / 2));
  }
  return Math.max(0, i - window + 1);
}

/** Compute window end index for trailing / centred windows. */
function windowEnd(i: number, n: number, window: number, center: boolean): number {
  if (center) {
    return Math.min(n - 1, i + (window - 1 - Math.floor((window - 1) / 2)));
  }
  return i;
}

/** Extract numeric values from data[start..end] (inclusive). */
function sliceNums(data: readonly Scalar[], start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) {
    const v = data[i];
    if (v !== undefined && !isMissing(v) && typeof v === "number") {
      out.push(v);
    }
  }
  return out;
}

// ─── Series apply ─────────────────────────────────────────────────────────────

/**
 * Apply a function over a rolling window of a Series.
 *
 * @param s        - Input Series (must contain numeric values).
 * @param window   - Window size (number of observations).
 * @param fn       - Function applied to each window of non-null numerics.
 *                   Returns `null` when the window has fewer than `minPeriods`
 *                   valid observations.
 * @param options  - Optional rolling configuration.
 * @returns A new Series of the same length with the applied values.
 *
 * @example
 * ```ts
 * import { rollingApply } from "tsb";
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * const result = rollingApply(s, 3, (w) => w[0]! + w[w.length - 1]!);
 * ```
 */
export function rollingApply(
  s: Series,
  window: number,
  fn: (window: readonly number[]) => number,
  options: RollingApplyOptions = {},
): Series {
  if (window < 1) {
    throw new RangeError(`rollingApply: window must be >= 1, got ${window}`);
  }

  const center = options.center ?? false;
  const minPeriods = options.minPeriods ?? window;
  const data = s.values as readonly Scalar[];
  const n = data.length;
  const result: (number | null)[] = [];

  for (let i = 0; i < n; i++) {
    const start = windowStart(i, window, center);
    const end = windowEnd(i, n, window, center);
    const nums = sliceNums(data, start, end);
    result.push(nums.length >= minPeriods ? fn(nums) : null);
  }

  return new Series({ data: result as Scalar[], index: s.index, name: s.name ?? null });
}

/**
 * Apply a function over an expanding window of a Series.
 *
 * At position `i`, the window covers all observations from index `0` to `i`
 * (inclusive). The function is applied to the non-null numeric values in
 * the window.
 *
 * @param s        - Input Series (must contain numeric values).
 * @param fn       - Function applied to each growing window of non-null numerics.
 * @param options  - Optional expanding configuration.
 * @returns A new Series of the same length with the applied values.
 *
 * @example
 * ```ts
 * import { expandingApply } from "tsb";
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * // running product
 * const prod = expandingApply(s, (w) => w.reduce((a, x) => a * x, 1));
 * ```
 */
export function expandingApply(
  s: Series,
  fn: (window: readonly number[]) => number,
  options: ExpandingApplyOptions = {},
): Series {
  const minPeriods = options.minPeriods ?? 1;
  const data = s.values as readonly Scalar[];
  const n = data.length;
  const result: (number | null)[] = [];

  for (let i = 0; i < n; i++) {
    const nums = sliceNums(data, 0, i);
    result.push(nums.length >= minPeriods ? fn(nums) : null);
  }

  return new Series({ data: result as Scalar[], index: s.index, name: s.name ?? null });
}

// ─── DataFrame apply ──────────────────────────────────────────────────────────

/**
 * Apply a function over a rolling window on each column of a DataFrame.
 *
 * @param df       - Input DataFrame.
 * @param window   - Window size.
 * @param fn       - Function applied to each window slice.
 * @param options  - Optional rolling configuration.
 * @returns A new DataFrame with the same columns and index.
 *
 * @example
 * ```ts
 * import { dataFrameRollingApply } from "tsb";
 * const result = dataFrameRollingApply(df, 3, (w) => w.reduce((a, x) => a + x, 0));
 * ```
 */
export function dataFrameRollingApply(
  df: DataFrame,
  window: number,
  fn: (window: readonly number[]) => number,
  options: RollingApplyOptions = {},
): DataFrame {
  const colData: Record<string, Scalar[]> = {};
  for (const col of df.columns.values) {
    const name = String(col);
    const colSeries = df.col(name);
    if (colSeries !== undefined) {
      colData[name] = rollingApply(colSeries, window, fn, options).values as Scalar[];
    }
  }
  return DataFrame.fromColumns(colData);
}

/**
 * Apply a function over an expanding window on each column of a DataFrame.
 *
 * @param df       - Input DataFrame.
 * @param fn       - Function applied to each growing window.
 * @param options  - Optional expanding configuration.
 * @returns A new DataFrame with the same columns and index.
 *
 * @example
 * ```ts
 * import { dataFrameExpandingApply } from "tsb";
 * const cumProd = dataFrameExpandingApply(df, (w) => w.reduce((a, x) => a * x, 1));
 * ```
 */
export function dataFrameExpandingApply(
  df: DataFrame,
  fn: (window: readonly number[]) => number,
  options: ExpandingApplyOptions = {},
): DataFrame {
  const colData: Record<string, Scalar[]> = {};
  for (const col of df.columns.values) {
    const name = String(col);
    const colSeries = df.col(name);
    if (colSeries !== undefined) {
      colData[name] = expandingApply(colSeries, fn, options).values as Scalar[];
    }
  }
  return DataFrame.fromColumns(colData);
}
