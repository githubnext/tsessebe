/**
 * fillna — fill missing values in Series and DataFrame.
 *
 * Mirrors `pandas.Series.fillna()` / `DataFrame.fillna()`:
 *
 * - `fillnaSeries(series, options)` — fill missing values in a Series
 * - `fillnaDataFrame(df, options)` — fill missing values in a DataFrame
 *
 * ### Fill strategies
 *
 * | Strategy | Description |
 * |---|---|
 * | Scalar `value` | Replace every missing element with a constant |
 * | `method: "ffill"` / `"pad"` | Forward fill — carry last known value forward |
 * | `method: "bfill"` / `"backfill"` | Backward fill — carry next known value backward |
 *
 * ### `limit`
 *
 * Maximum number of consecutive missing values to fill per run.
 * Default `Infinity` (fill all).
 *
 * ### DataFrame `value` variants
 *
 * When filling a DataFrame you may pass:
 * - A **scalar** — fills every missing cell uniformly.
 * - A **`Record<string, Scalar>`** (column map) — each key fills the named column.
 * - A **`Series<Scalar>`** — the Series index labels are matched to column names.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Fill method for missing values — matches `pandas.Series.fillna(method=...)`. */
export type FillnaMethod = "ffill" | "pad" | "bfill" | "backfill";

/** Options for {@link fillnaSeries}. */
export interface FillnaSeriesOptions {
  /**
   * Scalar value to replace missing entries with.
   * Mutually exclusive with `method`.
   */
  readonly value?: Scalar;
  /**
   * Fill method to use.
   * - `"ffill"` / `"pad"`: forward fill
   * - `"bfill"` / `"backfill"`: backward fill
   *
   * Mutually exclusive with `value`.
   */
  readonly method?: FillnaMethod;
  /**
   * Maximum number of consecutive missing values to fill per run.
   * Default `Infinity`.
   */
  readonly limit?: number;
}

/**
 * Per-column fill value for a DataFrame.
 *
 * A plain object whose keys are column names and values are the scalars to
 * use for that column.
 */
export type ColumnFillMap = Readonly<Record<string, Scalar>>;

