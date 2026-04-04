/**
 * Expanding-window computations for Series and DataFrame.
 *
 * Mirrors `pandas.Series.expanding` / `pandas.DataFrame.expanding`.
 * An expanding window grows with each observation: position `i` covers
 * `[0, i]` (all values seen so far).
 *
 * Usage:
 * ```ts
 * expanding(series, 1).mean()   // cumulative mean (min 1 obs)
 * expanding(df, 2).sum()        // column-wise cumulative sum (min 2 obs)
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

/** Collect numeric values from `data[0..i]` (inclusive). */
function collectExpandingNums(data: readonly Scalar[], i: number): number[] {
  const out: number[] = [];
  for (let j = 0; j <= i; j++) {
    const v = data[j];
    if (v !== undefined && !isMissing(v) && typeof v === "number") {
      out.push(v);
    }
  }
  return out;
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
function varNums(nums: number[]): number {
  if (nums.length < 2) {
    return Number.NaN;
  }
  const m = meanNums(nums);
  let sum = 0;
  for (const v of nums) {
    sum += (v - m) ** 2;
  }
  return sum / (nums.length - 1);
}

/** Std (sample) of an array. */
function stdNums(nums: number[]): number {
  return Math.sqrt(varNums(nums));
}

/** Build a Series result with the same index as `source`. */
function buildResult(source: Series<Scalar>, values: (number | null)[]): Series<number | null> {
  return new Series<number | null>({
    data: values,
    index: source.index,
    name: source.name ?? undefined,
  });
}

// ─── SeriesExpanding ──────────────────────────────────────────────────────────

/**
 * Expanding-window view of a Series.
 *
 * @example
 * ```ts
 * expanding(series).mean(); // cumulative mean
 * ```
 */
export class SeriesExpanding {
  private readonly _data: readonly Scalar[];
  private readonly _source: Series<Scalar>;
  private readonly _minPeriods: number;

  constructor(source: Series<Scalar>, minPeriods = 1) {
    this._source = source;
    this._data = source.values;
    this._minPeriods = minPeriods;
  }

  /** Compute expanding sum. */
  sum(): Series<number | null> {
    return this._compute(sumNums);
  }

  /** Compute expanding mean. */
  mean(): Series<number | null> {
    return this._compute(meanNums);
  }

  /** Compute expanding minimum. */
  min(): Series<number | null> {
    return this._compute((nums) => Math.min(...nums));
  }

  /** Compute expanding maximum. */
  max(): Series<number | null> {
    return this._compute((nums) => Math.max(...nums));
  }

  /** Compute expanding count of non-null values. */
  count(): Series<number | null> {
    const n = this._data.length;
    const values: (number | null)[] = [];
    for (let i = 0; i < n; i++) {
      values.push(collectExpandingNums(this._data, i).length);
    }
    return buildResult(this._source, values);
  }

  /** Compute expanding sample standard deviation (ddof=1). */
  std(): Series<number | null> {
    return this._compute(stdNums);
  }

  /** Compute expanding sample variance (ddof=1). */
  var(): Series<number | null> {
    return this._compute(varNums);
  }

  /**
   * Apply an arbitrary aggregation function over the expanding window.
   *
   * @param func - Function receiving numeric non-null values.
   */
  apply(func: (values: number[]) => number): Series<number | null> {
    return this._compute(func);
  }

  private _compute(agg: (nums: number[]) => number): Series<number | null> {
    const n = this._data.length;
    const values: (number | null)[] = [];
    for (let i = 0; i < n; i++) {
      const nums = collectExpandingNums(this._data, i);
      values.push(nums.length >= this._minPeriods ? agg(nums) : null);
    }
    return buildResult(this._source, values);
  }
}

// ─── DataFrameExpanding ───────────────────────────────────────────────────────

/**
 * Expanding-window view of a DataFrame (column-wise).
 */
export class DataFrameExpanding {
  private readonly _df: DataFrame;
  private readonly _minPeriods: number;

  constructor(df: DataFrame, minPeriods = 1) {
    this._df = df;
    this._minPeriods = minPeriods;
  }

  /** Compute expanding sum for each column. */
  sum(): DataFrame {
    return this._applyColumns((e) => e.sum());
  }

  /** Compute expanding mean for each column. */
  mean(): DataFrame {
    return this._applyColumns((e) => e.mean());
  }

  /** Compute expanding min for each column. */
  min(): DataFrame {
    return this._applyColumns((e) => e.min());
  }

  /** Compute expanding max for each column. */
  max(): DataFrame {
    return this._applyColumns((e) => e.max());
  }

  /** Compute expanding count for each column. */
  count(): DataFrame {
    return this._applyColumns((e) => e.count());
  }

  /** Compute expanding std for each column. */
  std(): DataFrame {
    return this._applyColumns((e) => e.std());
  }

  /** Compute expanding var for each column. */
  var(): DataFrame {
    return this._applyColumns((e) => e.var());
  }

  private _applyColumns(fn: (e: SeriesExpanding) => Series<number | null>): DataFrame {
    const colNames = [...this._df.columns.values()];
    const colData: Record<string, readonly Scalar[]> = {};
    for (const name of colNames) {
      const col = this._df.get(name);
      if (col !== undefined) {
        const result = fn(new SeriesExpanding(col, this._minPeriods));
        colData[name] = result.values;
      }
    }
    return DataFrame.fromColumns(colData, { index: this._df.index as Index<Label> });
  }
}

// ─── factory functions ────────────────────────────────────────────────────────

/**
 * Create an expanding window view of a Series.
 *
 * @param source - The input Series.
 * @param minPeriods - Minimum number of observations required. Defaults to 1.
 *
 * @example
 * ```ts
 * expanding(series, 2).mean();
 * ```
 */
export function expanding(source: Series<Scalar>, minPeriods?: number): SeriesExpanding;

/**
 * Create an expanding window view of a DataFrame (column-wise).
 *
 * @param source - The input DataFrame.
 * @param minPeriods - Minimum number of observations required. Defaults to 1.
 */
export function expanding(source: DataFrame, minPeriods?: number): DataFrameExpanding;

export function expanding(
  source: Series<Scalar> | DataFrame,
  minPeriods = 1,
): SeriesExpanding | DataFrameExpanding {
  if (source instanceof DataFrame) {
    return new DataFrameExpanding(source, minPeriods);
  }
  return new SeriesExpanding(source, minPeriods);
}
