/**
 * memory_usage — estimate memory consumption of Series and DataFrame.
 *
 * Mirrors `pandas.Series.memory_usage()` and `pandas.DataFrame.memory_usage()`:
 * - Returns the number of bytes consumed by the data values.
 * - `index: true` (default) includes the index in the estimate.
 * - `deep: false` (default) uses dtype item size for fixed-width dtypes and
 *   a per-pointer constant (8 bytes) for variable-width dtypes.
 * - `deep: true` traverses actual JS values to estimate string/object sizes.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── constants ────────────────────────────────────────────────────────────────

/** Bytes used for a single heap pointer on a 64-bit platform. */
const POINTER_SIZE = 8;

/**
 * Estimated V8 overhead bytes added to every JS heap string object on top of
 * the character data (2 bytes / char in UTF-16).
 */
const STRING_OBJECT_OVERHEAD = 56;

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Options for {@link seriesMemoryUsage} and {@link dataFrameMemoryUsage}.
 */
export interface MemoryUsageOptions {
  /**
   * When `true` (default), the size of the index is included in the result.
   */
  readonly index?: boolean;
  /**
   * When `true`, traverse the actual values and estimate their individual
   * sizes — useful for string and object columns.
   * When `false` (default), uses dtype itemsize for fixed-width types and
   * {@link POINTER_SIZE} bytes per element for variable-width types.
   */
  readonly deep?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Shallow per-element byte estimate for a single scalar value given that the
 * dtype itemsize is known to be variable (0).
 */
function deepScalarSize(v: Scalar): number {
  if (v === null || v === undefined) {
    return POINTER_SIZE;
  }
  if (typeof v === "boolean") {
    return 1;
  }
  if (typeof v === "number") {
    return 8;
  }
  if (typeof v === "bigint") {
    return 8;
  }
  if (typeof v === "string") {
    return v.length * 2 + STRING_OBJECT_OVERHEAD;
  }
  if (v instanceof Date) {
    return 8;
  }
  return POINTER_SIZE;
}

/**
 * Return the bytes used by a single element of dtype with the given item size.
 * Variable-width dtypes (itemsize = 0) fall back to one pointer per element.
 */
function shallowElemSize(itemsize: number): number {
  return itemsize > 0 ? itemsize : POINTER_SIZE;
}

/**
 * Estimate the bytes consumed by an `Index`.
 *
 * A `RangeIndex` stores only three integers (start / stop / step) so its
 * footprint is independent of length.  All other index types pay per-label.
 */
function indexMemoryBytes(idx: Index<Label>, deep: boolean): number {
  if (idx instanceof RangeIndex) {
    return 3 * 8;
  }
  const n = idx.size;
  if (deep) {
    let total = 0;
    for (let i = 0; i < n; i++) {
      total += deepScalarSize(idx.at(i) as Scalar);
    }
    return total;
  }
  return n * POINTER_SIZE;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Return the number of bytes used by a `Series`.
 *
 * Mirrors `pandas.Series.memory_usage(index=True, deep=False)`.
 *
 * @param s       - The Series to measure.
 * @param options - {@link MemoryUsageOptions}
 * @returns         Total estimated byte count.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3], dtype: Dtype.int32 });
 * seriesMemoryUsage(s); // 12  (3 elements × 4 bytes)
 * ```
 */
export function seriesMemoryUsage(
  s: Series<Scalar>,
  options?: MemoryUsageOptions,
): number {
  const includeIndex = options?.index ?? true;
  const deep = options?.deep ?? false;

  let total: number;
  if (deep) {
    total = s.values.reduce((sum: number, v) => sum + deepScalarSize(v), 0);
  } else {
    total = s.size * shallowElemSize(s.dtype.itemsize);
  }

  if (includeIndex) {
    total += indexMemoryBytes(s.index, deep);
  }

  return total;
}

/**
 * Return a `Series` mapping each column name to its memory usage in bytes.
 *
 * If `options.index` is `true` (default), an extra `"Index"` entry is
 * prepended for the row index.
 *
 * Mirrors `pandas.DataFrame.memory_usage(index=True, deep=False)`.
 *
 * @param df      - The DataFrame to measure.
 * @param options - {@link MemoryUsageOptions}
 * @returns         A `Series<number>` named `"memory_usage"`.
 *
 * @example
 * ```ts
 * const df = new DataFrame({ a: [1, 2, 3], b: ["x", "y", "z"] });
 * const mu = dataFrameMemoryUsage(df);
 * // Index entry + "a" (3×8 bytes float64) + "b" (3×8 pointer bytes)
 * ```
 */
export function dataFrameMemoryUsage(
  df: DataFrame,
  options?: MemoryUsageOptions,
): Series<number> {
  const includeIndex = options?.index ?? true;
  const deep = options?.deep ?? false;

  const names: string[] = [];
  const values: number[] = [];

  if (includeIndex) {
    names.push("Index");
    values.push(indexMemoryBytes(df.index, deep));
  }

  for (const [colName, col] of df.items()) {
    names.push(colName);
    let mem: number;
    if (deep) {
      mem = col.values.reduce((sum: number, v: Scalar) => sum + deepScalarSize(v), 0);
    } else {
      mem = col.size * shallowElemSize(col.dtype.itemsize);
    }
    values.push(mem);
  }

  return new Series<number>({
    data: values,
    index: new Index<Label>(names as Label[]),
    name: "memory_usage",
  });
}
