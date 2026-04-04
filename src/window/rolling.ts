/**
 * Rolling-window computations for Series and DataFrame.
 *
 * Mirrors `pandas.Series.rolling` / `pandas.DataFrame.rolling`.
 *
 * Usage:
 * ```ts
 * rolling(series, 3).mean()   // 3-period trailing moving average
 * rolling(df, 5).sum()        // column-wise 5-period sum
 * ```
 */

import type { Index } from "../core/index.ts";
import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when scalar is considered missing (null | undefined | NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Collect numeric values from a slice of `data[start..end]` (inclusive). */
function collectNums(data: readonly Scalar[], start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) {
    const v = data[i];
    if (v !== undefined && !isMissing(v) && typeof v === "number") {
      out.push(v);
    }
  }
  return out;
}

/** Determine window start/end for position `i`. */
function windowBounds(
  i: number,
  n: number,
  window: number,
  center: boolean,
): { start: number; end: number } {
  if (center) {
    const half = Math.floor((window - 1) / 2);
    return { start: Math.max(0, i - half), end: Math.min(n - 1, i + (window - 1 - half)) };
  }
  return { start: Math.max(0, i - window + 1), end: i };
}

/** Apply an aggregation function to a window, respecting minPeriods. */
function applyWindow(
  data: readonly Scalar[],
  i: number,
  window: number,
  center: boolean,
  minPeriods: number,
  agg: (nums: number[]) => number,
): number | null {
  const { start, end } = windowBounds(i, data.length, window, center);
  const nums = collectNums(data, start, end);
  if (nums.length < minPeriods) {
    return null;
  }
  return agg(nums);
}

/** Sum of an array. */
function sumNums(nums: number[]): number {
  let s = 0;
  for (const v of nums) {
    s += v;
  }
  return s;
}

/** Mean of an array. */
function meanNums(nums: number[]): number {
  return sumNums(nums) / nums.length;
}

/** Variance (sample, ddof=1) of an array. */
function varNums(nums: number[], ddof = 1): number {
  if (nums.length < ddof + 1) {
    return Number.NaN;
  }
  const m = meanNums(nums);
  let sum = 0;
  for (const v of nums) {
    sum += (v - m) ** 2;
  }
  return sum / (nums.length - ddof);
}

/** Std (sample) of an array. */
function stdNums(nums: number[]): number {
  return Math.sqrt(varNums(nums));
}

/** Median of an array. */
function medianNums(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const lo = sorted[mid - 1];
    const hi = sorted[mid];
    if (lo === undefined || hi === undefined) {
      return Number.NaN;
    }
    return (lo + hi) / 2;
  }
  const m = sorted[mid];
  return m !== undefined ? m : Number.NaN;
}

/** Build a Series<number | null> result with the same index as `source`. */
function buildResult(source: Series<Scalar>, values: (number | null)[]): Series<number | null> {
  return new Series<number | null>({
    data: values,
    index: source.index,
    name: source.name ?? undefined,
  });
}

// ─── RollingOptions ───────────────────────────────────────────────────────────

/** Options for rolling window. */
export interface RollingOptions {
  /** Minimum number of non-null observations required to compute a result. Defaults to `window`. */
  readonly minPeriods?: number;
  /** Whether to center the window. Defaults to `false`. */
  readonly center?: boolean;
}

// ─── SeriesRolling ────────────────────────────────────────────────────────────

/**
 * Rolling-window view of a Series.
 *
 * @example
 * ```ts
 * const r = rolling(series, 3);
 * r.mean(); // 3-period trailing moving average
 * ```
 */
export class SeriesRolling {
  private readonly _data: readonly Scalar[];
  private readonly _source: Series<Scalar>;
  private readonly _window: number;
  private readonly _minPeriods: number;
  private readonly _center: boolean;

  constructor(source: Series<Scalar>, window: number, options?: RollingOptions) {
    if (window < 1 || !Number.isInteger(window)) {
      throw new RangeError(`window must be a positive integer, got ${window}`);
    }
    this._source = source;
    this._window = window;
    this._data = source.values;
    this._minPeriods = options?.minPeriods ?? window;
    this._center = options?.center ?? false;
  }

  /** Compute rolling sum. */
  sum(): Series<number | null> {
    return this._compute(sumNums);
  }

  /** Compute rolling mean. */
  mean(): Series<number | null> {
    return this._compute(meanNums);
  }

  /** Compute rolling minimum. */
  min(): Series<number | null> {
    return this._compute((nums) => Math.min(...nums));
  }

