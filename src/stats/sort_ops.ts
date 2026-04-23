/**
 * sort_ops — value and index sorting for Series and DataFrame.
 *
 * Mirrors the pandas sort methods:
 *
 * - `sortValuesSeries(s, options)` — sort a Series by its values
 * - `sortIndexSeries(s, options)` — sort a Series by its index labels
 * - `sortValuesDataFrame(df, by, options)` — sort a DataFrame by one or more column values
 * - `sortIndexDataFrame(df, options)` — sort a DataFrame by its row index (or column names)
 *
 * All functions return a **new** object — the original is never mutated.
 *
 * @example
 * ```ts
 * import { Series, DataFrame, sortValuesSeries, sortValuesDataFrame } from "tsb";
 *
 * const s = new Series({ data: [3, 1, null, 2], index: ["b", "d", "a", "c"] });
 * sortValuesSeries(s);
 * // Series([1, 2, 3, null], index=["d","c","b","a"])  ← NaN/null last by default
 *
 * const df = DataFrame.fromColumns({ a: [3, 1, 2], b: [10, 30, 20] });
 * sortValuesDataFrame(df, "a");
 * // rows in order: index 1 (a=1), index 2 (a=2), index 0 (a=3)
 * ```
 *
 * @module
 */

import { DataFrame, Index, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when v is null, undefined, or NaN. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Build an argsort permutation that places missing values at the specified
 * position, and sorts non-missing values with the given comparator.
 */
function argsortWithNa(
  values: readonly Scalar[],
  ascending: boolean,
  naPosition: "first" | "last",
): number[] {
  const n = values.length;
  const missing: number[] = [];
  const present: number[] = [];

  for (let i = 0; i < n; i++) {
    if (isMissing(values[i])) {
      missing.push(i);
    } else {
      present.push(i);
    }
  }

  // Sort the non-missing indices by their values.
  present.sort((a, b) => {
    const av = values[a] as Scalar;
    const bv = values[b] as Scalar;
    return compareNonNull(av, bv, ascending);
  });

  return naPosition === "last" ? [...present, ...missing] : [...missing, ...present];
}

/** Compare two non-null/non-NaN scalars. */
function compareNonNull(a: Scalar, b: Scalar, ascending: boolean): number {
  let result: number;
  if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  } else if (typeof a === "boolean" && typeof b === "boolean") {
    result = (a ? 1 : 0) - (b ? 1 : 0);
  } else {
    const as_ = String(a);
    const bs_ = String(b);
    result = as_ < bs_ ? -1 : as_ > bs_ ? 1 : 0;
  }
  return ascending ? result : -result;
}

/** Build a default 0..n-1 index. */
function rangeIndex(n: number): Index<Label> {
  const labels: number[] = [];
  for (let i = 0; i < n; i++) {
    labels.push(i);
  }
  return new Index<Label>(labels);
}

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link sortValuesSeries}. */
export interface SortValuesSeriesOptions {
  /**
   * Sort ascending (default `true`). Pass `false` for descending order.
   */
  readonly ascending?: boolean;
  /**
   * Where to place `null` / `NaN` values.
   * @defaultValue `"last"`
   */
  readonly naPosition?: "first" | "last";
  /**
   * If `true`, reset the resulting index to `0, 1, 2, …`
   * @defaultValue `false`
   */
  readonly ignoreIndex?: boolean;
}

/** Options for {@link sortIndexSeries}. */
export interface SortIndexSeriesOptions {
  /**
   * Sort ascending (default `true`). Pass `false` for descending order.
   */
  readonly ascending?: boolean;
  /**
   * Where to place index entries that are `null` / `NaN`.
   * @defaultValue `"last"`
   */
  readonly naPosition?: "first" | "last";
  /**
   * If `true`, reset the resulting index to `0, 1, 2, …`
   * @defaultValue `false`
   */
  readonly ignoreIndex?: boolean;
}

