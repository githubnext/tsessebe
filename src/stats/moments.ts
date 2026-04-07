/**
 * moments — statistical moment functions for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.mode()` / `DataFrame.mode()` — most-frequent values
 * - `Series.skew()` / `DataFrame.skew()` — adjusted Fisher-Pearson skewness
 * - `Series.kurt()` / `DataFrame.kurt()` — excess kurtosis
 * - `Series.sem()` / `DataFrame.sem()` — standard error of the mean
 *
 * All functions are **pure** (return new objects; inputs are unchanged).
 * Missing values are skipped unless `skipna: false` is passed.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a value is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Collect non-missing numeric values from a scalar array. */
function collectNums(vals: readonly Scalar[]): number[] {
  const out: number[] = [];
  for (const v of vals) {
    if (typeof v === "number" && !Number.isNaN(v)) {
      out.push(v);
    }
  }
  return out;
}

/** Collect non-missing values of any type from a scalar array. */
function collectNonMissing(vals: readonly Scalar[]): Scalar[] {
  return vals.filter((v) => !isMissing(v));
}

/** Sample mean of a numeric array (assumes n >= 1). */
function mean(nums: readonly number[]): number {
  let s = 0;
  for (const v of nums) {
    s += v;
  }
  return s / nums.length;
}

/** Sample standard deviation with given degrees of freedom. */
function stdDev(nums: readonly number[], ddof: number): number {
  const n = nums.length;
  if (n <= ddof) {
    return Number.NaN;
  }
  const m = mean(nums);
  let s = 0;
  for (const v of nums) {
    s += (v - m) ** 2;
  }
  return Math.sqrt(s / (n - ddof));
}

// ─── public option types ───────────────────────────────────────────────────────

/** Options shared by Series/DataFrame skew, kurtosis, and sem. */
export interface MomentsOptions {
  /**
   * Whether to skip missing values.  Default `true`.
   * When `false`, any missing value causes the result to be `NaN`.
   */
  readonly skipna?: boolean;
}

/** Options for {@link semSeries} and {@link semDataFrame}. */
export interface SemOptions extends MomentsOptions {
  /**
   * Delta degrees of freedom for the standard deviation denominator.
   * Default `1` (sample estimate), matching `pandas.Series.sem()`.
   */
  readonly ddof?: number;
}

/** Options for {@link modeDataFrame}. */
export interface ModeDataFrameOptions {
  /**
   * Axis along which to compute the mode.
   * - `0` or `"index"` (default): column-wise (mode of each column)
   * - `1` or `"columns"`: row-wise (mode of each row)
   */
  readonly axis?: 0 | 1 | "index" | "columns";
  /**
   * Whether to exclude missing values before computing mode.  Default `true`.
   */
  readonly dropna?: boolean;
  /**
   * If `true`, include `NaN` in the result (i.e. propagate them).  Default `false`.
   * Mirrors pandas `numeric_only` exclusion — kept `false` for API symmetry.
   */
  readonly numericOnly?: boolean;
}

/** Options for {@link skewDataFrame} and {@link kurtosisDataFrame}. */
export interface MomentsDataFrameOptions extends MomentsOptions {
  /**
   * Axis along which to compute the statistic.
   * - `0` or `"index"` (default): column-wise
   * - `1` or `"columns"`: row-wise (one value per row)
   */
  readonly axis?: 0 | 1 | "index" | "columns";
  /**
   * Include only numeric columns when `axis=0`.  Default `false`.
   * Non-numeric columns always yield `NaN`.
   */
  readonly numericOnly?: boolean;
}

