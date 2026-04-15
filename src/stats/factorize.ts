/**
 * factorize — encode array-like values as integer codes.
 *
 * Mirrors:
 * - `pandas.factorize(values, sort, use_na_sentinel)`
 * - `pandas.Series.factorize(sort, use_na_sentinel)`
 *
 * Each unique non-missing value in the input is assigned a monotonically
 * increasing integer code.  Missing values (null / undefined / NaN) receive
 * code **-1** when `useNaSentinel` is `true` (the default).
 *
 * When `sort` is `false` (the default), unique values are returned in
 * **first-seen order** — exactly as pandas does for object arrays.
 * When `sort` is `true`, unique values are sorted (strings lexicographically,
 * numbers numerically) before codes are assigned.
 *
 * @module
 */

import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── types ────────────────────────────────────────────────────────────────────

/** Options for {@link factorize}. */
export interface FactorizeOptions {
  /**
   * If `true`, sort unique values before assigning integer codes.
   * Numbers are sorted numerically; all other values lexicographically.
   * @defaultValue `false`
   */
  readonly sort?: boolean;
  /**
   * If `true` (default), missing values (null / undefined / NaN) receive
   * code **-1** and are **not** included in `uniques`.
   * If `false`, missing values are treated as a regular value and receive
   * a non-negative code.
   * @defaultValue `true`
   */
  readonly useNaSentinel?: boolean;
}

/** Return type of {@link factorize}. */
export interface FactorizeResult<T extends Scalar = Scalar> {
  /** Integer code for each input value.  -1 for missing when `useNaSentinel` is `true`. */
  readonly codes: readonly number[];
  /** Unique values in first-seen (or sorted) order, never containing missing values when `useNaSentinel` is `true`. */
  readonly uniques: readonly T[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Returns `true` for null, undefined, and NaN. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Stable sort comparator for mixed scalar values.
 *
 * - Numbers are sorted numerically (with -Infinity first, +Infinity last).
 * - All other types are coerced to their string representation and sorted
 *   lexicographically.
 * - If the types differ (e.g. number vs. string), numbers come first.
 */
function scalarCompare(a: Scalar, b: Scalar): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  if (typeof a === "number") {
    return -1;
  }
  if (typeof b === "number") {
    return 1;
  }
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

// ─── core implementation ──────────────────────────────────────────────────────

/**
 * Encode an array of scalar values as integer codes plus a unique-values array.
 *
 * @param values - Input array.
 * @param options - {@link FactorizeOptions}.
 * @returns `{ codes, uniques }` — see {@link FactorizeResult}.
 *
 * @example
 * ```ts
 * const { codes, uniques } = factorize(["b", "a", "b", "c", "a"]);
 * // codes   → [0, 1, 0, 2, 1]
 * // uniques → ["b", "a", "c"]
 * ```
 *
 * @example
 * ```ts
 * const { codes, uniques } = factorize([3, 1, null, 2, 1], { sort: true });
 * // codes   → [2, 0, -1, 1, 0]
 * // uniques → [1, 2, 3]
 * ```
 */
export function factorize<T extends Scalar>(
  values: readonly T[],
  options?: FactorizeOptions,
): FactorizeResult<T> {
  const { sort = false, useNaSentinel = true } = options ?? {};

  // Map scalar → index in uniques array.
  // We can't use Map<Scalar, number> with NaN-as-key reliably, but since
  // useNaSentinel=true means we skip NaN, the Map key is always a non-NaN
  // value.  For useNaSentinel=false we use a sentinel string for NaN.
  const indexMap = new Map<string, number>();
  const uniques: T[] = [];

  /** Returns a stable string key for a scalar value. */
  function mapKey(v: T): string {
    if (typeof v === "number" && Number.isNaN(v)) {
      return "__NaN__";
    }
    if (v === null) {
      return "__null__";
    }
    if (v === undefined) {
      return "__undefined__";
    }
    return `${typeof v}:${String(v)}`;
  }

  // First pass: collect codes in first-seen order.
  const firstSeenCodes: number[] = new Array<number>(values.length);

  for (let i = 0; i < values.length; i++) {
    const v = values[i] as T;
    if (useNaSentinel && isMissing(v)) {
      firstSeenCodes[i] = -1;
      continue;
    }
    const key = mapKey(v);
    let idx = indexMap.get(key);
    if (idx === undefined) {
      idx = uniques.length;
      indexMap.set(key, idx);
      uniques.push(v);
    }
    firstSeenCodes[i] = idx;
  }

  if (!sort) {
    // First-seen order — codes are already correct.
    return { codes: firstSeenCodes, uniques };
  }

  // Sort uniques and build a remapping array: oldIdx → newIdx.
  const sorted = uniques.slice().sort(scalarCompare) as T[];
  const remap: number[] = new Array<number>(uniques.length);
  for (let newIdx = 0; newIdx < sorted.length; newIdx++) {
    const key = mapKey(sorted[newIdx] as T);
    const oldIdx = indexMap.get(key);
    if (oldIdx !== undefined) {
      remap[oldIdx] = newIdx;
    }
  }

  const sortedCodes = firstSeenCodes.map((c) => (c === -1 ? -1 : (remap[c] ?? c)));
  return { codes: sortedCodes, uniques: sorted };
}

// ─── Series overload ──────────────────────────────────────────────────────────

/**
 * Encode a {@link Series} as integer codes plus a unique-values Series.
 *
 * Mirrors `pandas.Series.factorize(sort, use_na_sentinel)`.
 *
 * @param series - Input Series.
 * @param options - {@link FactorizeOptions}.
 * @returns `{ codes, uniques }` where `codes` is a `Series<number>` with a
 *   default RangeIndex and `uniques` is a `Series<T>` with a default
 *   RangeIndex.
 *
 * @example
 * ```ts
 * const s = new Series(["b", "a", "b", "c"], { name: "letters" });
 * const { codes, uniques } = seriesFactorize(s);
 * // codes.values   → [0, 1, 0, 2]
 * // uniques.values → ["b", "a", "c"]
 * ```
 */
export function seriesFactorize<T extends Scalar>(
  series: Series<T>,
  options?: FactorizeOptions,
): { codes: Series<number>; uniques: Series<T> } {
  const result = factorize<T>(series.values as readonly T[], options);

  const codesIndex = new Index<Label>(Array.from({ length: result.codes.length }, (_, i) => i));
  const uniquesIndex = new Index<Label>(Array.from({ length: result.uniques.length }, (_, i) => i));

  const codesSeries = new Series<number>({
    data: result.codes as number[],
    index: codesIndex,
    ...(series.name !== null ? { name: series.name } : {}),
  });
  const uniquesSeries = new Series<T>({
    data: result.uniques as T[],
    index: uniquesIndex,
  });

  return { codes: codesSeries, uniques: uniquesSeries };
}
