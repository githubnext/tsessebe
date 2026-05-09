/**
 * hashBijectArray — bijective integer mapping for categorical arrays.
 *
 * Mirrors `pandas.util.hash_biject_array` (a semi-public pandas utility):
 * given an array of scalars, return an array of non-negative integers such
 * that **identical values always map to the same integer** and **distinct
 * values always map to different integers** — a bijection on the unique set.
 *
 * The integers are contiguous and zero-based (first-occurrence order),
 * matching pandas' internal `rizer.get_count_table` behaviour for
 * categorical encoding.
 *
 * @example
 * ```ts
 * import { hashBijectArray } from "tsb";
 *
 * const codes = hashBijectArray(["a", "b", "a", "c", "b"]);
 * // codes → [0, 1, 0, 2, 1]
 *
 * const nullCodes = hashBijectArray([1, null, 1, 2, null]);
 * // nullCodes → [0, 1, 0, 2, 1]
 * ```
 *
 * @module
 */

import type { Scalar } from "../types.ts";

// ─── key canonicalization ─────────────────────────────────────────────────────

/**
 * Convert a scalar to a stable string key for use in a `Map`.
 *
 * The key is **type-tagged** so that `1` (number) and `"1"` (string) do not
 * collide — mirroring pandas' type-sensitive hashing.
 */
function toKey(val: Scalar): string {
  if (val === null || val === undefined) {
    return "\x00null";
  }
  if (typeof val === "boolean") {
    return `\x00bool:${val ? "1" : "0"}`;
  }
  if (typeof val === "number") {
    if (Number.isNaN(val)) {
      return "\x00nan";
    }
    return `\x00num:${val}`;
  }
  if (typeof val === "bigint") {
    return `\x00bigint:${val}`;
  }
  if (val instanceof Date) {
    return `\x00date:${val.getTime()}`;
  }
  // string
  return `\x00str:${val}`;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Compute a bijective (contiguous, zero-based) integer code for each element
 * of `arr`.
 *
 * Identical values receive the same code; distinct values receive different
 * codes.  Codes are assigned in first-occurrence order so the result is
 * deterministic.
 *
 * This is useful for converting a categorical array into a compact integer
 * representation without losing the uniqueness guarantee — the standard
 * first step before building a hash table or index structure.
 *
 * Mirrors `pandas.util.hash_biject_array(arr)`.
 *
 * @param arr - Array of scalar values to encode.
 * @returns Array of non-negative integer codes (same length as `arr`).
 *
 * @example
 * ```ts
 * import { hashBijectArray } from "tsb";
 *
 * hashBijectArray(["cat", "dog", "cat"]);  // [0, 1, 0]
 * hashBijectArray([true, false, true]);     // [0, 1, 0]
 * hashBijectArray([1, null, 1, 2]);         // [0, 1, 0, 2]
 * ```
 */
export function hashBijectArray(arr: readonly Scalar[]): number[] {
  const map = new Map<string, number>();
  let nextCode = 0;

  return arr.map((val) => {
    const key = toKey(val);
    const existing = map.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const code = nextCode++;
    map.set(key, code);
    return code;
  });
}

/**
 * Return the unique values from `arr` in first-occurrence order — the inverse
 * mapping of {@link hashBijectArray}.
 *
 * `inverseMap(arr)[code]` gives the original scalar value for the code
 * returned by `hashBijectArray(arr)`.
 *
 * @param arr - Array of scalar values.
 * @returns Unique values in first-occurrence order.
 *
 * @example
 * ```ts
 * import { hashBijectInverse } from "tsb";
 *
 * hashBijectInverse(["cat", "dog", "cat"]);  // ["cat", "dog"]
 * hashBijectInverse([3, 1, 4, 1, 5, 9]);     // [3, 1, 4, 5, 9]
 * ```
 */
export function hashBijectInverse(arr: readonly Scalar[]): Scalar[] {
  const seen = new Map<string, Scalar>();
  const result: Scalar[] = [];

  for (const val of arr) {
    const key = toKey(val);
    if (!seen.has(key)) {
      seen.set(key, val);
      result.push(val);
    }
  }

  return result;
}