/** Options for {@link sortValuesDataFrame}. */
export interface SortValuesDataFrameOptions {
  /**
   * Sort ascending. Can be a single boolean (applies to all `by` columns) or
   * an array of booleans (one per column in `by`).
   * @defaultValue `true`
   */
  readonly ascending?: boolean | readonly boolean[];
  /**
   * Where to place rows whose sort-key column value is `null` / `NaN`.
   * @defaultValue `"last"`
   */
  readonly naPosition?: "first" | "last";
  /**
   * If `true`, reset the resulting row index to `0, 1, 2, …`
   * @defaultValue `false`
   */
  readonly ignoreIndex?: boolean;
}

/** Options for {@link sortIndexDataFrame}. */
export interface SortIndexDataFrameOptions {
  /**
   * Sort ascending (default `true`). Pass `false` for descending order.
   */
  readonly ascending?: boolean;
  /**
   * Which axis to sort.
   * - `0` (default) — sort rows by row-index labels.
   * - `1` — sort columns by column names.
   */
  readonly axis?: 0 | 1;
  /**
   * Where to place index labels that are `null` / `NaN`.
   * @defaultValue `"last"`
   */
  readonly naPosition?: "first" | "last";
  /**
   * If `true`, reset the resulting index to `0, 1, 2, …` (only valid for axis=0).
   * @defaultValue `false`
   */
  readonly ignoreIndex?: boolean;
}

// ─── sortValuesSeries ─────────────────────────────────────────────────────────

/**
 * Sort a Series by its values.
 *
 * Mirrors `pandas.Series.sort_values()`.
 *
 * @example
 * ```ts
 * import { Series, sortValuesSeries } from "tsb";
 *
 * const s = new Series({ data: [3, 1, 2], index: ["b", "a", "c"] });
 * sortValuesSeries(s);
 * // Series([1, 2, 3], index=["a","c","b"])
 *
 * sortValuesSeries(s, { ascending: false });
 * // Series([3, 2, 1], index=["b","c","a"])
 * ```
 */
export function sortValuesSeries(
  s: Series<Scalar>,
  options?: SortValuesSeriesOptions,
): Series<Scalar> {
  const ascending = options?.ascending ?? true;
  const naPosition = options?.naPosition ?? "last";
  const ignoreIndex = options?.ignoreIndex ?? false;

  const perm = argsortWithNa(s.values, ascending, naPosition);
  const newData = perm.map((i) => s.values[i] as Scalar);
  const newIndex = ignoreIndex
    ? rangeIndex(perm.length)
    : new Index<Label>(perm.map((i) => s.index.at(i)));

  return new Series<Scalar>({ data: newData, index: newIndex, name: s.name });
}

// ─── sortIndexSeries ──────────────────────────────────────────────────────────

/**
 * Sort a Series by its index labels.
 *
 * Mirrors `pandas.Series.sort_index()`.
 *
 * @example
 * ```ts
 * import { Series, sortIndexSeries } from "tsb";
 *
 * const s = new Series({ data: [3, 1, 2], index: ["b", "a", "c"] });
 * sortIndexSeries(s);
 * // Series([1, 3, 2], index=["a","b","c"])
 * ```
 */
export function sortIndexSeries(
  s: Series<Scalar>,
  options?: SortIndexSeriesOptions,
): Series<Scalar> {
  const ascending = options?.ascending ?? true;
  const naPosition = options?.naPosition ?? "last";
  const ignoreIndex = options?.ignoreIndex ?? false;

  const labels = s.index.values;
  const perm = argsortWithNa(labels, ascending, naPosition);
  const newData = perm.map((i) => s.values[i] as Scalar);
  const newIndex = ignoreIndex
    ? rangeIndex(perm.length)
    : new Index<Label>(perm.map((i) => labels[i] as Label));

  return new Series<Scalar>({ data: newData, index: newIndex, name: s.name });
}

// ─── sortValuesDataFrame ──────────────────────────────────────────────────────

/**
 * Sort a DataFrame by the values of one or more columns.
 *
 * Mirrors `pandas.DataFrame.sort_values(by, ...)`.
 *
 * When multiple sort keys are provided (array `by`), later columns act as
 * tie-breakers for earlier ones — matching pandas' stable-sort behaviour.
 *
 * @example
 * ```ts
 * import { DataFrame, sortValuesDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [3, 1, 2], b: [10, 30, 20] });
 * sortValuesDataFrame(df, "a");
 * // rows in order 1, 2, 0  (a=1, a=2, a=3)
 *
 * sortValuesDataFrame(df, ["b", "a"]);
 * // rows in order 0, 2, 1  (b=10, b=20, b=30)
 * ```
 */