/** Options for {@link fillnaDataFrame}. */
export interface FillnaDataFrameOptions {
  /**
   * Fill value.  One of:
   * - A **scalar** — fills every missing cell uniformly.
   * - A **`ColumnFillMap`** — per-column fill scalars.
   * - A **`Series<Scalar>`** — the Series index labels are matched to column names.
   *
   * Mutually exclusive with `method`.
   */
  readonly value?: Scalar | ColumnFillMap | Series<Scalar>;
  /**
   * Fill method to use.
   * - `"ffill"` / `"pad"`: forward fill (down each column by default)
   * - `"bfill"` / `"backfill"`: backward fill (down each column by default)
   *
   * Mutually exclusive with `value`.
   */
  readonly method?: FillnaMethod;
  /**
   * Maximum number of consecutive missing values to fill per run.
   * Default `Infinity`.
   */
  readonly limit?: number;
  /**
   * Axis along which to fill (only applicable when `method` is set):
   * - `0` / `"index"` (default) — fill down each **column**
   * - `1` / `"columns"` — fill across each **row**
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a missing value (null / undefined / NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** True when `v` is a plain object (ColumnFillMap), not a Series or primitive. */
function isColumnFillMap(v: unknown): v is ColumnFillMap {
  return v !== null && typeof v === "object" && !(v instanceof Series) && !(v instanceof DataFrame);
}

// ─── core algorithms ──────────────────────────────────────────────────────────

/**
 * Replace each missing value in `vals` with the constant `fill`.
 */
function fillWithScalar(vals: readonly Scalar[], fill: Scalar): Scalar[] {
  return vals.map((v): Scalar => (isMissing(v) ? fill : v));
}

/**
 * Forward fill: replace each missing value with the last seen non-missing
 * value, up to `limit` consecutive positions.
 */
function fillForward(vals: readonly Scalar[], limit: number): Scalar[] {
  const out: Scalar[] = new Array<Scalar>(vals.length);
  let lastKnown: Scalar = null;
  let runCount = 0;

  for (let i = 0; i < vals.length; i++) {
    const v = vals[i] as Scalar;
    if (!isMissing(v)) {
      lastKnown = v;
      runCount = 0;
      out[i] = v;
    } else if (!isMissing(lastKnown) && runCount < limit) {
      out[i] = lastKnown;
      runCount++;
    } else {
      out[i] = v;
    }
  }
  return out;
}

/**
 * Backward fill: replace each missing value with the next non-missing value,
 * up to `limit` consecutive positions.
 */
function fillBackward(vals: readonly Scalar[], limit: number): Scalar[] {
  const out: Scalar[] = new Array<Scalar>(vals.length);
  let nextKnown: Scalar = null;
  let runCount = 0;

  for (let i = vals.length - 1; i >= 0; i--) {
    const v = vals[i] as Scalar;
    if (!isMissing(v)) {
      nextKnown = v;
      runCount = 0;
      out[i] = v;
    } else if (!isMissing(nextKnown) && runCount < limit) {
      out[i] = nextKnown;
      runCount++;
    } else {
      out[i] = v;
    }
  }
  return out;
}

/**
 * Dispatch to the appropriate fill algorithm given a method.
 */
function fillByMethod(vals: readonly Scalar[], method: FillnaMethod, limit: number): Scalar[] {
  if (method === "ffill" || method === "pad") {
    return fillForward(vals, limit);
  }
  return fillBackward(vals, limit);
}

// ─── DataFrame helpers ────────────────────────────────────────────────────────

/** Build a per-column scalar map from a Series whose index holds column names. */
function seriesAsColumnMap(fill: Series<Scalar>, colNames: readonly string[]): Map<string, Scalar> {
  const map = new Map<string, Scalar>();
  for (let i = 0; i < fill.index.size; i++) {
    const label = String(fill.index.at(i));
    if (colNames.includes(label)) {
      const v = fill.values[i];
      map.set(label, v !== undefined ? v : null);
    }
  }
  return map;
}

/** Apply a column-level fill function to every column of a DataFrame. */
function colWiseFill(
  df: DataFrame,
  fn: (vals: readonly Scalar[], name: string) => Scalar[],
): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const col = df.col(name);
    const result = fn(col.values, name);
    colMap.set(name, new Series<Scalar>({ data: result, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}

/** Extract a row from per-column data arrays. */
function extractRow(colData: ReadonlyArray<readonly Scalar[]>, i: number): Scalar[] {
  const row: Scalar[] = new Array<Scalar>(colData.length);
  for (let j = 0; j < colData.length; j++) {
    const col = colData[j];
    const v = col !== undefined ? col[i] : undefined;
    row[j] = v !== undefined ? v : null;
  }
  return row;
}

/** Apply a row-level fill function across each row of a DataFrame. */
function rowWiseFill(df: DataFrame, fn: (vals: readonly Scalar[]) => Scalar[]): DataFrame {
  const colNames = df.columns.values;
  const nRows = df.index.size;
  const colData = colNames.map((c) => df.col(c).values);
  const outCols: Scalar[][] = colNames.map(() => new Array<Scalar>(nRows));

  for (let i = 0; i < nRows; i++) {
    const rowVals = extractRow(colData, i);
    const rowResult = fn(rowVals);
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

// ─── fillnaSeries ─────────────────────────────────────────────────────────────

/**
 * Fill missing (`null` / `undefined` / `NaN`) values in a Series.
 *
 * Mirrors `pandas.Series.fillna(value, method, limit)`.
 *
 * Exactly one of `options.value` or `options.method` should be provided.
 * If neither is given, the Series is returned unchanged.
 * If both are given, `value` takes precedence.
 *
 * @example
 * ```ts
 * import { Series, fillnaSeries } from "tsb";
 *
 * const s = new Series({ data: [1, null, null, 4] });
 * fillnaSeries(s, { value: 0 }).values;          // [1, 0, 0, 4]
 * fillnaSeries(s, { method: "ffill" }).values;   // [1, 1, 1, 4]
 * fillnaSeries(s, { method: "bfill" }).values;   // [1, 4, 4, 4]
 * fillnaSeries(s, { method: "ffill", limit: 1 }).values; // [1, 1, null, 4]
 * ```
 */
export function fillnaSeries(
  series: Series<Scalar>,
  options: FillnaSeriesOptions = {},
): Series<Scalar> {
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  let result: Scalar[];

  if (options.value !== undefined) {
    result = fillWithScalar(series.values, options.value);
  } else if (options.method !== undefined) {
    result = fillByMethod(series.values, options.method, limit);
  } else {
    result = Array.from(series.values);
  }

  return new Series<Scalar>({ data: result, index: series.index, name: series.name });
}

// ─── fillnaDataFrame ──────────────────────────────────────────────────────────

/**
 * Fill missing (`null` / `undefined` / `NaN`) values in a DataFrame.
 *
 * Mirrors `pandas.DataFrame.fillna(value, method, limit, axis)`.
 *
 * ### Value variants
 *
 * - `value: scalar` — fills every missing cell.
 * - `value: ColumnFillMap` — per-column scalars (`{ a: 0, b: -1 }`).
 * - `value: Series<Scalar>` — Series index labels matched to column names.
 *
 * ### Method fill
 *
 * `method` fills propagate along an axis:
 * - `axis=0` / `"index"` (default) — down each column.
 * - `axis=1` / `"columns"` — across each row.
 *
 * @example
 * ```ts
 * import { DataFrame, fillnaDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, null, 3], b: [null, 2, null] });
 * fillnaDataFrame(df, { value: 0 }).col("a").values;          // [1, 0, 3]
 * fillnaDataFrame(df, { value: { a: -1, b: 99 } }).col("b").values; // [99, 2, 99]
 * fillnaDataFrame(df, { method: "ffill" }).col("b").values;   // [null, 2, 2]
 * fillnaDataFrame(df, { method: "bfill" }).col("a").values;   // [1, 3, 3]
 * ```
 */
export function fillnaDataFrame(df: DataFrame, options: FillnaDataFrameOptions = {}): DataFrame {
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const axis = options.axis ?? 0;
  const colNames = df.columns.values;

  // ── value-based fill ──────────────────────────────────────────────────────
  if (options.value !== undefined) {
    const fillVal = options.value;

    if (fillVal instanceof Series) {
      // Series: match index labels to column names
      const colFillMap = seriesAsColumnMap(fillVal, colNames);
      return colWiseFill(df, (vals, name): Scalar[] => {
        const fill = colFillMap.get(name);
        if (fill === undefined) {
          return Array.from(vals);
        }
        return fillWithScalar(vals, fill);
      });
    }

    if (isColumnFillMap(fillVal)) {
      // ColumnFillMap: per-column scalars
      return colWiseFill(df, (vals, name): Scalar[] => {
        const fill = fillVal[name];
        if (fill === undefined) {
          return Array.from(vals);
        }
        return fillWithScalar(vals, fill);
      });
    }

    // plain scalar
    return colWiseFill(df, (vals): Scalar[] => fillWithScalar(vals, fillVal as Scalar));
  }

  // ── method-based fill ─────────────────────────────────────────────────────
  if (options.method !== undefined) {
    const method = options.method;
    const fn = (vals: readonly Scalar[]): Scalar[] => fillByMethod(vals, method, limit);

    if (axis === 1 || axis === "columns") {
      return rowWiseFill(df, fn);
    }
    return colWiseFill(df, fn);
  }

  // ── no-op ─────────────────────────────────────────────────────────────────
  return df;
}
