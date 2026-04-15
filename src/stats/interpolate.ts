/**
 * interpolate — fill missing values by interpolation.
 *
 * Mirrors `pandas.Series.interpolate()` / `DataFrame.interpolate()`:
 *
 * - `interpolateSeries(series, options)` — interpolate a Series
 * - `dataFrameInterpolate(df, options)` — interpolate a DataFrame column-wise or row-wise
 *
 * ### Supported methods
 *
 * | Method | Description |
 * |---|---|
 * | `"linear"` (default) | Linear interpolation between surrounding known values |
 * | `"ffill"` / `"pad"` | Forward fill — carry last known value forward |
 * | `"bfill"` / `"backfill"` | Backward fill — carry next known value backward |
 * | `"nearest"` | Fill with the nearest known value (ties go right) |
 * | `"zero"` | Step function — equivalent to `"ffill"` |
 *
 * ### Missing values
 *
 * `null`, `undefined`, and `NaN` are all treated as missing.  Non-numeric
 * scalars (strings, booleans, dates) are treated as known values and are
 * never overwritten.  Only numeric gaps are interpolated.
 *
 * ### Linear boundary behaviour
 *
 * Leading NaN (before the first known value) and trailing NaN (after the
 * last known value) are **not** filled by `"linear"` unless the
 * `limitDirection` includes `"backward"` (leading) or `"forward"` (trailing).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Interpolation method.
 *
 * - `"linear"` — linear interpolation between surrounding known values (default)
 * - `"ffill"` / `"pad"` — forward fill
 * - `"bfill"` / `"backfill"` — backward fill
 * - `"nearest"` — nearest known value
 * - `"zero"` — step function (same as forward fill)
 */
export type InterpolateMethod =
  | "linear"
  | "ffill"
  | "pad"
  | "bfill"
  | "backfill"
  | "nearest"
  | "zero";

/**
 * Direction for the `limit` constraint.
 *
 * - `"forward"` (default) — count consecutive NaN from the **left** boundary of each gap
 * - `"backward"` — count consecutive NaN from the **right** boundary of each gap
 * - `"both"` — count from both boundaries (fill `limit` from each side)
 */
export type LimitDirection = "forward" | "backward" | "both";

/** Options for {@link interpolateSeries}. */
export interface InterpolateOptions {
  /**
   * Interpolation method.  Default `"linear"`.
   */
  readonly method?: InterpolateMethod;
  /**
   * Maximum number of consecutive NaN values to fill per gap.
   * Default `Infinity` (no limit).
   */
  readonly limit?: number;
  /**
   * Which end of each gap the `limit` counts from.
   * Default `"forward"`.
   */
  readonly limitDirection?: LimitDirection;
}

