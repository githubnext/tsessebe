/**
 * interpolate — fill NaN/null values via interpolation.
 *
 * Mirrors `pandas.Series.interpolate()` / `pandas.DataFrame.interpolate()`:
 * - `method`: `"linear"` (default) — linear interpolation between non-NaN neighbours
 * - `method`: `"pad"` / `"ffill"` — forward-fill with the last known value
 * - `method`: `"backfill"` / `"bfill"` — backward-fill with the next known value
 * - `method`: `"nearest"` — fill with the nearest non-NaN neighbour
 * - `limit`: maximum consecutive NaN values to fill (`null` = no limit)
 * - `limitDirection`: which direction(s) to fill — `"forward"`, `"backward"`, `"both"`
 *
 * All functions are **pure** (inputs unchanged, new objects returned).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Interpolation method for {@link interpolateSeries} / {@link interpolateDataFrame}. */
export type InterpolateMethod = "linear" | "pad" | "ffill" | "backfill" | "bfill" | "nearest";

/** Direction in which missing values are filled. */
export type LimitDirection = "forward" | "backward" | "both";

/** Restricts fill area — `"inside"` fills only interior gaps, `"outside"` fills only edges. */
export type LimitArea = "inside" | "outside";

/** Options for {@link interpolateSeries}. */
export interface InterpolateOptions {
  /**
   * Interpolation method (default: `"linear"`).
   * - `"linear"`: numeric linear interpolation between neighbours
   * - `"pad"` / `"ffill"`: forward-fill with last known value
   * - `"backfill"` / `"bfill"`: backward-fill with next known value
   * - `"nearest"`: fill with nearest non-NaN neighbour
   */
  readonly method?: InterpolateMethod;
  /**
   * Maximum number of consecutive missing values to fill.
   * `null` means no limit (default).
   */
  readonly limit?: number | null;
  /**
   * Which direction(s) to fill (default depends on method):
   * - `"pad"` / `"ffill"` default → `"forward"`
   * - `"backfill"` / `"bfill"` default → `"backward"`
   * - All other methods default → `"both"`
   */
  readonly limitDirection?: LimitDirection;
  /**
   * Restrict fill area:
   * - `"inside"`: only fill gaps between two non-NaN values (no edge extrapolation)
   * - `"outside"`: only fill leading/trailing NaN values
   * - `null` (default): fill everywhere
   */
  readonly limitArea?: LimitArea | null;
}

