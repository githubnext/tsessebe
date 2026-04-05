/**
 * Cumulative operations — cumsum, cumprod, cummax, cummin.
 *
 * Mirrors:
 *   - `pandas.Series.cumsum`
 *   - `pandas.Series.cumprod`
 *   - `pandas.Series.cummax`
 *   - `pandas.Series.cummin`
 *   - `pandas.DataFrame` variants of each
 */

import type { Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True if v is a finite number. */
function isNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/** Apply a running accumulator over a values array. */
function accumulate(
  vals: readonly Scalar[],
  init: number,
  op: (acc: number, v: number) => number,
  skipna: boolean,
): Scalar[] {
  const out: Scalar[] = [];
  let acc: number | null = null;
  for (const v of vals) {
    if (!isNum(v)) {
      if (skipna) {
        out.push(acc);
      } else {
        acc = null;
        out.push(null);
      }
      continue;
    }
    acc = acc === null ? (init === 0 ? v : op(init, v)) : op(acc, v);
    // For cumsum/cummin/cummax init is a no-op start value, handle correctly:
    out.push(acc);
  }
  return out;
}

/** Running cumsum. */
function cumulativeSum(vals: readonly Scalar[], skipna: boolean): Scalar[] {
  const out: Scalar[] = [];
  let acc: number | null = null;
  for (const v of vals) {
    if (!isNum(v)) {
      if (skipna) {
        out.push(acc);
      } else {
        acc = null;
        out.push(null);
      }
      continue;
    }
    acc = (acc ?? 0) + v;
    out.push(acc);
  }
  return out;
}

/** Running cumprod. */
function cumulativeProd(vals: readonly Scalar[], skipna: boolean): Scalar[] {
  const out: Scalar[] = [];
  let acc: number | null = null;
  for (const v of vals) {
    if (!isNum(v)) {
      if (skipna) {
        out.push(acc);
      } else {
        acc = null;
        out.push(null);
      }
      continue;
    }
    acc = (acc ?? 1) * v;
    out.push(acc);
  }
  return out;
}

/** Running cummax. */
function cumulativeMax(vals: readonly Scalar[], skipna: boolean): Scalar[] {
  return accumulate(vals, Number.NEGATIVE_INFINITY, Math.max, skipna);
}

/** Running cummin. */
function cumulativeMin(vals: readonly Scalar[], skipna: boolean): Scalar[] {
  return accumulate(vals, Number.POSITIVE_INFINITY, Math.min, skipna);
}

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for cumulative functions. */
export interface CumulativeOptions {
  /** Skip NaN values (treat them as missing). Default `true`. */
  skipna?: boolean;
}

// ─── Series cumulative ────────────────────────────────────────────────────────

/**
 * Running cumulative sum of a Series.
 *
 * @example
 * ```ts
 * cumsumSeries(new Series({ data: [1, 2, 3] })); // [1, 3, 6]
 * ```
 */
export function cumsumSeries(s: Series<Scalar>, opts: CumulativeOptions = {}): Series<Scalar> {
  const skipna = opts.skipna ?? true;
  return new Series<Scalar>({
    data: cumulativeSum(s.values, skipna),
    index: s.index,
    name: s.name,
  });
}

/**
 * Running cumulative product of a Series.
 *
 * @example
 * ```ts
 * cumprodSeries(new Series({ data: [1, 2, 3] })); // [1, 2, 6]
 * ```
 */
export function cumprodSeries(s: Series<Scalar>, opts: CumulativeOptions = {}): Series<Scalar> {
  const skipna = opts.skipna ?? true;
  return new Series<Scalar>({
    data: cumulativeProd(s.values, skipna),
    index: s.index,
    name: s.name,
  });
}

/**
 * Running cumulative maximum of a Series.
 *
 * @example
 * ```ts
 * cummaxSeries(new Series({ data: [3, 1, 2] })); // [3, 3, 3]
 * ```
 */
export function cummaxSeries(s: Series<Scalar>, opts: CumulativeOptions = {}): Series<Scalar> {
  const skipna = opts.skipna ?? true;
  return new Series<Scalar>({
    data: cumulativeMax(s.values, skipna),
    index: s.index,
    name: s.name,
  });
}

/**
 * Running cumulative minimum of a Series.
 *
 * @example
 * ```ts
 * cumminSeries(new Series({ data: [3, 1, 2] })); // [3, 1, 1]
 * ```
 */
export function cumminSeries(s: Series<Scalar>, opts: CumulativeOptions = {}): Series<Scalar> {
  const skipna = opts.skipna ?? true;
  return new Series<Scalar>({
    data: cumulativeMin(s.values, skipna),
    index: s.index,
    name: s.name,
  });
}

// ─── DataFrame cumulative ─────────────────────────────────────────────────────

/** Apply a cumulative function to every column. */
function applyDfCumulative(
  df: DataFrame,
  fn: (s: Series<Scalar>, opts: CumulativeOptions) => Series<Scalar>,
  opts: CumulativeOptions,
): DataFrame {
  const data: Record<string, Scalar[]> = {};
  for (const col of df.columns) {
    const s = df.col(col) as Series<Scalar>;
    data[col] = fn(s, opts).values as Scalar[];
  }
  return DataFrame.fromColumns(data, { index: df.index });
}

/**
 * Running cumulative sum of every column in a DataFrame.
 *
 * @example
 * ```ts
 * cumsumDataFrame(df);
 * ```
 */
export function cumsumDataFrame(df: DataFrame, opts: CumulativeOptions = {}): DataFrame {
  return applyDfCumulative(df, cumsumSeries, opts);
}

/**
 * Running cumulative product of every column in a DataFrame.
 *
 * @example
 * ```ts
 * cumprodDataFrame(df);
 * ```
 */
export function cumprodDataFrame(df: DataFrame, opts: CumulativeOptions = {}): DataFrame {
  return applyDfCumulative(df, cumprodSeries, opts);
}

/**
 * Running cumulative maximum of every column in a DataFrame.
 *
 * @example
 * ```ts
 * cummaxDataFrame(df);
 * ```
 */
export function cummaxDataFrame(df: DataFrame, opts: CumulativeOptions = {}): DataFrame {
  return applyDfCumulative(df, cummaxSeries, opts);
}

/**
 * Running cumulative minimum of every column in a DataFrame.
 *
 * @example
 * ```ts
 * cumminDataFrame(df);
 * ```
 */
export function cumminDataFrame(df: DataFrame, opts: CumulativeOptions = {}): DataFrame {
  return applyDfCumulative(df, cumminSeries, opts);
}
