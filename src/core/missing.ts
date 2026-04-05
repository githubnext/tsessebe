/**
 * Missing-value utilities — standalone functions mirroring `pandas` top-level
 * and accessor-level missing-data API.
 *
 * Exports:
 *   - `isna` / `isnull` — detect missing values (scalar, Series, DataFrame)
 *   - `notna` / `notnull` — inverse of isna
 *   - `ffill` — forward-fill missing values
 *   - `bfill` — backward-fill missing values
 *   - `fillna` — fill with scalar value or propagation method
 *   - `dropna` — remove missing values
 *   - `interpolate` — linear (or index-weighted) interpolation
 */

import type { Label, Scalar } from "../types.ts";
import { Index } from "./base-index.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Returns `true` when a scalar value is considered missing (null / undefined / NaN). */
function scalarIsNA(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

// ─── isna / notna ─────────────────────────────────────────────────────────────

/** Options returned by the overloaded `isna` function — kept internal. */

/**
 * Detect missing values.
 *
 * Works like `pandas.isna`:
 * - For a **scalar** returns a single `boolean`.
 * - For a **Series** returns a boolean `Series<boolean>`.
 * - For a **DataFrame** returns a boolean `DataFrame`.
 *
 * @example
 * ```ts
 * isna(null);               // true
 * isna(0);                  // false
 * isna(NaN);                // true
 * isna(new Series({ data: [1, null, NaN] }));  // Series([false, true, true])
 * ```
 */
export function isna(value: Scalar): boolean;
export function isna<T extends Scalar>(value: Series<T>): Series<boolean>;
export function isna(value: DataFrame): DataFrame;
export function isna(value: Scalar | Series | DataFrame): boolean | Series<boolean> | DataFrame {
  if (value instanceof DataFrame) {
    return value.isna();
  }
  if (value instanceof Series) {
    return value.isna();
  }
  return scalarIsNA(value as Scalar);
}

/** Alias for {@link isna}. */
export const isnull: typeof isna = isna;

/**
 * Detect non-missing values.
 *
 * Inverse of {@link isna}: returns `true` / `Series<boolean>` / `DataFrame`
 * where values are **not** missing.
 *
 * @example
 * ```ts
 * notna(null);  // false
 * notna(1);     // true
 * ```
 */
export function notna(value: Scalar): boolean;
export function notna<T extends Scalar>(value: Series<T>): Series<boolean>;
export function notna(value: DataFrame): DataFrame;
export function notna(value: Scalar | Series | DataFrame): boolean | Series<boolean> | DataFrame {
  if (value instanceof DataFrame) {
    return value.notna();
  }
  if (value instanceof Series) {
    return value.notna();
  }
  return !scalarIsNA(value as Scalar);
}

/** Alias for {@link notna}. */
export const notnull: typeof notna = notna;

// ─── FfillOptions / BfillOptions ─────────────────────────────────────────────

/** Options for forward / backward fill. */
export interface FillPropagateOptions {
  /**
   * Maximum number of consecutive missing values to fill.
   * `null` (default) means unlimited.
   */
  readonly limit?: number | null;
}

// ─── ffill ────────────────────────────────────────────────────────────────────

/**
 * Forward-fill missing values in a Series.
 *
 * Each missing element is replaced by the most recent non-missing value
 * that precedes it (up to `options.limit` positions).
 *
 * Mirrors `Series.ffill()` in pandas.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, null, null, 4] });
 * ffill(s).values;  // [1, 1, 1, 4]
 * ffill(s, { limit: 1 }).values;  // [1, 1, null, 4]
 * ```
 */
export function ffill<T extends Scalar>(
  series: Series<T>,
  options?: FillPropagateOptions,
): Series<T> {
  const limit = options?.limit ?? null;
  const vals = series.values as readonly T[];
  const result: T[] = [...vals] as T[];
  let consecutiveFilled = 0;
  let lastValid: T | null = null;

  for (let i = 0; i < result.length; i++) {
    const v = result[i] as T;
    if (scalarIsNA(v as Scalar)) {
      if (lastValid !== null && (limit === null || consecutiveFilled < limit)) {
        result[i] = lastValid;
        consecutiveFilled++;
      }
    } else {
      lastValid = v;
      consecutiveFilled = 0;
    }
  }

  return new Series<T>({
    data: result,
    index: series.index,
    dtype: series.dtype,
    name: series.name,
  });
}

/**
 * Forward-fill missing values in all columns of a DataFrame.
 *
 * Each column is independently forward-filled.
 *
 * @example
 * ```ts
 * const df = new DataFrame({ a: [1, null, 3], b: [null, 2, null] });
 * ffill(df).toRecord();  // { a: [1, 1, 3], b: [null, 2, 2] }
 * ```
 */
export function ffillDataFrame(df: DataFrame, options?: FillPropagateOptions): DataFrame {
  const cols = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const s = df.get(name);
    if (s !== undefined) {
      cols.set(name, ffill(s, options));
    }
  }
  return new DataFrame(cols, df.index);
}