/** Options for {@link dataFrameInterpolate} — adds `axis` to {@link InterpolateOptions}. */
export interface DataFrameInterpolateOptions extends InterpolateOptions {
  /**
   * - `0` / `"index"` (default): operate **down each column**
   * - `1` / `"columns"`: operate **across each row**
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a missing value (null / undefined / NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** True when `v` is a number (finite or infinite, not NaN). */
function isNumeric(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/** Collect positions of all non-missing values. */
function knownPositions(vals: readonly Scalar[]): number[] {
  const pos: number[] = [];
  for (let i = 0; i < vals.length; i++) {
    if (!isMissing(vals[i])) {
      pos.push(i);
    }
  }
  return pos;
}

/** Build the output buffer as a mutable copy of the input. */
function initOut(vals: readonly Scalar[]): Scalar[] {
  return Array.from({ length: vals.length }, (_, i): Scalar => vals[i] as Scalar);
}

// ─── linear helpers ───────────────────────────────────────────────────────────

/** Whether a gap position should be filled given direction and limit. */
function canFill(
  distFromLeft: number,
  distFromRight: number,
  limit: number,
  dir: LimitDirection,
): boolean {
  if (dir === "forward") {
    return distFromLeft <= limit;
  }
  if (dir === "backward") {
    return distFromRight <= limit;
  }
  return distFromLeft <= limit || distFromRight <= limit;
}

/** Fill one interior gap with linear interpolation. */
function fillLinearGap(
  out: Scalar[],
  vals: readonly Scalar[],
  left: number,
  right: number,
  limit: number,
  dir: LimitDirection,
): void {
  const leftVal = vals[left];
  const rightVal = vals[right];
  if (!(isNumeric(leftVal) && isNumeric(rightVal))) {
    return;
  }
  const span = right - left;
  const gapLen = span - 1;
  for (let gi = 0; gi < gapLen; gi++) {
    const pos = left + gi + 1;
    if (!isMissing(vals[pos])) {
      continue;
    }
    const dl = gi + 1;
    const dr = gapLen - gi;
    if (canFill(dl, dr, limit, dir)) {
      out[pos] = leftVal + (rightVal - leftVal) * (dl / span);
    }
  }
}

/**
 * Fill a run of NaN values extending from `anchorPos` in the direction
 * given by `step` (+1 or −1), up to `limit` values.
 */
function fillConstantRun(
  out: Scalar[],
  vals: readonly Scalar[],
  anchorPos: number,
  step: 1 | -1,
  limit: number,
): void {
  const n = out.length;
  const anchorVal = vals[anchorPos] as Scalar;
  let filled = 0;
  let i = anchorPos + step;
  while (i >= 0 && i < n && isMissing(vals[i]) && filled < limit) {
    out[i] = anchorVal;
    filled++;
    i += step;
  }
}

// ─── core algorithms ──────────────────────────────────────────────────────────

/**
 * Linear interpolation between pairs of known numeric values.
 *
 * Interior gaps are linearly interpolated.
 * Leading / trailing gaps are filled only if `limitDirection` allows.
 * Non-numeric non-missing values are treated as known and never overwritten.
 */
function interpolateLinear(vals: readonly Scalar[], limit: number, dir: LimitDirection): Scalar[] {
  const out = initOut(vals);
  const kp = knownPositions(vals);
  if (kp.length < 2) {
    return out;
  }
  // Only fill interior gaps (between two known values). Leading/trailing NaN
  // are not filled — there is no second anchor for proper interpolation.
  for (let k = 0; k + 1 < kp.length; k++) {
    fillLinearGap(out, vals, kp[k] as number, kp[k + 1] as number, limit, dir);
  }
  return out;
}

/**
 * Forward fill: replace each missing value with the last seen non-missing value.
 */
function interpolateFfill(vals: readonly Scalar[], limit: number): Scalar[] {
  const out = initOut(vals);
  let lastKnown: Scalar = null;
  let runCount = 0;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i] as Scalar;
    if (!isMissing(v)) {
      lastKnown = v;
      runCount = 0;
    } else if (lastKnown !== null && lastKnown !== undefined && runCount < limit) {
      out[i] = lastKnown;
      runCount++;
    }
  }
  return out;
}

/**
 * Backward fill: replace each missing value with the next non-missing value.
 */
function interpolateBfill(vals: readonly Scalar[], limit: number): Scalar[] {
  const out = initOut(vals);
  let nextKnown: Scalar = null;
  let runCount = 0;
  for (let i = vals.length - 1; i >= 0; i--) {
    const v = vals[i] as Scalar;
    if (!isMissing(v)) {
      nextKnown = v;
      runCount = 0;
    } else if (nextKnown !== null && nextKnown !== undefined && runCount < limit) {
      out[i] = nextKnown;
      runCount++;
    }
  }
  return out;
}

/** Fill one interior gap with the nearest known value (right wins on tie). */
function fillNearestGap(
  out: Scalar[],
  vals: readonly Scalar[],
  left: number,
  right: number,
  limit: number,
): void {
  const leftVal = vals[left] as Scalar;
  const rightVal = vals[right] as Scalar;
  for (let i = left + 1; i < right; i++) {
    if (!isMissing(vals[i])) {
      continue;
    }
    const dl = i - left;
    const dr = right - i;
    const dist = Math.min(dl, dr);
    if (dist <= limit) {
      out[i] = dl < dr ? leftVal : rightVal;
    }
  }
}

/**
 * Nearest-neighbor fill: each missing position is replaced by the value of its
 * closest non-missing neighbor.  When equidistant, the **right** neighbor wins.
 */
function interpolateNearest(vals: readonly Scalar[], limit: number): Scalar[] {
  const out = initOut(vals);
  const kp = knownPositions(vals);
  if (kp.length === 0) {
    return out;
  }
  const firstKnown = kp[0] as number;
  if (firstKnown > 0) {
    fillConstantRun(out, vals, firstKnown, -1, limit);
  }
  for (let k = 0; k + 1 < kp.length; k++) {
    fillNearestGap(out, vals, kp[k] as number, kp[k + 1] as number, limit);
  }
  const lastKnown = kp.at(-1) as number;
  if (lastKnown < vals.length - 1) {
    fillConstantRun(out, vals, lastKnown, 1, limit);
  }
  return out;
}

/**
 * Dispatch the appropriate interpolation algorithm.
 */
