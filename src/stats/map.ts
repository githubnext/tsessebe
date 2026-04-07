/**
 * map / transform — element-wise value mapping and same-shape transformation.
 *
 * Mirrors the following pandas methods:
 * - `Series.map(arg, na_action=None)` — map values through a function, dict, or
 *   `Map`; missing values are propagated unless `na_action` is supplied.
 * - `DataFrame.transform(func, axis=0)` — apply a function to each column (or
 *   row), returning a same-shaped DataFrame.
 *
 * All functions are **pure** (return new Series/DataFrame; inputs are unchanged).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Controls how `NA` values are handled when the mapping argument is a function.
 *
 * - `undefined` (default): NA values **are** passed to the function.
 * - `"ignore"`: NA values are passed through unchanged (not passed to the function).
 */
export type NaAction = "ignore" | undefined;

/**
 * A plain-object dict whose keys and values are scalars.
 * Used as a shorthand for `Map<Scalar, Scalar>` in `seriesMap`.
 */
export type MapDict = Record<string | number, Scalar>;

/**
 * The argument accepted by {@link seriesMap}.
 *
 * - **Function**: called for each element → returns the mapped value.
 * - **`Map`**: native ES `Map`; missing keys produce `undefined` (treated as NA).
 * - **`MapDict`**: plain object used as a lookup table.
 * - **`Series`**: the Series' index labels are matched against source values;
 *   values not found in the index become `undefined`.
 */
export type MapArg =
  | ((value: Scalar) => Scalar)
  | Map<Scalar, Scalar>
  | MapDict
  | Series<Scalar>;

/** Options for {@link seriesMap}. */
export interface SeriesMapOptions {
  /**
   * How NA values are handled when `arg` is a function.
   * - `undefined` (default): NA values are passed to `arg`.
   * - `"ignore"`: NA values are returned as-is without calling `arg`.
   */
  readonly naAction?: NaAction;
}

