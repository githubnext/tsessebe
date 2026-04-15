/**
 * isin — element-wise membership testing.
 *
 * Mirrors `pandas.Series.isin` and `pandas.DataFrame.isin`:
 * - {@link isin}: check whether each element of a `Series` is contained in a
 *   collection of values.
 * - {@link dataFrameIsin}: check membership for an entire `DataFrame`, with
 *   optional per-column lookup tables.
 *
 * **NaN behaviour (matches pandas):** `NaN` is _never_ considered a member of
 * any collection, even if the collection itself contains `NaN`.  All other
 * missing values (`null`, `undefined`) use strict equality and _will_ match if
 * present in the values list.
 *
 * @example
 * ```ts
 * import { isin, dataFrameIsin } from "tsb";
 * import { Series, DataFrame } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, null], name: "x" });
 * isin(s, [1, 3]);
 * // Series([true, false, true, false], name="x")
 *
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * dataFrameIsin(df, [1, 3]);
 * // DataFrame({ a: [true, false], b: [true, false] })
 *
 * dataFrameIsin(df, { a: [1], b: [4] });
 * // DataFrame({ a: [true, false], b: [false, true] })
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * A collection of values to test membership against.
 *
 * Accepts any `Iterable<Scalar>` — arrays, Sets, generator sequences, etc.
 * Duplicates are silently de-duplicated for performance.
 */
export type IsinValues = Iterable<Scalar>;

/**
 * Per-column lookup map for {@link dataFrameIsin}.
 *
 * Keys are column names; values are the collections to test that column
 * against.  Columns absent from the map are checked against an empty set
 * (all values → `false`).
 */
export type IsinDict = Readonly<Record<string, IsinValues>>;

/**
 * Accepted `values` argument for {@link dataFrameIsin}:
 * - `IsinValues` — all columns share the same lookup.
 * - `IsinDict`   — per-column lookup tables.
 */
export type DataFrameIsinValues = IsinValues | IsinDict;

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a `Set<Scalar>` from any iterable of scalars.
 * (The Set is used for O(1) membership tests.)
 */
function buildSet(values: IsinValues): ReadonlySet<Scalar> {
  return new Set<Scalar>(values);
}

/**
 * Test whether `value` is a member of `lookup`.
 *
 * - `NaN` is never a member (matches pandas behaviour).
 * - All other values use the Set's SameValueZero equality
 *   (`null === null`, `-0 === +0`, etc.).
 */
function memberOf(value: Scalar, lookup: ReadonlySet<Scalar>): boolean {
  if (typeof value === "number" && Number.isNaN(value)) {
    return false;
  }
  return lookup.has(value);
}

/** Return `true` when `obj` is a plain record (IsinDict), not an Iterable. */
function isIsinDict(obj: DataFrameIsinValues): obj is IsinDict {
  return (
    obj !== null &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    !(obj instanceof Set) &&
    !Reflect.has(obj, Symbol.iterator)
  );
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Check whether each element of `series` is contained in `values`.
 *
 * Returns a boolean `Series` with the same index and name as the input.
 * `NaN` values in `series` always produce `false`, even if `NaN` appears in
 * `values`.
 *
 * @param series - The Series to test.
 * @param values - A collection of scalars to test membership against.
 * @returns A `Series<boolean>` with `true` where `series[i] ∈ values`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, NaN, null], name: "x" });
 * isin(s, [1, null]);
 * // Series([true, false, false, false, true], name="x")
 * ```
 */
export function isin(series: Series<Scalar>, values: IsinValues): Series<boolean> {
  const lookup = buildSet(values);
  const result: boolean[] = new Array<boolean>(series.size);
  for (let i = 0; i < series.size; i++) {
    // series.values[i] has type Scalar | undefined under noUncheckedIndexedAccess.
    // Since undefined ∈ Scalar the union collapses: the value is a valid Scalar.
    const v: Scalar = series.values[i] as Scalar;
    result[i] = memberOf(v, lookup);
  }
  return new Series<boolean>({ data: result, index: series.index, name: series.name });
}

/**
 * Check whether each element of `df` is contained in `values`.
 *
 * When `values` is an `IsinValues` (array, Set, iterable), every cell is
 * tested against the same collection.
 *
 * When `values` is an `IsinDict` (plain object mapping column name → values),
 * each column is tested against its own lookup.  Columns absent from the dict
 * are treated as having an empty lookup (all `false`).
 *
 * Returns a `DataFrame` of the same shape and index/columns as `df`, where
 * each cell is `true` if the original value was a member of the corresponding
 * lookup.
 *
 * @param df     - The DataFrame to test.
 * @param values - Shared collection or per-column dict.
 * @returns A `DataFrame` of booleans.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: ["x", "y", "z"] });
 *
 * // Shared collection:
 * dataFrameIsin(df, [1, "y"]);
 * // { a: [true, false, false], b: [false, true, false] }
 *
 * // Per-column dict:
 * dataFrameIsin(df, { a: [2, 3], b: ["x"] });
 * // { a: [false, true, true], b: [true, false, false] }
 * ```
 */
export function dataFrameIsin(df: DataFrame, values: DataFrameIsinValues): DataFrame {
  const colNames = [...df.columns.values];

  if (isIsinDict(values)) {
    // Per-column lookup: build a Set for each present column.
    const lookups = new Map<string, ReadonlySet<Scalar>>();
    for (const col of colNames) {
      const colValues = (values as Record<string, IsinValues | undefined>)[col];
      lookups.set(col, colValues !== undefined ? buildSet(colValues) : new Set<Scalar>());
    }

    const resultCols = new Map<string, Series<Scalar>>();
    for (const col of colNames) {
      const src = df.col(col);
      const lookup = lookups.get(col) as ReadonlySet<Scalar>;
      const data: Scalar[] = new Array<Scalar>(src.size);
      for (let i = 0; i < src.size; i++) {
        data[i] = memberOf(src.values[i] as Scalar, lookup);
      }
      resultCols.set(col, new Series<Scalar>({ data, index: df.index, name: col }));
    }
    return new DataFrame(resultCols, df.index);
  }

  // Shared collection: one Set for all columns.
  const lookup = buildSet(values as IsinValues);
  const resultCols = new Map<string, Series<Scalar>>();
  for (const col of colNames) {
    const src = df.col(col);
    const data: Scalar[] = new Array<Scalar>(src.size);
    for (let i = 0; i < src.size; i++) {
      data[i] = memberOf(src.values[i] as Scalar, lookup);
    }
    resultCols.set(col, new Series<Scalar>({ data, index: df.index, name: col }));
  }
  return new DataFrame(resultCols, df.index);
}