/** Options for {@link semDataFrame} — extends {@link SemOptions}. */
export interface SemDataFrameOptions extends SemOptions {
  /**
   * Axis along which to compute sem.
   * - `0` or `"index"` (default): column-wise
   * - `1` or `"columns"`: row-wise
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── core scalar computations ─────────────────────────────────────────────────

/**
 * Compute adjusted Fisher-Pearson skewness for a numeric array.
 *
 * Formula (matches `pandas.Series.skew()`):
 *   `n / ((n-1)*(n-2)) * sum(((x - mean)/s)^3)`
 *
 * Returns `NaN` when `n < 3` or when `std == 0`.
 */
function skewNums(nums: readonly number[]): number {
  const n = nums.length;
  if (n < 3) {
    return Number.NaN;
  }
  const m = mean(nums);
  const s = stdDev(nums, 1);
  if (s === 0 || Number.isNaN(s)) {
    return Number.NaN;
  }
  let cube = 0;
  for (const v of nums) {
    cube += ((v - m) / s) ** 3;
  }
  return (n / ((n - 1) * (n - 2))) * cube;
}

/**
 * Compute excess kurtosis for a numeric array.
 *
 * Formula (matches `pandas.Series.kurt()`):
 *   `(n*(n+1)/((n-1)*(n-2)*(n-3))) * sum(((x-mean)/s)^4)
 *    - 3*(n-1)^2/((n-2)*(n-3))`
 *
 * Returns `NaN` when `n < 4` or when `std == 0`.
 */
function kurtosisNums(nums: readonly number[]): number {
  const n = nums.length;
  if (n < 4) {
    return Number.NaN;
  }
  const m = mean(nums);
  const s = stdDev(nums, 1);
  if (s === 0 || Number.isNaN(s)) {
    return Number.NaN;
  }
  let fourth = 0;
  for (const v of nums) {
    fourth += ((v - m) / s) ** 4;
  }
  const a = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
  const b = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return a * fourth - b;
}

/**
 * Compute standard error of the mean for a numeric array.
 *
 * Formula: `std(ddof) / sqrt(n)`
 *
 * Returns `NaN` when `n <= ddof`.
 */
function semNums(nums: readonly number[], ddof: number): number {
  const n = nums.length;
  if (n <= ddof) {
    return Number.NaN;
  }
  const s = stdDev(nums, ddof);
  if (Number.isNaN(s)) {
    return Number.NaN;
  }
  return s / Math.sqrt(n);
}

// ─── mode helpers ─────────────────────────────────────────────────────────────

/** Stable serialization key for a Scalar used in frequency maps. */
function scalarKey(v: Scalar): string {
  if (v === null) {
    return "__null__";
  }
  if (v === undefined) {
    return "__undef__";
  }
  return String(v);
}

/** Compare two modes for sorting — numeric pairs sort numerically; others lexicographically. */
function compareModes(a: Scalar, b: Scalar): number {
  if (a === null || a === undefined) {
    return b === null || b === undefined ? 0 : -1;
  }
  if (b === null || b === undefined) {
    return 1;
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  const sa = String(a);
  const sb = String(b);
  if (sa < sb) {
    return -1;
  }
  if (sa > sb) {
    return 1;
  }
  return 0;
}

/** Build a frequency map from candidates. */
function buildFreqMap(
  candidates: readonly Scalar[],
): Map<string, { count: number; value: Scalar }> {
  const freq = new Map<string, { count: number; value: Scalar }>();
  for (const v of candidates) {
    const key = scalarKey(v);
    const entry = freq.get(key);
    if (entry === undefined) {
      freq.set(key, { count: 1, value: v });
    } else {
      entry.count += 1;
    }
  }
  return freq;
}

/** Compute mode(s) of an array of scalars. Returns sorted array of tied-max values. */
function computeMode(vals: readonly Scalar[], dropna: boolean): Scalar[] {
  const candidates = dropna ? collectNonMissing(vals) : [...vals];
  if (candidates.length === 0) {
    return [];
  }
  const freq = buildFreqMap(candidates);
  let maxCount = 0;
  for (const { count } of freq.values()) {
    if (count > maxCount) {
      maxCount = count;
    }
  }
  const modes: Scalar[] = [];
  for (const { count, value } of freq.values()) {
    if (count === maxCount) {
      modes.push(value);
    }
  }
  modes.sort(compareModes);
  return modes;
}

/** Build result DataFrame for column-wise mode. */
function colWiseMode(df: DataFrame, dropna: boolean): DataFrame {
  let maxLen = 0;
  const colModes = new Map<string, Scalar[]>();
  for (const col of df.columns.values) {
    const modes = computeMode(df.col(col).values, dropna);
    colModes.set(col, modes);
    if (modes.length > maxLen) {
      maxLen = modes.length;
    }
  }
  if (maxLen === 0) {
    maxLen = 1;
  }
  const rowIdx = new RangeIndex(maxLen) as unknown as Index<Label>;
  const resultMap = new Map<string, Series<Scalar>>();
  for (const col of df.columns.values) {
    const modes = colModes.get(col) ?? [];
    const data: Scalar[] = new Array<Scalar>(maxLen);
    for (let i = 0; i < maxLen; i++) {
      data[i] = i < modes.length ? (modes[i] as Scalar) : Number.NaN;
    }
    resultMap.set(col, new Series<Scalar>({ data, index: rowIdx, name: col }));
  }
  return new DataFrame(resultMap, rowIdx);
}

/** Build result DataFrame for row-wise mode. */
function rowWiseMode(df: DataFrame, dropna: boolean): DataFrame {
  const nrows = df.index.size;
  const data: Scalar[] = new Array<Scalar>(nrows);
  for (let r = 0; r < nrows; r++) {
    const rowVals: Scalar[] = [];
    for (const col of df.columns.values) {
      rowVals.push(df.col(col).values[r] as Scalar);
    }
    const modes = computeMode(rowVals, dropna);
    data[r] = modes.length > 0 ? (modes[0] as Scalar) : Number.NaN;
  }
  const colMap = new Map<string, Series<Scalar>>();
  colMap.set("0", new Series<Scalar>({ data, index: df.index, name: "0" }));
  return new DataFrame(colMap, df.index);
}

/**
 * Return the mode(s) of a Series as a new Series.
 *
 * When multiple values are tied for most frequent, all are returned in sorted
 * order (matching `pandas.Series.mode()`).  The result has a `RangeIndex`.
 *
 * @param series  - input Series
 * @param dropna  - whether to exclude missing values (default `true`)
 *
 * @example
 * ```ts
 * import { Series, modeSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 2, 3, 3] });
 * modeSeries(s); // Series [2, 3]  (both tied, returned in order)
 * ```
 */
export function modeSeries(series: Series<Scalar>, dropna = true): Series<Scalar> {
  const modes = computeMode(series.values, dropna);
  return new Series<Scalar>({
    data: modes,
    name: series.name,
  });
}

/**
 * Adjusted Fisher-Pearson skewness for a Series.
 *
 * Matches `pandas.Series.skew()`.  Returns `NaN` when fewer than 3
 * non-missing values are present or when all values are equal.
 *
 * @param series  - input Series (non-numeric values are skipped)
 * @param options - {@link MomentsOptions}
 *
 * @example
 * ```ts
 * import { Series, skewSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 10] });
 * skewSeries(s); // ~1.56 (right-skewed)
 * ```
 */
export function skewSeries(series: Series<Scalar>, options: MomentsOptions = {}): number {
  const { skipna = true } = options;
  const vals = series.values;
  if (!skipna && vals.some((v) => isMissing(v))) {
    return Number.NaN;
  }
  return skewNums(collectNums(vals));
}

/**
 * Excess kurtosis for a Series.
 *
 * Matches `pandas.Series.kurt()` / `pandas.Series.kurtosis()`.
 * Returns `NaN` when fewer than 4 non-missing values are present.
 *
 * @param series  - input Series
 * @param options - {@link MomentsOptions}
 *
 * @example
 * ```ts
 * import { Series, kurtosisSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * kurtosisSeries(s); // -1.3 (platykurtic)
 * ```
 */
export function kurtosisSeries(series: Series<Scalar>, options: MomentsOptions = {}): number {
  const { skipna = true } = options;
  const vals = series.values;
  if (!skipna && vals.some((v) => isMissing(v))) {
    return Number.NaN;
  }
  return kurtosisNums(collectNums(vals));
}

/**
 * Standard error of the mean for a Series.
 *
 * Matches `pandas.Series.sem()`.
 *
 * @param series  - input Series
 * @param options - {@link SemOptions}
 *
 * @example
 * ```ts
 * import { Series, semSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * semSeries(s); // ~0.7071... (std/sqrt(n) with ddof=1)
 * ```
 */
export function semSeries(series: Series<Scalar>, options: SemOptions = {}): number {
  const { skipna = true, ddof = 1 } = options;
  const vals = series.values;
  if (!skipna && vals.some((v) => isMissing(v))) {
    return Number.NaN;
  }
  return semNums(collectNums(vals), ddof);
}

// ─── public API — DataFrame ───────────────────────────────────────────────────

/**
 * Return the mode of each column (or row) in a DataFrame.
 *
 * Matches `pandas.DataFrame.mode()`.  Columns with multiple tied modes are
 * padded with `NaN` to make the result rectangular.
 *
 * @param df      - input DataFrame
 * @param options - {@link ModeDataFrameOptions}
 *
 * @example
 * ```ts
 * import { DataFrame, modeDataFrame } from "tsb";
 *
 * const df = new DataFrame(
 *   new Map([["a", new Series({ data: [1, 2, 2] })],
 *            ["b", new Series({ data: [5, 5, 6] })]]),
 * );
 * modeDataFrame(df);
 * // DataFrame  a  b
 * //         0  2  5
 * ```
 */
export function modeDataFrame(df: DataFrame, options: ModeDataFrameOptions = {}): DataFrame {
  const { axis = 0, dropna = true } = options;
  const rowAxis = axis === 0 || axis === "index";
  return rowAxis ? colWiseMode(df, dropna) : rowWiseMode(df, dropna);
}

/**
 * Skewness of each column (or row) in a DataFrame.
 *
 * Matches `pandas.DataFrame.skew()`.
 *
 * @param df      - input DataFrame
 * @param options - {@link MomentsDataFrameOptions}
 *
 * @example
 * ```ts
 * import { DataFrame, skewDataFrame } from "tsb";
 *
 * const df = new DataFrame(
 *   new Map([["a", new Series({ data: [1, 2, 3, 4, 10] })]]),
 * );
 * skewDataFrame(df); // Series { a: ~1.56 }
 * ```
 */
export function skewDataFrame(
  df: DataFrame,
  options: MomentsDataFrameOptions = {},
): Series<Scalar> {
  const { skipna = true, axis = 0 } = options;
  const rowAxis = axis === 0 || axis === "index";

  if (rowAxis) {
    const cols = df.columns.values;
    const data: Scalar[] = cols.map((col) => skewSeries(df.col(col), { skipna }));
    return new Series<Scalar>({
      data,
      index: new Index<Label>(cols as Label[]),
    });
  }

  // row-wise
  const nrows = df.index.size;
  const data: Scalar[] = new Array<Scalar>(nrows);
  for (let r = 0; r < nrows; r++) {
    const rowVals: number[] = [];
    for (const col of df.columns.values) {
      const v = df.col(col).values[r] as Scalar;
      if (!isMissing(v) && typeof v === "number") {
        rowVals.push(v);
      } else if (!skipna && isMissing(v)) {
        rowVals.length = 0;
        break;
      }
    }
    data[r] = skewNums(rowVals);
  }
  return new Series<Scalar>({ data, index: df.index });
}

/**
 * Excess kurtosis of each column (or row) in a DataFrame.
 *
 * Matches `pandas.DataFrame.kurt()` / `pandas.DataFrame.kurtosis()`.
 *
 * @param df      - input DataFrame
 * @param options - {@link MomentsDataFrameOptions}
 *
 * @example
 * ```ts
 * import { DataFrame, kurtosisDataFrame } from "tsb";
 *
 * const df = new DataFrame(
 *   new Map([["a", new Series({ data: [1, 2, 3, 4, 5] })]]),
 * );
 * kurtosisDataFrame(df); // Series { a: -1.3 }
 * ```
 */
export function kurtosisDataFrame(
  df: DataFrame,
  options: MomentsDataFrameOptions = {},
): Series<Scalar> {
  const { skipna = true, axis = 0 } = options;
  const rowAxis = axis === 0 || axis === "index";

  if (rowAxis) {
    const cols = df.columns.values;
    const data: Scalar[] = cols.map((col) => kurtosisSeries(df.col(col), { skipna }));
    return new Series<Scalar>({
      data,
      index: new Index<Label>(cols as Label[]),
    });
  }

  const nrows = df.index.size;
  const data: Scalar[] = new Array<Scalar>(nrows);
  for (let r = 0; r < nrows; r++) {
    const rowVals: number[] = [];
    for (const col of df.columns.values) {
      const v = df.col(col).values[r] as Scalar;
      if (!isMissing(v) && typeof v === "number") {
        rowVals.push(v);
      } else if (!skipna && isMissing(v)) {
        rowVals.length = 0;
        break;
      }
    }
    data[r] = kurtosisNums(rowVals);
  }
  return new Series<Scalar>({ data, index: df.index });
}

/**
 * Standard error of the mean for each column (or row) in a DataFrame.
 *
 * Matches `pandas.DataFrame.sem()`.
 *
 * @param df      - input DataFrame
 * @param options - {@link SemDataFrameOptions}
 *
 * @example
 * ```ts
 * import { DataFrame, semDataFrame } from "tsb";
 *
 * const df = new DataFrame(
 *   new Map([["a", new Series({ data: [1, 2, 3, 4, 5] })]]),
 * );
 * semDataFrame(df); // Series { a: ~0.7071 }
 * ```
 */
export function semDataFrame(df: DataFrame, options: SemDataFrameOptions = {}): Series<Scalar> {
  const { skipna = true, ddof = 1, axis = 0 } = options;
  const rowAxis = axis === 0 || axis === "index";

  if (rowAxis) {
    const cols = df.columns.values;
    const data: Scalar[] = cols.map((col) => semSeries(df.col(col), { skipna, ddof }));
    return new Series<Scalar>({
      data,
      index: new Index<Label>(cols as Label[]),
    });
  }

  const nrows = df.index.size;
  const data: Scalar[] = new Array<Scalar>(nrows);
  for (let r = 0; r < nrows; r++) {
    const rowVals: number[] = [];
    let hasNull = false;
    for (const col of df.columns.values) {
      const v = df.col(col).values[r] as Scalar;
      if (typeof v === "number" && !Number.isNaN(v)) {
        rowVals.push(v);
      } else if (isMissing(v) && !skipna) {
        hasNull = true;
        break;
      }
    }
    data[r] = hasNull ? Number.NaN : semNums(rowVals, ddof);
  }
  return new Series<Scalar>({ data, index: df.index });
}