// ─── bfill ────────────────────────────────────────────────────────────────────

/**
 * Backward-fill missing values in a Series.
 *
 * Each missing element is replaced by the nearest subsequent non-missing
 * value (up to `options.limit` positions).
 *
 * Mirrors `Series.bfill()` in pandas.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [null, null, 3, null] });
 * bfill(s).values;  // [3, 3, 3, null]
 * ```
 */
export function bfill<T extends Scalar>(
  series: Series<T>,
  options?: FillPropagateOptions,
): Series<T> {
  const limit = options?.limit ?? null;
  const vals = series.values as readonly T[];
  const result: T[] = [...vals] as T[];
  let consecutiveFilled = 0;
  let nextValid: T | null = null;

  for (let i = result.length - 1; i >= 0; i--) {
    const v = result[i] as T;
    if (scalarIsNA(v as Scalar)) {
      if (nextValid !== null && (limit === null || consecutiveFilled < limit)) {
        result[i] = nextValid;
        consecutiveFilled++;
      }
    } else {
      nextValid = v;
      consecutiveFilled = 0;
    }
  }

  return new Series<T>({
    data: result,
    index: series.index,
    dtype: series.dtype,
    name: series.name,
  });
}

/**
 * Backward-fill missing values in all columns of a DataFrame.
 *
 * @example
 * ```ts
 * const df = new DataFrame({ a: [1, null, 3] });
 * bfillDataFrame(df).toRecord();  // { a: [1, 3, 3] }
 * ```
 */
export function bfillDataFrame(df: DataFrame, options?: FillPropagateOptions): DataFrame {
  const cols = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const s = df.get(name);
    if (s !== undefined) {
      cols.set(name, bfill(s, options));
    }
  }
  return new DataFrame(cols, df.index);
}

// ─── fillna ───────────────────────────────────────────────────────────────────

/** Fill method: `"ffill"` / `"pad"` = forward-fill, `"bfill"` / `"backfill"` = backward-fill. */
export type FillnaMethod = "ffill" | "pad" | "bfill" | "backfill";

/** Options for {@link fillnaSeries} and {@link fillnaDataFrame}. */
export interface FillnaOptions<T extends Scalar = Scalar> {
  /**
   * Scalar value to fill with (mutually exclusive with `method`).
   * If both are specified, `method` takes precedence.
   */
  readonly value?: T;
  /** Propagation method: `"ffill"` or `"bfill"` (and their aliases). */
  readonly method?: FillnaMethod;
  /** Maximum number of consecutive fills when using `method`. */
  readonly limit?: number | null;
}

/**
 * Fill missing values in a Series using a scalar or a propagation method.
 *
 * Extends the built-in `Series.fillna(scalar)` by adding method support.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, null, null, 4] });
 * fillnaSeries(s, { value: 0 }).values;              // [1, 0, 0, 4]
 * fillnaSeries(s, { method: "ffill" }).values;       // [1, 1, 1, 4]
 * fillnaSeries(s, { method: "bfill", limit: 1 }).values;  // [1, null, 4, 4]
 * ```
 */
export function fillnaSeries<T extends Scalar>(
  series: Series<T>,
  options: FillnaOptions<T>,
): Series<T> {
  const { value, method, limit } = options;
  if (method === "ffill" || method === "pad") {
    return ffill(series, { limit: limit ?? null });
  }
  if (method === "bfill" || method === "backfill") {
    return bfill(series, { limit: limit ?? null });
  }
  if (value !== undefined) {
    return series.fillna(value);
  }
  return series;
}

/**
 * Fill missing values in a DataFrame using a scalar or a propagation method.
 *
 * @example
 * ```ts
 * fillnaDataFrame(df, { method: "ffill" });
 * fillnaDataFrame(df, { value: 0 });
 * ```
 */
export function fillnaDataFrame(df: DataFrame, options: FillnaOptions<Scalar>): DataFrame {
  const { method, value, limit } = options;
  if (method === "ffill" || method === "pad") {
    return ffillDataFrame(df, { limit: limit ?? null });
  }
  if (method === "bfill" || method === "backfill") {
    return bfillDataFrame(df, { limit: limit ?? null });
  }
  if (value !== undefined) {
    return df.fillna(value);
  }
  return df;
}

