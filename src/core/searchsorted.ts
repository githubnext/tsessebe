/**
 * searchsorted — binary search on sorted arrays.
 *
 * Mirrors `numpy.searchsorted` and `pandas.Index.searchsorted`:
 * given a **sorted** array `a`, return the index at which a value `v`
 * should be inserted to keep `a` sorted.
 *
 * - `side = "left"` (default) — insertion point before any equal elements
 *   (`a[i-1] < v <= a[i]`)
 * - `side = "right"` — insertion point after any equal elements
 *   (`a[i-1] <= v < a[i]`)
 *
 * @module
 */

import type { Scalar } from "../types.ts";

// ─── types ────────────────────────────────────────────────────────────────────

/** Which side of equal elements to return. */
export type SearchSortedSide = "left" | "right";

/** Options for {@link searchsorted} and {@link searchsortedMany}. */
export interface SearchSortedOptions {
  /**
   * Whether to return the insertion point before (`"left"`) or after
   * (`"right"`) existing equal elements.
   * @defaultValue `"left"`
   */
  readonly side?: SearchSortedSide;

  /**
   * An integer permutation that sorts `a` into ascending order.
   * When provided, `a[sorter[i]]` is assumed to be sorted ascending.
   * Mirrors `numpy.searchsorted`'s `sorter` parameter.
   */
  readonly sorter?: readonly number[];

  /**
   * Custom comparator returning a negative number when `a < b`, zero when
   * `a === b`, and a positive number when `a > b`.
   *
   * If omitted, a default comparator is used that handles `number`, `string`,
   * `boolean`, `bigint`, `Date`, `null`, and `undefined`:
   * - `null` and `undefined` are treated as **less than** all other values.
   * - Mixed-type comparisons fall back to `String()`.
   */
  readonly compareFn?: (a: Scalar, b: Scalar) => number;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Returns true when `v` is null or undefined (i.e. a missing value). */
function isMissing(v: Scalar): v is null | undefined {
  return v === null || v === undefined;
}

/**
 * Default scalar comparator.
 *
 * Ordering contract:
 * 1. null/undefined < every non-missing value
 * 2. Numbers, strings, booleans, bigints, and Dates compare naturally.
 * 3. Everything else falls back to String() comparison.
 */
function defaultCompare(a: Scalar, b: Scalar): number {
  const aMiss = isMissing(a);
  const bMiss = isMissing(b);
  if (aMiss && bMiss) return 0;
  if (aMiss) return -1;
  if (bMiss) return 1;

  // Same type fast-paths
  if (typeof a === "number" && typeof b === "number") {
    // NaN sorts last (treat NaN as greater than everything)
    const aNaN = Number.isNaN(a);
    const bNaN = Number.isNaN(b);
    if (aNaN && bNaN) return 0;
    if (aNaN) return 1;
    if (bNaN) return -1;
    return a - b;
  }

  if (typeof a === "bigint" && typeof b === "bigint") {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  if (typeof a === "string" && typeof b === "string") {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }

  // Cross-type fallback
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/**
 * Core binary search returning the insertion index for `v` into the already-
 * sorted sequence `get(0)…get(n-1)`.
 *
 * @param n - Length of the sorted sequence.
 * @param get - Element accessor by position.
 * @param v - Value to locate.
 * @param side - "left" or "right".
 * @param cmp - Comparator.
 */
function bisect(
  n: number,
  get: (i: number) => Scalar,
  v: Scalar,
  side: SearchSortedSide,
  cmp: (a: Scalar, b: Scalar) => number,
): number {
  let lo = 0;
  let hi = n;
  if (side === "left") {
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cmp(get(mid), v) < 0) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
  } else {
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cmp(get(mid), v) <= 0) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
  }
  return lo;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Find the insertion index for a **single** value in a sorted array.
 *
 * ```ts
 * searchsorted([1, 3, 5, 7], 5)        // → 2  (before the 5)
 * searchsorted([1, 3, 5, 7], 5, { side: "right" })  // → 3  (after the 5)
 * searchsorted([1, 3, 5, 7], 4)        // → 2  (where 4 would go)
 * searchsorted([1, 3, 5, 7], 0)        // → 0
 * searchsorted([1, 3, 5, 7], 99)       // → 4
 * ```
 *
 * Mirrors `numpy.searchsorted(a, v)` and `pandas.Index.searchsorted(v)`.
 *
 * @param a - Sorted array to search (ascending order assumed).
 * @param v - Value to locate.
 * @param options - `side`, `sorter`, and optional `compareFn`.
 * @returns Insertion index in `[0, a.length]`.
 */
export function searchsorted(
  a: readonly Scalar[],
  v: Scalar,
  options: SearchSortedOptions = {},
): number {
  const { side = "left", sorter, compareFn = defaultCompare } = options;
  const n = a.length;
  if (sorter !== undefined) {
    return bisect(n, (i) => a[sorter[i]!]!, v, side, compareFn);
  }
  return bisect(n, (i) => a[i]!, v, side, compareFn);
}

/**
 * Find insertion indices for **multiple** values in a sorted array.
 *
 * ```ts
 * searchsortedMany([1, 3, 5, 7], [2, 5, 8])
 * // → [1, 2, 4]
 *
 * searchsortedMany([1, 3, 5, 7], [2, 5, 8], { side: "right" })
 * // → [1, 3, 4]
 * ```
 *
 * Mirrors `numpy.searchsorted(a, [v1, v2, ...])`.
 *
 * @param a - Sorted array to search (ascending order assumed).
 * @param vs - Values to locate.
 * @param options - `side`, `sorter`, and optional `compareFn`.
 * @returns Array of insertion indices, one per element of `vs`.
 */
export function searchsortedMany(
  a: readonly Scalar[],
  vs: readonly Scalar[],
  options: SearchSortedOptions = {},
): number[] {
  const { side = "left", sorter, compareFn = defaultCompare } = options;
  const n = a.length;
  const get: (i: number) => Scalar =
    sorter !== undefined ? (i) => a[sorter[i]!]! : (i) => a[i]!;
  return vs.map((v) => bisect(n, get, v, side, compareFn));
}

/**
 * Return the `sorter` array (argsort) that would sort `a` in ascending order.
 *
 * Useful for building the `sorter` parameter when `a` is not pre-sorted:
 *
 * ```ts
 * const a = [5, 1, 3];
 * const sorter = argsortScalars(a);
 * // sorter → [1, 2, 0]  (indices of 1, 3, 5 in a)
 * searchsorted(a, 2, { sorter })  // → 1  (between 1 and 3)
 * ```
 *
 * Mirrors the `sorter` workflow in `numpy.searchsorted`.
 *
 * @param a - Array to compute the sort permutation for.
 * @param compareFn - Optional custom comparator (default handles all Scalar types).
 * @returns Integer permutation in `[0, a.length)` that sorts `a` ascending.
 */
export function argsortScalars(
  a: readonly Scalar[],
  compareFn: (x: Scalar, y: Scalar) => number = defaultCompare,
): number[] {
  const indices = a.map((_, i) => i);
  indices.sort((i, j) => compareFn(a[i]!, a[j]!));
  return indices;
}
