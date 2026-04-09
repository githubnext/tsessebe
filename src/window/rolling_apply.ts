/**
 * rolling_apply — standalone rolling-window apply and multi-aggregation.
 *
 * Mirrors the flexibility of `pandas.core.window.Rolling.apply()` with
 * additional utilities not available on the Rolling class:
 *
 * - {@link rollingApply} — apply a custom function over each window of a
 *   Series, with `raw` mode support (pass all window values including null/NaN
 *   vs. only valid numbers).
 * - {@link rollingAgg} — apply multiple named aggregation functions in a
 *   single pass, returning a DataFrame keyed by function name.
 * - {@link dataFrameRollingApply} — apply a custom function per-column across
 *   a DataFrame.
 * - {@link dataFrameRollingAgg} — apply multiple named aggregation functions
 *   per-column across a DataFrame.
 *
 * ### raw vs. filtered mode
 *
 * By default (`raw: false`) the aggregation function receives only the **valid
 * (non-null, non-NaN) numeric values** in the current window — matching the
 * default `raw=True` behaviour of `pandas.Rolling.apply` with NaN values
 * already stripped.  With `raw: true` the function receives the **full window
 * slice** including `null`/`undefined`/`NaN` entries (as `null`), giving the
 * aggregation full control over missing-value handling.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public option types ──────────────────────────────────────────────────────

/** Options for {@link rollingApply} and {@link dataFrameRollingApply}. */
export interface RollingApplyOptions {
  /**
   * Minimum number of valid (non-null/NaN) observations required to produce a
   * non-null result.
   *
   * Defaults to `window` (same as `pandas.Rolling` behaviour).
   */
  readonly minPeriods?: number;
  /**
   * Whether to centre the window.  When `true` the window is symmetric around
   * each index position; when `false` (default) the window is trailing.
   */
  readonly center?: boolean;
  /**
   * When `true`, the aggregation function receives the **full** window slice
   * including `null`/`NaN` values (represented as `null`).  When `false`
   * (default), only the valid numeric values are passed.
   */
  readonly raw?: boolean;
}

/** Options for {@link rollingAgg} and {@link dataFrameRollingAgg}. */
export type RollingAggOptions = Omit<RollingApplyOptions, "raw">;

/** A named map of aggregation functions for {@link rollingAgg}. */
export type AggFunctions = Record<string, (values: readonly number[]) => number>;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a Scalar is missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Extract the numeric values from a window slice, excluding missing entries. */
function validNums(slice: readonly Scalar[]): number[] {
  const out: number[] = [];
  for (const v of slice) {
    if (!isMissing(v) && typeof v === "number") {
      out.push(v);
    }
  }
  return out;
}

/** Convert a raw window slice to `null`-substituted numeric array. */
function rawWindow(slice: readonly Scalar[]): (number | null)[] {
  return slice.map((v): number | null => {
    if (isMissing(v)) return null;
    if (typeof v === "number") return v;
    return null;
  });
}

/** Trailing-window [start, end) indices for position `i`. */
function trailingBounds(i: number, window: number, n: number): [number, number] {
  return [Math.max(0, i - window + 1), Math.min(n, i + 1)];
}

/** Centred-window [start, end) indices for position `i`. */
function centeredBounds(i: number, window: number, n: number): [number, number] {
  const half = Math.floor((window - 1) / 2);
  return [Math.max(0, i - half), Math.min(n, i + (window - half))];
}

/** Select trailing or centred window bounds. */
function bounds(i: number, window: number, n: number, center: boolean): [number, number] {
  return center ? centeredBounds(i, window, n) : trailingBounds(i, window, n);
}

// ─── core engine ──────────────────────────────────────────────────────────────

/**
 * Iterate over each position in `vals`, yielding the window's valid numeric
 * values (or, when `useRaw`, the raw slice with nulls).  Returns whether the
 * window met `minPeriods` and the processed window array.
 */