export function sortValuesDataFrame(
  df: DataFrame,
  by: string | readonly string[],
  options?: SortValuesDataFrameOptions,
): DataFrame {
  const byArr = typeof by === "string" ? [by] : [...by];
  const ascending = options?.ascending ?? true;
  const naPosition = options?.naPosition ?? "last";
  const ignoreIndex = options?.ignoreIndex ?? false;

  const nRows = df.index.size;
  const perm: number[] = [];
  for (let i = 0; i < nRows; i++) {
    perm.push(i);
  }

  // Build ascending flags per key.
  const ascFlags: boolean[] = byArr.map((_, ki) => {
    if (typeof ascending === "boolean") {
      return ascending;
    }
    return (ascending as readonly boolean[])[ki] ?? true;
  });

  // Stable sort: sort by last key first, then earlier keys (to get multi-key).
  // Equivalent to a single pass sort with a compound comparator.
  perm.sort((a, b) => {
    for (let ki = 0; ki < byArr.length; ki++) {
      const col = byArr[ki] as string;
      const asc = ascFlags[ki] ?? true;
      const av = df.col(col).values[a] as Scalar;
      const bv = df.col(col).values[b] as Scalar;
      const aMiss = isMissing(av);
      const bMiss = isMissing(bv);
      if (aMiss && bMiss) {
        continue;
      }
      if (aMiss) {
        return naPosition === "last" ? 1 : -1;
      }
      if (bMiss) {
        return naPosition === "last" ? -1 : 1;
      }
      const cmp = compareNonNull(av, bv, asc);
      if (cmp !== 0) {
        return cmp;
      }
    }
    return 0;
  });

  const result = df.iloc(perm);

  if (ignoreIndex) {
    const colsObj: Record<string, Scalar[]> = {};
    for (const c of result.columns.values) {
      colsObj[c] = [...result.col(c).values];
    }
    return DataFrame.fromColumns(colsObj);
  }

  return result;
}

// ─── sortIndexDataFrame ───────────────────────────────────────────────────────

/**
 * Sort a DataFrame by its row index labels (axis=0) or column names (axis=1).
 *
 * Mirrors `pandas.DataFrame.sort_index()`.
 *
 * @example
 * ```ts
 * import { DataFrame, sortIndexDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns(
 *   { x: [1, 2, 3] },
 *   { index: ["b", "a", "c"] },
 * );
 * sortIndexDataFrame(df);
 * // rows reordered: "a" (row 1), "b" (row 0), "c" (row 2)
 *
 * const df2 = DataFrame.fromColumns({ z: [1], a: [2], m: [3] });
 * sortIndexDataFrame(df2, { axis: 1 });
 * // columns in alphabetical order: "a", "m", "z"
 * ```
 */
export function sortIndexDataFrame(df: DataFrame, options?: SortIndexDataFrameOptions): DataFrame {
  const ascending = options?.ascending ?? true;
  const axis = options?.axis ?? 0;
  const naPosition = options?.naPosition ?? "last";
  const ignoreIndex = options?.ignoreIndex ?? false;

  if (axis === 1) {
    // Sort columns by their names.
    const colLabels = df.columns.values;
    const perm = argsortWithNa(colLabels, ascending, naPosition);
    const sortedColNames = perm.map((i) => colLabels[i] as string);
    return df.select(sortedColNames);
  }

  // Sort rows by index labels.
  const labels = df.index.values;
  const perm = argsortWithNa(labels, ascending, naPosition);

  const result = df.iloc(perm);

  if (ignoreIndex) {
    const colsObj: Record<string, Scalar[]> = {};
    for (const c of result.columns.values) {
      colsObj[c] = [...result.col(c).values];
    }
    return DataFrame.fromColumns(colsObj);
  }

  return result;
}