/** Options for {@link dataFrameTransform}. */
export interface TransformOptions {
  /**
   * Axis along which to apply `func`.
   * - `0` / `"index"` (default): apply `func` to each **column** Series.
   * - `1` / `"columns"`: apply `func` to each **row** Series.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a value should be considered "missing" (NA). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Coerce a {@link MapArg} into a lookup function `Scalar → Scalar`.
 * Missing keys in dict/Map/Series produce `undefined` (becomes NA in output).
 */
function resolveMapper(arg: MapArg): (v: Scalar) => Scalar {
  if (typeof arg === "function") {
    return arg;
  }

  if (arg instanceof Map) {
    return (v: Scalar) => {
      if (arg.has(v)) {
        return arg.get(v) as Scalar;
      }
      return undefined;
    };
  }

  if (arg instanceof Series) {
    // Build a lookup from the index labels → values.
    const lookup = new Map<Scalar, Scalar>();
    const labels = arg.index.values;
    const vals = arg.values;
    for (let i = 0; i < labels.length; i++) {
      lookup.set(labels[i] as Scalar, vals[i] as Scalar);
    }
    return (v: Scalar) => {
      if (lookup.has(v)) {
        return lookup.get(v) as Scalar;
      }
      return undefined;
    };
  }

  // Plain-object dict: keys are strings/numbers.
  const dict = arg as MapDict;
  return (v: Scalar) => {
    const key = String(v);
    if (Object.prototype.hasOwnProperty.call(dict, key)) {
      return dict[key];
    }
    // Also try numeric key for number values.
    if (typeof v === "number" && Object.prototype.hasOwnProperty.call(dict, v)) {
      return dict[v];
    }
    return undefined;
  };
}

// ─── seriesMap ────────────────────────────────────────────────────────────────

/**
 * Map values of a Series through a function, `Map`, dict, or another Series.
 *
 * - **Function**: called for each element and the result replaces the element.
 * - **`Map`** / **dict** / **`Series`**: each element is looked up in the
 *   mapping; elements not found become `undefined` (NA).
 * - `naAction="ignore"`: skip NA elements entirely — they remain NA in output.
 *   Only meaningful when `arg` is a function.
 *
 * Mirrors `pandas.Series.map(arg, na_action=None)`.
 *
 * @example
 * ```ts
 * import { Series, seriesMap } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, null] });
 *
 * // function
 * seriesMap(s, (v) => (v as number) * 10).values; // [10, 20, 30, null]
 *
 * // dict
 * seriesMap(s, { 1: "one", 2: "two", 3: "three" }).values;
 * // ["one", "two", "three", undefined]
 *
 * // na_action ignore
 * seriesMap(s, (v) => (v as number) * 10, { naAction: "ignore" }).values;
 * // [10, 20, 30, null]
 * ```
 */
export function seriesMap(
  series: Series<Scalar>,
  arg: MapArg,
  options: SeriesMapOptions = {},
): Series<Scalar> {
  const { naAction } = options;
  const mapper = resolveMapper(arg);
  const n = series.values.length;
  const out: Scalar[] = new Array<Scalar>(n);

  for (let i = 0; i < n; i++) {
    const v = series.values[i] as Scalar;
    if (naAction === "ignore" && isMissing(v)) {
      out[i] = v;
    } else {
      out[i] = mapper(v);
    }
  }

  return new Series<Scalar>({ data: out, index: series.index, name: series.name });
}

// ─── dataFrameTransform ───────────────────────────────────────────────────────

/** Helper: extract row `i` from `df` as a `Series` keyed by column names. */
function extractRow(df: DataFrame, i: number, colIdx: Index<Label>): Series<Scalar> {
  const row: Scalar[] = [];
  for (const name of df.columns.values) {
    row.push(df.col(name).values[i] as Scalar);
  }
  return new Series<Scalar>({ data: row, index: colIdx });
}

/** Helper: convert a `Series` result to a `Scalar[]` of length `expected`. */
function toScalarArray(result: Series<Scalar> | readonly Scalar[], expected: number): Scalar[] {
  if (result instanceof Series) {
    if (result.values.length !== expected) {
      throw new RangeError(
        `transform: function returned a Series of length ${result.values.length} but expected ${expected}.`,
      );
    }
    return Array.from(result.values) as Scalar[];
  }
  if (result.length !== expected) {
    throw new RangeError(
      `transform: function returned an array of length ${result.length} but expected ${expected}.`,
    );
  }
  return Array.from(result) as Scalar[];
}

/**
 * Apply a function to each column (or row) of a DataFrame, returning a
 * **same-shaped** DataFrame.
 *
 * - `axis=0` (default): `func` is called with each **column** as a `Series`
 *   and must return a `Series` or array of the same length.
 * - `axis=1`: `func` is called with each **row** as a `Series` (column names
 *   as index) and must return a `Series` or array whose length equals the
 *   number of columns.
 * - `func` may also be a `Record<string, TransformFn>` (dict of per-column
 *   functions) — only meaningful with `axis=0`.
 *
 * Mirrors `pandas.DataFrame.transform(func, axis=0)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameTransform } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 *
 * // double every value in each column
 * dataFrameTransform(df, (col) =>
 *   col.values.map((v) => (v as number) * 2)
 * ).col("a").values; // [2, 4, 6]
 *
 * // per-column functions
 * dataFrameTransform(df, {
 *   a: (col) => col.values.map((v) => (v as number) + 10),
 *   b: (col) => col.values.map((v) => (v as number) - 1),
 * }).col("b").values; // [3, 4, 5]
 * ```
 */
export type TransformFn = (slice: Series<Scalar>) => Series<Scalar> | readonly Scalar[];
export type TransformArg = TransformFn | Record<string, TransformFn>;

export function dataFrameTransform(
  df: DataFrame,
  func: TransformArg,
  options: TransformOptions = {},
): DataFrame {
  const axis = options.axis ?? 0;
  const nRows = df.index.size;
  const colNames = df.columns.values;

  if (axis === 1 || axis === "columns") {
    // row-wise: func applied to each row Series
    if (typeof func !== "function") {
      throw new TypeError("transform: per-column dict is only supported with axis=0.");
    }
    const colIdx = new Index<Label>(colNames as readonly Label[]);
    // Accumulate results per-column position
    const colData: Scalar[][] = colNames.map(() => new Array<Scalar>(nRows));
    for (let i = 0; i < nRows; i++) {
      const row = extractRow(df, i, colIdx);
      const result = toScalarArray(func(row), colNames.length);
      for (let j = 0; j < colNames.length; j++) {
        (colData[j] as Scalar[])[i] = result[j] as Scalar;
      }
    }
    const colMap = new Map<string, Series<Scalar>>();
    for (let j = 0; j < colNames.length; j++) {
      const name = colNames[j] as string;
      colMap.set(name, new Series<Scalar>({ data: colData[j] as Scalar[], index: df.index, name }));
    }
    return new DataFrame(colMap, df.index);
  }

  // axis=0 (default): column-wise
  const colMap = new Map<string, Series<Scalar>>();

  if (typeof func === "function") {
    for (const name of colNames) {
      const col = df.col(name);
      const result = toScalarArray(func(col), nRows);
      colMap.set(name, new Series<Scalar>({ data: result, index: df.index, name }));
    }
  } else {
    // Dict of per-column functions — only transform named columns; others pass through.
    for (const name of colNames) {
      const col = df.col(name);
      const fn = func[name];
      if (fn !== undefined) {
        const result = toScalarArray(fn(col), nRows);
        colMap.set(name, new Series<Scalar>({ data: result, index: df.index, name }));
      } else {
        colMap.set(name, col);
      }
    }
  }

  return new DataFrame(colMap, df.index);
}
