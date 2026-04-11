/**
 * clip_advanced — per-element clipping for Series and DataFrame.
 *
 * Mirrors the following pandas methods with array/Series/DataFrame bounds:
 * - `Series.clip(lower, upper)` — per-element bounds from scalar, array, or Series
 * - `DataFrame.clip(lower, upper, axis?)` — per-element bounds with broadcast support
 *
 * Unlike the simple scalar `clip` in `elem_ops`, this module supports:
 * - Per-position bounds (array or positionally-aligned Series)
 * - DataFrame-shaped bounds for element-wise clipping
 * - Axis-based broadcasting when bounds is a Series
 *
 * All functions are **pure** (return new objects; inputs are unchanged).
 * Missing values (null / NaN) are propagated through every operation.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Axis, Scalar } from "../types.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/** Scalar or per-element bound accepted by {@link clipAdvancedSeries}. */
export type SeriesBound = number | null | undefined | readonly number[] | Series<Scalar>;

/** Scalar or per-element bound accepted by {@link clipAdvancedDataFrame}. */
export type DataFrameBound =
  | number
  | null
  | undefined
  | readonly number[]
  | Series<Scalar>
  | DataFrame;

/** Options for {@link clipAdvancedSeries}. */
export interface ClipAdvancedSeriesOptions {
  /**
   * Lower bound — scalar, array, or positionally-aligned Series.
   * `null` / `undefined` means no lower bound.
   */
  readonly lower?: SeriesBound;
  /**
   * Upper bound — scalar, array, or positionally-aligned Series.
   * `null` / `undefined` means no upper bound.
   */
  readonly upper?: SeriesBound;
}