  /** Compute rolling maximum. */
  max(): Series<number | null> {
    return this._compute((nums) => Math.max(...nums));
  }

  /** Compute rolling count of non-null values. */
  count(): Series<number | null> {
    const n = this._data.length;
    const values: (number | null)[] = [];
    for (let i = 0; i < n; i++) {
      const { start, end } = windowBounds(i, n, this._window, this._center);
      const nums = collectNums(this._data, start, end);
      values.push(nums.length);
    }
    return buildResult(this._source, values);
  }

  /** Compute rolling sample standard deviation (ddof=1). */
  std(): Series<number | null> {
    return this._compute(stdNums);
  }

  /** Compute rolling sample variance (ddof=1). */
  var(): Series<number | null> {
    return this._compute((nums) => varNums(nums));
  }

  /** Compute rolling median. */
  median(): Series<number | null> {
    return this._compute(medianNums);
  }

  /**
   * Apply an arbitrary aggregation function over the window.
   *
   * @param func - Function receiving numeric non-null values in the window.
   */
  apply(func: (values: number[]) => number): Series<number | null> {
    return this._compute(func);
  }

  private _compute(agg: (nums: number[]) => number): Series<number | null> {
    const n = this._data.length;
    const values: (number | null)[] = [];
    for (let i = 0; i < n; i++) {
      values.push(applyWindow(this._data, i, this._window, this._center, this._minPeriods, agg));
    }
    return buildResult(this._source, values);
  }
}

// ─── DataFrameRolling ─────────────────────────────────────────────────────────

/**
 * Rolling-window view of a DataFrame (column-wise).
 */
export class DataFrameRolling {
  private readonly _df: DataFrame;
  private readonly _window: number;
  private readonly _options: RollingOptions | undefined;

  constructor(df: DataFrame, window: number, options?: RollingOptions) {
    this._df = df;
    this._window = window;
    this._options = options;
  }

  /** Compute rolling sum for each column. */
  sum(): DataFrame {
    return this._applyColumns((r) => r.sum());
  }

  /** Compute rolling mean for each column. */
  mean(): DataFrame {
    return this._applyColumns((r) => r.mean());
  }

  /** Compute rolling min for each column. */
  min(): DataFrame {
    return this._applyColumns((r) => r.min());
  }

  /** Compute rolling max for each column. */
  max(): DataFrame {
    return this._applyColumns((r) => r.max());
  }

  /** Compute rolling count for each column. */
  count(): DataFrame {
    return this._applyColumns((r) => r.count());
  }

  /** Compute rolling std for each column. */
  std(): DataFrame {
    return this._applyColumns((r) => r.std());
  }

  /** Compute rolling var for each column. */
  var(): DataFrame {
    return this._applyColumns((r) => r.var());
  }

  /** Compute rolling median for each column. */
  median(): DataFrame {
    return this._applyColumns((r) => r.median());
  }

  private _applyColumns(fn: (r: SeriesRolling) => Series<number | null>): DataFrame {
    const colNames = [...this._df.columns.values()];
    const colData: Record<string, readonly Scalar[]> = {};
    for (const name of colNames) {
      const col = this._df.get(name);
      if (col !== undefined) {
        const result = fn(new SeriesRolling(col, this._window, this._options));
        colData[name] = result.values;
      }
    }
    return DataFrame.fromColumns(colData, { index: this._df.index as Index<Label> });
  }
}

// ─── factory functions ────────────────────────────────────────────────────────

/**
 * Create a rolling window view of a Series.
 *
 * @param source - The input Series.
 * @param window - Window size (number of observations).
 * @param options - Optional rolling configuration.
 *
 * @example
 * ```ts
 * rolling(series, 3).mean();
 * ```
 */
export function rolling(
  source: Series<Scalar>,
  window: number,
  options?: RollingOptions,
): SeriesRolling;

/**
 * Create a rolling window view of a DataFrame (column-wise).
 *
 * @param source - The input DataFrame.
 * @param window - Window size.
 * @param options - Optional rolling configuration.
 */
export function rolling(
  source: DataFrame,
  window: number,
  options?: RollingOptions,
): DataFrameRolling;

export function rolling(
  source: Series<Scalar> | DataFrame,
  window: number,
  options?: RollingOptions,
): SeriesRolling | DataFrameRolling {
  if (source instanceof DataFrame) {
    return new DataFrameRolling(source, window, options);
  }
  return new SeriesRolling(source, window, options);
}