/** Options for {@link interpolateDataFrame}. */
export interface InterpolateDataFrameOptions extends InterpolateOptions {
  /**
   * Axis to interpolate along (default: `0`).
   * - `0` / `"index"`: interpolate down each **column**
   * - `1` / `"columns"`: interpolate across each **row**
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** True when a value should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Resolve the effective limit direction for a method. */
function resolveDirection(method: InterpolateMethod, opt?: LimitDirection): LimitDirection {
  if (opt !== undefined) return opt;
  if (method === "pad" || method === "ffill") return "forward";
  if (method === "backfill" || method === "bfill") return "backward";
  return "both";
}

/**
 * Classify each position as `"inside"` (surrounded by non-NaN on both sides)
 * or `"outside"` (leading or trailing edge).
 */
function classifyAreas(vals: readonly Scalar[]): readonly LimitArea[] {
  const n = vals.length;
  let firstNonMissing = -1;
  let lastNonMissing = -1;
  for (let i = 0; i < n; i++) {
    if (!isMissing(vals[i] as Scalar)) {
      if (firstNonMissing === -1) firstNonMissing = i;
      lastNonMissing = i;
    }
  }
  return vals.map((v, i): LimitArea => {
    if (!isMissing(v)) return "inside";
    if (firstNonMissing === -1) return "outside";
    if (i < firstNonMissing || i > lastNonMissing) return "outside";
    return "inside";
  });
}

/** True if position is allowed to be filled given the area constraint. */
function areaAllows(area: LimitArea | null, classification: LimitArea): boolean {
  if (area === null) return true;
  return classification === area;
}

// ─── linear interpolation ─────────────────────────────────────────────────────

/** Fill a single run of missing values with linear interpolation. */
function fillLinearRun(
  out: Scalar[],
  runStart: number,
  runEnd: number,
  limit: number | null,
  direction: LimitDirection,
  areas: readonly LimitArea[],
  area: LimitArea | null,
): void {
  const leftIdx = runStart - 1;
  const rightIdx = runEnd;
  if (leftIdx < 0 || rightIdx >= out.length) return;

  const leftVal = out[leftIdx] as number;
  const rightVal = out[rightIdx] as number;
  const span = rightIdx - leftIdx;

  for (let j = runStart; j < runEnd; j++) {
    if (!areaAllows(area, areas[j] as LimitArea)) continue;

    const fromLeft = j - leftIdx;
    const fromRight = rightIdx - j;
    const withinFwd = limit === null || fromLeft <= limit;
    const withinBwd = limit === null || fromRight <= limit;
    const fillFwd = direction === "forward" || direction === "both";
    const fillBwd = direction === "backward" || direction === "both";

    if ((fillFwd && withinFwd) || (fillBwd && withinBwd)) {
      out[j] = leftVal + ((rightVal - leftVal) * fromLeft) / span;
    }
  }
}

/**
 * Linear interpolation over an array of scalars.
 * Interior runs are filled; edge missing values are left as-is.
 */
function interpolateLinearArray(
  vals: readonly Scalar[],
  limit: number | null,
  direction: LimitDirection,
  area: LimitArea | null,
): Scalar[] {
  const out: Scalar[] = Array.from(vals);
  const areas = classifyAreas(vals);
  const n = out.length;
  let i = 0;
  while (i < n) {
    if (!isMissing(out[i] as Scalar)) {
      i++;
      continue;
    }
    const runStart = i;
    while (i < n && isMissing(out[i] as Scalar)) {
      i++;
    }
    fillLinearRun(out, runStart, i, limit, direction, areas, area);
  }
  return out;
}

// ─── pad / ffill ─────────────────────────────────────────────────────────────

/** Forward-fill an array of scalars, respecting limit, direction, and area. */
function padArray(
  vals: readonly Scalar[],
  limit: number | null,
  direction: LimitDirection,
  area: LimitArea | null,
): Scalar[] {
  if (direction === "backward") return Array.from(vals);

  const out: Scalar[] = Array.from(vals);
  const areas = classifyAreas(vals);
  let lastValid: Scalar = null;
  let streak = 0;
  for (let i = 0; i < out.length; i++) {
    if (isMissing(out[i] as Scalar)) {
      if (!isMissing(lastValid) && areaAllows(area, areas[i] as LimitArea)) {
        if (limit === null || streak < limit) {
          out[i] = lastValid;
          streak++;
        }
      }
    } else {
      lastValid = out[i] as Scalar;
      streak = 0;
    }
  }
  return out;
}

// ─── backfill / bfill ────────────────────────────────────────────────────────

/** Backward-fill an array of scalars, respecting limit, direction, and area. */
function bfillArray(
  vals: readonly Scalar[],
  limit: number | null,
  direction: LimitDirection,
  area: LimitArea | null,
): Scalar[] {
  if (direction === "forward") return Array.from(vals);

  const out: Scalar[] = Array.from(vals);
  const areas = classifyAreas(vals);
  let nextValid: Scalar = null;
  let streak = 0;
  for (let i = out.length - 1; i >= 0; i--) {
    if (isMissing(out[i] as Scalar)) {
      if (!isMissing(nextValid) && areaAllows(area, areas[i] as LimitArea)) {
        if (limit === null || streak < limit) {
          out[i] = nextValid;
          streak++;
        }
      }
    } else {
      nextValid = out[i] as Scalar;
      streak = 0;
    }
  }
  return out;
}

// ─── nearest ─────────────────────────────────────────────────────────────────

/** Binary-search: first index in `arr` where `arr[k] >= target`. */
function bisectLeft(arr: readonly number[], target: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((arr[mid] as number) < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/** Return the index in `out` of the nearest non-missing neighbour to position `i`. */
function chooseNearest(
  nonMissingPos: readonly number[],
  i: number,
  limit: number | null,
  direction: LimitDirection,
): number {
  const ins = bisectLeft(nonMissingPos, i);
  const leftPos = ins > 0 ? (nonMissingPos[ins - 1] as number) : -1;
  const rightPos = ins < nonMissingPos.length ? (nonMissingPos[ins] as number) : -1;

  const fromLeft = leftPos >= 0 ? i - leftPos : Infinity;
  const fromRight = rightPos >= 0 ? rightPos - i : Infinity;
  const canFwd = direction === "forward" || direction === "both";
  const canBwd = direction === "backward" || direction === "both";
  const fwdOk = canFwd && leftPos >= 0 && (limit === null || fromLeft <= limit);
  const bwdOk = canBwd && rightPos >= 0 && (limit === null || fromRight <= limit);

  if (fromLeft <= fromRight) {
    if (fwdOk) return leftPos;
    if (bwdOk) return rightPos;
  } else {
    if (bwdOk) return rightPos;
    if (fwdOk) return leftPos;
  }
  return -1;
}

/** Nearest-neighbour fill for an array. */
function nearestArray(
  vals: readonly Scalar[],
  limit: number | null,
  direction: LimitDirection,
  area: LimitArea | null,
): Scalar[] {
  const out: Scalar[] = Array.from(vals);
  const areas = classifyAreas(vals);
  const nonMissingPos: number[] = [];
  for (let i = 0; i < out.length; i++) {
    if (!isMissing(out[i] as Scalar)) nonMissingPos.push(i);
  }
  if (nonMissingPos.length === 0) return out;

  for (let i = 0; i < out.length; i++) {
    if (!isMissing(out[i] as Scalar)) continue;
    if (!areaAllows(area, areas[i] as LimitArea)) continue;
    const chosen = chooseNearest(nonMissingPos, i, limit, direction);
    if (chosen >= 0) {
      out[i] = out[chosen] as Scalar;
    }
  }
  return out;
}

// ─── dispatch ─────────────────────────────────────────────────────────────────

/** Dispatch to the correct array-level fill function based on `opts.method`. */
function interpolateArray(vals: readonly Scalar[], opts: InterpolateOptions): Scalar[] {
  const method: InterpolateMethod = opts.method ?? "linear";
  const limit: number | null = opts.limit ?? null;
  const direction = resolveDirection(method, opts.limitDirection);
  const area: LimitArea | null = opts.limitArea ?? null;

  switch (method) {
    case "linear":
      return interpolateLinearArray(vals, limit, direction, area);
    case "pad":
    case "ffill":
      return padArray(vals, limit, direction, area);
    case "backfill":
    case "bfill":
      return bfillArray(vals, limit, direction, area);
    case "nearest":
      return nearestArray(vals, limit, direction, area);
  }
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Fill missing values in a Series using interpolation.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, null, null, 4] });
 * interpolateSeries(s);
 * // → Series([1, 2, 3, 4])
 * ```
 */
export function interpolateSeries(
  series: Series<Scalar>,
  opts: InterpolateOptions = {},
): Series<Scalar> {
  const filled = interpolateArray(series.values as readonly Scalar[], opts);
  return new Series({ data: filled, index: series.index, name: series.name, dtype: series.dtype });
}

/** Interpolate each column independently (axis=0). */
function interpolateByColumns(df: DataFrame, opts: InterpolateOptions): DataFrame {
  const newCols: Record<string, Scalar[]> = {};
  for (const colName of df.columns.values) {
    newCols[colName] = interpolateArray(df.col(colName).values as readonly Scalar[], opts);
  }
  return DataFrame.fromColumns(newCols, { index: df.index });
}

/** Interpolate across each row (axis=1). */
function interpolateByRows(df: DataFrame, opts: InterpolateOptions): DataFrame {
  const colNames = df.columns.values;
  const nRows = df.index.size;
  const colArrays: Record<string, Scalar[]> = {};
  for (const c of colNames) {
    colArrays[c] = [];
  }
  for (let r = 0; r < nRows; r++) {
    const rowVals: Scalar[] = colNames.map((c) => df.col(c).values[r] as Scalar);
    const filled = interpolateArray(rowVals, opts);
    for (let ci = 0; ci < colNames.length; ci++) {
      const c = colNames[ci] as string;
      (colArrays[c] as Scalar[]).push(filled[ci] as Scalar);
    }
  }
  return DataFrame.fromColumns(colArrays, { index: df.index });
}

/**
 * Fill missing values in a DataFrame using interpolation.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, null, 3], b: [null, 2, null] });
 * interpolateDataFrame(df);
 * // → DataFrame({ a: [1, 2, 3], b: [null, 2, null] })
 * ```
 */
export function interpolateDataFrame(
  df: DataFrame,
  opts: InterpolateDataFrameOptions = {},
): DataFrame {
  const axis = opts.axis ?? 0;
  const isColumnAxis = axis === 0 || axis === "index";
  if (isColumnAxis) return interpolateByColumns(df, opts);
  return interpolateByRows(df, opts);
}