/** Options for {@link clipAdvancedDataFrame}. */
export interface ClipAdvancedDataFrameOptions {
  /**
   * Lower bound — scalar, array, Series, or element-wise DataFrame.
   * `null` / `undefined` means no lower bound.
   */
  readonly lower?: DataFrameBound;
  /**
   * Upper bound — scalar, array, Series, or element-wise DataFrame.
   * `null` / `undefined` means no upper bound.
   */
  readonly upper?: DataFrameBound;
  /**
   * When `lower` or `upper` is a Series, this axis controls broadcasting.
   * - `0` or `"index"` (default): broadcast Series along rows (one bound per column).
   * - `1` or `"columns"`: broadcast Series along columns (one bound per row).
   */
  readonly axis?: Axis;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a finite number (not null / undefined / NaN). */
function isFiniteNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/** Clip a numeric value to [lo, hi], preserving missing values. */
function clipValue(v: Scalar, lo: number, hi: number): Scalar {
  if (!isFiniteNum(v)) {
    return v;
  }
  if (v < lo) {
    return lo;
  }
  if (v > hi) {
    return hi;
  }
  return v;
}

/**
 * Resolve a Series bound to a positional number for index `i`.
 * Arrays are accessed by position; Series are accessed by position.
 */
function resolveSeriesBound(bound: SeriesBound, i: number): number {
  if (bound === null || bound === undefined) {
    return Number.NaN; // sentinel: no bound
  }
  if (typeof bound === "number") {
    return bound;
  }
  if (Array.isArray(bound)) {
    const v = (bound as readonly number[])[i];
    return v !== undefined ? v : Number.NaN;
  }
  // Series<Scalar> — positional access
  const s = bound as Series<Scalar>;
  if (i >= s.size) {
    return Number.NaN;
  }
  const sv = s.iat(i);
  return isFiniteNum(sv) ? sv : Number.NaN;
}

// ─── clipAdvancedSeries ────────────────────────────────────────────────────────

/**
 * Clip each element of a Series to per-element [lower, upper] bounds.
 *
 * Bounds may be:
 * - A scalar `number` — applies the same bound to every element
 * - A `number[]` array — per-position bounds aligned by position
 * - A `Series<Scalar>` — per-position bounds taken positionally (label order ignored)
 * - `null` / `undefined` — no bound in that direction
 *
 * Non-numeric values (null, NaN, strings, …) pass through unchanged.
 * Mirrors `pandas.Series.clip(lower, upper)` with array bounds.
 *
 * @example
 * ```ts
 * import { Series, clipAdvancedSeries } from "tsb";
 * const s = new Series({ data: [-3, 1, 5, 10] });
 * const lo = new Series({ data: [-1, 0, 2, 8] });
 * clipAdvancedSeries(s, { lower: lo }).values; // [-1, 1, 5, 10]
 * ```
 */
export function clipAdvancedSeries(
  series: Series<Scalar>,
  options: ClipAdvancedSeriesOptions = {},
): Series<Scalar> {
  const { lower, upper } = options;
  const n = series.size;
  const out: Scalar[] = new Array<Scalar>(n);

  for (let i = 0; i < n; i++) {
    const v = series.iat(i);
    if (!isFiniteNum(v)) {
      out[i] = v;
      continue;
    }

    const lo = resolveSeriesBound(lower, i);
    const hi = resolveSeriesBound(upper, i);

    const effectiveLo = Number.isNaN(lo) ? Number.NEGATIVE_INFINITY : lo;
    const effectiveHi = Number.isNaN(hi) ? Number.POSITIVE_INFINITY : hi;

    out[i] = clipValue(v, effectiveLo, effectiveHi);
  }

  return new Series<Scalar>({ data: out, index: series.index, name: series.name });
}

// ─── DataFrame bound helpers ───────────────────────────────────────────────────

/** Resolve bound for a DataFrame cell where the bound is a Series (axis-based). */
function resolveSeriesBoundForDf(s: Series<Scalar>, r: number, c: number, axis: Axis): number {
  const isRowAxis = axis === 0 || axis === "index";
  if (isRowAxis) {
    // broadcast along rows → one bound per column → use col index `c`
    if (c >= s.size) {
      return Number.NaN;
    }
    const sv = s.iat(c);
    return isFiniteNum(sv) ? sv : Number.NaN;
  }
  // broadcast along columns → one bound per row → use row index `r`
  if (r >= s.size) {
    return Number.NaN;
  }
  const sv = s.iat(r);
  return isFiniteNum(sv) ? sv : Number.NaN;
}

/** Resolve bound for a DataFrame cell where the bound is a DataFrame (element-wise). */
function resolveDataFrameBoundFromDf(bound: DataFrame, r: number, colName: string): number {
  let val: Scalar = null;
  try {
    val = bound.col(colName).iat(r);
  } catch {
    return Number.NaN;
  }
  return isFiniteNum(val) ? val : Number.NaN;
}

/**
 * Resolve a DataFrame bound value for cell (row r, col c).
 * Supports: scalar, row-array, Series (broadcast by axis), DataFrame (element-wise).
 */
function resolveDataFrameBound(
  bound: DataFrameBound,
  r: number,
  c: number,
  colName: string,
  axis: Axis,
): number {
  if (bound === null || bound === undefined) {
    return Number.NaN;
  }
  if (typeof bound === "number") {
    return bound;
  }
  if (bound instanceof DataFrame) {
    return resolveDataFrameBoundFromDf(bound, r, colName);
  }
  if (bound instanceof Series) {
    return resolveSeriesBoundForDf(bound as Series<Scalar>, r, c, axis);
  }
  // plain array: treat as row-indexed (one bound per row)
  if (Array.isArray(bound)) {
    const v = (bound as readonly number[])[r];
    return v !== undefined ? v : Number.NaN;
  }
  return Number.NaN;
}

// ─── clipAdvancedDataFrame ─────────────────────────────────────────────────────

/**
 * Clip each element of a DataFrame to per-element [lower, upper] bounds.
 *
 * Bounds may be:
 * - A scalar `number` — same bound applied to every cell
 * - A `number[]` array — per-row bounds (one per row, broadcast across columns)
 * - A `Series<Scalar>` — broadcast by `axis`:
 *   - `axis=0` (default): one bound per **column** (series index = column position)
 *   - `axis=1`: one bound per **row** (series index = row position)
 * - A `DataFrame` — element-wise bounds (same shape, same column names)
 * - `null` / `undefined` — no bound in that direction
 *
 * Non-numeric values (null, NaN, strings, …) pass through unchanged.
 * Mirrors `pandas.DataFrame.clip(lower, upper, axis=0)` with array/Series/DF bounds.
 *
 * @example
 * ```ts
 * import { DataFrame, clipAdvancedDataFrame } from "tsb";
 * const df = DataFrame.fromColumns({ a: [1, 5, 9], b: [2, 6, 10] });
 * const loBound = DataFrame.fromColumns({ a: [2, 3, 4], b: [1, 4, 8] });
 * clipAdvancedDataFrame(df, { lower: loBound }).col("a").values; // [2, 5, 9]
 * ```
 */
export function clipAdvancedDataFrame(
  df: DataFrame,
  options: ClipAdvancedDataFrameOptions = {},
): DataFrame {
  const { lower, upper } = options;
  const axis: Axis = options.axis ?? 0;
  const colNames = df.columns.values;
  const colMap = new Map<string, Series<Scalar>>();

  for (let c = 0; c < colNames.length; c++) {
    const colName = colNames[c];
    if (colName === undefined) {
      continue;
    }
    const col = df.col(colName);
    const out: Scalar[] = new Array<Scalar>(df.index.size);

    for (let r = 0; r < df.index.size; r++) {
      const v = col.iat(r);
      if (!isFiniteNum(v)) {
        out[r] = v;
        continue;
      }

      const lo = resolveDataFrameBound(lower, r, c, colName, axis);
      const hi = resolveDataFrameBound(upper, r, c, colName, axis);

      const effectiveLo = Number.isNaN(lo) ? Number.NEGATIVE_INFINITY : lo;
      const effectiveHi = Number.isNaN(hi) ? Number.POSITIVE_INFINITY : hi;

      out[r] = clipValue(v, effectiveLo, effectiveHi);
    }

    colMap.set(colName, new Series<Scalar>({ data: out, index: df.index, name: colName }));
  }

  return new DataFrame(colMap, df.index);
}
