/**
 * factorize — encode values as integer codes.
 *
 * Mirrors `pandas.factorize()` and `pandas.Series.factorize()`:
 * - Maps each unique non-null value to an integer code (0-based, first-seen order
 *   by default, or sorted when `sort: true`).
 * - Null / undefined / NaN values receive the `naValue` sentinel (default `-1`).
 *
 * @example
 * ```ts
 * import { factorize, Series } from "tsb";
 * const { codes, uniques } = factorize(["b", "a", "b", null, "a"]);
 * // codes: [1, 0, 1, -1, 0]  uniques: ["a", "b"]
 * ```
 *
 * @module
 */

import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Comparison for sorting Label values (null sorts first). */
function compareLabels(a: Label, b: Label): number {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return -1;
  }
  if (b === null) {
    return 1;
  }
  const sa = String(a);
  const sb = String(b);
  if (sa < sb) {
    return -1;
  }
  if (sa > sb) {
    return 1;
  }
  return 0;
}

/** Collect unique labels from `values`, preserving first-seen order. */
function collectUniques(values: readonly Scalar[], treatNaAsValue: boolean): Label[] {
  const rawUniques: Label[] = [];
  const seenSet = new Set<Label>();
  for (const v of values) {
    if (isMissing(v)) {
      if (treatNaAsValue && !seenSet.has(null)) {
        seenSet.add(null);
        rawUniques.push(null);
      }
      continue;
    }
    const label = v as Label;
    if (!seenSet.has(label)) {
      seenSet.add(label);
      rawUniques.push(label);
    }
  }
  return rawUniques;
}

/** Build integer codes array for the given values using the codeMap. */
function buildCodes(
  values: readonly Scalar[],
  codeMap: Map<Label, number>,
  treatNaAsValue: boolean,
  na: number,
): number[] {
  const codes: number[] = [];
  for (const v of values) {
    if (isMissing(v)) {
      if (treatNaAsValue) {
        codes.push(codeMap.get(null) ?? na);
      } else {
        codes.push(na);
      }
    } else {
      codes.push(codeMap.get(v as Label) ?? na);
    }
  }
  return codes;
}

// ─── public API types ─────────────────────────────────────────────────────────

/** Options for {@link factorize} and {@link factorizeSeries}. */
export interface FactorizeOptions {
  /**
   * When `true`, sort unique values before assigning codes so that code 0
   * maps to the lexicographically smallest value. Default `false`
   * (first-seen order).
   */
  readonly sort?: boolean;
  /**
   * Integer sentinel returned for missing values (null / undefined / NaN).
   * Default `-1` (matches pandas' `use_na_sentinel=True` behaviour).
   * Pass `null` to assign missing values codes like any other value.
   */
  readonly naValue?: number | null;
}

/** Result returned by {@link factorize} and {@link factorizeSeries}. */
export interface FactorizeResult {
  /**
   * Integer codes array — same length as the input.
   * Missing values receive `naValue` (default `-1`).
   */
  readonly codes: readonly number[];
  /**
   * Unique values in code-assignment order.
   * Does **not** include missing values even when `naValue` is `null`.
   */
  readonly uniques: readonly Label[];
}

// ─── main function ────────────────────────────────────────────────────────────

/**
 * Encode an array of values as integer codes.
 *
 * @param values - Input array of scalars to encode.
 * @param options - {@link FactorizeOptions}.
 * @returns {@link FactorizeResult} with `codes` and `uniques` arrays.
 *
 * @example
 * ```ts
 * const { codes, uniques } = factorize(["cat", "dog", "cat", null, "dog"]);
 * // codes: [0, 1, 0, -1, 1]
 * // uniques: ["cat", "dog"]
 * ```
 */
export function factorize(
  values: readonly Scalar[],
  options: FactorizeOptions = {},
): FactorizeResult {
  const { sort = false, naValue = -1 } = options;
  const na = naValue ?? -1;
  const treatNaAsValue = naValue === null;

  const rawUniques = collectUniques(values, treatNaAsValue);
  const orderedUniques = sort ? [...rawUniques].sort(compareLabels) : rawUniques;

  const codeMap = new Map<Label, number>();
  for (const [i, u] of orderedUniques.entries()) {
    codeMap.set(u, i);
  }

  const codes = buildCodes(values, codeMap, treatNaAsValue, na);
  return { codes, uniques: orderedUniques };
}

/**
 * Encode a Series' values as integer codes.
 *
 * Returns a numeric Series of codes (index preserved) and an Index of unique
 * values, mirroring `pandas.Series.factorize()`.
 *
 * @param series - Input Series to encode.
 * @param options - {@link FactorizeOptions}.
 * @returns Object with `codes` Series and `uniques` Index.
 *
 * @example
 * ```ts
 * import { factorizeSeries, Series } from "tsb";
 * const s = new Series({ data: ["a", "b", "a", null], name: "x" });
 * const { codes, uniques } = factorizeSeries(s);
 * // codes: Series([0, 1, 0, -1])
 * // uniques: Index(["a", "b"])
 * ```
 */
export function factorizeSeries(
  series: Series<Scalar>,
  options: FactorizeOptions = {},
): { codes: Series<Scalar>; uniques: Index<Label> } {
  const result = factorize(series.values, options);
  const codesSeries = new Series({
    data: result.codes as Scalar[],
    index: series.index.values as Label[],
    name: series.name,
  });
  const uniquesIndex = new Index({ data: result.uniques as Label[] });
  return { codes: codesSeries, uniques: uniquesIndex };
}
