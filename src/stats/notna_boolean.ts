/**
 * notna_boolean — boolean-mask indexing helpers for Series and DataFrames.
 *
 * Complements the existing `notna`/`isna` predicates by exposing
 * easy selection helpers inspired by pandas boolean-indexing idioms:
 *
 * - {@link keepTrue}    — keep elements where a boolean mask is `true`
 * - {@link keepFalse}   — keep elements where a boolean mask is `false`
 * - {@link filterBy}    — filter DataFrame rows by a boolean array / Series mask
 *
 * ### Usage
 *
 * ```ts
 * import { Series, DataFrame, keepTrue, keepFalse, filterBy } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4], index: [0, 1, 2, 3] });
 * const mask = new Series({ data: [true, false, true, false], index: [0, 1, 2, 3] });
 *
 * keepTrue(s, mask).values;  // [1, 3]
 * keepFalse(s, mask).values; // [2, 4]
 *
 * const df = DataFrame.fromColumns({ a: [10, 20, 30], b: [1, 2, 3] });
 * const dfMask = [true, false, true];
 * filterBy(df, dfMask).col("a").values; // [10, 30]
 * ```
 *
 * @module
 */

import { type DataFrame, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert a mask value to a boolean. Truthy = `true`, falsy = `false`. */
function toBoolean(v: Scalar | boolean): boolean {
  return v !== null && v !== undefined && v !== false && v !== 0 && v !== "";
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Keep Series elements where the corresponding mask value is truthy.
 *
 * The mask can be:
 * - A `Series<Scalar>` aligned by position (same length as `series`).
 * - A plain `boolean[]` (same length as `series`).
 *
 * Missing mask values (`null`, `undefined`, `NaN`) are treated as `false`.
 *
 * @param series - Source Series.
 * @param mask   - Boolean Series or `boolean[]`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });
 * keepTrue(s, [true, false, true]).values; // [10, 30]
 * ```
 */
export function keepTrue(
  series: Series<Scalar>,
  mask: Series<Scalar> | readonly boolean[],
): Series<Scalar> {
  const values = series.values as readonly Scalar[];
  const maskVals: readonly (Scalar | boolean)[] =
    mask instanceof Series ? (mask.values as readonly Scalar[]) : mask;

  const resultData: Scalar[] = [];
  const resultIndex: Label[] = [];

  for (let i = 0; i < values.length; i++) {
    const mv = maskVals[i] ?? null;
    if (toBoolean(mv)) {
      resultData.push(values[i] ?? null);
      resultIndex.push(series.index.at(i) ?? (i as Label));
    }
  }

  return new Series<Scalar>({
    data: resultData,
    index: resultIndex,
    name: series.name,
  });
}

/**
 * Keep Series elements where the corresponding mask value is falsy.
 *
 * This is the complement of {@link keepTrue}.
 *
 * @param series - Source Series.
 * @param mask   - Boolean Series or `boolean[]`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });
 * keepFalse(s, [true, false, true]).values; // [20]
 * ```
 */
export function keepFalse(
  series: Series<Scalar>,
  mask: Series<Scalar> | readonly boolean[],
): Series<Scalar> {
  const values = series.values as readonly Scalar[];
  const maskVals: readonly (Scalar | boolean)[] =
    mask instanceof Series ? (mask.values as readonly Scalar[]) : mask;

  const resultData: Scalar[] = [];
  const resultIndex: Label[] = [];

  for (let i = 0; i < values.length; i++) {
    const mv = maskVals[i] ?? null;
    if (!toBoolean(mv)) {
      resultData.push(values[i] ?? null);
      resultIndex.push(series.index.at(i) ?? (i as Label));
    }
  }

  return new Series<Scalar>({
    data: resultData,
    index: resultIndex,
    name: series.name,
  });
}

/**
 * Filter DataFrame rows by a boolean mask, keeping rows where the mask is truthy.
 *
 * The mask can be:
 * - A `Series<Scalar>` aligned by position (same length as the DataFrame).
 * - A plain `boolean[]` (same length as the DataFrame).
 *
 * @param df   - Source DataFrame.
 * @param mask - Boolean mask.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * filterBy(df, [true, false, true]).col("a").values; // [1, 3]
 * ```
 */
export function filterBy(df: DataFrame, mask: Series<Scalar> | readonly boolean[]): DataFrame {
  const maskVals: readonly (Scalar | boolean)[] =
    mask instanceof Series ? (mask.values as readonly Scalar[]) : mask;

  const keepPositions: number[] = [];
  for (let i = 0; i < df.index.size; i++) {
    const mv = maskVals[i] ?? null;
    if (toBoolean(mv)) {
      keepPositions.push(i);
    }
  }

  return df.iloc(keepPositions);
}