function interpolateVals(
  vals: readonly Scalar[],
  method: InterpolateMethod,
  limit: number,
  dir: LimitDirection,
): Scalar[] {
  if (method === "linear") {
    return interpolateLinear(vals, limit, dir);
  }
  if (method === "ffill" || method === "pad" || method === "zero") {
    return interpolateFfill(vals, limit);
  }
  if (method === "bfill" || method === "backfill") {
    return interpolateBfill(vals, limit);
  }
  return interpolateNearest(vals, limit);
}

// ─── DataFrame helpers ────────────────────────────────────────────────────────

function colWiseInterp(
  df: DataFrame,
  method: InterpolateMethod,
  limit: number,
  dir: LimitDirection,
): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const col = df.col(name);
    const result = interpolateVals(col.values, method, limit, dir);
    colMap.set(name, new Series<Scalar>({ data: result, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}

function buildRowArray(
  colData: ReadonlyArray<readonly Scalar[]>,
  colNames: readonly string[],
  rowIdx: number,
): Scalar[] {
  return colNames.map((_, j): Scalar => {
    const cd = colData[j];
    if (cd === undefined) {
      return null;
    }
    const v = cd[rowIdx];
    return v !== undefined ? v : null;
  });
}

function rowWiseInterp(
  df: DataFrame,
  method: InterpolateMethod,
  limit: number,
  dir: LimitDirection,
): DataFrame {
  const colNames = df.columns.values;
  const nRows = df.index.size;
  const colData = colNames.map((c) => df.col(c).values);
  const outCols: Scalar[][] = colNames.map(() => new Array<Scalar>(nRows));

  for (let i = 0; i < nRows; i++) {
    const rowResult = interpolateVals(buildRowArray(colData, colNames, i), method, limit, dir);
    for (let j = 0; j < colNames.length; j++) {
      const col = outCols[j];
      const rv = rowResult[j];
      if (col !== undefined) {
        col[i] = rv !== undefined ? rv : null;
      }
    }
  }

  const colMap = new Map<string, Series<Scalar>>();
  for (let j = 0; j < colNames.length; j++) {
    const name = colNames[j];
    const data = outCols[j];
    if (name !== undefined && data !== undefined) {
      colMap.set(name, new Series<Scalar>({ data, index: df.index, name }));
    }
  }
  return new DataFrame(colMap, df.index);
}

// ─── interpolateSeries ────────────────────────────────────────────────────────

/**
 * Fill missing (`null` / `undefined` / `NaN`) values in a Series by
 * interpolation.
 *
 * Mirrors `pandas.Series.interpolate(method, limit, limit_direction)`.
 *
 * @example
 * ```ts
 * import { Series, interpolateSeries } from "tsb";
 *
 * const s = new Series({ data: [1, null, null, 4] });
 * interpolateSeries(s).values;          // [1, 2, 3, 4]  (linear)
 *
 * const t = new Series({ data: [null, 1, null, 3, null] });
 * interpolateSeries(t, { method: "ffill" }).values; // [null, 1, 1, 3, 3]
 * interpolateSeries(t, { method: "bfill" }).values; // [1, 1, 3, 3, null]
 * ```
 */
export function interpolateSeries(
  series: Series<Scalar>,
  options: InterpolateOptions = {},
): Series<Scalar> {
  const method = options.method ?? "linear";
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const dir = options.limitDirection ?? "forward";

  const result = interpolateVals(series.values, method, limit, dir);
  return new Series<Scalar>({ data: result, index: series.index, name: series.name });
}

// ─── dataFrameInterpolate ─────────────────────────────────────────────────────

/**
 * Fill missing values in a DataFrame by interpolation.
 *
 * By default (`axis=0`) operates **down each column**.  Set `axis=1` to
 * operate **across each row**.
 *
 * Mirrors `pandas.DataFrame.interpolate(method, limit, limit_direction, axis)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameInterpolate } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, null, 3], b: [10, null, 30] });
 * dataFrameInterpolate(df).col("a").values; // [1, 2, 3]
 * dataFrameInterpolate(df).col("b").values; // [10, 20, 30]
 * ```
 */
export function dataFrameInterpolate(
  df: DataFrame,
  options: DataFrameInterpolateOptions = {},
): DataFrame {
  const method = options.method ?? "linear";
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const dir = options.limitDirection ?? "forward";
  const axis = options.axis ?? 0;

  if (axis === 1 || axis === "columns") {
    return rowWiseInterp(df, method, limit, dir);
  }
  return colWiseInterp(df, method, limit, dir);
}