/** Options for {@link dropnaSeries} and {@link dropnaDataFrame}. */
export interface DropnaOptions {
  /**
   * For DataFrames: which axis to drop.
   * - `0` (default) — drop rows containing missing values.
   * - `1` — drop columns containing missing values.
   */
  readonly axis?: 0 | 1;
  /**
   * For DataFrames: whether a row/column must have **any** or **all** missing
   * values to be dropped.
   * - `"any"` (default) — drop if any value is missing.
   * - `"all"` — drop only if **all** values are missing.
   */
  readonly how?: "any" | "all";
  /**
   * Minimum number of non-missing values required to keep a row/column.
   * Takes precedence over `how` when specified.
   */
  readonly thresh?: number;
  /**
   * For DataFrames: subset of columns (axis=0) or rows (axis=1) to consider
   * when deciding what to drop.
   */
  readonly subset?: readonly string[];
}

/**
 * Remove missing values from a Series.
 *
 * This is a standalone version of `Series.dropna()` with the same semantics.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, null, 3, NaN, 5] });
 * dropnaSeries(s).values;  // [1, 3, 5]
 * ```
 */
export function dropnaSeries<T extends Scalar>(
  series: Series<T>,
  _options?: DropnaOptions,
): Series<T> {
  return series.dropna();
}

/**
 * Remove rows (or columns) containing missing values from a DataFrame.
 *
 * @example
 * ```ts
 * const df = new DataFrame({ a: [1, null, 3], b: [4, 5, null] });
 * dropnaDataFrame(df).toRecord();            // { a: [1], b: [4] }
 * dropnaDataFrame(df, { how: "all" });       // drops only fully-null rows
 * dropnaDataFrame(df, { thresh: 2 });        // keeps rows with >= 2 non-null
 * dropnaDataFrame(df, { axis: 1 });          // drops columns with any null
 * ```
 */
export function dropnaDataFrame(df: DataFrame, options?: DropnaOptions): DataFrame {
  const axis = options?.axis ?? 0;
  if (axis === 0) {
    return dropRowsDF(df, options);
  }
  return dropColsDF(df, options);
}

/** Drop rows axis logic, extracted for complexity limit. */
function dropRowsDF(df: DataFrame, options?: DropnaOptions): DataFrame {
  const how = options?.how ?? "any";
  const thresh = options?.thresh;
  const subset = options?.subset;
  const nRows = df.shape[0];
  const cols = df.columns.values;
  const checkCols: readonly string[] =
    subset !== undefined ? subset.filter((c) => cols.includes(c)) : cols;

  const keep: number[] = [];
  for (let i = 0; i < nRows; i++) {
    if (rowShouldKeep(df, i, checkCols, how, thresh)) {
      keep.push(i);
    }
  }
  return selectRows(df, keep);
}

/** Drop columns axis logic, extracted for complexity limit. */
function dropColsDF(df: DataFrame, options?: DropnaOptions): DataFrame {
  const how = options?.how ?? "any";
  const thresh = options?.thresh;
  const subset = options?.subset;
  const nRows = df.shape[0];
  const cols = df.columns.values;

  const checkRows: readonly number[] =
    subset !== undefined
      ? subset
          .map((lbl) => {
            try {
              const pos = df.index.getLoc(lbl as Label);
              return typeof pos === "number" ? pos : (pos[0] as number);
            } catch {
              return -1;
            }
          })
          .filter((pos): pos is number => pos >= 0)
      : Array.from({ length: nRows }, (_, k) => k);

  const keepCols: string[] = [];
  for (const name of cols) {
    const s = df.get(name);
    if (s === undefined) {
      continue;
    }
    const vals = checkRows.map((r) => s.values[r] as Scalar);
    if (colShouldKeep(vals, how, thresh)) {
      keepCols.push(name);
    }
  }
  return df.select(keepCols);
}

/** Returns true if the row at position `i` should be kept. */
function rowShouldKeep(
  df: DataFrame,
  i: number,
  cols: readonly string[],
  how: "any" | "all",
  thresh?: number,
): boolean {
  const vals = cols.map((c) => {
    const s = df.get(c);
    return s !== undefined ? (s.values[i] as Scalar) : null;
  });

  if (thresh !== undefined) {
    const nonNullCount = vals.filter((v) => !scalarIsNA(v)).length;
    return nonNullCount >= thresh;
  }

  if (how === "all") {
    return !vals.every((v) => scalarIsNA(v));
  }
  // how === "any"
  return !vals.some((v) => scalarIsNA(v));
}

/** Returns true if a column should be kept (axis=1). */
function colShouldKeep(
  vals: readonly Scalar[],
  how: "any" | "all",
  thresh: number | undefined,
): boolean {
  if (thresh !== undefined) {
    const nonNullCount = vals.filter((v) => !scalarIsNA(v)).length;
    return nonNullCount >= thresh;
  }
  if (how === "all") {
    return !vals.every((v) => scalarIsNA(v));
  }
  // how === "any"
  return !vals.some((v) => scalarIsNA(v));
}