function* windowIterator(
  vals: readonly Scalar[],
  window: number,
  minPeriods: number,
  center: boolean,
  useRaw: boolean,
): Generator<{ met: boolean; nums: readonly number[]; raw: readonly (number | null)[] }> {
  const n = vals.length;
  for (let i = 0; i < n; i++) {
    const [start, end] = bounds(i, window, n, center);
    const slice = vals.slice(start, end);
    const nums = validNums(slice);
    const met = nums.length >= minPeriods;
    yield { met, nums, raw: useRaw ? rawWindow(slice) : [] };
  }
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Apply a custom aggregation function over a rolling window of a Series.
 *
 * This is the standalone counterpart to `series.rolling(w).apply(fn)`.  It
 * adds `raw` mode support and returns a `Series<number | null>` with the
 * original index and name preserved.
 *
 * @param series  - Input Series (numeric values only; non-numeric treated as missing).
 * @param window  - Window size (positive integer).
 * @param fn      - Aggregation function.  In default (`raw: false`) mode
 *                  receives only valid numeric values; in `raw: true` mode
 *                  receives the full window with nulls.
 * @param options - {@link RollingApplyOptions}.
 * @returns A new `Series<number | null>`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * rollingApply(s, 3, (w) => w.reduce((a, b) => a + b, 0) / w.length);
 * // Series([null, null, 2, 3, 4])
 * ```
 */
export function rollingApply(
  series: Series<Scalar>,
  window: number,
  fn: (values: readonly number[]) => number,
  options?: RollingApplyOptions,
): Series<number | null> {
  if (!Number.isInteger(window) || window < 1) {
    throw new RangeError(`window must be a positive integer, got ${window}`);
  }
  const minPeriods = options?.minPeriods ?? window;
  const center = options?.center ?? false;
  const useRaw = options?.raw ?? false;

  const vals = series.values;
  const result: (number | null)[] = [];

  for (const { met, nums, raw } of windowIterator(vals, window, minPeriods, center, useRaw)) {
    if (!met) {
      result.push(null);
    } else if (useRaw) {
      const validOnly = (raw as readonly (number | null)[]).filter(
        (v): v is number => v !== null,
      );
      result.push(fn(validOnly));
    } else {
      result.push(fn(nums));
    }
  }

  return new Series<number | null>({
    data: result,
    index: series.index as Index<Label>,
    name: series.name,
  });
}

/**
 * Apply multiple named aggregation functions over a rolling window of a
 * Series, returning a DataFrame where each column corresponds to one
 * aggregation function.
 *
 * Mirrors `pandas.Series.rolling(w).agg({"mean": np.mean, "std": np.std})`.
 *
 * @param series  - Input Series.
 * @param window  - Window size (positive integer).
 * @param fns     - Named map of aggregation functions (each receives valid
 *                  numeric values in the window).
 * @param options - {@link RollingAggOptions}.
 * @returns A `DataFrame` with one column per function in `fns`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * rollingAgg(s, 3, {
 *   mean: (w) => w.reduce((a, b) => a + b, 0) / w.length,
 *   max:  (w) => Math.max(...w),
 * });
 * // DataFrame with columns "mean" and "max"
 * ```
 */
export function rollingAgg(
  series: Series<Scalar>,
  window: number,
  fns: AggFunctions,
  options?: RollingAggOptions,
): DataFrame {
  if (!Number.isInteger(window) || window < 1) {
    throw new RangeError(`window must be a positive integer, got ${window}`);
  }
  const minPeriods = options?.minPeriods ?? window;
  const center = options?.center ?? false;

  const fnEntries = Object.entries(fns);
  const cols: Map<string, (number | null)[]> = new Map(fnEntries.map(([k]) => [k, []]));
  const vals = series.values;

  for (const { met, nums } of windowIterator(vals, window, minPeriods, center, false)) {
    for (const [name, fn] of fnEntries) {
      const col = cols.get(name) as (number | null)[];
      col.push(met ? fn(nums) : null);
    }
  }

  const colMap = new Map<string, Series<Scalar>>();
  for (const [name, data] of cols) {
    colMap.set(
      name,
      new Series<Scalar>({
        data,
        index: series.index as Index<Label>,
        name,
      }),
    );
  }
  return new DataFrame(colMap, series.index as Index<Label>);
}

/**
 * Apply a custom aggregation function over a rolling window for each column of
 * a DataFrame.
 *
 * @param df      - Input DataFrame.
 * @param window  - Window size (positive integer).
 * @param fn      - Aggregation function receiving valid numeric values.
 * @param options - {@link RollingApplyOptions}.
 * @returns A new `DataFrame` with the same shape as `df`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * dataFrameRollingApply(df, 2, (w) => w[w.length - 1] - w[0]);
 * // DataFrame with pairwise diff per column
 * ```
 */
export function dataFrameRollingApply(
  df: DataFrame,
  window: number,
  fn: (values: readonly number[]) => number,
  options?: RollingApplyOptions,
): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const colName of df.columns.values) {
    const col = df.col(colName);
    const result = rollingApply(col, window, fn, options);
    colMap.set(colName, result as Series<Scalar>);
  }
  return new DataFrame(colMap, df.index);
}

/**
 * Apply multiple named aggregation functions over a rolling window for each
 * column of a DataFrame.
 *
 * Each column produces a sub-DataFrame of results.  All sub-DataFrames are
 * concatenated horizontally, with column names formatted as `{col}_{aggName}`.
 *
 * @param df      - Input DataFrame.
 * @param window  - Window size (positive integer).
 * @param fns     - Named map of aggregation functions.
 * @param options - {@link RollingAggOptions}.
 * @returns A `DataFrame` with columns `{col}_{aggName}` for every combination.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ x: [1, 2, 3, 4], y: [5, 6, 7, 8] });
 * dataFrameRollingAgg(df, 2, { mean: avg, sum: s });
 * // columns: "x_mean", "x_sum", "y_mean", "y_sum"
 * ```
 */
export function dataFrameRollingAgg(
  df: DataFrame,
  window: number,
  fns: AggFunctions,
  options?: RollingAggOptions,
): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  const fnEntries = Object.entries(fns);

  for (const colName of df.columns.values) {
    const col = df.col(colName);
    const aggDf = rollingAgg(col, window, fns, options);

    for (const [aggName] of fnEntries) {
      const key = `${colName}_${aggName}`;
      colMap.set(key, aggDf.col(aggName));
    }
  }
  return new DataFrame(colMap, df.index);
}
