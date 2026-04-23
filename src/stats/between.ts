/**
 * between — element-wise range check for Series values.
 *
 * Mirrors `pandas.Series.between(left, right, inclusive='both')`.
 *
 * Returns a boolean Series indicating whether each element falls within the
 * interval `[left, right]` (by default inclusive on both ends).
 *
 * - {@link seriesBetween} — element-wise range check
 *
 * @example
 * ```ts
 * import { Series, seriesBetween } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * seriesBetween(s, 2, 4).values; // [false, true, true, true, false]
 *
 * seriesBetween(s, 2, 4, { inclusive: "left" }).values;
 * // [false, true, true, false, false]
 * ```
 *
 * @module
 */

import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Controls which endpoints of the interval are included.
 * - `"both"` (default): left ≤ x ≤ right
 * - `"left"`:  left ≤ x < right
 * - `"right"`: left < x ≤ right
 * - `"neither"`: left < x < right
 */
export type BetweenInclusive = "both" | "left" | "right" | "neither";

/** Options for {@link seriesBetween}. */
export interface BetweenOptions {
  /**
   * Which endpoints to include.
   * @default "both"
   */
  readonly inclusive?: BetweenInclusive;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Return `true` when `v` is a missing value (null, undefined, NaN). */
function isMissing(v: unknown): boolean {
  if (v === null || v === undefined) {
    return true;
  }
  if (typeof v === "number" && Number.isNaN(v)) {
    return true;
  }
  return false;
}

/** Compare two scalar values as numbers or strings. */
function scalarLt(a: Scalar, b: Scalar): boolean {
  return (a as unknown as number) < (b as unknown as number);
}

function scalarLte(a: Scalar, b: Scalar): boolean {
  return (a as unknown as number) <= (b as unknown as number);
}

/**
 * Check whether a single scalar `v` falls inside [left, right] according to
 * the `inclusive` setting.  Returns `false` for any missing value.
 */
function inRange(v: Scalar, left: Scalar, right: Scalar, inclusive: BetweenInclusive): boolean {
  if (isMissing(v) || isMissing(left) || isMissing(right)) {
    return false;
  }
  const leftOk =
    inclusive === "both" || inclusive === "left" ? scalarLte(left, v) : scalarLt(left, v);
  const rightOk =
    inclusive === "both" || inclusive === "right" ? scalarLte(v, right) : scalarLt(v, right);
  return leftOk && rightOk;
}

// ─── seriesBetween ─────────────────────────────────────────────────────────────

/**
 * Return a boolean Series indicating whether each element of `s` lies within
 * the range `[left, right]`.
 *
 * Missing values in `s` produce `false` (matching pandas behaviour).
 *
 * @param s         - Source Series.
 * @param left      - Left bound of the interval.
 * @param right     - Right bound of the interval.
 * @param options   - See {@link BetweenOptions}.
 * @returns Boolean Series with the same index as `s`.
 *
 * @example
 * ```ts
 * import { Series, seriesBetween } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * seriesBetween(s, 2, 4).values;
 * // [false, true, true, true, false]
 *
 * seriesBetween(s, 2, 4, { inclusive: "neither" }).values;
 * // [false, false, true, false, false]
 * ```
 */
export function seriesBetween(
  s: Series<Scalar>,
  left: Scalar,
  right: Scalar,
  options: BetweenOptions = {},
): Series<boolean> {
  const inclusive: BetweenInclusive = options.inclusive ?? "both";
  const data: boolean[] = [];
  for (let i = 0; i < s.size; i++) {
    data.push(inRange(s.values[i] as Scalar, left, right, inclusive));
  }
  return new Series<boolean>({
    data,
    index: s.index,
    name: s.name,
  });
}