/** Select rows by integer positions (internal helper). */
function selectRows(df: DataFrame, positions: readonly number[]): DataFrame {
  const cols = df.columns.values;
  const colMap = new Map<string, Series<Scalar>>();
  const idxLabels: Label[] = positions.map((i) => df.index.at(i) as Label);
  const newIndex = new Index<Label>(idxLabels);

  for (const name of cols) {
    const s = df.get(name);
    if (s === undefined) {
      continue;
    }
    const data = positions.map((i) => s.values[i] as Scalar);
    colMap.set(name, new Series<Scalar>({ data, dtype: s.dtype }));
  }
  return new DataFrame(colMap, newIndex);
}

// ─── interpolate ─────────────────────────────────────────────────────────────

/** Interpolation methods supported by {@link interpolate}. */
export type InterpolateMethod = "linear" | "index";

/** Options for {@link interpolate}. */
export interface InterpolateOptions {
  /**
   * Interpolation method.
   * - `"linear"` (default) — treat missing values as equally spaced.
   * - `"index"` — use the numeric index positions as x-coordinates.
   */
  readonly method?: InterpolateMethod;
  /**
   * If `true` (default), fill leading/trailing missing values by extending
   * the nearest boundary values.
   */
  readonly fill_value?: "extrapolate" | null;
  /** Maximum number of consecutive NaNs to fill. `null` = unlimited. */
  readonly limit?: number | null;
}

/**
 * Interpolate missing values in a numeric Series using linear interpolation.
 *
 * Only works for numeric Series (float/int dtype or object dtype containing
 * numbers). String / boolean values are left unchanged.
 *
 * Mirrors `Series.interpolate(method="linear")` in pandas.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, null, null, 4] });
 * interpolate(s).values;  // [1, 2, 3, 4]
 *
 * const s2 = new Series({ data: [null, 2, null, 4, null] });
 * interpolate(s2).values;  // [null, 2, 3, 4, null]  (no extrapolation by default)
 * ```
 */
export function interpolate<T extends Scalar>(
  series: Series<T>,
  options?: InterpolateOptions,
): Series<T> {
  const limit = options?.limit ?? null;

  const vals = series.values as readonly T[];
  const result: T[] = [...vals] as T[];
  const n = result.length;

  let i = 0;
  while (i < n) {
    if (!scalarIsNA(result[i] as Scalar)) {
      i++;
      continue;
    }

    const gapStart = i;
    let j = gapStart;
    while (j < n && scalarIsNA(result[j] as Scalar)) {
      j++;
    }
    const gapEnd = j;

    fillGap(result, gapStart, gapEnd, limit);
    i = gapEnd + 1;
  }

  return new Series<T>({
    data: result,
    index: series.index,
    dtype: series.dtype,
    name: series.name,
  });
}

/**
 * Fill a contiguous gap in `result` from `gapStart` (inclusive) to `gapEnd`
 * (exclusive) using linear interpolation between the anchors at
 * `gapStart - 1` and `gapEnd`.
 */
function fillGap<T>(result: T[], gapStart: number, gapEnd: number, limit: number | null): void {
  const leftAnchorIdx = gapStart - 1;
  const rightAnchorIdx = gapEnd < result.length ? gapEnd : -1;

  const hasLeft = leftAnchorIdx >= 0 && !scalarIsNA(result[leftAnchorIdx] as unknown as Scalar);
  const hasRight = rightAnchorIdx >= 0;

  if (!(hasLeft && hasRight)) {
    return; // leading/trailing gap — no extrapolation
  }

  const leftVal = result[leftAnchorIdx] as unknown as number;
  const rightVal = result[rightAnchorIdx] as unknown as number;
  const span = rightAnchorIdx - leftAnchorIdx;

  let filled = 0;
  for (let k = gapStart; k < gapEnd; k++) {
    if (limit !== null && filled >= limit) {
      break;
    }
    const t = (k - leftAnchorIdx) / span;
    result[k] = (leftVal + t * (rightVal - leftVal)) as unknown as T;
    filled++;
  }
}

/**
 * Interpolate missing values column-by-column in a DataFrame.
 *
 * @example
 * ```ts
 * const df = new DataFrame({ a: [1, null, 3], b: [10, null, 30] });
 * interpolateDataFrame(df).toRecord();  // { a: [1, 2, 3], b: [10, 20, 30] }
 * ```
 */
export function interpolateDataFrame(df: DataFrame, options?: InterpolateOptions): DataFrame {
  const cols = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const s = df.get(name);
    if (s !== undefined) {
      cols.set(name, interpolate(s, options));
    }
  }
  return new DataFrame(cols, df.index);
}
